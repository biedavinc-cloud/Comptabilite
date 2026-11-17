// Sections « signature » de la landing, inspirées des meilleures landings
// fintech (mot rotatif, flux live, révélation au scroll, liste sticky,
// cartes pays flottantes, texte épinglé, filigrane géant, badge rotatif) —
// aux couleurs LiBooks, 100 % CSS transforms + rAF, reduced-motion respecté.
import { useEffect, useRef, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, ArrowRight, Check, FileText, Smartphone, Package, Building2, Bot, ScanLine,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { prefersReducedMotion, Reveal, CountUp, useInView } from '../ui/Motion';
import { ECOSYSTEM_PRODUCTS, LIYAH_GROUP, LIAFRIK_URL } from '../../lib/ecosystem';

const flag = (cc: string, w = 80) => `https://flagcdn.com/w${w}/${cc}.png`;

/** Progression 0→1 d'un élément traversant le viewport (rAF-throttlé). */
function useScrollProgress<T extends HTMLElement>(mode: 'through' | 'pinned' = 'through') {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setP(mode === 'pinned' ? 0.5 : 1); return; }
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const v = mode === 'pinned'
        ? -r.top / Math.max(1, r.height - vh)
        : (vh - r.top) / (vh + r.height);
      setP(Math.min(1, Math.max(0, v)));
      raf = 0;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    update();
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [mode]);
  return { ref, p };
}

