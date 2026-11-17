# LiBooks — Logiciel de comptabilité en ligne pour l'Afrique

Dev by **Liafrik Tech** (Vincent Nogue, CEO) — www.liafrik.com

Stack : React + Vite + Tailwind · Supabase (Postgres/RLS, Edge Functions) · Cloudflare Pages · Resend.

## Nouveautés (migration 042)

- **Essai gratuit 30 jours** (défaut base + essais en cours prolongés).
- **Super Admin > Intégrations & PSP** : coffre de clés (service_role uniquement, aperçu masqué),
  activation/mode test-live, test de connexion, URL de webhook à copier.
  PSP : Stripe, Paddle, PayUnit, Flutterwave, Paystack, **CinetPay**, **Korapay**.
  Autres : **Gemini** (assistant IA « Libooks »), Resend, WhatsApp Cloud API, GA4, Turnstile.
  Les Edge Functions lisent d'abord le coffre puis les secrets d'environnement (rien ne casse).
- **Assistant IA « Libooks »** (Edge Function `libooks-ai`, streaming Gemini) avec repli FAQ + humain.
- **Factures personnalisables** (Paramètres > Factures & marque) : modèle, couleurs, logo, cachet, mentions.
- **Tableau de bord personnalisable** (Premium & Entreprise, verrouillé en base).
- **Blog** `/blog` (articles intégrés + articles gérés dans Super Admin > Blog), SEO renforcé.
- Animations premium (Motion system sans dépendance), loader autour du logo, police Outfit.

## Edge Functions à déployer

`libooks-ai` (verify_jwt=false), `integration-test`, `cinetpay-checkout`, `cinetpay-webhook` (verify_jwt=false),
`korapay-checkout`, `korapay-webhook` (verify_jwt=false) + toutes les fonctions qui importent `_shared/integrations.ts`.
