// « Libooks » — assistant IA de la plateforme (Google Gemini).
// Clé : Super Admin > Intégrations > Gemini (api_key) ou secret GEMINI_API_KEY.
// Modèle : public_config.model (défaut gemini-flash-latest, alias toujours à jour).
//
// Réponse en streaming SSE (text/event-stream) : chaque évènement
// `data: {"t":"…"}` porte un morceau de texte, puis `data: {"done":true,…}`.
// Si Gemini n'est pas configuré → HTTP 503 { error:"AI_NOT_CONFIGURED" } :
// le widget retombe alors sur le bot FAQ + humain (support-chat).
//
// Les messages sont aussi enregistrés dans support_conversations /
// support_messages : le Super Admin voit tout et peut reprendre la main.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";
import { corsHeaders, json, getSecret, getPublic, serviceClient, logFunctionError } from "../_shared/integrations.ts";

const KNOWLEDGE = `
LiBooks (https://libooks.liafrik.com) est le logiciel de comptabilité et de gestion commerciale en ligne
développé par LiAfrik Tech (Dubaï & Afrique, https://liafrik.com). Points clés :
- Essai gratuit de 30 jours, sans carte bancaire.
- Forfaits : Starter 14$/mois (facturation illimitée, stocks multi-magasins, clients/fournisseurs, avoirs, grand livre,
  rapports, 2 utilisateurs) ; Pro 29$/mois (+ Banque & Mobile Money, WhatsApp, rapprochement bancaire, 5 utilisateurs) ;
  Premium 79$/mois (+ IA trésorerie & FX, OHADA complet bilan/compte de résultat, immobilisations & amortissements,
  factures récurrentes, OCR & paie, tableau de bord personnalisable, utilisateurs illimités) ;
  Entreprise 199$/mois (+ multi-société, API & intégrations, tableau de bord personnalisable, support dédié 24/7, SLA 99,9%).
  Annuel : -20%.
- Paiement de l'abonnement : cartes (Stripe, Paddle, PayUnit, Paystack), Mobile Money (CinetPay, Flutterwave, Korapay).
- Plan SYSCOHADA révisé pré-configuré pour les pays OHADA, TVA automatique, factures PDF A4 et ticket thermique 58/80 mm,
  factures personnalisables (logo, cachet, couleurs, mentions), envoi WhatsApp et e-mail.
- Mode offline-first (PWA) : on facture sans connexion, synchronisation automatique.
- 8 langues d'interface, multi-devises avec taux de change.
- Sécurité : isolation des données par Row Level Security, 2FA, journal d'audit.
`;

