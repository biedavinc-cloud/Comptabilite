import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChatWidget from '../components/ui/ChatWidget';
import MarketingBanner from '../components/ui/MarketingBanner';
import MarketingPopup from '../components/ui/MarketingPopup';
import FlagScrollBanner from '../components/ui/FlagScrollBanner';
import PartnerLogoBanner from '../components/ui/PartnerLogoBanner';
import logo from '../assets/logo.png';
import {
  BarChart3, FileText, Receipt, Building2,
  Smartphone, Wifi, Globe, Shield, Zap, CheckCircle, ChevronDown,
  ArrowRight, Star, Quote, Menu, X, Sparkles,
  Package, Bell, Bot, ScanLine, Languages,
  Mail, MapPin,
  Sun, Moon,
  Facebook, Instagram, Linkedin, Youtube, LayoutDashboard, Rocket, BookOpen
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { PLAN_LIMITS, MODULES, ModuleKey, COUNTRIES } from '../lib/countryData';
import {
  Reveal, SplitText, CountUp, Magnetic, ScrollProgress, useSpotlight, useParallax, GiantScrollText,
} from '../components/ui/Motion';

const NAVY = '#0F2A3D';
const GREEN = '#0057D9';

// lucide-react n'a pas d'icône TikTok officielle : SVG dédié, même style que les autres (stroke).
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { name: 'TikTok', href: 'https://www.tiktok.com/@liyahgroup?_r=1&_t=ZS-9981XGgaxrE', Icon: TikTokIcon },
  { name: 'Facebook', href: 'https://www.facebook.com/share/1LMAGqsy3n/?mibextid=wwXIfr', Icon: Facebook },
  { name: 'Instagram', href: 'https://www.instagram.com/liafrik_tech?igsi=eXBjdTc5NG42Zml4&utm_source=qr', Icon: Instagram },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/liafrik/', Icon: Linkedin },
  { name: 'YouTube', href: 'https://youtube.com/@liyah-n?si=D-lXwovYubw3sdaf', Icon: Youtube },
];

const FEATURE_CARDS = [
  { icon: BarChart3, title: 'Tableau de bord', desc: 'KPIs en temps réel : CA, achats, créances, dettes. Graphiques mensuels.', color: 'bg-blue-500' },
  { icon: FileText, title: 'Facturation', desc: 'Factures ventes & achats avec numérotation séquentielle, TVA auto, PDF A4 & thermique 58/80mm.', color: 'bg-green-500' },
  { icon: Package, title: 'Stocks & Magasins', desc: 'Multi-magasins, mouvements, alertes rupture, valorisation au coût moyen pondéré.', color: 'bg-orange-500' },
  { icon: Building2, title: 'Comptabilité OHADA', desc: 'Plan SYSCOHADA pré-configuré, écritures double-partie, bilan, compte de résultat.', color: 'bg-purple-500' },
  { icon: Receipt, title: 'Transactions', desc: 'Journal des écritures avec équilibre débit/crédit, rapprochement bancaire.', color: 'bg-teal-500' },
  { icon: BarChart3, title: 'Rapports', desc: 'Compte de résultat, bilan, balance des comptes, déclaration TVA.', color: 'bg-indigo-500' },
  { icon: Smartphone, title: 'Banque & Mobile Money', desc: 'Intégration Orange Money, MTN MoMo, Wave, Moov Money. Relevé automatique.', color: 'bg-pink-500', premium: true },
  { icon: Bell, title: 'WhatsApp', desc: 'Envoi de vos factures par WhatsApp en un clic, directement à vos clients.', color: 'bg-green-600', premium: true },
  { icon: Bot, title: 'IA Trésorerie & FX', desc: 'Prévisions de trésorerie par IA, alertes intelligentes, gestion du risque de change.', color: 'bg-violet-500', premium: true },
  { icon: ScanLine, title: 'OCR & Paie', desc: 'Numérisation factures par OCR, génération bulletins de paie, déclarations sociales.', color: 'bg-amber-500', premium: true },
];

// Fonctionnalités affichées = exactement ce que PLAN_LIMITS (lib/countryData.ts)
// et les policies RLS débloquent pour chaque forfait — aucune promesse que le
// produit ne tient pas. « Personnalisation du tableau de bord » est verrouillée
// en base (migration 042) pour Premium & Entreprise.
const PLANS = [
  { id: 'starter', name: 'Starter', price: 14, tagline: 'Pour lancer et structurer son activité', features: ['Facturation illimitée & avoirs', 'Factures personnalisées (logo, cachet, couleurs)', 'Stocks multi-magasins', 'Clients, fournisseurs, grand livre', 'Rapports & TVA', '2 utilisateurs', 'Assistant IA Libooks'], color: 'border-gray-200 dark:border-surface-3' },
  { id: 'pro', name: 'Pro', price: 29, tagline: 'Pour encaisser partout, plus vite', features: ['Tout Starter', 'Banque & Mobile Money', 'Rapprochement bancaire', 'Envoi WhatsApp des factures', '5 utilisateurs'], color: 'border-[#0057D9]', popular: true },
  { id: 'premium', name: 'Premium', price: 79, tagline: 'Pour piloter avec l’IA et l’OHADA complet', features: ['Tout Pro', 'Tableau de bord personnalisable', 'IA Trésorerie & FX', 'OHADA complet (bilan, résultat)', 'Immobilisations & amortissements', 'Factures récurrentes', 'Utilisateurs illimités'], color: 'border-blue-300 dark:border-blue-500/50' },
  { id: 'enterprise', name: 'Entreprise', price: 199, tagline: 'Pour les groupes et multi-sociétés', features: ['Tout Premium', 'Tableau de bord personnalisable', 'Multi-société', 'API & intégrations', 'Support dédié 24/7', 'SLA 99,9 %'], color: 'border-purple-300 dark:border-purple-500/50' },
];

