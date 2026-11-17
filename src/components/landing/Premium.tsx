// Sections premium « pinned » de la landing : Pour qui (contenu qui change au
// scroll), Couverture interactive, pile de cartes 3D, finale géante.
import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Search, Sparkles, Store, Users, Building2, Briefcase, ShoppingBag } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useScrollProgress, prefersReducedMotion, Reveal, CountUp, useInView } from '../ui/Motion';
import { COUNTRIES } from '../../lib/countryData';
import { ECOSYSTEM_PRODUCTS } from '../../lib/ecosystem';
import ProductMark from '../ui/ProductMark';

const flag = (cc: string, w = 80) => `https://flagcdn.com/w${w}/${cc.toLowerCase()}.png`;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/* ================================================================== */
/* 1. POUR QUI — section épinglée, le contenu change au défilement     */
/* ================================================================== */
interface Segment {
  icon: typeof Store; kicker: string; title: string; desc: string; points: string[];
  bg: string; dark: boolean; visual: ReactNode; cta: { label: string; href: string; external?: boolean };
  partners?: string[];
}

function MiniRow({ cc, a, b, c }: { cc: string; a: string; b: string; c?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2 shadow-sm">
      <img src={flag(cc, 40)} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-black/5" />
      <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800 truncate">{a}</p><p className="text-[10px] text-gray-400">{b}</p></div>
      {c ? <span className="text-xs font-semibold text-gray-900 tabular-nums">{c}</span> : <span className="w-5 h-5 rounded-full bg-[#0057D9] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>}
    </div>
  );
}

const SEGMENTS: Segment[] = [
  {
    icon: Store, kicker: 'Conçu pour', title: 'PME & commerçants', bg: 'linear-gradient(150deg,#0057D9 0%,#0F2A3D 100%)', dark: true,
    desc: 'Facturez, encaissez en Mobile Money et tenez une comptabilité conforme sans expert à plein temps.',
    points: ['Factures pro en 30 secondes', 'Mobile Money rapproché tout seul', 'Stocks & alertes de rupture'],
    cta: { label: 'Démarrer gratuitement', href: '/signup' },
    visual: (
      <div className="relative w-72 h-60">
        <div className="absolute inset-x-6 top-0 h-28 rounded-2xl bg-[#B7F7C4] rotate-[-9deg] shadow-xl" />
        <div className="absolute inset-x-8 top-3 h-28 rounded-2xl bg-[#FFE7A3] rotate-[7deg] shadow-xl" />
        <div className="absolute inset-x-4 top-7 h-28 rounded-2xl bg-gradient-to-br from-[#BFDBFE] to-[#60A5FA] shadow-xl p-3"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-[#0057D9]">MoMo</span></div>
        <div className="absolute inset-x-0 bottom-0 rounded-2xl bg-[#0F2A3D] text-white p-5 text-center shadow-2xl">
          <p className="text-[11px] text-white/60">Encaissé cette semaine</p>
          <p className="text-2xl font-semibold tabular-nums">XAF 1 284 500<span className="text-white/40">,00</span></p>
        </div>
      </div>
    ),
  },
  {
    icon: Building2, kicker: 'Aussi pour', title: 'Groupes & filiales', bg: 'linear-gradient(150deg,#111827 0%,#020617 100%)', dark: true,
    desc: 'Multi-sociétés, multi-devises et consolidation : pilotez vos filiales de Dubaï à Douala depuis un seul compte.',
    points: ['Multi-sociétés illimitées', 'Conversion & écarts de change', 'API & intégrations'],
    cta: { label: 'Voir le forfait Entreprise', href: '#pricing' },
    visual: (
      <div className="relative w-72 h-60 flex items-center justify-center">
        <div className="absolute w-32 h-56 rounded-2xl bg-white/10" /><div className="absolute w-72 h-28 rounded-2xl bg-white/10" />
        <div className="relative w-52 rounded-2xl overflow-hidden shadow-2xl bg-white">
          <div className="bg-[#0057D9] text-white p-3"><p className="text-base font-bold tracking-wide">FACTURE</p><p className="text-[10px] text-white/70">Filiale Dubaï → Douala</p></div>
          <div className="p-3 space-y-1.5 text-[11px] text-gray-600">
            <div className="flex justify-between"><span>Réf.</span><b>INV-2041</b></div>
            <div className="flex justify-between"><span>Montant</span><b>USD 2 400</b></div>
            <div className="flex justify-between"><span>Converti</span><b>XAF 1 464 000</b></div>
          </div>
        </div>
        <span className="absolute top-10 -left-2 rotate-[-8deg] text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-gray-800 shadow-lg">↙ + USD 2 400</span>
        <span className="absolute top-14 -right-3 rotate-[6deg] text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-gray-800 shadow-lg flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Payée</span>
      </div>
    ),
  },
  {
    icon: Briefcase, kicker: 'Aussi pour', title: 'Cabinets comptables', bg: 'linear-gradient(150deg,#DBEAFE 0%,#93C5FD 100%)', dark: false,
    desc: 'Tous vos dossiers clients, leurs liasses et déclarations, avec des accès et rôles par collaborateur.',
    points: ['Un espace par client', 'Rôles & permissions fins', 'États OHADA prêts à déposer'],
    cta: { label: 'Créer mon cabinet', href: '/signup' },
    visual: (
      <div className="w-72 rounded-2xl bg-white/60 backdrop-blur p-3 space-y-2 shadow-2xl">
        <p className="text-xs font-semibold text-gray-800 px-1">Dossiers clôturés</p>
        <MiniRow cc="ci" a="Boutique Akwaba" b="Abidjan" /><MiniRow cc="cm" a="Bakery Bonapriso" b="Douala" />
        <MiniRow cc="sn" a="Studio Teranga" b="Dakar" /><MiniRow cc="ga" a="Gabon Logistic" b="Libreville" />
      </div>
    ),
  },
  {
    icon: ShoppingBag, kicker: 'Aussi pour', title: 'Restaurants & boutiques', bg: 'linear-gradient(150deg,#E11D48 0%,#4C0519 100%)', dark: true,
    desc: 'Connecté à Nutro (POS restaurant + KDS) et POS Flow : chaque vente devient une écriture, sans ressaisie.',
    points: ['Tickets → comptabilité en temps réel', 'Clôture de caisse automatique', 'Marges par produit'],
    cta: { label: 'Découvrir Nutro', href: 'https://nutro.liafrik.com', external: true }, partners: ['nutro', 'posflow'],
    visual: (
      <div className="w-72 space-y-2">
        <div className="rounded-2xl bg-white p-3 shadow-2xl">
          <div className="flex justify-between text-xs"><b className="text-gray-900">Table 12 · Cuisine</b><span className="text-emerald-600 font-semibold">Prête</span></div>
          <div className="mt-2 space-y-1 text-[11px] text-gray-600"><div>2× Poulet DG</div><div>1× Ndolé crevettes</div><div>3× Jus de bissap</div></div>
        </div>
        <MiniRow cc="cm" a="Ticket #4821" b="Caisse 1 · MoMo" c="XAF 18 500" />
        <MiniRow cc="cm" a="Clôture du jour" b="Écritures générées" c="XAF 642 000" />
      </div>
    ),
  },
  {
    icon: Users, kicker: 'Aussi pour', title: 'E-commerce & startups', bg: 'linear-gradient(150deg,#7C3AED 0%,#1E1B4B 100%)', dark: true,
    desc: 'Vendez avec Sellia ou sur Zanldo, encaissez partout, et laissez LiBooks consolider ventes, frais et TVA.',
    points: ['Commandes → factures automatiques', 'Multi-devises & Mobile Money', 'Tableau de bord investisseurs'],
    cta: { label: 'Découvrir Sellia', href: 'https://sellia.liafrik.com', external: true }, partners: ['sellia', 'zanldo', 'zanldo-express'],
    visual: (
      <div className="w-72 rounded-2xl bg-white p-4 shadow-2xl">
        <p className="text-xs font-semibold text-gray-800">Ventes en ligne — 7 jours</p>
        <div className="mt-3 flex items-end gap-1.5 h-24">
          {[35, 52, 44, 70, 62, 88, 96].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#7C3AED] to-[#A78BFA]" style={{ height: `${h}%` }} />)}
        </div>
        <div className="mt-3 flex justify-between text-xs"><span className="text-gray-500">Commandes</span><b className="text-gray-900">1 248</b></div>
        <div className="flex justify-between text-xs"><span className="text-gray-500">Chiffre d’affaires</span><b className="text-[#7C3AED]">USD 48 920</b></div>
      </div>
    ),
  },
];

function SegmentCard({ s }: { s: Segment }) {
  const ctaCls = `mt-5 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:gap-3 ${s.dark ? 'bg-white text-[#0F2A3D]' : 'bg-[#0F2A3D] text-white'}`;
  return (
    <div className="relative h-full rounded-[2rem] overflow-hidden p-7 sm:p-9 flex flex-col" style={{ background: s.bg }}>
      <span className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex-1 flex items-center justify-center py-4">{s.visual}</div>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${s.dark ? 'text-white/70' : 'text-[#0F2A3D]/70'}`}>{s.kicker}</p>
          {s.partners && (
            <span className="flex items-center gap-1.5">
              <span className={`text-[10px] ${s.dark ? 'text-white/60' : 'text-[#0F2A3D]/60'}`}>connecté à</span>
              {s.partners.map((id) => { const p = ECOSYSTEM_PRODUCTS.find((x) => x.id === id); return p ? <ProductMark key={id} p={p} size={28} className="!rounded-lg" /> : null; })}
            </span>
          )}
        </div>
        <h3 className={`mt-1 text-3xl sm:text-4xl font-semibold tracking-tight ${s.dark ? 'text-white' : 'text-[#0F2A3D]'}`}>{s.title}</h3>
        <p className={`mt-2 text-sm max-w-md ${s.dark ? 'text-white/75' : 'text-[#0F2A3D]/75'}`}>{s.desc}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {s.points.map((p) => <span key={p} className={`text-xs px-3 py-1 rounded-full ${s.dark ? 'bg-white/10 text-white' : 'bg-white/70 text-[#0F2A3D]'}`}>{p}</span>)}
        </div>
        {s.cta.external
          ? <a href={s.cta.href} target="_blank" rel="noopener noreferrer" className={ctaCls}>{s.cta.label} <ArrowUpRight className="w-4 h-4" /></a>
          : s.cta.href.startsWith('#')
            ? <a href={s.cta.href} className={ctaCls}>{s.cta.label} <ArrowUpRight className="w-4 h-4" /></a>
            : <Link to={s.cta.href} className={ctaCls}>{s.cta.label} <ArrowUpRight className="w-4 h-4" /></Link>}
      </div>
    </div>
  );
}

export function ForWhomSection() {
  const { ref, p } = useScrollProgress<HTMLElement>('pinned');
  const n = SEGMENTS.length;
  const pos = p * n; // 0 → n
  const active = Math.min(n - 1, Math.floor(pos));
  return (
    <>
      {/* Desktop : épinglé, les cartes se remplacent au scroll */}
      <section ref={ref} className="hidden lg:block relative bg-gray-50 dark:bg-surface-0" style={{ height: `${n * 85 + 40}vh` }}>
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-[0.9fr_1.1fr] gap-14 items-center">
            <div>
              <h2 className="text-8xl font-light tracking-tight text-[#0F2A3D] dark:text-white leading-none">Pour qui<span className="font-semibold text-[#0057D9]">.</span></h2>
              <p className="mt-5 text-lg text-gray-500 dark:text-gray-400 max-w-md">Des entreprises réelles qui vendent, encaissent et grandissent au-delà des frontières.</p>
              <ul className="mt-10 space-y-1">
                {SEGMENTS.map((s, i) => {
                  const fill = clamp(pos - i);
                  const on = i === active;
                  return (
                    <li key={s.title}>
                      <button
                        onClick={() => { const el = ref.current; if (!el) return; const top = el.getBoundingClientRect().top + window.scrollY; const h = el.offsetHeight - window.innerHeight; window.scrollTo({ top: top + h * ((i + 0.5) / n), behavior: 'smooth' }); }}
                        className="w-full text-left group">
                        <div className="flex items-center gap-4 py-3">
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${on ? 'bg-[#0057D9] text-white scale-110 shadow-lg shadow-[#0057D9]/30' : 'bg-white dark:bg-surface-2 text-gray-400'}`}><s.icon className="w-5 h-5" /></span>
                          <span className={`text-xl font-semibold transition-colors duration-500 ${on ? 'text-[#0F2A3D] dark:text-white' : 'text-gray-400'}`}>{s.title}</span>
                          <span className="ml-auto text-xs text-gray-400 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="h-0.5 rounded-full bg-gray-200 dark:bg-surface-3 overflow-hidden"><div className="h-full bg-[#0057D9] origin-left" style={{ transform: `scaleX(${fill})` }} /></div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="relative h-[620px] rounded-[2rem] overflow-hidden shadow-2xl shadow-[#0F2A3D]/20" style={{ perspective: 1400, clipPath: 'inset(0 round 2rem)' }}>
              {SEGMENTS.map((s, i) => {
                const d = pos - i; // <0 à venir, 0..1 actif, >1 passé
                let y = 0, scale = 1, opacity = 1, rot = 0;
                // carte suivante : monte du bas et recouvre la carte active
                if (d < 0) { const t = clamp(-d * 1.6); y = 105 * ease(t); rot = 8 * t; opacity = 1; }
                // carte passée : recule, rétrécit et s'efface sous la suivante
                else if (d > 1) { const t = clamp(d - 1); scale = 1 - 0.1 * t; y = -3 * t; opacity = 1 - clamp(t * 1.4); }
                else if (d > 0.6) { const t = (d - 0.6) / 0.4; scale = 1 - 0.04 * t; }
                return (
                  <div key={s.title} className="absolute inset-0 will-change-transform"
                    style={{ transform: `translate3d(0, ${y}%, 0) scale(${scale}) rotateX(${rot}deg)`, opacity: clamp(opacity), zIndex: i, pointerEvents: i === active ? 'auto' : 'none' }}>
                    <SegmentCard s={s} />
                  </div>
                );
              })}
              <div className="absolute top-5 right-5 z-20 flex gap-1.5 px-2.5 py-1.5 rounded-full bg-black/20 backdrop-blur">
                {SEGMENTS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile / tablette : carrousel horizontal à défilement libre */}
      <section className="lg:hidden py-20 bg-gray-50 dark:bg-surface-0">
        <div className="px-4">
          <h2 className="text-6xl font-light tracking-tight text-[#0F2A3D] dark:text-white leading-none">Pour qui<span className="font-semibold text-[#0057D9]">.</span></h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Glissez pour découvrir →</p>
        </div>
        <div className="mt-8 flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 [scrollbar-width:none]">
          {SEGMENTS.map((s) => <div key={s.title} className="snap-center shrink-0 w-[86vw] sm:w-[60vw] h-[600px]"><SegmentCard s={s} /></div>)}
        </div>
      </section>
    </>
  );
}

/* ================================================================== */
/* 2. COUVERTURE — cartes flottantes + explorateur de pays interactif  */
/* ================================================================== */
const REGION_OF: Record<string, string> = {};
const REGIONS: { id: string; label: string; codes: string[] }[] = [
  { id: 'west', label: 'Afrique de l’Ouest', codes: ['SN', 'CI', 'NG', 'GH', 'BJ', 'TG', 'BF', 'ML', 'NE', 'GN', 'SL', 'LR', 'GM', 'GW', 'CV'] },
  { id: 'central', label: 'Afrique centrale', codes: ['CM', 'GA', 'CG', 'CD', 'TD', 'CF', 'GQ', 'ST', 'AO', 'BI', 'RW'] },
  { id: 'east', label: 'Afrique de l’Est', codes: ['KE', 'TZ', 'UG', 'ET', 'DJ', 'ER', 'SO', 'SS', 'SD', 'KM', 'MG', 'SC', 'MU'] },
  { id: 'south', label: 'Afrique australe', codes: ['ZA', 'MZ', 'ZW', 'ZM', 'MW', 'BW', 'NA', 'SZ', 'LS', 'SH'] },
  { id: 'north', label: 'Afrique du Nord', codes: ['MA', 'TN', 'DZ', 'EG', 'LY', 'EH'] },
  { id: 'world', label: 'Europe, Amériques, Asie & Golfe', codes: [] },
];
REGIONS.forEach((r) => r.codes.forEach((c) => { REGION_OF[c] = r.id; }));

const FLOAT = [
  { cc: 'cm', name: 'Cameroun', tag: 'OHADA · MoMo', x: '4%', y: '12%', r: -8, d: 1.2 },
  { cc: 'ci', name: 'Côte d’Ivoire', tag: 'OHADA · Wave', x: '2%', y: '56%', r: 5, d: 0.8 },
  { cc: 'sn', name: 'Sénégal', tag: 'OHADA · Wave', x: '24%', y: '0%', r: -3, d: 1.5 },
  { cc: 'ng', name: 'Nigeria', tag: 'Cartes · Virement', x: '64%', y: '2%', r: 4, d: 1.1 },
  { cc: 'ke', name: 'Kenya', tag: 'M-Pesa', x: '82%', y: '16%', r: 7, d: 0.9 },
  { cc: 'ae', name: 'Émirats', tag: 'Multi-devises', x: '83%', y: '58%', r: -6, d: 1.3 },
  { cc: 'gh', name: 'Ghana', tag: 'MoMo', x: '18%', y: '80%', r: -4, d: 1.0 },
  { cc: 'fr', name: 'France', tag: 'TVA · SEPA', x: '66%', y: '82%', r: 3, d: 1.4 },
];

export function CoverageSection({ currencies }: { currencies: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: inRef, inView } = useInView<HTMLDivElement>(0.2);
  const [region, setRegion] = useState<string>('all');
  const [q, setQ] = useState('');
  const countries = COUNTRIES.filter((c) => c.code !== 'XX');
  const ohadaCount = countries.filter((c) => c.isOhada).length;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', String((e.clientX - r.left) / r.width - 0.5));
      el.style.setProperty('--py', String((e.clientY - r.top) / r.height - 0.5));
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);

  const list = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return countries.filter((c) => {
      const reg = REGION_OF[c.code] ?? 'world';
      if (region !== 'all' && reg !== region) return false;
      if (q && !norm(`${c.nameFr} ${c.name} ${c.currency}`).includes(norm(q))) return false;
      return true;
    });
  }, [countries, region, q]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden text-white" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #0b4fc4 0%, #0F2A3D 55%, #0a1620 100%)' }}>
      {/* grille + halo */}
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
      <div ref={inRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 lg:pt-0 lg:h-[760px] flex items-center justify-center">
        {FLOAT.map((c, i) => (
          <div key={c.cc} className="hidden lg:block absolute w-52 transition-all duration-1000"
            style={{ left: c.x, top: c.y, opacity: inView ? 1 : 0, transitionDelay: `${i * 90}ms`,
              transform: `translate3d(calc(var(--px,0) * ${c.d * 46}px), calc(var(--py,0) * ${c.d * 46}px), 0) rotate(${c.r}deg) scale(${inView ? 1 : 0.8})` }}>
            <div className="rounded-2xl bg-white text-[#0F2A3D] p-4 shadow-2xl shadow-black/30" style={{ animation: `lb-float ${5 + (i % 3)}s ease-in-out ${i * 0.4}s infinite` }}>
              <div className="flex items-center gap-2.5"><img src={flag(c.cc)} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5" loading="lazy" /><p className="font-semibold">{c.name}</p></div>
              <span className="mt-7 inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#0F2A3D] text-white">{c.tag}</span>
            </div>
          </div>
        ))}
        <div className="relative text-center z-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70 flex items-center justify-center gap-3"><span className="w-8 h-px bg-white/50" /> Couverture</p>
          <h2 className="mt-4 text-6xl sm:text-8xl lg:text-9xl font-semibold tracking-tight leading-[0.95]"><CountUp to={countries.length} /> pays.</h2>
          <p className="text-5xl sm:text-7xl lg:text-8xl font-light tracking-tight leading-none mt-1"><CountUp to={currencies} /> devises.</p>
          <p className="mt-6 text-white/75 max-w-md mx-auto">Régions, villes, TVA et plans comptables pré-configurés — dont <b className="text-white">{ohadaCount} pays OHADA</b> avec le SYSCOHADA révisé natif.</p>
        </div>
      </div>

      {/* Explorateur */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-24 pt-10 lg:pt-0">
        <Reveal>
          <div className="rounded-[2rem] bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/15 p-5 sm:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <p className="text-lg font-semibold">Votre pays est-il couvert ?</p>
                <p className="text-sm text-white/60">{list.length} résultat{list.length > 1 ? 's' : ''} · devise, TVA et OHADA pré-configurés</p>
              </div>
              <div className="relative md:w-80">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pays ou une devise…"
                  className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 ring-1 ring-white/20 placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/60" />
              </div>
            </div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {[{ id: 'all', label: 'Tous' }, ...REGIONS].map((r) => (
                <button key={r.id} onClick={() => setRegion(r.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${region === r.id ? 'bg-white text-[#0F2A3D] shadow-lg' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {list.map((c, i) => (
                <div key={c.code} className="group flex items-center gap-2.5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] ring-1 ring-white/10 px-3 py-2.5 transition-all hover:-translate-y-0.5"
                  style={{ animation: `lb-row-in .5s cubic-bezier(.2,.8,.2,1) ${Math.min(i, 20) * 18}ms both` }}>
                  <img src={flag(c.code, 40)} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nameFr}</p>
                    <p className="text-[11px] text-white/55">{c.currency} · TVA {c.vatRate}%</p>
                  </div>
                  {c.isOhada && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0057D9] text-white">OHADA</span>}
                </div>
              ))}
              {list.length === 0 && <p className="col-span-full text-center text-sm text-white/60 py-6">Aucun pays trouvé — LiBooks fonctionne aussi partout ailleurs via « Autre pays ».</p>}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-white/50">Votre pays manque ? Choisissez « Autre pays » à l’inscription : devise et TVA se configurent en 1 minute.</p>
              <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0F2A3D] font-semibold hover:gap-3 transition-all whitespace-nowrap">Démarrer dans mon pays <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/* 3. PILE DE CARTES 3D épinglée — texte géant qui défile derrière      */
/* ================================================================== */
const STACK = [
  {
    big: '6', title: 'Opérateurs Mobile Money', sub: 'Rapprochés automatiquement', theme: 'blue',
    items: [['Orange Money', 'ci'], ['MTN MoMo', 'cm'], ['Wave', 'sn'], ['M-Pesa', 'ke']],
  },
  {
    big: '70', title: 'Devises gérées', sub: 'Taux de change quotidiens', theme: 'light',
    items: [['XAF', 'cm'], ['XOF', 'sn'], ['NGN', 'ng'], ['USD', 'us']],
  },
  {
    big: '∞', title: 'Comptes bancaires', sub: 'Relevés & rapprochement', theme: 'dark',
    items: [['Banque locale', 'cm'], ['USD', 'us'], ['EUR', 'eu'], ['AED', 'ae']],
  },
] as const;

export function PinnedCardStack() {
  const { ref, p } = useScrollProgress<HTMLElement>('pinned');
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 1024);
    on(); window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const enter = ease(clamp(p / 0.3));           // la pile entre en 3D
  const spread = ease(clamp((p - 0.3) / 0.35)); // éventail
  const settle = clamp((p - 0.7) / 0.3);        // légende finale
  const textX = 25 - p * 150;
  const captions = ['Encaissez', 'Convertissez', 'Rapprochez'];
  const capIdx = Math.min(2, Math.floor(clamp((p - 0.3) / 0.6) * 3));

  return (
    <section ref={ref} className="relative bg-[#0a1620]" style={{ height: '300vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 50% 50%, rgba(0,87,217,.45) 0%, rgba(10,22,32,0) 70%)' }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Texte géant derrière */}
        <div className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap will-change-transform select-none" aria-hidden="true" style={{ transform: `translate3d(${textX}%, -50%, 0)` }}>
          <span className="lb-giant !text-white/90">Facturez. </span>
          <span className="lb-giant lb-outline-dark">Encaissez. </span>
          <span className="lb-giant !text-[#3B82F6]">Consolidez. </span>
          <span className="lb-giant lb-outline-dark">Grandissez.</span>
        </div>

        {/* Pile */}
        <div className="relative w-full max-w-6xl h-[460px] flex items-center justify-center" style={{ perspective: 1600 }}>
          {STACK.map((c, i) => {
            const k = i - 1; // -1, 0, 1
            const x = wide ? k * 360 * spread : 0;
            const y = (1 - enter) * 300 + (wide ? 0 : k * 120 * spread) + -k * 14 * (1 - spread);
            const rotZ = k * 8 * (1 - spread) * enter + k * 3 * spread;
            const rotX = 45 * (1 - enter);
            const rotY = wide ? -k * 14 * spread : 0;
            const scale = (wide ? 0.92 : 0.82) + 0.08 * enter;
            const light = c.theme === 'light';
            const bg = c.theme === 'blue' ? 'linear-gradient(145deg,#0a5cf0,#003f9e)' : light ? 'linear-gradient(145deg,#ffffff,#e8f0ff)' : 'linear-gradient(145deg,#132b40,#0a1620)';
            return (
              <div key={c.title} className="absolute w-[min(330px,82vw)] rounded-[1.75rem] p-6 will-change-transform ring-1 ring-white/15"
                style={{
                  background: bg, zIndex: 10 - Math.abs(k),
                  transform: `translate3d(${x}px, ${y}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
                  boxShadow: '0 40px 80px -20px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.25)',
                  opacity: clamp(enter * 1.4),
                }}>
                <div className="absolute inset-0 rounded-[1.75rem] pointer-events-none" style={{ background: `linear-gradient(115deg, transparent 30%, rgba(255,255,255,${light ? 0.5 : 0.18}) ${40 + p * 40}%, transparent ${60 + p * 40}%)` }} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <p className={`text-6xl font-bold tracking-tight ${light ? 'text-[#0F2A3D]' : 'text-white'}`}>{c.big}</p>
                    <img src={logo} alt="" className="w-8 h-8 opacity-90" />
                  </div>
                  <p className={`mt-2 text-lg font-semibold ${light ? 'text-[#0F2A3D]' : 'text-white'}`}>{c.title}</p>
                  <p className={`text-xs ${light ? 'text-gray-500' : 'text-white/60'}`}>{c.sub}</p>
                  <div className="mt-5 space-y-2">
                    {c.items.map(([n, cc], j) => (
                      <div key={n} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${j === 0 ? 'bg-[#22C55E] text-white' : light ? 'bg-[#0F2A3D]/5 text-[#0F2A3D]' : 'bg-white/10 text-white'}`}>
                        <span className="flex items-center gap-2"><img src={flag(cc, 40)} alt="" className="w-4 h-4 rounded-full object-cover" />{n}</span>
                        {j === 0 ? <Check className="w-3.5 h-3.5" /> : <span className="opacity-50">•••</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Légendes */}
        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 px-4 text-center">
          <div className="flex gap-2">
            {captions.map((c, i) => (
              <span key={c} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 ${i === capIdx && p > 0.3 ? 'bg-white text-[#0F2A3D]' : 'bg-white/10 text-white/60'}`}>{c}</span>
            ))}
          </div>
          <p className="text-white/70 text-sm max-w-lg transition-all duration-700" style={{ opacity: settle, transform: `translateY(${(1 - settle) * 12}px)` }}>
            Tout converge dans votre comptabilité LiBooks — sans ressaisie, en temps réel.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* 4. FINALE géante — lignes épinglées, remplissage progressif, vitesse */
/* ================================================================== */
const FINALE = [
  { words: ['LIBOOKS', 'DEV', 'BY', 'LIAFRIK', 'TECH'] },
  { words: ['LA', 'COMPTABILITÉ', 'AFRICAINE', 'DE', 'RÉFÉRENCE'] },
  { words: ['FACTURER', 'ENCAISSER', 'PILOTER', 'GRANDIR'] },
];

export function GiantFinale() {
  const { ref, p } = useScrollProgress<HTMLElement>('pinned');
  const skewRef = useRef(0);
  const [skew, setSkew] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let last = window.scrollY; let raf = 0;
    const loop = () => {
      const y = window.scrollY; const v = y - last; last = y;
      skewRef.current += (clamp(v * 0.25, -10, 10) - skewRef.current) * 0.12;
      setSkew(Math.abs(skewRef.current) < 0.05 ? 0 : skewRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const end = ease(clamp((p - 0.72) / 0.22));

  return (
    <section ref={ref} className="relative bg-white dark:bg-surface-0 border-t border-gray-100 dark:border-surface-3" style={{ height: '320vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(50% 40% at 50% 50%, rgba(0,87,217,.08), transparent 70%)' }} />
        <div className="space-y-1 sm:space-y-3" style={{ transform: `skewX(${-skew}deg)`, opacity: 1 - end * 0.85, filter: `blur(${end * 6}px)` }}>
          {FINALE.map((line, i) => {
            const dir = i % 2 === 0 ? -1 : 1;
            const x = -30 + dir * (p - 0.35) * 55;
            const fill = clamp((p - 0.05 - i * 0.12) / 0.38); // contour → plein
            return (
              <div key={i} className="relative w-max whitespace-nowrap will-change-transform" style={{ transform: `translate3d(${x}%,0,0)` }} aria-hidden="true">
                {[0, 1, 2].map((rep) => (
                  <span key={rep} className="inline-block pr-[0.35em]">
                    {line.words.map((w, j) => (
                      <span key={j} className="relative inline-block">
                        <span className="lb-giant lb-outline">{w}{'\u00A0'}</span>
                        <span className={`lb-giant absolute inset-0 ${j % 2 === 1 ? 'lb-giant-accent' : ''}`}
                          style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}>{w}{'\u00A0'}</span>
                      </span>
                    ))}
                    <span className="lb-giant lb-giant-accent inline-block align-middle" style={{ fontSize: 'clamp(1.5rem,5vw,5rem)' }}>✦</span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* Révélation finale */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: end }}>
          <div className="text-center px-4" style={{ transform: `scale(${0.9 + end * 0.1})`, pointerEvents: end > 0.6 ? 'auto' : 'none' }}>
            <div className="mx-auto w-24 h-24 rounded-3xl bg-white dark:bg-surface-1 shadow-2xl shadow-[#0057D9]/30 flex items-center justify-center ring-1 ring-gray-100 dark:ring-surface-3"><img src={logo} alt="" className="w-14 h-14" /></div>
            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-[#0057D9] font-semibold flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> LiBooks · dev by Liafrik Tech</p>
            <p className="mt-3 text-4xl sm:text-6xl font-semibold tracking-tight text-[#0F2A3D] dark:text-white">La référence, <span className="font-light">c’est maintenant.</span></p>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full text-white text-lg font-semibold shadow-xl shadow-[#0057D9]/40 hover:scale-105 transition-transform" style={{ background: '#0057D9' }}>
              Essai gratuit 30 jours <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-1 rounded-full bg-gray-200 dark:bg-surface-3 overflow-hidden">
          <div className="h-full bg-[#0057D9] origin-left" style={{ transform: `scaleX(${p})` }} />
        </div>
      </div>
    </section>
  );
}
