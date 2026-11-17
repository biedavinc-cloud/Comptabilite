// Korapay (Kora) — abonnement LiBooks : cartes, virement, Mobile Money
// (Nigeria, Kenya, Ghana, Afrique du Sud, Égypte, zone CFA…). Hosted
// checkout redirect : montant fixé ici côté serveur, re-vérifié via
// GET /charges/{reference} avant activation (korapay-webhook).
//
// Clés (Super Admin > Intégrations > Korapay, ou secrets Edge Function) :
//   secret_key (KORAPAY_SECRET_KEY)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, getSecret, getPublic, serviceClient, logFunctionError,
  usdPriceForCycle, usdTo, requireTenantAdmin,
} from "../_shared/integrations.ts";

const KORA = "https://api.korapay.com/merchant/api/v1";
const SUPPORTED = ["NGN", "KES", "GHS", "ZAR", "EGP", "XOF", "XAF", "USD"];
const FALLBACK_RATE: Record<string, number> = { NGN: 1550, KES: 130, GHS: 15, ZAR: 18, EGP: 49, XOF: 610, XAF: 610, USD: 1 };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const secretKey = await getSecret("korapay", "secret_key", "KORAPAY_SECRET_KEY");
    if (!secretKey) throw new Error("Korapay n'est pas encore configuré (secret_key).");

    const { plan, tenant_id, cycle: rawCycle } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");
    const auth = await requireTenantAdmin(req, tenant_id);
    if (!auth.user) return auth.error ?? json({ error: "Unauthorized" }, 401);

    const cycle = rawCycle === "annual" ? "annual" : "monthly";
    const usd = usdPriceForCycle(plan, cycle);

    const sc = serviceClient();
    const { data: tenant } = await sc.from("tenants").select("id, name, currency").eq("id", tenant_id).single();
    if (!tenant) throw new Error("Tenant not found");

    const defaultCurrency = (await getPublic("korapay", "default_currency", "NGN"))!;
    const currency = SUPPORTED.includes(tenant.currency) ? tenant.currency : defaultCurrency;
    const rate = await usdTo(currency, FALLBACK_RATE[currency] ?? 1);
    const amount = currency === "USD" ? usd : Math.ceil(usd * rate);

    const reference = `libooks-${crypto.randomUUID()}`;
    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/korapay-webhook`;

    const res = await fetch(`${KORA}/charges/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({
        amount,
        currency,
        reference,
        narration: `Abonnement LiBooks ${plan} (${cycle === "annual" ? "annuel" : "mensuel"})`,
        redirect_url: `${fnBase}?return=1&ref=${encodeURIComponent(reference)}`,
        notification_url: fnBase,
        customer: { name: tenant.name?.slice(0, 80) || "Client LiBooks", email: auth.user.email ?? "" },
        metadata: { tenant_id, plan, cycle },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.status || !body.data?.checkout_url) {
      throw new Error(body.message || "Korapay n'a pas pu initialiser le paiement");
    }

    await sc.from("korapay_transactions").insert({
      reference, tenant_id, plan, cycle, expected_amount: amount, expected_usd: usd, currency, status: "pending",
    });

    return json({ url: body.data.checkout_url, reference });
  } catch (err) {
    await logFunctionError("korapay-checkout", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 400);
  }
});