// Libellés FR pour la matrice de comparaison. La liste des modules réellement
// affichés est calculée plus bas à partir de PLAN_LIMITS (lib/countryData.ts)
// — la même source que PremiumGate et les policies RLS (migration 023) — donc
// impossible que cette matrice affiche une promesse que le produit ne tient
// pas réellement.
const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Tableau de bord', companies: 'Multi-société', chart_of_accounts: 'Plan comptable',
  inventory: 'Stocks', warehouses: 'Multi-magasins', sales_invoices: 'Factures de vente',
  purchase_invoices: 'Factures d\'achat', transactions: 'Transactions', ledger: 'Grand livre',
  reports: 'Rapports', banking: 'Banque & Mobile Money', whatsapp: 'WhatsApp',
  ai_cashflow: 'IA Trésorerie & FX', ohada: 'OHADA complet (bilan, résultat)', billing: 'Facturation abonnement',
  settings: 'Paramètres', users: 'Gestion utilisateurs', roles: 'Rôles & permissions',
  customers: 'Clients', suppliers: 'Fournisseurs', credit_notes: 'Avoirs',
  bank_reconciliation: 'Rapprochement bancaire', fixed_assets: 'Immobilisations & amortissements',
  api_access: 'Accès API', recurring_invoices: 'Factures récurrentes',
};

const PLAN_ORDER = ['starter', 'pro', 'premium', 'enterprise'] as const;
const MAX_USERS: Record<typeof PLAN_ORDER[number], string> = {
  starter: '2', pro: '5', premium: 'Illimité', enterprise: 'Illimité',
};

// Un module n'est intéressant à afficher dans la matrice que s'il distingue
// au moins deux forfaits — sinon (ex: "Factures de vente", inclus partout)
// ça n'aide pas à choisir.
const DIFFERENTIATING_MODULES = MODULES.filter((m) => {
  const included = PLAN_ORDER.map((p) => PLAN_LIMITS[p].includes(m));
  return new Set(included).size > 1;
});

const TESTIMONIALS = [
  { name: 'Aïssatou Diallo', role: 'Comptable, Dakar', text: 'LiBooks a transformé notre gestion. En 3 mois, nous avons divisé par 4 le temps de clôture mensuelle.', avatar: 'AD', color: 'bg-orange-500' },
  { name: 'Karim El Fassi', role: 'CFO, Dubaï', text: 'On gère nos filiales sur plusieurs continents depuis un seul compte, avec une conformité locale qui suit à chaque fois.', avatar: 'KF', color: 'bg-teal-500' },
  { name: 'Fatou Ndiaye', role: 'Gérante, Abidjan', text: 'Le mode offline est un game-changer. Je facture même sans connexion, ça se synchronise tout seul.', avatar: 'FN', color: 'bg-blue-500' },
  { name: 'Claire Dubosc', role: 'Directrice financière, Paris', text: 'Rare de trouver un outil aussi complet sur la conformité OHADA et aussi simple pour le reste de notre groupe.', avatar: 'CD', color: 'bg-purple-500' },
];

const FAQS = [
  { q: 'LiBooks fonctionne-t-il hors connexion ?', a: 'Oui. L\'application est une PWA (Progressive Web App) avec mode offline-first. Vous pouvez créer factures, mouvements de stock et transactions sans connexion. Les données se synchronisent automatiquement dès le retour du réseau, avec déduplication par clés d\'idempotence.' },
  { q: 'Le plan comptable SYSCOHADA est-il inclus ?', a: 'Oui. Pour tous les pays OHADA (Cameroun, Sénégal, Côte d\'Ivoire, etc.), le plan SYSCOHADA révisé est pré-configuré automatiquement à la création du compte, avec plus de 40 comptes des classes 1 à 7.' },
  { q: 'Puis-je utiliser mon Mobile Money pour encaisser ?', a: 'Le module Banque & Mobile Money (forfait Pro et supérieur) intègre Orange Money, MTN MoMo, Wave et Moov Money. Les encaissements apparaissent automatiquement dans vos transactions.' },
  { q: 'Comment fonctionne la facturation ?', a: 'Vous bénéficiez d\'un essai gratuit de 30 jours sans carte bancaire, avec accès complet. Ensuite, vous choisissez un forfait (Starter, Pro, Premium, Entreprise), en mensuel ou annuel (-20%). Paiement par carte (Stripe, Paddle, PayUnit, Paystack) ou Mobile Money (CinetPay, Korapay, Flutterwave). Vous pouvez changer de forfait à tout moment.' },
  { q: 'Puis-je personnaliser mes factures et mon tableau de bord ?', a: 'Oui. Sur tous les forfaits, vos factures portent votre logo, votre cachet, vos couleurs, vos mentions légales et vos conditions de paiement. Sur Premium et Entreprise, chaque utilisateur peut en plus personnaliser son tableau de bord : choix et ordre des widgets, couleur d\'accent et densité.' },
  { q: 'Qu\'est-ce que l\'assistant IA Libooks ?', a: 'Libooks est l\'assistant IA intégré à la plateforme : il répond en quelques secondes à vos questions de comptabilité (SYSCOHADA, TVA, écritures), vous guide dans l\'application et passe la main à un conseiller humain quand vous le demandez.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Absolument. Chaque entreprise a ses données isolées par Row Level Security (RLS) PostgreSQL. Les super admins ont 2FA obligatoire. Toutes les actions sensibles sont journalisées dans un audit log. Vous pouvez exporter ou supprimer vos données à tout moment.' },
  { q: 'Puis-je gérer plusieurs sociétés ?', a: 'Le forfait Entreprise permet de gérer plusieurs sociétés depuis un seul compte, avec consolidation et tableau de bord multi-tenant.' },
];

