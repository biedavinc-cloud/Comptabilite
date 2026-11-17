import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

export type PspId = 'payunit' | 'flutterwave' | 'paystack' | 'stripe' | 'paddle' | 'cinetpay' | 'korapay';
export type IntegrationCategory = 'psp' | 'ai' | 'email' | 'messaging' | 'analytics' | 'storage' | 'other';

export interface PublicIntegration {
  provider: string;
  category: IntegrationCategory;
  enabled: boolean;
  mode: 'test' | 'live';
  public_config: Record<string, string>;
}

/**
 * PSP déjà validés en production AVANT le coffre d'intégrations (leurs clés
 * vivent dans les secrets Edge Functions). Tant qu'aucune ligne n'est
 * activée dans Super Admin > Intégrations, ce sont eux qui restent proposés :
 * rien ne casse pour les clients actuels. Dès qu'un super admin active au
 * moins un PSP depuis le back-office, le back-office devient la seule source
 * de vérité.
 */
export const PSP_DEFAULTS: Record<PspId, boolean> = {
  payunit: true,
  stripe: true,
  paddle: true,
  flutterwave: false,
  paystack: false,
  cinetpay: false,
  korapay: false,
};

export function usePublicIntegrations() {
  return useQuery({
    queryKey: ['public-integrations'],
    queryFn: async (): Promise<PublicIntegration[]> => {
      const { data, error } = await supabase.rpc('get_public_integrations');
      if (error) return [];
      return (data ?? []) as PublicIntegration[];
    },
    staleTime: 60_000,
  });
}

export function resolvePspAvailability(rows: PublicIntegration[] | undefined): Record<PspId, boolean> {
  const enabledPsps = (rows ?? []).filter((r) => r.category === 'psp' && r.enabled);
  if (enabledPsps.length === 0) return { ...PSP_DEFAULTS };
  const out = Object.fromEntries(Object.keys(PSP_DEFAULTS).map((k) => [k, false])) as Record<PspId, boolean>;
  for (const r of enabledPsps) if (r.provider in out) out[r.provider as PspId] = true;
  return out;
}

export function publicConfig(rows: PublicIntegration[] | undefined, provider: string): Record<string, string> {
  return rows?.find((r) => r.provider === provider)?.public_config ?? {};
}

// ---------- Catalogue affiché dans Super Admin > Intégrations ----------
export interface IntegrationField {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
  help?: string;
}

export interface IntegrationDef {
  provider: string;
  name: string;
  category: IntegrationCategory;
  tagline: string;
  color: string;
  docs: string;
  regions?: string;
  fields: IntegrationField[];
  /** Nom de l'Edge Function à déclarer comme webhook chez le fournisseur. */
  webhook?: string;
}

