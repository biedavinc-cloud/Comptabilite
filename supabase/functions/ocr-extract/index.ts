// Real OCR: sends an uploaded receipt/invoice image (or PDF page) to
// Claude's vision API and extracts structured fields — this replaces
// what was previously just a file upload with no text extraction at all.
//
// Requires the Edge Function secret: ANTHROPIC_API_KEY
//
// Request body: { document_path: string, tenant_id: string, media_type?: string }
// (document_path is the object path in the PRIVATE tenant-documents bucket
// via uploadOcrDocument() in src/lib/upload.ts)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EXTRACTION_PROMPT = `Tu analyses un reçu ou une facture d'achat. Extrait UNIQUEMENT les champs suivants en JSON strict, sans aucun texte avant/après, sans balises markdown :
{
  "vendor_name": string ou null,
  "invoice_number": string ou null,
  "date": string au format YYYY-MM-DD ou null,
  "subtotal": number ou null,
  "vat_amount": number ou null,
  "total": number ou null,
  "currency": string (code ISO 3 lettres, ex: XAF, XOF, USD) ou null,
  "line_items": [{ "description": string, "quantity": number ou null, "unit_price": number ou null }],
  "confidence": "high" | "medium" | "low"
}
Si un champ est illisible ou absent, mets null. Ne devine jamais un montant, laisse null plutôt que d'halluciner.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { document_path, tenant_id, media_type } = await req.json();
    if (!document_path || !tenant_id) throw new Error("document_path and tenant_id are required");

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: membership } = await serviceClient
      .from("tenant_users").select("id").eq("tenant_id", tenant_id).eq("user_id", user.id).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this tenant" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SECURITY: les justificatifs vivent dans le bucket PRIVÉ tenant-documents.
    // Le chemin doit être exactement dans le dossier OCR de CETTE entreprise
    // (aucune URL arbitraire, aucun « .. », aucun autre tenant).
    const path = String(document_path);
    if (!path.startsWith(`${tenant_id}/ocr/`) || path.includes("..") || path.includes("//")) {
      return new Response(JSON.stringify({ error: "document_path must point to this tenant's own uploaded document" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: blob, error: dlError } = await serviceClient.storage.from("tenant-documents").download(path);
    if (dlError || !blob) throw new Error("Could not fetch the uploaded document");
    const fileRes = { headers: new Headers({ "content-type": blob.type, "content-length": String(blob.size) }), arrayBuffer: () => blob.arrayBuffer() };

    // Belt-and-braces size cap (uploadOcrDocument() already enforces 5MB
    // client-side, but never trust the client alone) — refuse to read an
    // unbounded response body into memory.
    const MAX_BYTES = 8 * 1024 * 1024;
    const contentLength = Number(fileRes.headers.get("content-length") ?? 0);
    if (contentLength && contentLength > MAX_BYTES) {
      throw new Error("Document too large (max 8MB)");
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) throw new Error("Document too large (max 8MB)");
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const resolvedMediaType = media_type || fileRes.headers.get("content-type") || "image/jpeg";
    const isPdf = resolvedMediaType === "application/pdf";
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: resolvedMediaType, data: base64 } };

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const textBlock = claudeData.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock) throw new Error("No text response from vision model");

    let extracted;
    try {
      extracted = JSON.parse(textBlock.text.trim().replace(/^```json\s*|```$/g, ""));
    } catch {
      throw new Error("Could not parse extraction result");
    }

    return new Response(JSON.stringify({ extracted }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
