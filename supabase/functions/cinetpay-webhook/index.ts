// CinetPay — notify_url (serveur → serveur) ET return_url (navigateur).
// Déployer avec verify_jwt = false. Dans les deux cas, on ne fait JAMAIS
// confiance au payload : on re-vérifie le statut via /v2/payment/check
// avec nos propres clés, on contrôle montant + devise, puis on « claim »
// la transaction de façon atomique (un seul appel peut activer le plan).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, getSecret, serviceClient, logFunctionError, activatePlan,
} from "../_shared/integrations.ts";

async function readTransactionId(req: Request, url: URL): Promise<string | null> {
  const fromQuery = url.searchParams.get("tx") || url.searchParams.get("transaction_id") || url.searchParams.get("cpm_trans_id");
  if (fromQuery) return fromQuery;
  if (req.method !== "POST") return null;
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const b = await req.json();
      return b.cpm_trans_id || b.transaction_id || null;
    }
    const form = await req.formData();
    return (form.get("cpm_trans_id") || form.get("transaction_id") || null) as string | null;
  } catch {
    return null;
  }
}

async function process(transactionId: string): Promise<"activated" | "already_processed" | "not_successful" | "unknown" | "mismatch"> {
  const sc = serviceClient();
  const { data: tx } = await sc.from("cinetpay_transactions").select("*").eq("transaction_id", transactionId).maybeSingle();
  if (!tx) return "unknown";
  if (tx.status === "success") return "already_processed";

  const apiKey = await getSecret("cinetpay", "api_key", "CINETPAY_API_KEY");
  const siteId = await getSecret("cinetpay", "site_id", "CINETPAY_SITE_ID");
  if (!apiKey || !siteId) throw new Error("CinetPay not configured");

  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
  });
  const body = await res.json().catch(() => ({}));
  const status = String(body?.data?.status ?? "").toUpperCase();
  if (status !== "ACCEPTED") {
    if (status === "REFUSED" || status === "CANCELED") {
      await sc.from("cinetpay_transactions").update({ status: status === "REFUSED" ? "refused" : "canceled" })
        .eq("transaction_id", transactionId).neq("status", "success");
    }
    return "not_successful";
  }

  const charged = Number(body.data.amount);
  if (!(charged >= Number(tx.expected_amount)) || String(body.data.currency) !== tx.currency) {
    await logFunctionError("cinetpay-webhook", new Error("Amount mismatch — refusing to activate plan"), {
      tenant_id: tx.tenant_id, transactionId, expected: tx.expected_amount, charged, currency: body.data.currency,
    });
    return "mismatch";
  }

  const { data: claimed } = await sc.from("cinetpay_transactions")
    .update({ status: "success", confirmed_at: new Date().toISOString() })
    .eq("transaction_id", transactionId).neq("status", "success").select("transaction_id");
  if (!claimed || claimed.length === 0) return "already_processed";

  await activatePlan(tx.tenant_id, tx.plan, tx.cycle, Number(tx.expected_usd));
  return "activated";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const url = new URL(req.url);
  const isReturn = url.searchParams.get("return") === "1";
  const appUrl = Deno.env.get("APP_URL") ?? "https://libooks.liafrik.com";

  let outcome = "error";
  try {
    const transactionId = await readTransactionId(req, url);
    // CinetPay « ping » le notify_url par GET pour vérifier qu'il répond.
    if (!transactionId) {
      return isReturn
        ? Response.redirect(`${appUrl}/app/billing?psp_return=cinetpay&status=unknown`, 303)
        : new Response("OK", { status: 200 });
    }
    outcome = await process(transactionId);
  } catch (err) {
    await logFunctionError("cinetpay-webhook", err);
  }

  if (isReturn) {
    return Response.redirect(`${appUrl}/app/billing?psp_return=cinetpay&status=${outcome}`, 303);
  }
  return new Response(JSON.stringify({ received: true, action: outcome }), { status: 200, headers: { "Content-Type": "application/json" } });
});
