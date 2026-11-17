import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Rocket, X, Sparkles, Loader2, Trash2, Image, Palette, Users, Package, FileText, UserPlus, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { usePWAInstall, InstallGuideModal } from '../ui/InstallApp';

// Démarrage guidé : checklist calculée à partir des VRAIES données du tenant,
// plus un jeu de données d'exemple (clients + articles) que l'on peut retirer.
const DEMO_TAG = '[DEMO]';

const DEMO_CUSTOMERS = [
  { name: 'Boutique Akwaba (exemple)', email: 'contact@akwaba.example', phone: '+225 07 00 00 00', city: 'Abidjan', country: 'CI' },
  { name: 'Bakery Bonapriso (exemple)', email: 'hello@bonapriso.example', phone: '+237 6 00 00 00 00', city: 'Douala', country: 'CM' },
  { name: 'Studio Teranga (exemple)', email: 'studio@teranga.example', phone: '+221 77 000 00 00', city: 'Dakar', country: 'SN' },
];
const DEMO_PRODUCTS = [
  { sku: 'DEMO-001', name: 'Riz parfumé 25 kg (exemple)', sale_price: 18500, purchase_price: 15000, product_type: 'goods', unit_of_measure: 'sac' },
  { sku: 'DEMO-002', name: 'Huile végétale 5 L (exemple)', sale_price: 7200, purchase_price: 5900, product_type: 'goods', unit_of_measure: 'bidon' },
  { sku: 'DEMO-003', name: 'Prestation de conseil (exemple)', sale_price: 150000, purchase_price: 0, product_type: 'service', unit_of_measure: 'jour' },
  { sku: 'DEMO-004', name: 'Formation équipe (exemple)', sale_price: 95000, purchase_price: 0, product_type: 'service', unit_of_measure: 'session' },
];