export const INTEGRATIONS: IntegrationDef[] = [
  {
    provider: 'cinetpay', name: 'CinetPay', category: 'psp', color: '#1BA548',
    tagline: 'Mobile Money (Orange, MTN, Moov, Wave) & cartes — UEMOA, CEMAC, RDC, Guinée',
    regions: 'CI · SN · CM · BF · ML · BJ · TG · NE · GN · CD', docs: 'https://docs.cinetpay.com',
    webhook: 'cinetpay-webhook',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true },
      { key: 'site_id', label: 'Site ID', secret: true },
      { key: 'secret_key', label: 'Secret Key (HMAC x-token)', secret: true, help: 'Optionnelle — chaque paiement est de toute façon re-vérifié via /payment/check.' },
      { key: 'default_currency', label: 'Devise par défaut', placeholder: 'XOF', help: 'Utilisée si la devise du client n’est pas XOF/XAF/CDF/GNF/USD.' },
    ],
  },
  {
    provider: 'korapay', name: 'Korapay (Kora)', category: 'psp', color: '#2376F3',
    tagline: 'Cartes, virement, Mobile Money — Nigeria, Kenya, Ghana, Afrique du Sud, Égypte, zone CFA',
    regions: 'NG · KE · GH · ZA · EG · CI · CM', docs: 'https://developers.korapay.com',
    webhook: 'korapay-webhook',
    fields: [
      { key: 'secret_key', label: 'Secret Key (sk_…)', secret: true },
      { key: 'public_key', label: 'Public Key (pk_…)' },
      { key: 'default_currency', label: 'Devise par défaut', placeholder: 'NGN' },
    ],
  },
  {
    provider: 'stripe', name: 'Stripe', category: 'psp', color: '#635BFF',
    tagline: 'Cartes internationales, Apple Pay, Google Pay, portail client', docs: 'https://dashboard.stripe.com/apikeys',
    webhook: 'stripe-webhook',
    fields: [
      { key: 'secret_key', label: 'Secret Key (sk_live_…)', secret: true },
      { key: 'webhook_secret', label: 'Webhook signing secret (whsec_…)', secret: true },
    ],
  },
  {
    provider: 'paddle', name: 'Paddle', category: 'psp', color: '#111827',
    tagline: 'Merchant of record — cartes & PayPal, TVA mondiale gérée', docs: 'https://vendors.paddle.com/authentication-v2',
    webhook: 'paddle-webhook',
    fields: [
      { key: 'client_token', label: 'Client-side token (live_… / test_…)' },
      { key: 'price_starter', label: 'Price ID Starter (mensuel)' },
      { key: 'price_pro', label: 'Price ID Pro (mensuel)' },
      { key: 'price_premium', label: 'Price ID Premium (mensuel)' },
      { key: 'price_enterprise', label: 'Price ID Entreprise (mensuel)' },
      { key: 'price_starter_annual', label: 'Price ID Starter (annuel)' },
      { key: 'price_pro_annual', label: 'Price ID Pro (annuel)' },
      { key: 'price_premium_annual', label: 'Price ID Premium (annuel)' },
      { key: 'price_enterprise_annual', label: 'Price ID Entreprise (annuel)' },
      { key: 'webhook_secret', label: 'Webhook secret', secret: true },
      { key: 'api_key', label: 'API key (test de connexion)', secret: true },
    ],
  },
  {
    provider: 'payunit', name: 'PayUnit', category: 'psp', color: '#0057D9',
    tagline: 'Cartes & Mobile Money — Cameroun / CEMAC', docs: 'https://payunit.net',
    webhook: 'payunit-webhook',
    fields: [
      { key: 'api_user', label: 'API User', secret: true },
      { key: 'api_password', label: 'API Password', secret: true },
      { key: 'api_key', label: 'API Key', secret: true },
    ],
  },
  {
    provider: 'flutterwave', name: 'Flutterwave', category: 'psp', color: '#F5A623',
    tagline: 'Mobile Money & cartes locales — 30+ pays africains', docs: 'https://app.flutterwave.com/dashboard/settings/apis',
    webhook: 'flutterwave-webhook',
    fields: [
      { key: 'public_key', label: 'Public Key (FLWPUBK-…)' },
      { key: 'secret_key', label: 'Secret Key (FLWSECK-…)', secret: true },
      { key: 'webhook_hash', label: 'Webhook secret hash', secret: true },
    ],
  },
  {
    provider: 'paystack', name: 'Paystack', category: 'psp', color: '#0BA4DB',
    tagline: 'Cartes, virement, USSD — Nigeria, Ghana, Kenya, Afrique du Sud', docs: 'https://dashboard.paystack.com/#/settings/developers',
    webhook: 'paystack-webhook',
    fields: [{ key: 'secret_key', label: 'Secret Key (sk_…)', secret: true }],
  },
  {
    provider: 'gemini', name: 'Google Gemini — Assistant « Libooks »', category: 'ai', color: '#8E75FF',
    tagline: 'Alimente l’assistant IA Libooks (chat, conseils comptables, aide produit) en streaming', docs: 'https://aistudio.google.com/app/apikey',
    fields: [
      { key: 'api_key', label: 'Gemini API Key', secret: true },
      { key: 'model', label: 'Modèle', placeholder: 'gemini-flash-latest', help: 'Alias toujours à jour recommandé. Ex. : gemini-flash-latest, gemini-3.8-flash.' },
    ],
  },
  {
    provider: 'resend', name: 'Resend', category: 'email', color: '#000000',
    tagline: 'E-mails transactionnels (factures, invitations, rappels)', docs: 'https://resend.com/api-keys',
    fields: [
      { key: 'api_key', label: 'API Key (re_…)', secret: true },
      { key: 'from', label: 'Expéditeur', placeholder: 'LiBooks <noreply@liafrik.com>' },
    ],
  },
  {
    provider: 'whatsapp', name: 'WhatsApp Cloud API', category: 'messaging', color: '#25D366',
    tagline: 'Envoi automatisé des factures et relances par WhatsApp', docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    fields: [
      { key: 'phone_number_id', label: 'Phone number ID' },
      { key: 'business_id', label: 'WhatsApp Business Account ID' },
      { key: 'access_token', label: 'Access token permanent', secret: true },
    ],
  },
  {
    provider: 'google_analytics', name: 'Google Analytics 4', category: 'analytics', color: '#E37400',
    tagline: 'Mesure d’audience du site public (SEO, conversions)', docs: 'https://analytics.google.com',
    fields: [{ key: 'measurement_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' }],
  },
  {
    provider: 'cloudflare_turnstile', name: 'Cloudflare Turnstile', category: 'other', color: '#F38020',
    tagline: 'Anti-bot invisible pour les formulaires publics', docs: 'https://dash.cloudflare.com/?to=/:account/turnstile',
    fields: [
      { key: 'site_key', label: 'Site key' },
      { key: 'secret_key', label: 'Secret key', secret: true },
    ],
  },
];

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  psp: 'Paiements (PSP abonnements)',
  ai: 'Intelligence artificielle',
  email: 'E-mail',
  messaging: 'Messagerie',
  analytics: 'Analytics & SEO',
  storage: 'Stockage',
  other: 'Sécurité & autres',
};