/* ------------------------------------------------------------------ */
/* 1. Mot rotatif (hero)                                               */
/* ------------------------------------------------------------------ */
export function RotatingWord({ words, className = '', interval = 2200 }: { words: string[]; className?: string; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((x) => (x + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
  return (
    <span className={`relative inline-grid align-baseline overflow-hidden ${className}`} aria-live="polite">
      <span className="invisible col-start-1 row-start-1">{longest}</span>
      {words.map((w, idx) => (
        <span key={w} className="col-start-1 row-start-1 transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ transform: `translateY(${idx === i ? 0 : idx === (i - 1 + words.length) % words.length ? -110 : 110}%)`, opacity: idx === i ? 1 : 0, filter: idx === i ? 'blur(0)' : 'blur(6px)' }}>
          {w}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Flux live d'encaissements (hero)                                 */
/* ------------------------------------------------------------------ */
const FEED = [
  { cc: 'ci', who: 'Orange Money', where: 'Abidjan', amt: '+ XOF 30 500', usd: 50 },
  { cc: 'cm', who: 'MTN MoMo', where: 'Douala', amt: '+ XAF 125 000', usd: 205 },
  { cc: 'sn', who: 'Wave', where: 'Dakar', amt: '+ XOF 18 000', usd: 29.5 },
  { cc: 'ke', who: 'M-Pesa', where: 'Nairobi', amt: '+ KES 18 200', usd: 141 },
  { cc: 'ng', who: 'Virement', where: 'Lagos', amt: '+ NGN 96 500', usd: 62 },
  { cc: 'ga', who: 'Airtel Money', where: 'Libreville', amt: '+ XAF 45 000', usd: 74 },
  { cc: 'fr', who: 'Carte Visa', where: 'Paris', amt: '+ EUR 240', usd: 260 },
];

export function LiveFeedCard({ className = '' }: { className?: string }) {
  const [head, setHead] = useState(0);
  const [total, setTotal] = useState(83855.4);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => {
      setHead((h) => (h + 1) % FEED.length);
      setTotal((v) => v + FEED[(head + 1) % FEED.length].usd);
    }, 2400);
    return () => clearInterval(t);
  }, [head]);
  const rows = [0, 1, 2].map((k) => FEED[(head - k + FEED.length * 4) % FEED.length]);
  const [int, dec] = total.toFixed(2).split('.');
  return (
    <div className={`rounded-3xl bg-white/95 dark:bg-surface-1/95 backdrop-blur-xl shadow-2xl shadow-[#0F2A3D]/15 ring-1 ring-gray-100 dark:ring-surface-3 p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Encaissé aujourd’hui, toutes devises</p>
          <p className="text-3xl font-semibold tracking-tight text-[#0F2A3D] dark:text-white tabular-nums mt-1">
            ${Number(int).toLocaleString('en-US')}<span className="text-gray-300 font-normal">.{dec}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r, k) => (
          <div key={`${head}-${k}`} className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-surface-3 px-3 py-2.5 bg-white dark:bg-surface-2"
            style={{ animation: k === 0 ? 'lb-row-in .7s cubic-bezier(.2,.8,.2,1)' : undefined, opacity: k === 2 ? 0.55 : 1 }}>
            <img src={flag(r.cc)} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-black/5" loading="lazy" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{r.who}</p>
              <p className="text-[11px] text-gray-400">{r.where}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{r.amt}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#0F2A3D] text-white px-4 py-3 text-sm">
        <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Écritures OHADA générées</span>
        <span className="text-white/60 text-xs">automatiquement</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Déclaration révélée mot à mot + cartes qui montent               */
/* ------------------------------------------------------------------ */
export function StatementSection({ countries, currencies }: { countries: number; currencies: number }) {
  const { ref, p } = useScrollProgress<HTMLElement>('through');
  const text = 'Chaque pays a sa devise, sa TVA, ses normes comptables et ses moyens de paiement. Les entreprises jonglent entre cinq outils. LiBooks supprime la frontière.';
  const words = text.split(' ');
  const reveal = Math.min(1, Math.max(0, (p - 0.12) / 0.45)) * words.length;
  return (
    <section ref={ref} className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(140deg,#0F2A3D 0%,#0b2234 45%,#0057D9 160%)' }}>
      <div className="absolute -right-40 -top-40 w-[560px] h-[560px] rounded-full border-[60px] border-white/[0.04]" />
      <div className="absolute right-20 top-1/3 w-[420px] h-[420px] rounded-full border-[40px] border-white/[0.03]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-32">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-6 flex items-center gap-3"><span className="w-8 h-px bg-white/40" /> Le problème</p>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] max-w-5xl">
          {words.map((w, i) => (
            <span key={i} className="transition-[opacity,color] duration-300" style={{ opacity: i < reveal ? 1 : 0.18, color: i >= words.length - 4 && i < reveal ? '#7DB7FF' : undefined }}>{w} </span>
          ))}
        </h2>

        <div className="mt-16 grid lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-3xl bg-gradient-to-b from-[#DCEBFF] to-[#9CC4FF] p-3 sm:p-4 shadow-2xl will-change-transform"
                style={{ transform: `translate3d(0, ${(1 - Math.min(1, p * 1.6)) * (60 + i * 50)}px, 0)`, minHeight: 210 + (i === 1 ? 40 : 0) }}>
                {i === 0 && (
                  <div className="relative h-full flex flex-col justify-end">
                    <div className="absolute top-2 left-2 right-2 h-16 rounded-xl bg-white/70 rotate-[-6deg]" />
                    <div className="absolute top-5 left-4 right-0 h-16 rounded-xl bg-[#FFE7A3] rotate-[4deg]" />
                    <div className="relative rounded-2xl bg-[#0F2A3D] text-white p-3 text-center mt-20">
                      <p className="text-[10px] text-white/60">Encaissé cette semaine</p>
                      <p className="text-sm sm:text-lg font-semibold tabular-nums">XAF 1 284 500</p>
                    </div>
                  </div>
                )}
                {i === 1 && (
                  <div className="rounded-2xl bg-white p-2.5 space-y-1.5 text-gray-800">
                    <p className="text-[10px] font-semibold px-1">Factures payées</p>
                    {[['cm', 'FAC-0241', 'XAF 450 000'], ['sn', 'FAC-0242', 'XOF 120 000'], ['ng', 'FAC-0243', 'NGN 96 500'], ['ke', 'FAC-0244', 'KES 18 200']].map(([c, n, a]) => (
                      <div key={n} className="flex items-center gap-1.5 rounded-lg border border-gray-100 px-1.5 py-1">
                        <img src={flag(c, 40)} alt="" className="w-4 h-4 rounded-full object-cover" />
                        <span className="text-[9px] sm:text-[10px] flex-1 truncate">{n}<br /><span className="text-gray-400">{a}</span></span>
                        <span className="w-3.5 h-3.5 rounded-full bg-[#0057D9] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></span>
                      </div>
                    ))}
                  </div>
                )}
                {i === 2 && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 pt-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#0057D9] to-[#0F2A3D] flex items-center justify-center shadow-xl lb-float">
                      <img src={logo} alt="" className="w-9 h-9 sm:w-11 sm:h-11" />
                    </div>
                    <div className="rounded-xl bg-white px-2 py-1.5 text-[10px] text-gray-800 flex items-center gap-1 shadow"><Check className="w-3 h-3 text-emerald-500" /> Bilan OHADA prêt</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div>
            <p className="text-lg text-white/75 leading-relaxed">
              LiBooks réunit facturation, encaissements Mobile Money, stocks, comptabilité SYSCOHADA, paie et IA dans un seul compte. Vous vendez localement, nous convertissons, et toute votre activité se consolide dans une seule comptabilité.
            </p>
            <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
              <div><p className="text-3xl sm:text-4xl font-semibold tabular-nums"><CountUp to={countries} /></p><p className="text-sm text-white/60">pays configurés</p></div>
              <div><p className="text-3xl sm:text-4xl font-semibold tabular-nums"><CountUp to={currencies} /></p><p className="text-sm text-white/60">devises</p></div>
              <div><p className="text-2xl sm:text-4xl font-semibold">OHADA</p><p className="text-sm text-white/60">natif</p></div>
            </div>
            <a href="#features" className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0F2A3D] font-semibold hover:gap-3 transition-all">Comment ça marche <ArrowRight className="w-4 h-4" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Cartes « Conçu pour… »                                           */
/* ------------------------------------------------------------------ */
export function UseCaseCards() {
  const cards = [
    {
      kicker: 'Conçu pour', title: 'PME & commerçants africains', desc: 'Facturez, encaissez en Mobile Money et tenez une comptabilité conforme, sans expert à plein temps.',
      bg: 'linear-gradient(160deg,#0057D9 0%,#0F2A3D 100%)', dark: true,
      visual: (
        <div className="relative w-56 h-44">
          <div className="absolute inset-x-4 top-0 h-24 rounded-2xl bg-[#B7F7C4] rotate-[-8deg] shadow-lg transition-transform duration-700 group-hover:rotate-[-14deg] group-hover:-translate-x-3" />
          <div className="absolute inset-x-6 top-2 h-24 rounded-2xl bg-[#FFE7A3] rotate-[6deg] shadow-lg transition-transform duration-700 group-hover:rotate-[12deg] group-hover:translate-x-3" />
          <div className="absolute inset-x-3 top-5 h-24 rounded-2xl bg-gradient-to-br from-[#BFDBFE] to-[#60A5FA] shadow-lg"><span className="m-3 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-[#0057D9]">MoMo</span></div>
          <div className="absolute inset-x-0 bottom-0 rounded-2xl bg-[#0F2A3D]/95 text-white p-4 text-center shadow-2xl backdrop-blur">
            <p className="text-[10px] text-white/60">Encaissé cette semaine</p>
            <p className="text-xl font-semibold tabular-nums">XAF 1 284 500<span className="text-white/40">,00</span></p>
          </div>
        </div>
      ),
    },
    {
      kicker: 'Aussi pour', title: 'Groupes & filiales multi-pays', desc: 'Multi-sociétés, multi-devises, consolidation et conformité locale depuis un seul compte.',
      bg: 'linear-gradient(160deg,#111827 0%,#030712 100%)', dark: true,
      visual: (
        <div className="relative w-64 h-48 flex items-center justify-center">
          <div className="absolute w-28 h-48 rounded-2xl bg-white/10" />
          <div className="absolute w-60 h-24 rounded-2xl bg-white/10" />
          <div className="relative w-44 rounded-2xl overflow-hidden shadow-2xl bg-white transition-transform duration-700 group-hover:-rotate-3 group-hover:scale-105">
            <div className="bg-[#0057D9] text-white p-3"><p className="text-sm font-bold tracking-wide">FACTURE</p><p className="text-[9px] text-white/70">Filiale Dubaï → Douala</p></div>
            <div className="p-3 space-y-1 text-[9px] text-gray-600">
              <div className="flex justify-between"><span>Réf.</span><span className="font-semibold">INV-2041</span></div>
              <div className="flex justify-between"><span>Montant</span><span className="font-semibold">USD 2 400</span></div>
              <div className="flex justify-between"><span>Converti</span><span className="font-semibold">XAF 1 464 000</span></div>
            </div>
          </div>
          <span className="absolute top-6 -left-1 rotate-[-8deg] text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white text-gray-800 shadow-lg">↙ + USD 2 400</span>
          <span className="absolute top-10 -right-2 rotate-[6deg] text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white text-gray-800 shadow-lg flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Payée</span>
        </div>
      ),
    },
    {
      kicker: 'Aussi pour', title: 'Cabinets comptables & experts', desc: 'Gérez tous vos clients, leurs liasses et déclarations avec les accès et rôles adaptés.',
      bg: 'linear-gradient(160deg,#DBEAFE 0%,#93C5FD 100%)', dark: false,
      visual: (
        <div className="w-64 rounded-2xl bg-white shadow-2xl p-3 transition-transform duration-700 group-hover:-translate-y-2">
          <p className="text-[11px] font-semibold text-gray-800 mb-2 px-1">Dossiers clients clôturés</p>
          {[['ci', 'Boutique Akwaba', 'Abidjan'], ['cm', 'Bakery Bonapriso', 'Douala'], ['sn', 'Studio Teranga', 'Dakar'], ['ga', 'Gabon Logistic', 'Libreville']].map(([c, n, w]) => (
            <div key={n} className="flex items-center gap-2 rounded-xl bg-gray-50 px-2 py-1.5 mb-1.5">
              <img src={flag(c, 40)} alt="" className="w-6 h-6 rounded-full object-cover" />
              <div className="flex-1 min-w-0"><p className="text-[10px] font-semibold text-gray-800 truncate">{n}</p><p className="text-[9px] text-gray-400">{w}</p></div>
              <span className="w-4 h-4 rounded-full bg-[#0057D9] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></span>
            </div>
          ))}
        </div>
      ),
    },
  ];
  return (
    <section className="py-24 bg-gray-50 dark:bg-surface-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <Reveal><h2 className="text-5xl sm:text-7xl font-light tracking-tight text-[#0F2A3D] dark:text-white leading-none">Pour qui<span className="font-semibold">.</span></h2></Reveal>
          <Reveal delay={120}><p className="text-lg text-gray-500 dark:text-gray-400 max-w-md">Des entreprises réelles qui vendent, encaissent et grandissent au-delà des frontières. Un forfait par entreprise, sans surprise.</p></Reveal>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 120} variant="up">
              <Link to="/signup" className="group relative block h-[520px] rounded-[2rem] overflow-hidden p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl" style={{ background: c.bg }}>
                <span className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110">
                  <ArrowUpRight className="w-5 h-5 text-[#0F2A3D]" />
                </span>
                <div className="flex justify-center pt-10 transition-transform duration-700 group-hover:scale-[1.04]">{c.visual}</div>
                <div className="absolute inset-x-8 bottom-8">
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${c.dark ? 'text-white/70' : 'text-[#0F2A3D]/70'}`}>{c.kicker}</p>
                  <h3 className={`mt-2 text-3xl font-semibold tracking-tight leading-tight ${c.dark ? 'text-white' : 'text-[#0F2A3D]'}`}>{c.title}</h3>
                  <p className={`mt-2 text-sm ${c.dark ? 'text-white/75' : 'text-[#0F2A3D]/75'}`}>{c.desc}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Liste numérotée + visuel sticky qui change au scroll             */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { icon: FileText, title: 'Facturation', desc: 'Factures, devis, avoirs et récurrences, PDF A4 et ticket thermique, à vos couleurs.' },
  { icon: Smartphone, title: 'Encaissements', desc: 'Orange Money, MTN MoMo, Wave, Moov, M-Pesa, virements et cartes, rapprochés automatiquement.' },
  { icon: Package, title: 'Stocks & magasins', desc: 'Multi-magasins, transferts, alertes de rupture et valorisation au coût moyen pondéré.' },
  { icon: Building2, title: 'Comptabilité OHADA', desc: 'Plan SYSCOHADA révisé, écritures auto, grand livre, balance, bilan et compte de résultat.' },
  { icon: Bot, title: 'IA Libooks', desc: 'Assistant comptable instantané et prévisions de trésorerie intelligentes.' },
  { icon: ScanLine, title: 'Paie & OCR', desc: 'Bulletins de paie, déclarations sociales et numérisation des factures fournisseurs.' },
];

function FeatureVisual({ i }: { i: number }) {
  const common = 'absolute inset-0 flex items-center justify-center transition-all duration-700';
  return (
    <>
      {FEATURES.map((_, k) => (
        <div key={k} className={common} style={{ opacity: k === i ? 1 : 0, transform: k === i ? 'none' : `translateY(${k < i ? -30 : 30}px) scale(.96)`, filter: k === i ? 'none' : 'blur(8px)' }}>
          {k === 0 && (
            <div className="w-72 rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="bg-[#0F2A3D] text-white p-4 flex justify-between"><div><p className="text-xs text-white/60">Facture</p><p className="font-semibold">FAC-2026-0412</p></div><img src={logo} alt="" className="w-8 h-8" /></div>
              <div className="p-4 space-y-2 text-xs text-gray-600">
                {[['Conseil stratégique', '450 000'], ['Licence annuelle', '180 000'], ['Formation équipe', '95 000']].map(([a, b]) => <div key={a} className="flex justify-between border-b border-gray-100 pb-1.5"><span>{a}</span><span className="font-semibold">{b}</span></div>)}
                <div className="flex justify-between pt-1 text-sm"><span className="font-semibold text-[#0F2A3D]">Total TTC</span><span className="font-bold text-[#0057D9]">XAF 865 000</span></div>
              </div>
            </div>
          )}
          {k === 1 && <LiveFeedCard className="w-80" />}
          {k === 2 && (
            <div className="w-72 rounded-2xl bg-white shadow-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-800">Niveaux de stock</p>
              {[['Riz parfumé 25kg', 82, '#0057D9'], ['Huile 5L', 34, '#F59E0B'], ['Savon x48', 12, '#EF4444'], ['Lait en poudre', 66, '#10B981']].map(([n, v, c]) => (
                <div key={n as string}><div className="flex justify-between text-[11px] text-gray-500"><span>{n}</span><span>{v}%</span></div>
                  <div className="h-2 rounded-full bg-gray-100 mt-1 overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${v}%`, background: c as string }} /></div></div>
              ))}
            </div>
          )}
          {k === 3 && (
            <div className="w-72 rounded-2xl bg-white shadow-2xl p-4 text-xs">
              <p className="font-semibold text-gray-800 mb-2">Journal — écriture équilibrée</p>
              {[['521', 'Banque', '865 000', ''], ['411', 'Clients', '', '865 000'], ['701', 'Ventes', '', '733 051'], ['443', 'TVA collectée', '', '131 949']].map(([a, b, d, c]) => (
                <div key={a} className="grid grid-cols-[40px_1fr_70px_70px] gap-1 py-1 border-b border-gray-100 text-gray-600"><span className="font-mono text-[#0057D9]">{a}</span><span>{b}</span><span className="text-right">{d}</span><span className="text-right">{c}</span></div>
              ))}
              <p className="mt-2 text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Débit = Crédit</p>
            </div>
          )}
          {k === 4 && (
            <div className="w-72 space-y-2">
              <div className="ml-auto w-56 rounded-2xl rounded-br-sm bg-[#0057D9] text-white text-xs p-3 shadow-xl">Combien de TVA dois-je déclarer ce mois ?</div>
              <div className="w-64 rounded-2xl rounded-bl-sm bg-white text-gray-700 text-xs p-3 shadow-xl"><span className="font-semibold text-[#0057D9]">Libooks</span> — Votre TVA collectée est de <strong>XAF 131 949</strong>, déductible <strong>XAF 42 300</strong>. Montant à reverser : <strong>XAF 89 649</strong> ✅</div>
            </div>
          )}
          {k === 5 && (
            <div className="w-72 rounded-2xl bg-white shadow-2xl p-4">
              <p className="text-xs font-semibold text-gray-800">Bulletin de paie — Novembre</p>
              <div className="mt-3 space-y-1.5 text-[11px] text-gray-600">
                {[['Salaire de base', '350 000'], ['Prime transport', '25 000'], ['CNPS salarié', '- 15 750'], ['IRPP', '- 21 400']].map(([a, b]) => <div key={a} className="flex justify-between"><span>{a}</span><span className="font-medium">{b}</span></div>)}
              </div>
              <div className="mt-3 rounded-xl bg-[#0057D9]/10 text-[#0057D9] px-3 py-2 flex justify-between text-sm font-semibold"><span>Net à payer</span><span>337 850</span></div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function StickyFeatures() {
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.current.forEach((r) => r && obs.observe(r));
    return () => obs.disconnect();
  }, []);
  return (
    <section id="features" className="py-24 bg-white dark:bg-surface-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Reveal><p className="text-xs uppercase tracking-[0.3em] text-[#0057D9] mb-3 flex items-center gap-3"><span className="w-8 h-px bg-[#0057D9]" /> Une plateforme, tout le cycle</p></Reveal>
        <Reveal delay={80}><h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-[#0F2A3D] dark:text-white mb-14 max-w-3xl">De la vente au bilan, <span className="font-light">sans couture.</span></h2></Reveal>
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16">
          <div>
            {FEATURES.map((f, i) => (
              <div key={f.title} ref={(n) => { rows.current[i] = n; }} data-idx={i}
                className="relative grid grid-cols-[40px_1fr_auto] items-center gap-4 py-8 border-b border-gray-200 dark:border-surface-3 cursor-pointer"
                onClick={() => rows.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                <span className="text-xs text-gray-400 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className={`text-2xl sm:text-4xl font-semibold tracking-tight transition-all duration-500 ${active === i ? 'text-[#0057D9] translate-x-2' : 'text-[#0F2A3D] dark:text-white'}`}>{f.title}</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">{f.desc}</p>
                </div>
                <span className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-500 ${active === i ? 'bg-[#0057D9] border-[#0057D9] text-white rotate-[-45deg]' : 'border-gray-300 dark:border-surface-3 text-[#0F2A3D] dark:text-white'}`}>
                  <ArrowUpRight className="w-4 h-4" />
                </span>
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#0057D9] origin-left transition-transform duration-700" style={{ transform: `scaleX(${active === i ? 1 : 0})` }} />
                {active === i && <span className="absolute -bottom-[5px] w-2.5 h-2.5 rounded-full bg-[#0F2A3D] dark:bg-white transition-all duration-700" style={{ left: '50%' }} />}
                {/* Visuel mobile */}
                {active === i && (
                  <div className="lg:hidden col-span-3 relative h-80 mt-4 rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(160deg,#DBEAFE,#93C5FD)' }}>
                    <div className="absolute inset-0 scale-[0.85]"><FeatureVisual i={i} /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-28 h-[560px] rounded-[2rem] overflow-hidden" style={{ background: 'radial-gradient(80% 70% at 50% 40%, #EAF3FF 0%, #BFDBFE 55%, #93C5FD 100%)' }}>
              <FeatureVisual i={active} />
              <span className="absolute left-6 bottom-6 text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-[#0F2A3D] shadow">{String(active + 1).padStart(2, '0')} · {FEATURES[active].title}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Couverture : cartes pays flottantes autour d'un titre géant      */
/* ------------------------------------------------------------------ */
const COVER = [
  { cc: 'cm', name: 'Cameroun', tag: 'OHADA · MoMo', x: '6%', y: '14%', r: -8, d: 1.2 },
  { cc: 'ci', name: 'Côte d’Ivoire', tag: 'OHADA · Wave', x: '3%', y: '58%', r: 4, d: 0.8 },
  { cc: 'sn', name: 'Sénégal', tag: 'OHADA · Wave', x: '28%', y: '2%', r: -3, d: 1.5 },
  { cc: 'ng', name: 'Nigeria', tag: 'Cartes · Virement', x: '62%', y: '4%', r: 4, d: 1.1 },
  { cc: 'ke', name: 'Kenya', tag: 'M-Pesa', x: '80%', y: '18%', r: 7, d: 0.9 },
  { cc: 'ae', name: 'Émirats', tag: 'Multi-devises', x: '82%', y: '60%', r: -6, d: 1.3 },
  { cc: 'gh', name: 'Ghana', tag: 'MoMo', x: '22%', y: '78%', r: -4, d: 1.0 },
  { cc: 'fr', name: 'France', tag: 'TVA · SEPA', x: '62%', y: '80%', r: 3, d: 1.4 },
];

export function CoverageSection({ countries, currencies }: { countries: number; currencies: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', String((e.clientX - r.left) / r.width - 0.5));
      el.style.setProperty('--py', String((e.clientY - r.top) / r.height - 0.5));
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);
  const { ref: inRef, inView } = useInView<HTMLDivElement>(0.2);
  return (
    <section ref={ref} className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg,#0057D9 0%,#0F2A3D 80%)' }}>
      <div ref={inRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 py-28 lg:py-0 lg:h-[820px] flex items-center justify-center">
        {COVER.map((c, i) => (
          <div key={c.cc} className="hidden lg:block absolute w-56 transition-all duration-1000"
            style={{
              left: c.x, top: c.y,
              opacity: inView ? 1 : 0,
              transform: `translate3d(calc(var(--px,0) * ${c.d * 40}px), calc(var(--py,0) * ${c.d * 40}px), 0) rotate(${c.r}deg) scale(${inView ? 1 : 0.8})`,
              transitionDelay: `${i * 90}ms`,
            }}>
            <div className="rounded-2xl bg-white text-[#0F2A3D] p-4 shadow-2xl hover:-translate-y-1 transition-transform" style={{ animation: `lb-float ${5 + (i % 3)}s ease-in-out ${i * 0.4}s infinite` }}>
              <div className="flex items-center gap-2.5"><img src={flag(c.cc)} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5" loading="lazy" /><p className="font-semibold">{c.name}</p></div>
              <span className="mt-8 inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#0F2A3D] text-white">{c.tag}</span>
            </div>
          </div>
        ))}
        <div className="relative text-center z-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70 flex items-center justify-center gap-3"><span className="w-8 h-px bg-white/50" /> Couverture</p>
          <h2 className="mt-4 text-6xl sm:text-8xl lg:text-9xl font-semibold tracking-tight leading-[0.95]"><CountUp to={countries} /> pays.</h2>
          <p className="text-5xl sm:text-7xl lg:text-8xl font-light tracking-tight leading-none mt-1"><CountUp to={currencies} /> devises.</p>
          <p className="mt-6 text-white/75 max-w-md mx-auto">Afrique de l’Ouest, centrale, de l’Est et australe, Moyen-Orient et Europe. Régions, villes, TVA et plans comptables pré-configurés.</p>
          <div className="lg:hidden mt-8 flex flex-wrap justify-center gap-2">
            {COVER.map((c) => <span key={c.cc} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/10"><img src={flag(c.cc, 40)} alt="" className="w-4 h-4 rounded-full object-cover" />{c.name}</span>)}
          </div>
          <Link to="/signup" className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0F2A3D] font-semibold hover:gap-3 transition-all">Démarrer dans mon pays <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Texte géant épinglé qui glisse derrière une pile de cartes        */
/* ------------------------------------------------------------------ */
export function PinnedCardStack() {
  const { ref, p } = useScrollProgress<HTMLElement>('pinned');
  const x = 30 - p * 140; // % de la largeur du texte
  const fan = Math.min(1, p * 1.8);
  const cards = [
    { title: 'Mobile Money', items: [['Orange Money', 'ci'], ['MTN MoMo', 'cm'], ['Wave', 'sn']], bg: '#0057D9' },
    { title: 'Devises', items: [['XAF', 'cm'], ['XOF', 'sn'], ['NGN', 'ng']], bg: '#ffffff' },
    { title: 'Comptes bancaires', items: [['Banque locale', 'cm'], ['USD', 'us'], ['EUR', 'eu']], bg: '#0F2A3D' },
  ];
  return (
    <section ref={ref} className="relative h-[240vh] bg-gray-50 dark:bg-surface-0">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute whitespace-nowrap will-change-transform select-none" aria-hidden="true" style={{ transform: `translate3d(${x}%,0,0)` }}>
          <span className="lb-giant">Facturez. </span><span className="lb-giant lb-outline">Encaissez. </span><span className="lb-giant">Consolidez. </span><span className="lb-giant lb-giant-accent">Grandissez.</span>
        </div>
        <div className="relative mx-auto w-[min(560px,90vw)] h-[380px] rounded-[2rem] bg-white/60 dark:bg-surface-1/60 backdrop-blur-xl ring-1 ring-gray-200 dark:ring-surface-3 flex items-center justify-center">
          {cards.map((c, i) => {
            const dark = c.bg !== '#ffffff';
            const rot = (i - 1) * 7 * fan;
            const tx = (i - 1) * 26 * fan;
            const ty = (1 - i) * 10 * fan;
            return (
              <div key={c.title} className="absolute w-[min(400px,78vw)] rounded-3xl p-6 shadow-2xl transition-transform duration-200"
                style={{ background: c.bg, transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`, zIndex: i === 2 ? 3 : i }}>
                <div className="flex justify-between gap-4">
                  <div>
                    <p className={`text-5xl font-bold ${dark ? 'text-white' : 'text-[#0F2A3D]'}`}>3</p>
                    <p className={`mt-2 font-semibold ${dark ? 'text-white' : 'text-[#0F2A3D]'}`}>{c.title}</p>
                    <p className={`text-xs mt-1 ${dark ? 'text-white/60' : 'text-gray-500'}`}>Rapprochés automatiquement</p>
                  </div>
                  <div className="space-y-2 w-36">
                    {c.items.map(([n, cc], k) => (
                      <div key={n} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${k === 0 ? 'bg-[#22C55E]/90 text-white' : dark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {n}<img src={flag(cc, 40)} alt="" className="w-4 h-4 rounded-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Écosystème Liafrik                                                */
/* ------------------------------------------------------------------ */
export function EcosystemSection() {
  return (
    <section className="relative py-24 bg-white dark:bg-surface-1 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <Reveal><p className="text-xs uppercase tracking-[0.3em] text-[#0057D9] mb-3 flex items-center gap-3"><span className="w-8 h-px bg-[#0057D9]" /> L’écosystème Liafrik</p></Reveal>
            <Reveal delay={80}><h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-[#0F2A3D] dark:text-white max-w-3xl">Une famille de plateformes <span className="font-light">pensées depuis l’Afrique.</span></h2></Reveal>
          </div>
          <Reveal delay={160}>
            <a href={LIAFRIK_URL} target="_blank" rel="noopener noreferrer" className="max-w-sm block rounded-2xl border border-gray-200 dark:border-surface-3 p-5 hover:shadow-lg transition-all">
              <p className="text-xs uppercase tracking-widest text-gray-400">Maison mère</p>
              <p className="mt-1 font-semibold text-[#0F2A3D] dark:text-white">{LIYAH_GROUP.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{LIYAH_GROUP.description}</p>
            </a>
          </Reveal>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ECOSYSTEM_PRODUCTS.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 80}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="lb-spotlight group relative flex flex-col h-full rounded-3xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 p-6 overflow-hidden hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-500">
                <span className="absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 group-hover:opacity-25 group-hover:scale-125 transition-all duration-700" style={{ background: p.color }} />
                <div className="flex items-center justify-between">
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ background: p.color }}>{p.name.charAt(0).toUpperCase()}</span>
                  <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-[#0057D9] group-hover:rotate-45 transition-all duration-500" />
                </div>
                <p className="mt-5 text-lg font-semibold text-[#0F2A3D] dark:text-white">{p.name}</p>
                <p className="text-[11px] uppercase tracking-widest" style={{ color: p.color }}>{p.category}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex-1">{p.tagline}</p>
                <p className="mt-4 text-xs text-gray-400">{p.linkable ? p.domain : 'via liafrik.com'}</p>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Badge circulaire rotatif + filigrane géant du footer              */
/* ------------------------------------------------------------------ */
export function RotatingBadge({ text = 'LIBOOKS • DEV BY LIAFRIK TECH • COMPTABILITÉ AFRICAINE • ', size = 128 }: { text?: string; size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-[lb-spin_18s_linear_infinite]" aria-hidden="true">
        <defs><path id="lb-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
        <text fill="currentColor" fontSize="7.4" fontWeight="700" letterSpacing="2.2"><textPath href="#lb-circle">{text}</textPath></text>
      </svg>
      <div className="absolute inset-[30%] rounded-full bg-white flex items-center justify-center shadow-lg"><img src={logo} alt="" className="w-3/4 h-3/4" /></div>
    </div>
  );
}

export function FooterWatermark({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--wx', `${((e.clientX - r.left) / r.width) * 100}%`);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);
  return (
    <div ref={ref} className="relative overflow-hidden select-none" aria-hidden="true">
      <p className="lb-watermark text-center font-extrabold leading-[0.8] tracking-[-0.06em]" style={{ fontSize: 'clamp(5rem, 24vw, 22rem)' }}>libooks</p>
      {children}
    </div>
  );
}