function systemPrompt(lang: string, ctx: string) {
  return `Tu es « Libooks », l'assistant IA officiel de LiBooks, by LiAfrik Tech.
Tu es expert-comptable (SYSCOHADA/OHADA, IFRS, TVA africaines), fiscaliste pratique et coach de gestion pour PME africaines et internationales.
Style : chaleureux, précis, concret, réponses courtes et structurées (listes, étapes), en ${lang === "en" ? "anglais" : "français"} sauf si l'utilisateur écrit dans une autre langue.
Règles : n'invente jamais de chiffres sur l'entreprise de l'utilisateur ; si tu ne sais pas, dis-le et propose de contacter l'équipe humaine (taper « humain »).
Pour une question de prix, de fonctionnalités ou d'inscription, appuie-toi STRICTEMENT sur la base de connaissances ci-dessous.
Ne donne pas de conseil juridique ou fiscal définitif : rappelle de valider avec un professionnel agréé pour les décisions importantes.

BASE DE CONNAISSANCES :
${KNOWLEDGE}
${ctx ? `\nCONTEXTE DE L'UTILISATEUR CONNECTÉ :\n${ctx}` : ""}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const apiKey = await getSecret("gemini", "api_key", "GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI_NOT_CONFIGURED" }, 503);
    const model = (await getPublic("gemini", "model", "gemini-flash-latest"))!;

    const { conversation_id, message, visitor_id, language } = await req.json();
    const text = String(message ?? "").trim().slice(0, 4000);
    if (!text) return json({ error: "message is required" }, 400);
    const lang = language === "en" ? "en" : "fr";

    const sc = serviceClient();

    // --- Utilisateur connecté (optionnel) → contexte métier ---
    let userId: string | null = null;
    let tenantId: string | null = null;
    let ctx = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anon.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: m } = await sc.from("tenant_users").select("tenant_id, role").eq("user_id", user.id).limit(1).maybeSingle();
        tenantId = m?.tenant_id ?? null;
        if (tenantId) {
          const { data: t } = await sc.from("tenants")
            .select("name, country, currency, plan, subscription_status, trial_ends_at, vat_rate, sector").eq("id", tenantId).maybeSingle();
          const [{ count: invCount }, { count: unpaid }, { count: products }] = await Promise.all([
            sc.from("sales_invoices").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
            sc.from("sales_invoices").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["sent", "overdue"]),
            sc.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          ]).catch(() => [{ count: null }, { count: null }, { count: null }]);
          if (t) {
            ctx = `Entreprise : ${t.name} (${t.country}, secteur ${t.sector ?? "n/c"}), devise ${t.currency}, TVA ${t.vat_rate}%.
Forfait : ${t.plan} (${t.subscription_status}${t.subscription_status === "trialing" ? `, essai jusqu'au ${String(t.trial_ends_at).slice(0, 10)}` : ""}).
Rôle de l'utilisateur : ${m?.role}. Factures de vente : ${invCount ?? "?"} (dont ${unpaid ?? "?"} non payées). Articles : ${products ?? "?"}.`;
          }
        }
      }
    }

    // --- Conversation (partagée avec le support humain) ---
    let convId: string | null = conversation_id ?? null;
    if (convId) {
      const { data } = await sc.from("support_conversations").select("id, status").eq("id", convId).maybeSingle();
      if (!data) convId = null;
      else if (data.status === "escalated") {
        await sc.from("support_messages").insert({ conversation_id: convId, sender: "visitor", content: text });
        await sc.from("support_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
        return json({ conversation_id: convId, escalated: true });
      }
    }
    if (!convId) {
      const { data, error } = await sc.from("support_conversations").insert({
        tenant_id: tenantId, user_id: userId, visitor_id: userId ? null : (visitor_id ?? null),
        language: lang, status: "ai",
      }).select("id").single();
      if (error) throw error;
      convId = data.id;
    }

    const { data: history } = await sc.from("support_messages").select("sender, content")
      .eq("conversation_id", convId).order("created_at", { ascending: false }).limit(16);
    await sc.from("support_messages").insert({ conversation_id: convId, sender: "visitor", content: text });

    const contents = [...(history ?? []).reverse(), { sender: "visitor", content: text }].map((m) => ({
      role: m.sender === "visitor" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    // L'API refuse un historique qui commence par un tour « model ».
    while (contents.length && contents[0].role === "model") contents.shift();

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt(lang, ctx) }] },
          contents,
          generationConfig: { maxOutputTokens: 1200 },
        }),
      },
    );
    if (!gemRes.ok || !gemRes.body) {
      const errText = await gemRes.text().catch(() => "");
      throw new Error(`Gemini ${gemRes.status}: ${errText.slice(0, 300)}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const finalConvId = convId;
    let full = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (o: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
        send({ conversation_id: finalConvId });
        const reader = gemRes.body!.getReader();
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              try {
                const evt = JSON.parse(line.slice(5).trim());
                const parts = evt?.candidates?.[0]?.content?.parts ?? [];
                for (const p of parts) {
                  if (typeof p.text === "string" && !p.thought) {
                    full += p.text;
                    send({ t: p.text });
                  }
                }
              } catch { /* ligne partielle */ }
            }
          }
        } catch (e) {
          send({ error: e instanceof Error ? e.message : "stream error" });
        }
        if (!full.trim()) {
          full = lang === "en"
            ? "Sorry, I couldn't answer that. Type \"human\" to reach our team."
            : "Désolé, je n'ai pas pu répondre. Tape « humain » pour joindre notre équipe.";
          send({ t: full });
        }
        await sc.from("support_messages").insert({ conversation_id: finalConvId, sender: "ai", content: full });
        await sc.from("support_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", finalConvId);
        send({ done: true });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    await logFunctionError("libooks-ai", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
