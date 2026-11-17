import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, Copy, ExternalLink, KeyRound, Loader2, PlugZap, Save, ShieldCheck, Eye, EyeOff, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  INTEGRATIONS, CATEGORY_LABELS, PSP_DEFAULTS, IntegrationDef, IntegrationCategory, PspId,
} from '../../lib/integrations';

interface AdminRow {
  provider: string;
  category: IntegrationCategory;
  enabled: boolean;
  mode: 'test' | 'live';
  public_config: Record<string, string>;
  secret_preview: Record<string, string>;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_msg: string | null;
  updated_at: string;
}

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function IntegrationsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | IntegrationCategory>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['sa-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_integrations');
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [r.provider, r])), [rows]);
  const anyPspEnabledInVault = rows.some((r) => r.category === 'psp' && r.enabled);

  const list = INTEGRATIONS.filter((d) =>
    (filter === 'all' || d.category === filter) &&
    (!search || `${d.name} ${d.tagline}`.toLowerCase().includes(search.toLowerCase())),
  );

  const connectedCount = INTEGRATIONS.filter((d) => {
    const r = byId[d.provider];
    return r?.enabled || (d.category === 'psp' && !anyPspEnabledInVault && PSP_DEFAULTS[d.provider as PspId]);
  }).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white" style={{ background: 'linear-gradient(135deg,#0F2A3D 0%,#0057D9 120%)' }}>
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-widest mb-2"><PlugZap className="w-4 h-4" /> Centre d’intégrations</div>
            <h2 className="text-2xl font-semibold">Connectez vos PSP, l’IA et vos services en un clic</h2>
            <p className="text-sm text-white/70 mt-1 max-w-2xl">
              Les clés sont stockées dans un coffre accessible uniquement par les Edge Functions (service_role). Elles ne sont jamais renvoyées au navigateur : seul un aperçu masqué s’affiche ici.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-semibold">{connectedCount}</p>
              <p className="text-[11px] text-white/70">actives</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-semibold">{INTEGRATIONS.length}</p>
              <p className="text-[11px] text-white/70">disponibles</p>
            </div>
          </div>
        </div>
      </div>

      {!anyPspEnabledInVault && (
        <div className="flex gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-sm text-blue-900 dark:text-blue-200">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p>
            Aucun PSP n’est encore piloté depuis ce back-office : les paiements utilisent la configuration historique
            (Stripe, Paddle, PayUnit via les secrets Edge Functions). Dès que vous activez un PSP ici, ce panneau devient la
            source de vérité — Stripe, Paddle et PayUnit sont alors automatiquement conservés actifs.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'psp', 'ai', 'email', 'messaging', 'analytics', 'other'] as const).map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === c ? 'bg-[#0057D9] text-white' : 'bg-gray-100 dark:bg-surface-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-3'}`}>
              {c === 'all' ? 'Toutes' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="input pl-9 sm:w-64" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">Erreur : {(error as Error).message}. La migration 042 est-elle appliquée ?</p>}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0057D9]" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((def) => (
            <IntegrationCard
              key={def.provider}
              def={def}
              row={byId[def.provider]}
              open={openId === def.provider}
              onToggleOpen={() => setOpenId(openId === def.provider ? null : def.provider)}
              legacyActive={def.category === 'psp' && !anyPspEnabledInVault && PSP_DEFAULTS[def.provider as PspId]}
              anyPspEnabledInVault={anyPspEnabledInVault}
              onSaved={() => { qc.invalidateQueries({ queryKey: ['sa-integrations'] }); qc.invalidateQueries({ queryKey: ['public-integrations'] }); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  def, row, open, onToggleOpen, legacyActive, anyPspEnabledInVault, onSaved,
}: {
  def: IntegrationDef; row?: AdminRow; open: boolean; onToggleOpen: () => void;
  legacyActive: boolean; anyPspEnabledInVault: boolean; onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean>(row?.enabled ?? legacyActive);
  const [mode, setMode] = useState<'test' | 'live'>(row?.mode ?? 'live');
  const [pub, setPub] = useState<Record<string, string>>(row?.public_config ?? {});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const active = row?.enabled || legacyActive;
  const hasSecrets = Object.keys(row?.secret_preview ?? {}).length > 0;

  const save = useMutation({
    mutationFn: async () => {
      const publicConfig: Record<string, string> = {};
      for (const f of def.fields.filter((f) => !f.secret)) {
        const v = (pub[f.key] ?? '').trim();
        if (v) publicConfig[f.key] = v;
      }
      const secretPatch: Record<string, string> = {};
      for (const f of def.fields.filter((f) => f.secret)) {
        if (secrets[f.key]?.trim()) secretPatch[f.key] = secrets[f.key].trim();
      }
      // Première activation d'un PSP depuis le back-office : on conserve
      // actifs les PSP historiques pour ne couper aucun moyen de paiement.
      if (def.category === 'psp' && enabled && !anyPspEnabledInVault) {
        for (const [p, on] of Object.entries(PSP_DEFAULTS)) {
          if (on && p !== def.provider) {
            const { error } = await supabase.rpc('admin_save_integration', {
              p_provider: p, p_category: 'psp', p_enabled: true, p_mode: 'live', p_public_config: {}, p_secret_patch: {},
            });
            if (error) throw error;
          }
        }
      }
      const { error } = await supabase.rpc('admin_save_integration', {
        p_provider: def.provider, p_category: def.category, p_enabled: enabled, p_mode: mode,
        p_public_config: publicConfig, p_secret_patch: secretPatch,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${def.name} enregistré`); setSecrets({}); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`${FN_BASE}/integration-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.session?.access_token}` },
        body: JSON.stringify({ provider: def.provider }),
      });
      return (await res.json()) as { ok: boolean; msg: string };
    },
    onSuccess: (r) => { (r.ok ? toast.success : toast.error)(r.msg); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSecret = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.rpc('admin_save_integration', {
        p_provider: def.provider, p_category: def.category, p_enabled: row?.enabled ?? false, p_mode: row?.mode ?? 'live',
        p_public_config: row?.public_config ?? {}, p_secret_patch: { [key]: '__DELETE__' },
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Clé supprimée'); onSaved(); },
  });

  return (
    <div className={`group rounded-2xl border bg-white dark:bg-surface-1 transition-all duration-300 ${open ? 'border-[#0057D9]/50 shadow-xl lg:col-span-2' : 'border-gray-100 dark:border-surface-3 hover:shadow-lg hover:-translate-y-0.5'}`}>
      <button onClick={onToggleOpen} className="w-full text-left p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm" style={{ background: def.color }}>
          {def.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white">{def.name}</h3>
            {active ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {legacyActive && !row?.enabled ? 'Actif (secrets env)' : 'Actif'}
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-surface-2 dark:text-gray-400">Inactif</span>
            )}
            {row?.mode === 'test' && row.enabled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Test</span>}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{def.tagline}</p>
          {def.regions && <p className="text-[11px] text-gray-400 mt-1 tracking-wide">{def.regions}</p>}
          {row?.last_test_at && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${row.last_test_ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {row.last_test_ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {row.last_test_msg}
            </p>
          )}
        </div>
        <KeyRound className={`w-5 h-5 mt-1 transition-colors ${hasSecrets ? 'text-[#0057D9]' : 'text-gray-300'}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-surface-3 pt-5 space-y-5 animate-fade-in">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <span className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[#0057D9]' : 'bg-gray-300 dark:bg-surface-3'}`}>
                <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Activer</span>
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-surface-3 p-0.5">
              {(['live', 'test'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === m ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500'}`}>
                  {m === 'live' ? 'Production' : 'Test / Sandbox'}
                </button>
              ))}
            </div>
            <a href={def.docs} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0057D9] inline-flex items-center gap-1 hover:underline">
              Où trouver mes clés ? <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {def.fields.map((f) => (
              <div key={f.key}>
                <label className="label flex items-center justify-between">
                  <span>{f.label} {f.secret && <span className="text-[10px] uppercase tracking-wide text-gray-400 ml-1">secret</span>}</span>
                  {f.secret && row?.secret_preview?.[f.key] && (
                    <button type="button" onClick={() => removeSecret.mutate(f.key)} className="text-[11px] text-red-500 hover:underline">Supprimer</button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={f.secret && !reveal[f.key] ? 'password' : 'text'}
                    autoComplete="off"
                    className="input pr-10 font-mono text-xs"
                    placeholder={f.secret ? (row?.secret_preview?.[f.key] || 'Coller la clé…') : (f.placeholder ?? '')}
                    value={f.secret ? (secrets[f.key] ?? '') : (pub[f.key] ?? '')}
                    onChange={(e) => f.secret
                      ? setSecrets((s) => ({ ...s, [f.key]: e.target.value }))
                      : setPub((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                  {f.secret && (
                    <button type="button" onClick={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {reveal[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
                {f.secret && row?.secret_preview?.[f.key] && <p className="text-[11px] text-emerald-600 mt-1">Enregistrée — laissez vide pour la conserver.</p>}
              </div>
            ))}
          </div>

          {def.webhook && (
            <div className="rounded-xl bg-gray-50 dark:bg-surface-2 p-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">URL de webhook / notification à déclarer chez {def.name}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono text-gray-700 dark:text-gray-200 truncate">{FN_BASE}/{def.webhook}</code>
                <button onClick={() => { navigator.clipboard.writeText(`${FN_BASE}/${def.webhook}`); toast.success('Copié'); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-3 text-gray-500">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-end">
            <button onClick={() => test.mutate()} disabled={test.isPending} className="btn-secondary">
              {test.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />} Tester la connexion
            </button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
