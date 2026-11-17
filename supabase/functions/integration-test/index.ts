// Super Admin > Intégrations > « Tester la connexion ».
// Fait un appel en LECTURE SEULE (aucun paiement, aucun e-mail envoyé) à
// l'API du fournisseur avec les clés du coffre (ou des secrets d'env), et
// enregistre le résultat dans platform_integrations.last_test_*.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";
import { corsHeaders, json, getSecret, getPublic, getMode, serviceClient } from "../_shared/integrations.ts";

type Result = { ok: boolean; msg: string };

async function test(provider: string): Promise<Result> {
  const need = (v: string | undefined, name: string) => { if (!v) throw new Error(`Clé manquante : ${name}`); return v; };
  switch (provider) {
    case "stripe": {
      const k = need(await getSecret("stripe", "secret_key", "STRIPE_SECRET_KEY"), "secret_key");
      const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${k}` } });
      return { ok: r.ok, msg: r.ok ? `Stripe OK (${k.startsWith("sk_live") ? "live" : "test"})` : `Stripe ${r.status}` };
    }
    case "paystack": {
      const k = need(await getSecret("paystack", "secret_key", "PAYSTACK_SECRET_KEY"), "secret_key");
      const r = await fetch("https://api.paystack.co/balance", { headers: { Authorization: `Bearer ${k}` } });
      return { ok: r.ok, msg: r.ok ? "Paystack OK" : `Paystack ${r.status}` };
    }
    case "flutterwave": {
      const k = need(await getSecret("flutterwave", "secret_key", "FLUTTERWAVE_SECRET_KEY"), "secret_key");
      const r = await fetch("https://api.flutterwave.com/v3/balances", { headers: { Authorization: `Bearer ${k}` } });
      return { ok: r.ok, msg: r.ok ? "Flutterwave OK" : `Flutterwave ${r.status}` };
    }
    case "korapay": {
      const k = need(await getSecret("korapay", "secret_key", "KORAPAY_SECRET_KEY"), "secret_key");
      const r = await fetch("https://api.korapay.com/merchant/api/v1/balances", { headers: { Authorization: `Bearer ${k}` } });
      return { ok: r.ok, msg: r.ok ? "Korapay OK" : `Korapay ${r.status}` };
    }
    case "cinetpay": {
      const apikey = need(await getSecret("cinetpay", "api_key", "CINETPAY_API_KEY"), "api_key");
      const site_id = need(await getSecret("cinetpay", "site_id", "CINETPAY_SITE_ID"), "site_id");
      // Une transaction inconnue renvoie un code métier, mais prouve que
      // apikey + site_id sont acceptés (code 627 = transaction introuvable).
      const r = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey, site_id, transaction_id: "LIBOOKS-HEALTHCHECK" }),
      });
      const b = await r.json().catch(() => ({}));
      const code = String(b.code ?? "");
      const authBad = ["608", "609", "613"].includes(code);
      return { ok: !authBad && r.status < 500, msg: authBad ? `CinetPay : identifiants refusés (${b.message ?? code})` : `CinetPay OK (réponse ${code || r.status})` };
    }
    case "payunit": {
      const user = need(await getSecret("payunit", "api_user", "PAYUNIT_API_USER"), "api_user");
      const pass = need(await getSecret("payunit", "api_password", "PAYUNIT_API_PASSWORD"), "api_password");
      const key = need(await getSecret("payunit", "api_key", "PAYUNIT_API_KEY"), "api_key");
      const mode = await getMode("payunit", "PAYUNIT_MODE");
      const r = await fetch("https://gateway.payunit.net/api/gateway/gateways?t=1", {
        headers: { "x-api-key": key, mode, Authorization: `Basic ${btoa(`${user}:${pass}`)}` },
      });
      return { ok: r.status !== 401 && r.status !== 403, msg: `PayUnit ${r.status}` };
    }
    case "paddle": {
      const k = await getSecret("paddle", "api_key", "PADDLE_API_KEY");
      if (!k) return { ok: !!(await getSecret("paddle", "webhook_secret", "PADDLE_WEBHOOK_SECRET")), msg: "Paddle : webhook secret présent (api_key non fournie, test API ignoré)" };
      const r = await fetch("https://api.paddle.com/event-types", { headers: { Authorization: `Bearer ${k}` } });
      return { ok: r.ok, msg: r.ok ? "Paddle OK" : `Paddle ${r.status}` };
    }
    case "gemini": {
      const k = need(await getSecret("gemini", "api_key", "GEMINI_API_KEY"), "api_key");
      const model = (await getPublic("gemini", "model", "gemini-flash-latest"))!;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, { headers: { "x-goog-api-key": k } });
      return { ok: r.ok, msg: r.ok ? `Gemini OK — modèle ${model}` : `Gemini ${r.status} (clé ou modèle invalide)` };
    }
    case "resend": {
      const k = need(await getSecret("resend", "api_key", "RESEND_API_KEY"), "api_key");
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${k}` } });
      return { ok: r.ok, msg: r.ok ? "Resend OK" : `Resend ${r.status}` };
    }
    case "whatsapp": {
      const token = need(await getSecret("whatsapp", "access_token", "WHATSAPP_ACCESS_TOKEN"), "access_token");
      const phoneId = need(await getPublic("whatsapp", "phone_number_id"), "phone_number_id");
      const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}`, { headers: { Authorization: `Bearer ${token}` } });
      return { ok: r.ok, msg: r.ok ? "WhatsApp Cloud API OK" : `WhatsApp ${r.status}` };
    }
    default:
      return { ok: true, msg: "Aucun test automatique pour cette intégration — configuration enregistrée." };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await anon.rpc("is_super_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { provider } = await req.json();
    let result: Result;
    try {
      result = await test(String(provider));
    } catch (e) {
      result = { ok: false, msg: e instanceof Error ? e.message : String(e) };
    }
    await serviceClient().from("platform_integrations").update({
      last_test_at: new Date().toISOString(), last_test_ok: result.ok, last_test_msg: result.msg.slice(0, 300),
    }).eq("provider", provider);
    return json(result);
  } catch (err) {
    return json({ ok: false, msg: err instanceof Error ? err.message : "Erreur" }, 400);
  }
});
