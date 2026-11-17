import { useCallback, useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, Lock, Database, CreditCard, KeyRound, FileSearch, Globe2, Download, Bug, ArrowLeft,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Activity, Server, Zap, Cloud,
} from 'lucide-react';
import logo from '../assets/logo.png';
import ThemeToggle from '../components/ui/ThemeToggle';
import { usePageMeta } from '../lib/usePageMeta';
import { Reveal } from '../components/ui/Motion';

function Shell({ children, isEn }: { children: ReactNode; isEn: boolean }) {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-0">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-1/80 backdrop-blur-md border-b border-gray-100 dark:border-surface-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={isEn ? '/en' : '/'} className="flex items-center gap-2">
            <img src={logo} alt="LiBooks" className="w-7 h-7" />
            <span className="text-lg text-gray-900 dark:text-white"><span className="font-bold">Li</span><span className="font-medium text-[#0057D9]">Books</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to={isEn ? '/en/securite' : '/securite'} className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 hover:text-[#0057D9]">{isEn ? 'Security' : 'Sécurité'}</Link>
            <Link to={isEn ? '/en/status' : '/status'} className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 hover:text-[#0057D9]">{isEn ? 'Status' : 'État des services'}</Link>
            <ThemeToggle variant="subtle" />
            <Link to={isEn ? '/en' : '/'} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"><ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">{isEn ? 'Home' : 'Accueil'}</span></Link>
          </div>
        </div>
      </nav>
      {children}
      <footer className="border-t border-gray-100 dark:border-surface-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} LiBooks — {isEn ? 'built by' : 'développé par'} <a className="text-[#0057D9]" href="https://liafrik.com" target="_blank" rel="noopener noreferrer">Liafrik Tech</a>
      </footer>
    </div>
  );
}

/* ============================== SÉCURITÉ ============================== */
export function SecurityPage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  usePageMeta(
    isEn ? 'Trust & Security' : 'Confiance & sécurité',
    isEn ? 'How LiBooks protects your accounting data: tenant isolation, encryption, payments, access control, audit trail.'
      : 'Comment LiBooks protège vos données comptables : isolation, chiffrement, paiements, contrôle des accès, journal d’audit.',
  );

  const pillars = isEn ? [
    { icon: Database, t: 'Strict data isolation', d: 'Every row carries its company ID and Postgres Row Level Security filters every query at the database level. A user can never read or write another company’s data — even by tampering with a request.' },
    { icon: Lock, t: 'Encryption everywhere', d: 'HTTPS/TLS on every connection with HSTS preload. Data is encrypted at rest (AES-256) by our database provider.' },
    { icon: Globe2, t: 'European hosting', d: 'The database is hosted in the European Union (Frankfurt). The application is served through Cloudflare’s global network for speed across Africa.' },
    { icon: CreditCard, t: 'No card data stored', d: 'Payments go through PCI DSS–certified payment providers on their own hosted pages. LiBooks never sees or stores a card number.' },
    { icon: KeyRound, t: 'Access control', d: 'Two-factor authentication, roles and permissions per user, and server-side protection of billing fields. Integration secrets live in a server-only vault.' },
    { icon: FileSearch, t: 'Full audit trail', d: 'Sensitive actions are logged with author, date and before/after values, viewable by administrators.' },
    { icon: Download, t: 'Your data, your choice', d: 'Export your data at any time. We never sell or share your data. Request deletion whenever you want.' },
    { icon: ShieldCheck, t: 'Hardened web app', d: 'Strict Content-Security-Policy, anti-clickjacking, no MIME sniffing, restrictive browser permissions, sanitised rich content.' },
  ] : [
    { icon: Database, t: 'Isolation stricte des données', d: 'Chaque ligne porte l’identifiant de son entreprise et la Row Level Security de Postgres filtre chaque requête au niveau de la base. Un utilisateur ne peut jamais lire ni modifier les données d’une autre entreprise — même en trafiquant une requête.' },
    { icon: Lock, t: 'Chiffrement de bout en bout', d: 'HTTPS/TLS sur toutes les connexions, avec HSTS preload. Les données sont chiffrées au repos (AES-256) par notre hébergeur de base de données.' },
    { icon: Globe2, t: 'Hébergement européen', d: 'La base de données est hébergée dans l’Union européenne (Francfort). L’application est servie par le réseau mondial Cloudflare pour la vitesse partout en Afrique.' },
    { icon: CreditCard, t: 'Aucune donnée de carte stockée', d: 'Les paiements passent par des prestataires certifiés PCI DSS, sur leurs propres pages sécurisées. LiBooks ne voit ni ne stocke jamais un numéro de carte.' },
    { icon: KeyRound, t: 'Contrôle des accès', d: 'Double authentification, rôles et permissions par utilisateur, protection côté serveur des champs de facturation. Les clés d’intégration vivent dans un coffre accessible uniquement par le serveur.' },
    { icon: FileSearch, t: 'Journal d’audit complet', d: 'Les actions sensibles sont journalisées avec l’auteur, la date et les valeurs avant/après, consultables par les administrateurs.' },
    { icon: Download, t: 'Vos données vous appartiennent', d: 'Exportez vos données à tout moment. Nous ne vendons ni ne partageons vos données. Demandez leur suppression quand vous le souhaitez.' },
    { icon: ShieldCheck, t: 'Application durcie', d: 'Content-Security-Policy stricte, anti-clickjacking, pas de « MIME sniffing », permissions navigateur restreintes, contenus riches assainis.' },
  ];

  return (
    <Shell isEn={isEn}>
      <header className="relative overflow-hidden text-white" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #0b4fc4 0%, #0F2A3D 60%, #0a1620 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <Reveal><div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center"><ShieldCheck className="w-8 h-8" /></div></Reveal>
          <Reveal delay={80}><h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight">{isEn ? 'Trust & security' : 'Confiance & sécurité'}</h1></Reveal>
          <Reveal delay={160}><p className="mt-4 text-lg text-white/75 max-w-2xl mx-auto">{isEn ? 'Your accounting is the heart of your business. Here is exactly how we protect it — no vague promises.' : 'Votre comptabilité est le cœur de votre entreprise. Voici précisément comment nous la protégeons — sans promesses floues.'}</p></Reveal>
          <Reveal delay={240}>
            <Link to={isEn ? '/en/status' : '/status'} className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/20 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {isEn ? 'Live system status' : 'État des services en direct'}
            </Link>
          </Reveal>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <Reveal key={p.t} delay={(i % 4) * 80}>
              <div className="lb-spotlight h-full rounded-2xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                <span className="w-11 h-11 rounded-xl bg-[#0057D9]/10 text-[#0057D9] flex items-center justify-center"><p.icon className="w-5 h-5" /></span>
                <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">{p.t}</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-6">
          <Reveal>
            <section className="h-full rounded-3xl p-8 bg-gray-50 dark:bg-surface-1 border border-gray-100 dark:border-surface-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{isEn ? 'Our commitments' : 'Nos engagements'}</h2>
              <ul className="mt-5 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                {(isEn ? [
                  'We only state what is actually in place — no certification is claimed until it has been obtained.',
                  'Personal data is processed according to GDPR principles: access, rectification, portability, erasure.',
                  'Any security incident affecting your data will be notified to you without undue delay.',
                  'An independent security audit and an ISO 27001 path are on our roadmap.',
                ] : [
                  'Nous n’affirmons que ce qui est réellement en place — aucune certification n’est revendiquée avant d’avoir été obtenue.',
                  'Les données personnelles sont traitées selon les principes du RGPD : accès, rectification, portabilité, effacement.',
                  'Tout incident de sécurité affectant vos données vous sera notifié dans les meilleurs délais.',
                  'Un audit de sécurité indépendant et une démarche ISO 27001 font partie de notre feuille de route.',
                ]).map((t) => <li key={t} className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-[#0057D9] flex-shrink-0" />{t}</li>)}
              </ul>
              <Link to={isEn ? '/en/privacy' : '/privacy'} className="mt-6 inline-block text-sm font-semibold text-[#0057D9] hover:underline">{isEn ? 'Read our privacy policy →' : 'Lire notre politique de confidentialité →'}</Link>
            </section>
          </Reveal>
          <Reveal delay={100}>
            <section className="h-full rounded-3xl p-8 text-white" style={{ background: 'linear-gradient(140deg,#0F2A3D,#0057D9 140%)' }}>
              <Bug className="w-8 h-8" />
              <h2 className="mt-4 text-xl font-semibold">{isEn ? 'Report a vulnerability' : 'Signaler une vulnérabilité'}</h2>
              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                {isEn
                  ? 'Found a security issue? Write to us with the steps to reproduce it. We acknowledge every report, keep you informed and never pursue good-faith research.'
                  : 'Vous avez trouvé une faille ? Écrivez-nous avec les étapes pour la reproduire. Nous accusons réception de chaque signalement, vous tenons informé et ne poursuivons jamais une recherche menée de bonne foi.'}
              </p>
              <a href="mailto:support@liafrik.com?subject=%5BS%C3%A9curit%C3%A9%5D%20Signalement" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0F2A3D] text-sm font-semibold">support@liafrik.com</a>
            </section>
          </Reveal>
        </div>
      </main>
    </Shell>
  );
}

/* ============================ ÉTAT DES SERVICES ============================ */
type State = 'checking' | 'up' | 'slow' | 'down';
interface Check { id: string; label: string; desc: string; icon: typeof Server; run: () => Promise<Response> }

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function StatusPage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  usePageMeta(isEn ? 'System status' : 'État des services', isEn ? 'Live status of LiBooks services.' : 'État en direct des services LiBooks.');

  const checks: Check[] = [
    { id: 'web', label: isEn ? 'Web application' : 'Application web', desc: 'Cloudflare', icon: Cloud, run: () => fetch('/manifest.json', { cache: 'no-store' }) },
    { id: 'auth', label: isEn ? 'Authentication' : 'Authentification', desc: isEn ? 'Sign-in, sessions' : 'Connexion, sessions', icon: KeyRound, run: () => fetch(`${URL_BASE}/auth/v1/health`, { headers: { apikey: KEY } }) },
    { id: 'db', label: isEn ? 'API & database' : 'API & base de données', desc: isEn ? 'Invoices, accounting, inventory' : 'Factures, comptabilité, stocks', icon: Database, run: () => fetch(`${URL_BASE}/rest/v1/rpc/get_public_integrations`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: '{}' }) },
    { id: 'fn', label: isEn ? 'Payments & webhooks' : 'Paiements & webhooks', desc: 'Edge Functions', icon: Zap, run: () => fetch(`${URL_BASE}/functions/v1/cinetpay-webhook`, { mode: 'no-cors' }) },
    { id: 'ai', label: isEn ? 'Libooks AI assistant' : 'Assistant IA Libooks', desc: 'Edge Functions', icon: Activity, run: () => fetch(`${URL_BASE}/functions/v1/libooks-ai`, { method: 'OPTIONS' }) },
  ];

  const [res, setRes] = useState<Record<string, { state: State; ms?: number }>>({});
  const [at, setAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const runAll = useCallback(async () => {
    setBusy(true);
    setRes(Object.fromEntries(checks.map((c) => [c.id, { state: 'checking' as State }])));
    await Promise.all(checks.map(async (c) => {
      const t0 = performance.now();
      let state: State = 'down';
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 10000);
        const r = await Promise.race([c.run(), new Promise<never>((_, rej) => ctrl.signal.addEventListener('abort', () => rej(new Error('timeout'))))]);
        clearTimeout(to);
        const ms = Math.round(performance.now() - t0);
        state = r.status < 500 ? (ms > 2500 ? 'slow' : 'up') : 'down';
        setRes((x) => ({ ...x, [c.id]: { state, ms } }));
      } catch {
        setRes((x) => ({ ...x, [c.id]: { state: 'down' } }));
      }
    }));
    setAt(new Date());
    setBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEn]);

  useEffect(() => { runAll(); const t = setInterval(runAll, 60000); return () => clearInterval(t); }, [runAll]);

  const states = Object.values(res).map((r) => r.state);
  const overall: State = states.includes('checking') || states.length === 0 ? 'checking' : states.includes('down') ? 'down' : states.includes('slow') ? 'slow' : 'up';
  const label = (s: State) => ({
    checking: isEn ? 'Checking…' : 'Vérification…',
    up: isEn ? 'Operational' : 'Opérationnel',
    slow: isEn ? 'Degraded performance' : 'Performances dégradées',
    down: isEn ? 'Unreachable from your network' : 'Injoignable depuis votre réseau',
  }[s]);
  const tone = (s: State) => s === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : s === 'slow' ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' : s === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-500/10' : 'text-gray-500 bg-gray-100 dark:bg-surface-2';
  const Icon = (s: State) => s === 'up' ? CheckCircle2 : s === 'slow' ? AlertTriangle : s === 'down' ? XCircle : RefreshCw;
  const OverallIcon = Icon(overall);

  return (
    <Shell isEn={isEn}>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">{isEn ? 'System status' : 'État des services'}</h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400">{isEn ? 'Real checks run from your browser, every minute.' : 'Vérifications réelles lancées depuis votre navigateur, chaque minute.'}</p>

        <div className={`mt-8 rounded-3xl p-6 flex items-center gap-4 ${overall === 'up' ? 'bg-emerald-500 text-white' : overall === 'slow' ? 'bg-amber-400 text-gray-900' : overall === 'down' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-surface-2 text-gray-600'}`}>
          <OverallIcon className={`w-8 h-8 ${overall === 'checking' ? 'animate-spin' : ''}`} />
          <div className="flex-1">
            <p className="text-lg font-semibold">{overall === 'up' ? (isEn ? 'All systems operational' : 'Tous les services sont opérationnels') : label(overall)}</p>
            {at && <p className="text-sm opacity-80">{isEn ? 'Last check' : 'Dernière vérification'} : {at.toLocaleTimeString(isEn ? 'en-GB' : 'fr-FR')}</p>}
          </div>
          <button onClick={runAll} disabled={busy} className="p-2 rounded-xl bg-black/10 hover:bg-black/20 disabled:opacity-50" aria-label="Actualiser"><RefreshCw className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`} /></button>
        </div>

        <ul className="mt-6 divide-y divide-gray-100 dark:divide-surface-3 rounded-3xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 overflow-hidden">
          {checks.map((c) => {
            const r = res[c.id] ?? { state: 'checking' as State };
            const I = Icon(r.state);
            return (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                <span className="w-10 h-10 rounded-xl bg-[#0057D9]/10 text-[#0057D9] flex items-center justify-center"><c.icon className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{c.label}</p>
                  <p className="text-xs text-gray-400">{c.desc}{r.ms ? ` · ${r.ms} ms` : ''}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${tone(r.state)}`}>
                  <I className={`w-3.5 h-3.5 ${r.state === 'checking' ? 'animate-spin' : ''}`} /> {label(r.state)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-xs text-gray-400">{isEn ? 'If a service shows as unreachable, it may also come from your own connection or a firewall. Contact' : 'Un service affiché injoignable peut aussi venir de votre connexion ou d’un pare-feu. Contact :'} <a className="text-[#0057D9]" href="mailto:support@liafrik.com">support@liafrik.com</a></p>
      </main>
    </Shell>
  );
}
