// CinetPay — abonnement LiBooks (Mobile Money Orange/MTN/Moov/Wave + cartes,
// zone UEMOA/CEMAC + RDC/Guinée). Hosted checkout : le montant est fixé ICI,
// côté serveur, puis re-vérifié via /v2/payment/check avant toute activation
// (cinetpay-webhook). Body attendu : { plan, tenant_id, cycle }.
//
// Clés (Super Admin > Intégrations > CinetPay, ou secrets Edge Function) :
//   api_key  (CINETPAY_API_KEY)   site_id (CINETPAY_SITE_ID)
//   secret_key (CINETPAY_SECRET_KEY, HMAC x-token — optionnel)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, getSecret, getPublic, serviceClient, logFunctionError,
  usdPriceForCycle, usdTo, requireTenantAdmin,
} from "../_shared/integrations.ts";

const SUPPORTED = ["XOF", "XAF", "CDF", "GNF", "USD"];
const FALLBACK_RATE: Record<string, number> = { XOF: 610, XAF: 610, CDF: 2800, GNF: 8600, USD: 1 };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const apiKey = await getSecret("cinetpay", "api_key", "CINETPAY_API_KEY");
    const siteId = await getSecret("cinetpay", "site_id", "CINETPAY_SITE_ID");
    if (!apiKey || !siteId) throw new Error("CinetPay n'est pas encore configuré (api_key / site_id).");

    const { plan, tenant_id, cycle: rawCycle } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");
    const auth = await requireTenantAdmin(req, tenant_id);
    if (!auth.user) return auth.error ?? json({ error: "Unauthorized" }, 401);

    const cycle = rawCycle === "annual" ? "annual" : "monthly";
    const usd = usdPriceForCycle(plan, cycle);

    const sc = serviceClient();
    const { data: tenant } = await sc.from("tenants").select("id, name, currency, country").eq("id", tenant_id).single();
    if (!tenant) throw new Error("Tenant not found");

    const defaultCurrency = (await getPublic("cinetpay", "default_currency", "XOF"))!;
    const currency = SUPPORTED.includes(tenant.currency) ? tenant.currency : defaultCurrency;
    const rate = await usdTo(currency, FALLBACK_RATE[currency] ?? 610);
    // CinetPay exige un montant multiple de 5 pour les francs CFA.
    let amount = Math.ceil(usd * rate);
    if (currency === "XOF" || currency === "XAF") amount = Math.ceil(amount / 5) * 5;

    const transactionId = `LB${Date.now()}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`.toUpperCase();
    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/cinetpay-webhook`;

    const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
        amount,
        currency,
        description: `Abonnement LiBooks ${plan} ${cycle === "annual" ? "annuel" : "mensuel"}`,
        notify_url: fnBase,
        return_url: `${fnBase}?return=1&tx=${transactionId}`,
        channels: "ALL",
        lang: "FR",
        metadata: JSON.stringify({ tenant_id, plan, cycle }),
        customer_name: tenant.name?.slice(0, 60) || "Client",
        customer_surname: "LiBooks",
        customer_email: auth.user.email ?? "",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || String(body.code) !== "201" || !body.data?.payment_url) {
      throw new Error(body.description || body.message || "CinetPay n'a pas pu initialiser le paiement");
    }

    await sc.from("cinetpay_transactions").insert({
      transaction_id: transactionId, tenant_id, plan, cycle,
      expected_amount: amount, expected_usd: usd, currency, status: "pending",
    });

    return json({ url: body.data.payment_url, transaction_id: transactionId });
  } catch (err) {
    await logFunctionError("cinetpay-checkout", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 400);
  }
});
