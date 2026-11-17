import { Suspense, useEffect } from 'react';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import i18n from './i18n';
import { useAuth } from './contexts/AuthContext';
import { useTenant } from './contexts/TenantContext';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary, GlobalErrorListener } from './components/ui/ErrorMonitoring';
import PremiumGate from './components/ui/PremiumGate';
import { INVITE_STORAGE_KEY } from './pages/auth/AcceptInvitePage';
import LogoLoader from './components/ui/LogoLoader';

// Every page is loaded on demand (route-based code splitting) instead of
// all being bundled into one giant chunk downloaded on first visit --
// this is the single biggest lever for initial load speed. AppLayout,
// PremiumGate and the INVITE_STORAGE_KEY constant stay eager since
// they're small and needed immediately for routing/layout decisions.
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const LoginPage = lazyWithRetry(() => import('./pages/auth/LoginPage'));
const SignupPage = lazyWithRetry(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazyWithRetry(() => import('./pages/auth/VerifyEmailPage'));
const AcceptInvitePage = lazyWithRetry(() => import('./pages/auth/AcceptInvitePage'));
const OnboardingPage = lazyWithRetry(() => import('./pages/onboarding/OnboardingPage'));
const Dashboard = lazyWithRetry(() => import('./pages/app/Dashboard'));
const ChartOfAccounts = lazyWithRetry(() => import('./pages/app/ChartOfAccounts'));
const Inventory = lazyWithRetry(() => import('./pages/app/Inventory'));
const Warehouses = lazyWithRetry(() => import('./pages/app/Warehouses'));
const Customers = lazyWithRetry(() => import('./pages/app/Customers'));
const Suppliers = lazyWithRetry(() => import('./pages/app/Suppliers'));
const SalesInvoices = lazyWithRetry(() => import('./pages/app/SalesInvoices'));
const RecurringInvoices = lazyWithRetry(() => import('./pages/app/RecurringInvoices'));
const InvoiceDetail = lazyWithRetry(() => import('./pages/app/InvoiceDetail'));
const PurchaseInvoices = lazyWithRetry(() => import('./pages/app/PurchaseInvoices'));
const Transactions = lazyWithRetry(() => import('./pages/app/Transactions'));
const Reports = lazyWithRetry(() => import('./pages/app/Reports'));
const Ledger = lazyWithRetry(() => import('./pages/app/Ledger'));
const BankReconciliation = lazyWithRetry(() => import('./pages/app/BankReconciliation'));
const CreditNotes = lazyWithRetry(() => import('./pages/app/CreditNotes'));
const FixedAssets = lazyWithRetry(() => import('./pages/app/FixedAssets'));
const Settings = lazyWithRetry(() => import('./pages/app/Settings'));
const UsersRoles = lazyWithRetry(() => import('./pages/app/UsersRoles'));
const Billing = lazyWithRetry(() => import('./pages/app/Billing'));
const Banking = lazyWithRetry(() => import('./pages/app/Banking'));
const WhatsApp = lazyWithRetry(() => import('./pages/app/WhatsApp'));
const AICashflow = lazyWithRetry(() => import('./pages/app/AICashflow'));
const Ohada = lazyWithRetry(() => import('./pages/app/Ohada'));
const SuperAdmin = lazyWithRetry(() => import('./pages/app/SuperAdmin'));
const PlanSelectionGate = lazyWithRetry(() => import('./pages/app/PlanSelectionGate'));
const AboutPage = lazyWithRetry(() => import('./pages/footer/AboutPage'));
const ContactPage = lazyWithRetry(() => import('./pages/footer/ContactPage'));
const LegalPage = lazyWithRetry(() => import('./pages/footer/LegalPage'));
const ApiDocsPage = lazyWithRetry(() => import('./pages/ApiDocsPage'));
const HelpCenterPage = lazyWithRetry(() => import('./pages/HelpCenterPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/footer/PrivacyPage'));
const TermsPage = lazyWithRetry(() => import('./pages/footer/TermsPage'));
const CookiePolicyPage = lazyWithRetry(() => import('./pages/footer/CookiePolicyPage'));
const RefundPolicyPage = lazyWithRetry(() => import('./pages/footer/RefundPolicyPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));
const SecurityPage = lazyWithRetry(() => import('./pages/TrustPage').then(m => ({ default: m.SecurityPage })));
const StatusPage = lazyWithRetry(() => import('./pages/TrustPage').then(m => ({ default: m.StatusPage })));
const BlogIndexPage = lazyWithRetry(() => import('./pages/BlogPage').then(m => ({ default: m.BlogIndexPage })));
const BlogPostPage = lazyWithRetry(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPostPage })));

