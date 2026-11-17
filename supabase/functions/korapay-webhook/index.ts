// Korapay — notification_url (POST signé) ET redirect_url (GET navigateur).
// Déployer avec verify_jwt = false.
//  - Webhook : signature x-korapay-signature = HMAC-SHA256(JSON.stringify(body.data), secret_key).
//  - Dans tous les cas, re-vérification via GET /charges/{reference},
//    contrôle montant/devise, puis claim atomique (anti-rejeu).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, getSecret, serviceClient, logFunctionError, activatePlan, hmacHex, timingSafeEqual,
} from "../_shared/integrations.ts";

const KORA = "https://api.korapay.com/merchant/api/v1";

async function process(reference: string, secretKey: string) {
  const sc = serviceClient();
  const { data: tx } = await sc.from("korapay_transactions").select("*").eq("reference", reference).maybeSingle();
  if (!tx) return "unknown";
  if (tx.status === "success") return "already_processed";

  const res = await fetch(`${KORA}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await res.json().catch(() => ({}));
  const status = String(body?.data?.status ?? "").toLowerCase();
  if (!res.ok || status !== "success") {
    if (status === "failed" || status === "expired") {
      await sc.from("korapay_transactions").update({ status }).eq("reference", reference).neq("status", "success");
    }
    return "not_successful";
  }
  const charged = Number(body.data.amount);
  if (!(charged >= Number(tx.expected_amount)) || String(body.data.currency) !== tx.currency) {
    await logFunctionError("korapay-webhook", new Error("Amount mismatch — refusing to activate plan"), {
      tenant_id: tx.tenant_id, reference, expected: tx.expected_amount, charged, currency: body.data.currency,
    });
    return "mismatch";
  }
  const { data: claimed } = await sc.from("korapay_transactions")
    .update({ status: "success", confirmed_at: new Date().toISOString() })
    .eq("reference", reference).neq("status", "success").select("reference");
  if (!claimed || claimed.length === 0) return "already_processed";
  await activatePlan(tx.tenant_id, tx.plan, tx.cycle, Number(tx.expected_usd));
  return "activated";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  const appUrl = Deno.env.get("APP_URL") ?? "https://libooks.liafrik.com";
  const isReturn = url.searchParams.get("return") === "1";
  let outcome = "error";

  try {
    const secretKey = await getSecret("korapay", "secret_key", "KORAPAY_SECRET_KEY");
    if (!secretKey) throw new Error("Korapay not configured");

    if (isReturn) {
      const ref = url.searchParams.get("ref") || url.searchParams.get("reference");
      if (ref) outcome = await process(ref, secretKey);
      return Response.redirect(`${appUrl}/app/billing?psp_return=korapay&status=${outcome}`, 303);
    }

    const raw = await req.text();
    const payload = JSON.parse(raw || "{}");
    const signature = req.headers.get("x-korapay-signature") ?? "";
    const expected = await hmacHex("SHA-256", secretKey, JSON.stringify(payload.data ?? {}));
    if (!signature || !timingSafeEqual(signature, expected)) {
      return new Response("Invalid signature", { status: 401 });
    }
    const reference = payload?.data?.reference;
    if (reference && String(payload.event ?? "").startsWith("charge.")) {
      outcome = await process(reference, secretKey);
    } else {
      outcome = "ignored";
    }
  } catch (err) {
    await logFunctionError("korapay-webhook", err);
    if (isReturn) return Response.redirect(`${appUrl}/app/billing?psp_return=korapay&status=error`, 303);
  }
  return new Response(JSON.stringify({ received: true, action: outcome }), { status: 200, headers: { "Content-Type": "application/json" } });
});
