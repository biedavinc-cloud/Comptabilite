// Personnalisation des factures (tenants.invoice_settings, migration 042).
// Utilisé à l'identique par l'aperçu Paramètres, l'écran facture et le PDF.
export type InvoiceTemplate = 'classic' | 'modern' | 'minimal';

export interface InvoiceSettings {
  template: InvoiceTemplate;
  primary_color: string;   // titres, bordures
  accent_color: string;    // n° de facture, total
  title: string;           // « FACTURE », « INVOICE », « FACTURE PROFORMA »…
  show_logo: boolean;
  logo_size: 'sm' | 'md' | 'lg';
  show_stamp: boolean;
  address: string;
  phone: string;
  email: string;
  website: string;
  payment_instructions: string; // ex. numéros Mobile Money
  default_notes: string;
  default_terms: string;
  footer_text: string;
  signature_label: string;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  template: 'classic',
  primary_color: '#0F2A3D',
  accent_color: '#0057D9',
  title: 'FACTURE',
  show_logo: true,
  logo_size: 'md',
  show_stamp: true,
  address: '',
  phone: '',
  email: '',
  website: '',
  payment_instructions: '',
  default_notes: '',
  default_terms: '',
  footer_text: '',
  signature_label: 'Cachet & signature',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function resolveInvoiceSettings(raw: unknown): InvoiceSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<InvoiceSettings>;
  const s = { ...DEFAULT_INVOICE_SETTINGS, ...r };
  if (!HEX.test(s.primary_color)) s.primary_color = DEFAULT_INVOICE_SETTINGS.primary_color;
  if (!HEX.test(s.accent_color)) s.accent_color = DEFAULT_INVOICE_SETTINGS.accent_color;
  if (!['classic', 'modern', 'minimal'].includes(s.template)) s.template = 'classic';
  if (!['sm', 'md', 'lg'].includes(s.logo_size)) s.logo_size = 'md';
  s.title = (s.title || 'FACTURE').slice(0, 40);
  return s;
}

export const LOGO_HEIGHT = { sm: 36, md: 52, lg: 72 } as const;

export const COLOR_PRESETS = [
  { name: 'LiBooks', primary: '#0F2A3D', accent: '#0057D9' },
  { name: 'Émeraude', primary: '#064E3B', accent: '#10B981' },
  { name: 'Bordeaux', primary: '#4C0519', accent: '#E11D48' },
  { name: 'Or', primary: '#3F2A06', accent: '#D97706' },
  { name: 'Violet', primary: '#2E1065', accent: '#7C3AED' },
  { name: 'Graphite', primary: '#111827', accent: '#374151' },
];