function Spinner() {
  return <LogoLoader />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin, staffInfo } = useAuth();
  const { tenant, loading: tenantLoading, isPlanLocked } = useTenant();

  if (loading || tenantLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  const isPlatformUser = isSuperAdmin || staffInfo.isStaff;
  if (!tenant && !isPlatformUser) return <Navigate to="/onboarding" replace />;
  if (!tenant && isPlatformUser) {
    const path = window.location.pathname;
    if (path === '/app' || path === '/app/dashboard') {
      return <Navigate to="/app/super-admin" replace />;
    }
  }

  if (isPlanLocked && !isSuperAdmin && !staffInfo.isStaff) {
    const path = window.location.pathname;
    if (path !== '/app/billing') {
      return <PlanSelectionGate />;
    }
  }

  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();
  const { loading: tenantLoading } = useTenant();

  if (loading || tenantLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/app/dashboard" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin, staffInfo } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  if (loading || tenantLoading) return <Spinner />;
  if (user && (tenant || isSuperAdmin || staffInfo.isStaff)) return <Navigate to="/app/dashboard" replace />;
  if (user && !tenant) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

function OnboardingRoute() {
  const { user, loading, isSuperAdmin, staffInfo } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  if (loading || tenantLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (tenant || isSuperAdmin || staffInfo.isStaff) return <Navigate to="/app/dashboard" replace />;

  const pendingInvite = localStorage.getItem(INVITE_STORAGE_KEY);
  if (pendingInvite) return <Navigate to={`/invite/${pendingInvite}`} replace />;

  return <OnboardingPage />;
}

function PremiumPlaceholder({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center gap-4 px-4">
      <span className="text-5xl">{icon}</span>
      <div>
        <p className="text-xl font-medium text-gray-800">{title}</p>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">{desc}</p>
      </div>
      <Link to="/app/billing" className="mt-2 px-6 py-2.5 bg-[#0057D9] text-white text-sm font-semibold rounded-xl hover:bg-[#003F9E] transition-colors">
        Voir les forfaits
      </Link>
    </div>
  );
}

// Forces the page's language to match its URL, independent of whatever
// was last stored in localStorage — a URL is only genuinely indexable in
// a given language if visiting it deterministically renders that
// language, every time, regardless of prior visits/preference. Only used
// on routes that actually have full translation coverage (right now:
// just the landing page — see the /en route below and the comment on
// why the footer/legal pages aren't duplicated here).
function WithLang({ lang, children }: { lang: 'fr' | 'en'; children: React.ReactNode }) {
  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [lang]);
  return <>{children}</>;
}

/** Une erreur sur une page ne bloque plus la navigation : la frontière se réinitialise à chaque changement de page. */
function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <GlobalErrorListener />
      <RouteErrorBoundary>
      <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<WithLang lang="fr"><LandingPage /></WithLang>} />
        {/*
          Only the landing page is duplicated under /en — it's the only
          public page with full i18next translation coverage (see
          src/i18n/en.ts). The footer/legal pages (About, Contact, Legal,
          Terms, Privacy, Cookies, Refund policy, Help, API docs) are
          hardcoded French prose with no English version at all today;
          duplicating them under an /en/... URL would serve French text
          at an address that claims to be English — worse for SEO than
          not having the URL (duplicate-content + wrong hreflang, and
          misleading for anyone who lands there expecting English). Add
          a route here once each page actually has translated content,
          not before.
        */}
        <Route path="/en" element={<WithLang lang="en"><LandingPage /></WithLang>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/developers" element={<ApiDocsPage />} />
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/securite" element={<WithLang lang="fr"><SecurityPage /></WithLang>} />
        <Route path="/security" element={<Navigate to="/en/securite" replace />} />
        <Route path="/en/security" element={<Navigate to="/en/securite" replace />} />
        <Route path="/en/securite" element={<WithLang lang="en"><SecurityPage /></WithLang>} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/en/status" element={<WithLang lang="en"><StatusPage /></WithLang>} />
        <Route path="/blog" element={<WithLang lang="fr"><BlogIndexPage /></WithLang>} />
        <Route path="/blog/:slug" element={<WithLang lang="fr"><BlogPostPage /></WithLang>} />
        <Route path="/en/blog" element={<WithLang lang="en"><BlogIndexPage /></WithLang>} />
        <Route path="/en/blog/:slug" element={<WithLang lang="en"><BlogPostPage /></WithLang>} />
        <Route path="/en/about" element={<WithLang lang="en"><AboutPage /></WithLang>} />
        <Route path="/en/contact" element={<WithLang lang="en"><ContactPage /></WithLang>} />
        <Route path="/en/legal" element={<WithLang lang="en"><LegalPage /></WithLang>} />
        <Route path="/en/developers" element={<WithLang lang="en"><ApiDocsPage /></WithLang>} />
        <Route path="/en/help" element={<WithLang lang="en"><HelpCenterPage /></WithLang>} />
        <Route path="/en/privacy" element={<WithLang lang="en"><PrivacyPage /></WithLang>} />
        <Route path="/en/terms" element={<WithLang lang="en"><TermsPage /></WithLang>} />
        <Route path="/en/cookies" element={<WithLang lang="en"><CookiePolicyPage /></WithLang>} />
        <Route path="/en/refund-policy" element={<WithLang lang="en"><RefundPolicyPage /></WithLang>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />

        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="sales-invoices" element={<SalesInvoices />} />
          <Route path="sales-invoices/:id" element={<InvoiceDetail />} />
          <Route path="recurring-invoices" element={<RecurringInvoices />} />
          <Route path="purchase-invoices" element={<PurchaseInvoices />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="credit-notes" element={<CreditNotes />} />
          <Route path="bank-reconciliation" element={<PremiumGate module="bank_reconciliation"><BankReconciliation /></PremiumGate>} />
          <Route path="fixed-assets" element={<PremiumGate module="fixed_assets"><FixedAssets /></PremiumGate>} />
          <Route path="companies" element={<PremiumPlaceholder icon="🏢" title="Multi-société" desc="Gérez plusieurs sociétés depuis un seul compte. Disponible en forfait Entreprise." />} />
          <Route path="banking" element={<PremiumGate module="banking"><Banking /></PremiumGate>} />
          <Route path="whatsapp" element={<PremiumGate module="whatsapp"><WhatsApp /></PremiumGate>} />
          <Route path="ai-cashflow" element={<PremiumGate module="ai_cashflow"><AICashflow /></PremiumGate>} />
          <Route path="ohada" element={<PremiumGate module="ohada"><Ohada /></PremiumGate>} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<UsersRoles />} />
          <Route path="billing" element={<Billing />} />
          <Route path="super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </RouteErrorBoundary>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