const ALL_LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇦🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

function LanguageDropdown({
  dark, onPick,
}: {
  dark?: boolean;
  onPick: (lang: typeof ALL_LANGUAGES[number]['code']) => void;
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = ALL_LANGUAGES.find(l => l.code === i18n.language) ?? ALL_LANGUAGES[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
          dark
            ? 'border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
            : 'border-gray-200 dark:border-surface-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-2'
        }`}
      >
        <span>{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 py-1.5 z-50 max-h-72 overflow-y-auto">
            {ALL_LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { onPick(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  l.code === current.code
                    ? 'text-[#0057D9] font-semibold bg-blue-50 dark:bg-[#0057D9]/10'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-2'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const navigate = useNavigate();
  // Keeps the URL and the rendered language in lockstep: /en must always
  // render English and / must always render French, so switching the
  // language here navigates instead of just calling i18n.changeLanguage
  // in place — otherwise a reload (or a search engine crawl) would
  // silently revert to whatever the URL says, ignoring the choice.
  // fr and en have dedicated routed URLs (/ and /en) for SEO — switching
  // to either navigates, keeping URL and language in lockstep (see
  // WithLang in App.tsx). The other 6 languages don't have their own
  // indexable URL yet (translating the whole public site 6 more times is
  // a separate project) — for those, this just switches i18n.language in
  // place, same mechanism as the Settings picker in-app.
  function switchLang(lang: 'fr' | 'en' | 'ar' | 'pt' | 'es' | 'sw' | 'zh' | 'de') {
    if (lang === 'en') { navigate('/en'); return; }
    if (lang === 'fr') { navigate('/'); return; }
    i18n.changeLanguage(lang);
  }

  // Landing page is the only public page genuinely available in both
  // languages (see the comment on the /en route in App.tsx) — so it's
  // also the only one where hreflang alternates are actually correct to
  // publish. canonical must match whichever URL is currently active
  // (usePageMeta's default, set once in index.html for "/", isn't
  // enough here since this one page has two valid canonical URLs
  // depending on language, not one fixed URL for the whole app).
  useEffect(() => {
    const SITE_URL = 'https://libooks.liafrik.com';
    const isEnglish = i18n.language === 'en';
    const canonicalUrl = `${SITE_URL}${isEnglish ? '/en' : '/'}`;

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonicalLink?.getAttribute('href') ?? `${SITE_URL}/`;
    if (canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    const previousOgUrl = ogUrl?.getAttribute('content') ?? `${SITE_URL}/`;
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    const previousLangAttr = document.documentElement.getAttribute('lang') ?? 'fr';
    document.documentElement.setAttribute('lang', isEnglish ? 'en' : 'fr');

    const added: HTMLLinkElement[] = [];
    const alternates: { hreflang: string; href: string }[] = [
      { hreflang: 'fr', href: `${SITE_URL}/` },
      { hreflang: 'en', href: `${SITE_URL}/en` },
      { hreflang: 'x-default', href: `${SITE_URL}/` },
    ];
    for (const { hreflang, href } of alternates) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', href);
      document.head.appendChild(link);
      added.push(link);
    }

    return () => {
      if (canonicalLink) canonicalLink.setAttribute('href', previousCanonical);
      if (ogUrl) ogUrl.setAttribute('content', previousOgUrl);
      document.documentElement.setAttribute('lang', previousLangAttr);
      added.forEach((link) => link.remove());
    };
  }, [i18n.language]);
  const { theme, toggleTheme } = useTheme();
  useSpotlight();
  const heroVisualRef = useParallax<HTMLDivElement>(0.08);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-surface-0 transition-colors overflow-x-clip">
      <ScrollProgress />
      {/* ===== NAVBAR ===== */}
      <MarketingBanner />
      <nav className={`sticky top-0 z-50 transition-all duration-300 bg-white/90 dark:bg-surface-1/90 backdrop-blur-sm py-3 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="LiBooks" className="w-8 h-8 flex-shrink-0" />
            <span className="text-lg tracking-tight text-[#0F2A3D] dark:text-white">
              <span className="font-bold">Li</span><span className="font-medium text-[#0057D9]">Books</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#modules" className="text-sm font-medium transition-colors hover:text-[#0057D9] text-gray-700 dark:text-gray-300">{t('landing.navModules')}</a>
            <a href="#pricing" className="text-sm font-medium transition-colors hover:text-[#0057D9] text-gray-700 dark:text-gray-300">{t('landing.navPricing')}</a>
            <a href="#testimonials" className="text-sm font-medium transition-colors hover:text-[#0057D9] text-gray-700 dark:text-gray-300">{t('landing.navTestimonials')}</a>
            <a href="#faq" className="text-sm font-medium transition-colors hover:text-[#0057D9] text-gray-700 dark:text-gray-300">{t('landing.navFaq')}</a>
            <Link to={isEn ? '/en/blog' : '/blog'} className="text-sm font-medium transition-colors hover:text-[#0057D9] text-gray-700 dark:text-gray-300">Blog</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-2"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {/* Language selector */}
            <LanguageDropdown onPick={switchLang} />
            <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-2">
              {t('landing.navLogin')}
            </Link>
            <Magnetic strength={0.2}>
              <Link to="/signup" className="inline-block text-sm font-semibold px-5 py-2.5 rounded-xl text-white shadow-lg shadow-[#0057D9]/30 hover:shadow-xl transition-all hover:scale-105" style={{ background: GREEN }}>
                {t('landing.navSignup')}
              </Link>
            </Magnetic>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className={`md:hidden p-2 text-gray-900 dark:text-white`}>
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white dark:bg-surface-1 border-t border-gray-100 dark:border-surface-3 px-4 py-4 space-y-3">
            <a href="#modules" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-700 dark:text-gray-200 py-2">{t('landing.navModules')}</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-700 dark:text-gray-200 py-2">{t('landing.navPricing')}</a>
            <a href="#testimonials" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-700 dark:text-gray-200 py-2">{t('landing.navTestimonials')}</a>
            <a href="#faq" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-700 dark:text-gray-200 py-2">{t('landing.navFaq')}</a>
            <Link to={isEn ? '/en/blog' : '/blog'} className="block text-sm font-medium text-gray-700 dark:text-gray-200 py-2">Blog</Link>
            <div className="flex items-center gap-2 py-2">
              <button onClick={toggleTheme} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </button>
              <LanguageDropdown onPick={(lang) => { switchLang(lang); setMobileMenu(false); }} />
            </div>
            <Link to="/login" className="block text-sm font-medium text-gray-700 dark:text-gray-200 py-2">{t('landing.navLogin')}</Link>
            <Link to="/signup" className="block text-center text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: GREEN }}>{t('landing.navSignup')}</Link>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[auto] pt-8 pb-16 md:min-h-screen md:py-0 flex items-center overflow-hidden bg-white dark:bg-surface-0">
        {/* Soft gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-surface-1 dark:via-surface-0 dark:to-surface-0" />
        <div className="absolute inset-0 lb-aurora pointer-events-none" />
        {/* Decorative blobs — soft pastel on light, brand-colored glow on dark */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30 dark:opacity-20 blur-3xl animate-pulse" style={{ background: '#BFDBFE' }} />
          <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full opacity-20 dark:opacity-10 blur-3xl animate-pulse" style={{ background: GREEN, animationDelay: '1s' }} />
          <div className="absolute -bottom-40 right-1/3 w-96 h-96 rounded-full opacity-20 dark:opacity-10 blur-3xl animate-pulse" style={{ background: '#93C5FD', animationDelay: '2s' }} />
        </div>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${NAVY} 1px, transparent 1px), linear-gradient(90deg, ${NAVY} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-0 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal variant="down" duration={700}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-white/10 backdrop-blur-sm border border-blue-100 dark:border-white/10 mb-6">
              <Sparkles className="w-4 h-4" style={{ color: GREEN }} />
              <span className="text-sm font-medium" style={{ color: GREEN }}>{t('landing.heroBadge')}</span>
            </div>
            </Reveal>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-6">
              <SplitText text={t('landing.heroTitle')} /><br />
              <SplitText text={t('landing.heroTitleAccent')} wordClassName="lb-gradient-text" delay={250} />
            </h1>

            <Reveal delay={450}>
            <p className="text-lg text-gray-600 dark:text-white/70 mb-8 max-w-lg leading-relaxed">
              {t('landing.heroSub')}
            </p>
            </Reveal>

            <Reveal delay={600}>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Magnetic strength={0.18} className="w-full sm:w-auto">
              <Link to="/signup" className="group w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white text-base font-semibold shadow-xl shadow-[#0057D9]/30 hover:shadow-2xl transition-all hover:scale-105" style={{ background: GREEN }}>
                {t('landing.heroCta')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              </Magnetic>
              <a href="#modules" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-base font-semibold hover:bg-gray-50 dark:hover:bg-white/15 transition-all shadow-sm">
                {t('landing.heroDiscover')}
              </a>
            </div>
            </Reveal>

            <Reveal delay={750}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-white/60">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: GREEN }} /> {t('landing.heroFree')}</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: GREEN }} /> {t('landing.heroNoCc')}</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: GREEN }} /> FR / EN</div>
            </div>
            </Reveal>
          </div>

          {/* Hero visual: Dashboard mockup */}
          <div ref={heroVisualRef} className="relative hidden lg:block will-change-transform">
            <Reveal variant="right" delay={300} duration={1100}>
            <div className="relative rounded-2xl bg-white dark:bg-surface-1 shadow-2xl ring-1 ring-gray-100 dark:ring-0 overflow-hidden rotate-1 hover:rotate-0 transition-transform duration-500">
              {/* Mock browser bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 dark:bg-surface-2 border-b border-gray-100 dark:border-surface-3">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-3 text-xs text-gray-400 dark:text-gray-500 font-mono">libooks.liafrik.com/dashboard</div>
              </div>
              {/* Mock content */}
              <div className="p-5 bg-gray-50 dark:bg-surface-0">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[['Chiffre d\'affaires', '$124,500', GREEN], ['Achats', '$51,200', '#F97316'], ['Créances', '$23,400', '#3B82F6'], ['Dettes', '$18,300', '#EF4444']].map(([label, val, c]) => (
                    <div key={label as string} className="bg-white dark:bg-surface-1 rounded-xl p-4 border border-gray-100 dark:border-surface-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                      <p className="text-lg font-medium" style={{ color: c as string }}>{val}</p>
                    </div>
                  ))}
                </div>
                {/* Mock chart */}
                <div className="bg-white dark:bg-surface-1 rounded-xl p-4 border border-gray-100 dark:border-surface-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Évolution mensuelle</p>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 55, 45, 70, 60, 85, 75, 95].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t hover:opacity-80 lb-bar" style={{ height: `${h}%`, background: i % 2 === 0 ? GREEN : '#3B82F6', animationDelay: `${600 + i * 90}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </Reveal>
            {/* Floating badges */}
            <div className="absolute -top-6 -right-4 bg-white dark:bg-surface-1 rounded-2xl shadow-xl ring-1 ring-gray-100 dark:ring-0 px-4 py-3 flex items-center gap-3 lb-float-slow">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500"><Bot className="w-5 h-5 text-white" /></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Assistant IA Libooks</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Réponse en 2 secondes</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white dark:bg-surface-1 rounded-2xl shadow-xl ring-1 ring-gray-100 dark:ring-0 p-4 flex items-center gap-3 lb-float">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN }}>
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Mode offline</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Synchronisé automatiquement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-300 dark:text-white/40" />
        </div>
      </section>

      <PartnerLogoBanner />

      {/* ===== STATS BAR ===== */}
      <section className="py-14 bg-white dark:bg-surface-0 border-b border-gray-100 dark:border-surface-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { to: COUNTRIES.length, suffix: '', decimals: 0, label: t('landing.statCountries') },
            { to: MODULES.length, suffix: '', decimals: 0, label: t('landing.statModules') },
            { to: 99.9, suffix: '%', decimals: 1, label: t('landing.statSla') },
            { to: 30, suffix: isEn ? ' days' : ' j', decimals: 0, label: t('landing.statTrial') },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 120}>
              <div className="text-center group">
                <p className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#0F2A3D] dark:text-white tabular-nums">
                  <CountUp to={s.to} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
                <span className="block mx-auto mt-3 h-0.5 w-8 rounded-full bg-[#0057D9]/30 group-hover:w-16 group-hover:bg-[#0057D9] transition-all duration-500" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== BANDE DÉFILANTE ===== */}
      <section aria-hidden="true" className="relative py-5 bg-[#0F2A3D] overflow-hidden">
        <div className="flex w-max lb-marquee gap-10">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex gap-10 items-center">
              {['SYSCOHADA révisé', 'Mobile Money', 'Facturation illimitée', 'IA Libooks', 'Offline-first', 'Multi-devises', 'CinetPay', 'Korapay', 'WhatsApp', 'API ouverte', 'Paie & OCR', 'Multi-société'].map((w) => (
                <span key={w} className="flex items-center gap-10 text-white/80 text-lg font-medium whitespace-nowrap">
                  {w}<Sparkles className="w-4 h-4 text-[#3B82F6]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== PENSÉ POUR L'AFRIQUE ===== */}
      <section className="py-20 bg-gray-50 dark:bg-surface-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: `${GREEN}15`, color: GREEN }}>
                {t('landing.sectionAfrica')}
              </span>
              <h2 className="text-3xl lg:text-4xl font-medium mb-4 text-gray-900 dark:text-white">
                <SplitText text={t('landing.sectionAfricaTitle')} />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                {t('landing.sectionAfricaSub')}
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {(isEn ? [
              { icon: Globe, title: `${COUNTRIES.length} countries supported`, desc: 'Cameroon, Senegal, Ivory Coast, Nigeria, Kenya, Ghana, France, UAE, and more. Regions, cities, currencies, VAT rates — all pre-configured.' },
              { icon: Wifi, title: 'Offline-first', desc: 'Unstable connection? No problem. Create invoices and transactions offline. Syncing happens automatically once the network is back.' },
              { icon: Smartphone, title: 'Native Mobile Money', desc: 'Orange Money, MTN MoMo, Wave, Moov Money. Collect, track, reconcile — without leaving the app.' },
              { icon: Shield, title: 'Native OHADA', desc: 'Revised SYSCOHADA chart pre-configured. Balance sheet, income statement, filings — OHADA-compliant.' },
              { icon: Languages, title: 'Bilingual FR / EN', desc: 'The full interface, in French and English. Switch in one click, for your whole team.' },
              { icon: Zap, title: 'Fast & lightweight', desc: 'Installable PWA, under 3MB. Works on phone, tablet, desktop. Even on a Samsung A10.' },
            ] : [
              { icon: Globe, title: `${COUNTRIES.length} pays supportés`, desc: 'Cameroun, Sénégal, Côte d\'Ivoire, Nigeria, Kenya, Ghana, France, Émirats Arabes Unis, et plus. Régions, villes, devises, taux de TVA — tout est pré-configuré.' },
              { icon: Wifi, title: 'Offline-first', desc: 'Connexion instable ? Aucun problème. Créez factures et mouvements hors ligne. La synchronisation est automatique au retour du réseau.' },
              { icon: Smartphone, title: 'Mobile Money natif', desc: 'Orange Money, MTN MoMo, Wave, Moov Money. Encaissez, suivez, rapprochez — sans quitter l\'application.' },
              { icon: Shield, title: 'OHADA natif', desc: 'Plan SYSCOHADA révisé pré-configuré. Bilan, compte de résultat, déclarations — conformes aux normes OHADA.' },
              { icon: Languages, title: 'Bilingue FR / EN', desc: 'Toute l\'interface, en français et en anglais. Basculez en un clic, pour toute l\'équipe.' },
              { icon: Zap, title: 'Rapide & léger', desc: 'PWA installable, moins de 3MB. Fonctionne sur smartphone, tablette, ordinateur. Même sur un Samsung A10.' },
            ]).map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="lb-spotlight bg-white dark:bg-surface-1 rounded-2xl p-6 border border-gray-100 dark:border-surface-3 hover:shadow-xl hover:border-[#0057D9]/30 transition-all duration-500 hover:-translate-y-1.5 group h-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" style={{ background: `${GREEN}15` }}>
                    <f.icon className="w-6 h-6" style={{ color: GREEN }} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MODULES ===== */}
      <section id="modules" className="py-20 bg-white dark:bg-surface-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: `${GREEN}12`, color: GREEN }}>
                Modules
              </span>
              <h2 className="text-3xl lg:text-4xl font-medium mb-4 text-gray-900 dark:text-white">
                <SplitText text="Tout ce dont votre entreprise a besoin" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                De la facturation à l'IA trésorerie, un seul abonnement, une seule interface.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_CARDS.map((m, i) => (
              <Reveal key={m.title} delay={(i % 3) * 100}>
                <div className="lb-spotlight group bg-white dark:bg-surface-1 rounded-2xl p-6 border border-gray-100 dark:border-surface-3 hover:shadow-2xl hover:border-[#0057D9]/30 transition-all duration-500 hover:-translate-y-1.5 h-full relative overflow-hidden">
                  {m.premium && (
                    <span className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${GREEN}15`, color: GREEN }}>
                      Premium
                    </span>
                  )}
                  <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500`}>
                    <m.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">{m.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 bg-gray-50 dark:bg-surface-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: `${GREEN}15`, color: GREEN }}>
                Tarifs
              </span>
              <h2 className="text-3xl lg:text-4xl font-medium mb-4 text-gray-900 dark:text-white">
                <SplitText text="Des forfaits pour chaque taille" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                <strong className="text-gray-900 dark:text-white">30 jours d'essai gratuit</strong>, accès complet. Sans carte bancaire. Changez de forfait à tout moment.
              </p>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-3 p-1.5 bg-white dark:bg-surface-1 rounded-xl border border-gray-200 dark:border-surface-3">
                <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} style={!annual ? { background: GREEN } : {}}>
                  {t('landing.monthly')}
                </button>
                <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} style={annual ? { background: GREEN } : {}}>
                  {t('landing.annual')}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${annual ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>-20%</span>
                </button>
              </div>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 items-stretch">
            {PLANS.map((plan, i) => {
              const price = annual ? Math.round(plan.price * 12 * 0.8) : plan.price;
              const perMonth = annual ? Math.round((plan.price * 12 * 0.8) / 12) : plan.price;
              const premiumTier = plan.id === 'premium' || plan.id === 'enterprise';
              return (
                <Reveal key={plan.id} delay={i * 120} className="h-full">
                  <div className={`lb-spotlight group relative bg-white dark:bg-surface-1 rounded-2xl border-2 p-6 h-full flex flex-col transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${plan.popular ? 'shadow-xl lg:scale-105 lb-shine-border border-transparent' : 'shadow-sm'} ${plan.popular ? '' : plan.color}`}>
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-1 rounded-full text-white shadow-lg shadow-[#0057D9]/30 z-10" style={{ background: GREEN }}>
                        Populaire
                      </span>
                    )}
                    {premiumTier && (
                      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        <LayoutDashboard className="w-3 h-3" /> Dashboard sur-mesure
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 min-h-[2rem]">{plan.tagline}</p>
                    <div className="mb-1 flex items-end gap-1">
                      <span className="text-4xl font-semibold tracking-tight text-[#0F2A3D] dark:text-white tabular-nums">${price}</span>
                      <span className="text-sm text-gray-400 mb-1">/{annual ? t('onboarding.perYear').replace('/', '') : t('onboarding.perMonth').replace('/', '')}</span>
                    </div>
                    <p className={`text-xs mb-5 h-4 ${annual ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      {annual ? `soit $${perMonth}/mois — vous économisez $${plan.price * 12 - price}` : 'ou -20 % en annuel'}
                    </p>
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/signup" className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${plan.popular ? 'text-white hover:opacity-90 shadow-lg shadow-[#0057D9]/30' : 'border-2 border-[#0F2A3D] text-[#0F2A3D] dark:border-white/40 dark:text-white hover:bg-gray-50 dark:hover:bg-surface-2'}`} style={plan.popular ? { background: GREEN } : {}}>
                      {t('landing.choosePlan')} {plan.name}
                    </Link>
                    <p className="text-[11px] text-center text-gray-400 mt-2">30 jours gratuits · sans carte</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
            Facturation annuelle avec 20 % de réduction. Paiement sécurisé par carte (Stripe, Paddle, PayUnit, Paystack) ou Mobile Money (CinetPay, Korapay, Flutterwave).
          </p>

          {/* ===== MATRICE DE COMPARAISON DÉTAILLÉE ===== */}
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowMatrix(!showMatrix)}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border-2 border-[#0F2A3D] text-[#0F2A3D] dark:border-white/40 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-surface-2"
            >
              {showMatrix ? 'Masquer le détail des modules' : 'Voir le détail module par module'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showMatrix ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showMatrix && (
            <Reveal className="mt-8">
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-surface-3 bg-white dark:bg-surface-1 shadow-sm">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-surface-3">
                      <th className="text-left px-5 py-4 font-medium text-gray-500 dark:text-gray-400">Ce qui est inclus</th>
                      {PLANS.map(plan => (
                        <th key={plan.id} className="px-4 py-4 text-center">
                          <span className={`font-semibold ${plan.popular ? '' : 'text-gray-900 dark:text-white'}`} style={plan.popular ? { color: GREEN } : {}}>
                            {plan.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50 dark:border-surface-2">
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">Utilisateurs inclus</td>
                      {PLAN_ORDER.map(p => (
                        <td key={p} className="px-4 py-3.5 text-center font-medium text-gray-900 dark:text-white">{MAX_USERS[p]}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-50 dark:border-surface-2 bg-gray-50/50 dark:bg-surface-2/30">
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">Sociétés gérées depuis un compte</td>
                      <td className="px-4 py-3.5 text-center text-gray-900 dark:text-white">1</td>
                      <td className="px-4 py-3.5 text-center text-gray-900 dark:text-white">1</td>
                      <td className="px-4 py-3.5 text-center text-gray-900 dark:text-white">1</td>
                      <td className="px-4 py-3.5 text-center font-medium text-gray-900 dark:text-white">Illimité</td>
                    </tr>
                    <tr className="border-b border-gray-50 dark:border-surface-2">
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">Factures personnalisées (logo, cachet, couleurs)</td>
                      {PLAN_ORDER.map(p => <td key={p} className="px-4 py-3.5 text-center"><CheckCircle className="w-5 h-5 mx-auto" style={{ color: GREEN }} /></td>)}
                    </tr>
                    <tr className="border-b border-gray-50 dark:border-surface-2 bg-gray-50/50 dark:bg-surface-2/30">
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">Tableau de bord personnalisable</td>
                      {PLAN_ORDER.map(p => (
                        <td key={p} className="px-4 py-3.5 text-center">
                          {p === 'premium' || p === 'enterprise' ? <CheckCircle className="w-5 h-5 mx-auto" style={{ color: GREEN }} /> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      ))}
                    </tr>
                    {DIFFERENTIATING_MODULES.map((m, idx) => (
                      <tr key={m} className={`border-b border-gray-50 dark:border-surface-2 last:border-0 ${idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-surface-2/30' : ''}`}>
                        <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">{MODULE_LABELS[m]}</td>
                        {PLAN_ORDER.map(p => (
                          <td key={p} className="px-4 py-3.5 text-center">
                            {PLAN_LIMITS[p].includes(m) ? (
                              <CheckCircle className="w-5 h-5 mx-auto" style={{ color: GREEN }} />
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                Chaque module listé ci-dessus est verrouillé au niveau base de données selon votre forfait, pas seulement dans l'interface.
              </p>
            </Reveal>
          )}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="py-20 bg-white dark:bg-surface-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: `${GREEN}12`, color: GREEN }}>
                Témoignages
              </span>
              <h2 className="text-3xl lg:text-4xl font-medium mb-4 text-gray-900 dark:text-white">
                <SplitText text="Ils gèrent leur entreprise avec LiBooks" />
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((tm, i) => (
              <Reveal key={tm.name} delay={(i % 2) * 100}>
                <div className="lb-spotlight bg-gray-50 dark:bg-surface-2 rounded-2xl p-7 h-full border border-gray-100 dark:border-surface-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                  <Quote className="w-8 h-8 mb-4 opacity-30 text-[#0057D9]" />
                  <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6 italic">"{tm.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${tm.color} rounded-full flex items-center justify-center text-white font-medium`}>
                      {tm.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tm.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tm.role}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" style={{ color: GREEN }} />)}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 bg-gray-50 dark:bg-surface-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: `${GREEN}15`, color: GREEN }}>
                FAQ
              </span>
              <h2 className="text-3xl lg:text-4xl font-medium mb-4 text-gray-900 dark:text-white">
                <SplitText text="Questions fréquentes" />
              </h2>
            </div>
          </Reveal>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <Reveal key={i} delay={i * 50}>
                <div className="bg-white dark:bg-surface-1 rounded-xl border border-gray-100 dark:border-surface-3 overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-96' : 'max-h-0'}`}>
                    <p className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative py-24 overflow-hidden" style={{ background: NAVY }}>
        <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ background: 'radial-gradient(50% 60% at 50% 0%, rgba(0,87,217,.45), transparent 70%)' }} />
        <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-[#22D3EE]/10 blur-3xl lb-float-slow" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight text-white mb-6">
              <SplitText text={t('landing.ctaTitle')} />
            </h2>
            <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
              {t('landing.ctaSub')}
            </p>
            <Magnetic strength={0.22}>
            <Link to="/signup" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white text-lg font-semibold shadow-xl shadow-[#0057D9]/40 hover:shadow-2xl transition-all hover:scale-105" style={{ background: GREEN }}>
              <Rocket className="w-5 h-5" />
              {t('landing.ctaButton')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            </Magnetic>
            <p className="text-sm text-white/50 mt-4">{t('landing.ctaNote')}</p>
          </Reveal>
        </div>
      </section>

      {/* ===== SIGNATURE GÉANTE ===== */}
      <section className="relative bg-white dark:bg-surface-0 border-t border-gray-100 dark:border-surface-3">
        <GiantScrollText lines={[
          { words: [{ text: 'LIBOOKS' }, { text: 'DEV', outline: true }, { text: 'BY', outline: true }, { text: 'LIAFRIK', accent: true }, { text: 'TECH' }] },
          { words: [{ text: 'COMPTABILITÉ', outline: true }, { text: 'AFRICAINE' }, { text: 'DE', outline: true }, { text: 'RÉFÉRENCE', accent: true }] },
          { words: [{ text: 'FACTURER' }, { text: 'ENCAISSER', outline: true }, { text: 'PILOTER', accent: true }, { text: 'GRANDIR', outline: true }] },
        ]} />
        <p className="sr-only">LiBooks, développé par LiAfrik Tech — la comptabilité africaine de référence.</p>
      </section>

      <FlagScrollBanner />

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 dark:bg-surface-0 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                <img src={logo} alt="LiBooks" className="w-8 h-8" />
                <span className="text-lg"><span className="font-bold">Li</span><span className="text-[#0057D9] font-medium">Books</span></span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                {t('landing.footerTagline')}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4 text-white">{t('landing.footerProduct')}</h4>
              <ul className="space-y-2.5">
                {['Facturation', 'Stocks & Magasins', 'Comptabilité OHADA', 'Mobile Money', 'IA Trésorerie'].map(l => (
                  <li key={l}><a href="#modules" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4 text-white">{t('landing.footerResources')}</h4>
              <ul className="space-y-2.5">
                <li><Link to={isEn ? '/en/blog' : '/blog'} className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Blog</Link></li>
                <li><Link to={isEn ? '/en/about' : '/about'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'About' : 'À propos'}</Link></li>
                <li><Link to={isEn ? '/en/help' : '/help'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Help Center' : "Centre d'aide"}</Link></li>
                <li><Link to={isEn ? '/en/developers' : '/developers'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Developers / API' : 'Développeurs / API'}</Link></li>
                <li><Link to={isEn ? '/en/contact' : '/contact'} className="text-sm text-gray-400 hover:text-white transition-colors">Contact & Support</Link></li>
                <li><Link to={isEn ? '/en/legal' : '/legal'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Legal Notice' : 'Mentions légales'}</Link></li>
                <li><Link to={isEn ? '/en/privacy' : '/privacy'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Privacy Policy' : 'Politique de confidentialité'}</Link></li>
                <li><Link to={isEn ? '/en/terms' : '/terms'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Terms of Service' : "Conditions d'utilisation"}</Link></li>
                <li><Link to={isEn ? '/en/cookies' : '/cookies'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Cookie Policy' : 'Politique de cookies'}</Link></li>
                <li><Link to={isEn ? '/en/refund-policy' : '/refund-policy'} className="text-sm text-gray-400 hover:text-white transition-colors">{isEn ? 'Refund Policy' : 'Politique de remboursement'}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4 text-white">{t('landing.footerContact')}</h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-gray-400"><Mail className="w-4 h-4" /> info@liafrik.com</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><Mail className="w-4 h-4" /> support@liafrik.com</li>
                <li className="flex items-center gap-2 text-sm text-gray-400"><MapPin className="w-4 h-4" /> Dubaï, EAU & Yaoundé, Cameroun</li>
              </ul>
            </div>
          </div>

          {/* LiAfrik identity banner */}
          <div className="py-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-300 font-medium">
                  LiBooks est développé par{' '}
                  <a href="https://liafrik.com" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-[#0057D9] transition-colors">
                    LiAfrik Tech
                  </a>{' '}
                  — Dubaï 🇦🇪 & Afrique
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Un pont entre l'innovation internationale et l'ancrage africain.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-[#0057D9] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Instagram : simple bouton (aucune vidéo / aucun embed) */}
          <div className="py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">Les coulisses de LiAfrik Tech, chaque semaine.</p>
            <a
              href="https://www.instagram.com/liafrik_tech?igsi=eXBjdTc5NG42Zml4&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(45deg,#F58529 0%,#DD2A7B 45%,#8134AF 75%,#515BD4 100%)' }}
            >
              <Instagram className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Suivez-nous sur Instagram
              <span className="text-white/70 font-normal">@liafrik_tech</span>
            </a>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">{t('landing.footerRights')}</p>
            <div className="flex items-center gap-6">
              <Link to={isEn ? '/en/privacy' : '/privacy'} className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerPrivacy')}</Link>
              <Link to={isEn ? '/en/terms' : '/terms'} className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerTerms')}</Link>
              <LanguageDropdown dark onPick={switchLang} />
            </div>
          </div>
        </div>
      </footer>
      <ChatWidget />
      <MarketingPopup />
    </div>
  );
}
