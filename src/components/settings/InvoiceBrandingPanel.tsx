import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save, Loader2, Palette, LayoutTemplate, Image as ImageIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import ImageUploader from '../ui/ImageUploader';
import {
  InvoiceSettings, resolveInvoiceSettings, COLOR_PRESETS, LOGO_HEIGHT, InvoiceTemplate,
} from '../../lib/invoiceSettings';

const TEMPLATES: { id: InvoiceTemplate; name: string; desc: string }[] = [
  { id: 'classic', name: 'Classique', desc: 'Sobre et institutionnel' },
  { id: 'modern', name: 'Moderne', desc: 'Bandeau couleur en-tête' },
  { id: 'minimal', name: 'Minimal', desc: 'Épuré, typographie fine' },
];

export default function InvoiceBrandingPanel() {
  const { tenant, refreshTenant, formatCurrency } = useTenant();
  const [cfg, setCfg] = useState<InvoiceSettings>(resolveInvoiceSettings(tenant?.invoice_settings));
  useEffect(() => { setCfg(resolveInvoiceSettings(tenant?.invoice_settings)); }, [tenant?.invoice_settings]);
  const set = <K extends keyof InvoiceSettings>(k: K, v: InvoiceSettings[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').update({ invoice_settings: cfg }).eq('id', tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => { refreshTenant(); toast.success('Personnalisation des factures enregistrée'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveImage = async (field: 'logo_url' | 'cachet_url', url: string) => {
    const { error } = await supabase.from('tenants').update({ [field]: url || null }).eq('id', tenant!.id);
    if (error) toast.error(error.message); else { refreshTenant(); toast.success(field === 'logo_url' ? 'Logo enregistré' : 'Cachet enregistré'); }
  };

  if (!tenant) return null;
  const modern = cfg.template === 'modern';

  return (
    <div className="grid xl:grid-cols-[1fr_minmax(0,460px)] gap-6">
      <div className="space-y-6">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3"><LayoutTemplate className="w-4 h-4 text-[#0057D9]" /> Modèle</h3>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => set('template', t.id)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${cfg.template === t.id ? 'border-[#0057D9] bg-[#0057D9]/5' : 'border-gray-200 dark:border-surface-3 hover:border-gray-300'}`}>
                <div className="h-10 rounded-md mb-2 overflow-hidden bg-gray-50 dark:bg-surface-2 border border-gray-100 dark:border-surface-3">
                  {t.id === 'modern' && <div className="h-3" style={{ background: cfg.primary_color }} />}
                  {t.id === 'classic' && <div className="mx-1.5 mt-2 h-0.5" style={{ background: cfg.primary_color }} />}
                  {t.id === 'minimal' && <div className="mx-1.5 mt-2 h-px bg-gray-300" />}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-[11px] text-gray-400">{t.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3"><Palette className="w-4 h-4 text-[#0057D9]" /> Couleurs</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {COLOR_PRESETS.map((p) => (
              <button key={p.name} onClick={() => setCfg((c) => ({ ...c, primary_color: p.primary, accent_color: p.accent }))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-surface-3 text-xs hover:shadow-sm">
                <span className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                <span className="w-3 h-3 rounded-full -ml-1.5" style={{ background: p.accent }} />
                <span className="text-gray-600 dark:text-gray-300">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(['primary_color', 'accent_color'] as const).map((k) => (
              <div key={k}>
                <label className="label">{k === 'primary_color' ? 'Couleur principale' : 'Couleur d’accent'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={cfg[k]} onChange={(e) => set(k, e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer bg-transparent" />
                  <input className="input font-mono text-xs" value={cfg[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3"><ImageIcon className="w-4 h-4 text-[#0057D9]" /> Logo & cachet</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <ImageUploader tenantId={tenant.id} kind="logo" label="Logo de l’entreprise" currentUrl={tenant.logo_url || undefined} onUploaded={(url) => saveImage('logo_url', url)} />
            <ImageUploader tenantId={tenant.id} kind="cachet" label="Cachet / signature" currentUrl={tenant.cachet_url || undefined} onUploaded={(url) => saveImage('cachet_url', url)} />
          </div>
          <div className="flex flex-wrap items-center gap-5 mt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={cfg.show_logo} onChange={(e) => set('show_logo', e.target.checked)} /> Afficher le logo</label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={cfg.show_stamp} onChange={(e) => set('show_stamp', e.target.checked)} /> Afficher le cachet</label>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-surface-3 p-0.5">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button key={sz} onClick={() => set('logo_size', sz)} className={`px-3 py-1 rounded-md text-xs font-semibold ${cfg.logo_size === sz ? 'bg-[#0057D9] text-white' : 'text-gray-500'}`}>{sz === 'sm' ? 'Petit' : sz === 'md' ? 'Moyen' : 'Grand'}</button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3"><FileText className="w-4 h-4 text-[#0057D9]" /> Contenu</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Titre du document</label><input className="input" value={cfg.title} onChange={(e) => set('title', e.target.value)} placeholder="FACTURE" /></div>
            <div><label className="label">Libellé du cachet</label><input className="input" value={cfg.signature_label} onChange={(e) => set('signature_label', e.target.value)} /></div>
            <div><label className="label">Adresse</label><input className="input" value={cfg.address} onChange={(e) => set('address', e.target.value)} placeholder="Rue, quartier, ville" /></div>
            <div><label className="label">Téléphone</label><input className="input" value={cfg.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+237 6…" /></div>
            <div><label className="label">E-mail</label><input className="input" value={cfg.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label className="label">Site web</label><input className="input" value={cfg.website} onChange={(e) => set('website', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Modalités de paiement (ex. numéros Mobile Money)</label><textarea className="input" rows={2} value={cfg.payment_instructions} onChange={(e) => set('payment_instructions', e.target.value)} placeholder="Orange Money : 6XX XX XX XX — MTN MoMo : 6XX XX XX XX" /></div>
            <div><label className="label">Notes par défaut</label><textarea className="input" rows={2} value={cfg.default_notes} onChange={(e) => set('default_notes', e.target.value)} placeholder="Merci pour votre confiance !" /></div>
            <div><label className="label">Conditions par défaut</label><textarea className="input" rows={2} value={cfg.default_terms} onChange={(e) => set('default_terms', e.target.value)} placeholder="Paiement à 30 jours." /></div>
            <div className="sm:col-span-2"><label className="label">Pied de page</label><input className="input" value={cfg.footer_text} onChange={(e) => set('footer_text', e.target.value)} placeholder="SARL au capital de … — RCCM … — NIF …" /></div>
          </div>
        </section>

        <div className="flex justify-end">
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer la personnalisation
          </button>
        </div>
      </div>

      {/* Aperçu en direct */}
      <div className="xl:sticky xl:top-4 self-start">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Aperçu en direct</p>
        <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-100 overflow-hidden text-[11px] text-gray-700 relative">
          {modern && <div className="h-1.5" style={{ background: cfg.accent_color }} />}
          <div className={`flex justify-between gap-4 p-5 ${modern ? 'text-white' : ''}`} style={modern ? { background: cfg.primary_color } : {}}>
            <div>
              {cfg.show_logo && tenant.logo_url && <img src={tenant.logo_url} alt="" className="object-contain mb-2" style={{ height: LOGO_HEIGHT[cfg.logo_size] * 0.7 }} />}
              <p className="text-sm font-bold" style={{ color: modern ? '#fff' : cfg.primary_color }}>{tenant.name}</p>
              {[cfg.address, cfg.phone, cfg.email, cfg.website].filter(Boolean).map((c) => <p key={c} className={modern ? 'text-white/80' : 'text-gray-500'}>{c}</p>)}
            </div>
            <div className="text-right">
              <p className={`font-semibold ${cfg.template === 'minimal' ? 'text-sm tracking-[0.2em]' : 'text-lg'}`} style={{ color: modern ? '#fff' : cfg.primary_color }}>{cfg.title || 'FACTURE'}</p>
              <p className="font-mono font-semibold" style={{ color: modern ? '#fff' : cfg.accent_color }}>{tenant.invoice_prefix}-0001</p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="flex border-b-2 pb-1 font-semibold" style={{ borderColor: cfg.primary_color, color: cfg.primary_color }}>
              <span className="flex-1">Description</span><span className="w-10 text-right">Qté</span><span className="w-20 text-right">Total</span>
            </div>
            {[['Prestation de conseil', 1, 150000], ['Licence logicielle', 2, 45000]].map(([d, q, p]) => (
              <div key={d as string} className="flex border-b border-gray-100 py-1.5"><span className="flex-1">{d}</span><span className="w-10 text-right">{q}</span><span className="w-20 text-right">{formatCurrency((p as number) * (q as number))}</span></div>
            ))}
            <div className="flex justify-between mt-3">
              <div className="max-w-[55%] text-gray-500">
                {cfg.payment_instructions && <p className="whitespace-pre-line"><span className="block text-[9px] uppercase text-gray-400">Paiement</span>{cfg.payment_instructions}</p>}
              </div>
              <div className="text-right">
                <p className="border-t-2 pt-1 text-sm font-semibold" style={{ borderColor: cfg.primary_color, color: cfg.accent_color }}>{formatCurrency(240000)}</p>
              </div>
            </div>
            {cfg.show_stamp && tenant.cachet_url && <div className="flex justify-end mt-3"><img src={tenant.cachet_url} alt="" className="h-12 object-contain" /></div>}
            <p className="mt-4 pt-2 border-t border-gray-100 text-center text-[9px] text-gray-400">{cfg.footer_text || tenant.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