export default function GettingStarted() {
  const { tenant, isAdmin } = useTenant();
  const qc = useQueryClient();
  const pwa = usePWAInstall();
  const [guide, setGuide] = useState(false);
  const dismissKey = `libooks_onboarding_dismissed_${tenant?.id}`;
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(dismissKey) === '1'; } catch { return false; } });

  const { data, isLoading } = useQuery({
    queryKey: ['getting-started', tenant?.id],
    enabled: !!tenant?.id && !dismissed,
    queryFn: async () => {
      const id = tenant!.id;
      const head = { count: 'exact' as const, head: true };
      const [c1, c2, c3, c4, c5, c6] = await Promise.all([
        supabase.from('customers').select('id', head).eq('tenant_id', id),
        supabase.from('products').select('id', head).eq('tenant_id', id),
        supabase.from('sales_invoices').select('id', head).eq('tenant_id', id),
        supabase.from('tenant_users').select('id', head).eq('tenant_id', id),
        supabase.from('customers').select('id', head).eq('tenant_id', id).like('notes', `${DEMO_TAG}%`),
        supabase.from('products').select('id', head).eq('tenant_id', id).like('sku', 'DEMO-%'),
      ]);
      const customers = c1.count ?? 0, products = c2.count ?? 0, invoices = c3.count ?? 0, members = c4.count ?? 0;
      const demoCustomers = c5.count ?? 0, demoProducts = c6.count ?? 0;
      return { customers, products, invoices, members, demo: demoCustomers + demoProducts };
    },
  });

  const loadDemo = useMutation({
    mutationFn: async () => {
      const id = tenant!.id;
      const { error: e1 } = await supabase.from('customers').insert(DEMO_CUSTOMERS.map((c) => ({ ...c, tenant_id: id, notes: `${DEMO_TAG} Client d’exemple — vous pouvez le supprimer.` })));
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('products').insert(DEMO_PRODUCTS.map((p) => ({ ...p, tenant_id: id, vat_rate: tenant!.vat_rate, track_stock: p.product_type === 'goods', description: `${DEMO_TAG} Article d’exemple` })));
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success('Données d’exemple ajoutées : 3 clients et 4 articles'); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDemo = useMutation({
    mutationFn: async () => {
      const id = tenant!.id;
      // Si un exemple est déjà utilisé dans une facture, on le désactive au lieu de le supprimer.
      const del1 = await supabase.from('customers').delete().eq('tenant_id', id).like('notes', `${DEMO_TAG}%`);
      if (del1.error) await supabase.from('customers').update({ is_active: false }).eq('tenant_id', id).like('notes', `${DEMO_TAG}%`);
      const del2 = await supabase.from('products').delete().eq('tenant_id', id).like('sku', 'DEMO-%');
      if (del2.error) await supabase.from('products').update({ is_active: false }).eq('tenant_id', id).like('sku', 'DEMO-%');
    },
    onSuccess: () => { toast.success('Données d’exemple retirées'); qc.invalidateQueries(); },
  });

  if (!tenant || dismissed || isLoading || !data) return null;

  const steps = [
    { done: !!tenant.logo_url, icon: Image, title: 'Ajoutez votre logo', desc: 'Il apparaîtra sur toutes vos factures.', to: '/app/settings' },
    { done: !!tenant.invoice_settings && Object.keys(tenant.invoice_settings).length > 0, icon: Palette, title: 'Personnalisez vos factures', desc: 'Couleurs, modèle, coordonnées, Mobile Money.', to: '/app/settings' },
    { done: data.customers > 0, icon: Users, title: 'Créez votre premier client', desc: 'Ou importez vos clients existants.', to: '/app/customers' },
    { done: data.products > 0, icon: Package, title: 'Ajoutez vos articles', desc: 'Produits et services, prix et TVA.', to: '/app/inventory' },
    { done: data.invoices > 0, icon: FileText, title: 'Émettez votre première facture', desc: 'Envoyez-la par e-mail ou WhatsApp.', to: '/app/sales-invoices' },
    { done: data.members > 1, icon: UserPlus, title: 'Invitez votre équipe', desc: 'Comptable, vendeurs, associés.', to: '/app/users' },
    { done: pwa.installed, icon: Smartphone, title: 'Installez l’application', desc: 'Sur votre téléphone ou ordinateur, même hors ligne.', action: true },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#0057D9]/20 bg-white dark:bg-surface-1 animate-fade-in">
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#0057D9]/10 blur-3xl pointer-events-none" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-[#0057D9] text-white flex items-center justify-center shadow-lg shadow-[#0057D9]/30"><Rocket className="w-5 h-5" /></span>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bien démarrer avec LiBooks</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{done}/{steps.length} étapes · environ 10 minutes</p>
            </div>
          </div>
          <button onClick={() => { setDismissed(true); try { localStorage.setItem(dismissKey, '1'); } catch { /* ignore */ } }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-2" aria-label="Masquer"><X className="w-4 h-4" /></button>
        </div>
        <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-surface-3 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#0057D9] to-[#22D3EE] transition-all duration-700" style={{ width: `${pct}%` }} /></div>

        <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {steps.map((s) => {
            const inner = (
              <>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'bg-[#0057D9]/10 text-[#0057D9]'}`}>{s.done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${s.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{s.title}</span>
                  <span className="block text-xs text-gray-400 truncate">{s.desc}</span>
                </span>
                {!s.done && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0057D9] group-hover:translate-x-0.5 transition-all" />}
              </>
            );
            const cls = `group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${s.done ? 'border-gray-100 dark:border-surface-3 bg-gray-50/60 dark:bg-surface-2/40' : 'border-gray-100 dark:border-surface-3 hover:border-[#0057D9]/40 hover:shadow-md'}`;
            return s.action
              ? <button key={s.title} className={`${cls} text-left`} onClick={async () => { const r = await pwa.install(); if (r === 'ios' || r === 'unavailable') setGuide(true); }}>{inner}</button>
              : <Link key={s.title} to={s.to!} className={cls}>{inner}</Link>;
          })}
        </div>

        {isAdmin && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-[#0057D9]/5 to-transparent p-3">
            <Sparkles className="w-4 h-4 text-[#0057D9]" />
            <p className="text-sm text-gray-600 dark:text-gray-300 flex-1 min-w-[200px]">
              {data.demo > 0 ? 'Les données d’exemple sont chargées. Retirez-les quand vous êtes prêt.' : 'Envie d’explorer d’abord ? Chargez 3 clients et 4 articles d’exemple, retirables en un clic.'}
            </p>
            {data.demo > 0 ? (
              <button onClick={() => removeDemo.mutate()} disabled={removeDemo.isPending} className="btn-secondary !py-2 !px-4">{removeDemo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Retirer les exemples</button>
            ) : (
              <button onClick={() => loadDemo.mutate()} disabled={loadDemo.isPending} className="btn-primary !py-2 !px-4">{loadDemo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Charger des exemples</button>
            )}
          </div>
        )}
      </div>
      {guide && <InstallGuideModal onClose={() => setGuide(false)} />}
    </section>
  );
}
