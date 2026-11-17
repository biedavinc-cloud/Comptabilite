/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X, ArrowUp, ArrowDown, Eye, EyeOff, Lock, Save, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export type DashboardWidgetId = 'kpis' | 'secondary' | 'revenue' | 'cashflow' | 'customers' | 'team';

export interface DashboardLayout {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  accent: string;
  density: 'comfortable' | 'compact';
  greeting: boolean;
}

export const WIDGET_LABELS: Record<DashboardWidgetId, { name: string; desc: string }> = {
  kpis: { name: 'Indicateurs clés', desc: 'CA, achats, créances, dettes' },
  secondary: { name: 'Indicateurs secondaires', desc: 'Clients, articles, alertes' },
  revenue: { name: 'Chiffre d’affaires & statuts', desc: 'Courbe 12 mois + répartition des factures' },
  cashflow: { name: 'Trésorerie & factures récentes', desc: 'Flux 30 jours + dernières factures' },
  customers: { name: 'Top clients & balance âgée', desc: 'Meilleurs clients et retards de paiement' },
  team: { name: 'Performance de l’équipe', desc: 'Classement et CA par membre' },
};

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: ['kpis', 'secondary', 'revenue', 'cashflow', 'customers', 'team'],
  hidden: [],
  accent: '#0057D9',
  density: 'comfortable',
  greeting: false,
};

const ACCENTS = ['#0057D9', '#10B981', '#7C3AED', '#E11D48', '#D97706', '#0EA5E9', '#111827'];

function normalize(raw: unknown): DashboardLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DashboardLayout>;
  const valid = DEFAULT_LAYOUT.order;
  const order = (Array.isArray(r.order) ? r.order.filter((x): x is DashboardWidgetId => valid.includes(x as DashboardWidgetId)) : []);
  for (const id of valid) if (!order.includes(id)) order.push(id);
  return {
    order,
    hidden: Array.isArray(r.hidden) ? r.hidden.filter((x): x is DashboardWidgetId => valid.includes(x as DashboardWidgetId)) : [],
    accent: typeof r.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.accent) ? r.accent : DEFAULT_LAYOUT.accent,
    density: r.density === 'compact' ? 'compact' : 'comfortable',
    greeting: !!r.greeting,
  };
}

/** Préférences par utilisateur (table user_dashboard_prefs, RLS Premium/Entreprise). */
export function useDashboardLayout(tenantId?: string, userId?: string, enabled = false) {
  const qc = useQueryClient();
  const key = ['dashboard-layout', tenantId, userId];
  const { data } = useQuery({
    queryKey: key,
    enabled: !!tenantId && !!userId && enabled,
    queryFn: async () => {
      const { data } = await supabase.from('user_dashboard_prefs').select('layout')
        .eq('tenant_id', tenantId!).eq('user_id', userId!).maybeSingle();
      return normalize(data?.layout);
    },
  });
  const saveLayout = useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      const { error } = await supabase.from('user_dashboard_prefs').upsert({
        tenant_id: tenantId, user_id: userId, layout, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return layout;
    },
    onSuccess: (l) => { qc.setQueryData(key, l); toast.success('Tableau de bord personnalisé'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { layout: enabled ? (data ?? DEFAULT_LAYOUT) : DEFAULT_LAYOUT, saveLayout };
}

export default function DashboardCustomizer({ layout, canCustomize, saving, onClose, onSave }: {
  layout: DashboardLayout; canCustomize: boolean; saving: boolean;
  onClose: () => void; onSave: (l: DashboardLayout) => void;
}) {
  const [draft, setDraft] = useState<DashboardLayout>(layout);
  const move = (i: number, d: -1 | 1) => setDraft((l) => {
    const order = [...l.order];
    const j = i + d;
    if (j < 0 || j >= order.length) return l;
    [order[i], order[j]] = [order[j], order[i]];
    return { ...l, order };
  });
  const toggle = (id: DashboardWidgetId) => setDraft((l) => ({ ...l, hidden: l.hidden.includes(id) ? l.hidden.filter((x) => x !== id) : [...l.hidden, id] }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <aside className="w-full max-w-md h-full bg-white dark:bg-surface-1 shadow-2xl flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-surface-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#0057D9]" /> Personnaliser le tableau de bord</h2>
            <p className="text-xs text-gray-400">Vos préférences sont propres à votre compte.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-2"><X className="w-5 h-5" /></button>
        </div>

        {!canCustomize ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center"><Lock className="w-6 h-6 text-violet-600" /></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fonction Premium & Entreprise</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Choisissez vos widgets, leur ordre, votre couleur d’accent et la densité d’affichage. Disponible sur les forfaits Premium et Entreprise.</p>
            <Link to="/app/billing" className="btn-primary">Voir les forfaits</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Widgets & ordre</p>
                <ul className="space-y-2">
                  {draft.order.map((id, i) => {
                    const hidden = draft.hidden.includes(id);
                    return (
                      <li key={id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${hidden ? 'border-dashed border-gray-200 dark:border-surface-3 opacity-60' : 'border-gray-100 dark:border-surface-3 bg-gray-50/60 dark:bg-surface-2'}`}>
                        <div className="flex flex-col">
                          <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-[#0057D9] disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button onClick={() => move(i, 1)} disabled={i === draft.order.length - 1} className="p-0.5 text-gray-400 hover:text-[#0057D9] disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{WIDGET_LABELS[id].name}</p>
                          <p className="text-xs text-gray-400 truncate">{WIDGET_LABELS[id].desc}</p>
                        </div>
                        <button onClick={() => toggle(id)} className={`p-2 rounded-lg ${hidden ? 'text-gray-400' : 'text-[#0057D9] bg-[#0057D9]/10'}`} aria-label={hidden ? 'Afficher' : 'Masquer'}>
                          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Couleur d’accent</p>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((c) => (
                    <button key={c} onClick={() => setDraft((l) => ({ ...l, accent: c }))}
                      className={`w-9 h-9 rounded-full ring-offset-2 dark:ring-offset-surface-1 transition-all ${draft.accent === c ? 'ring-2 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-105'}`} style={{ background: c }} aria-label={c} />
                  ))}
                  <input type="color" value={draft.accent} onChange={(e) => setDraft((l) => ({ ...l, accent: e.target.value }))} className="w-9 h-9 rounded-full cursor-pointer bg-transparent" />
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Affichage</p>
                <div className="inline-flex rounded-xl border border-gray-200 dark:border-surface-3 p-1">
                  {(['comfortable', 'compact'] as const).map((d) => (
                    <button key={d} onClick={() => setDraft((l) => ({ ...l, density: d }))} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${draft.density === d ? 'bg-[#0057D9] text-white' : 'text-gray-500'}`}>
                      {d === 'comfortable' ? 'Confortable' : 'Compact'}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={draft.greeting} onChange={(e) => setDraft((l) => ({ ...l, greeting: e.target.checked }))} />
                  Bandeau d’accueil premium aux couleurs de l’accent
                </label>
              </section>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-surface-3">
              <button onClick={() => setDraft(DEFAULT_LAYOUT)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><RotateCcw className="w-4 h-4" /> Réinitialiser</button>
              <button onClick={() => onSave(draft)} disabled={saving} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
