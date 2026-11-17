/*
# 042 — Premium platform upgrade (LiBooks by LiAfrik Tech)

1. Essai gratuit 7 → 30 jours (défaut de colonne + essais en cours prolongés).
2. Garde anti-rejeu Flutterwave (flutterwave_processed_tx_ref) — empêche un
   même paiement de prolonger l'abonnement plusieurs fois.
3. Coffre d'intégrations plateforme (platform_integrations) piloté depuis le
   Super Admin : clés PSP (Stripe, Paddle, PayUnit, Flutterwave, Paystack,
   CinetPay, Korapay), Gemini (assistant IA « Libooks »), Resend, WhatsApp…
   Les secrets ne sont JAMAIS lisibles côté client : lecture masquée via RPC
   super-admin, lecture en clair uniquement par les Edge Functions (service_role).
4. Transactions CinetPay & Korapay (ancre de vérification, même modèle que
   paystack_transactions).
5. Personnalisation des factures (invoice_settings) par tenant.
6. Dashboard personnalisable (Premium & Entreprise) — préférences par utilisateur.
7. Blog (articles gérés depuis le Super Admin, lecture publique).
*/

-- ============================================================
-- 1. Essai gratuit 30 jours
-- ============================================================
ALTER TABLE tenants ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

-- Le trigger de protection des colonnes de facturation remet trial_ends_at
-- à son ancienne valeur pour tout rôle ≠ service_role (y compris le rôle
-- de migration) : on le suspend le temps de prolonger les essais en cours.
ALTER TABLE tenants DISABLE TRIGGER trg_protect_tenant_billing_columns;
UPDATE tenants
   SET trial_ends_at = created_at + interval '30 days'
 WHERE subscription_status = 'trialing'
   AND created_at + interval '30 days' > trial_ends_at;
ALTER TABLE tenants ENABLE TRIGGER trg_protect_tenant_billing_columns;

-- ============================================================
-- 2. Anti-rejeu Flutterwave
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS flutterwave_processed_tx_ref text;

-- ============================================================
-- 5. Personnalisation des factures
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Re-déclare la protection en y ajoutant la nouvelle colonne sensible.
CREATE OR REPLACE FUNCTION public.protect_tenant_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_super_admin() THEN
    NEW.plan := OLD.plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.referred_by_staff_code := OLD.referred_by_staff_code;
    NEW.max_users := OLD.max_users;
    NEW.flutterwave_customer_id := OLD.flutterwave_customer_id;
    NEW.flutterwave_last_tx_ref := OLD.flutterwave_last_tx_ref;
    NEW.flutterwave_processed_tx_ref := OLD.flutterwave_processed_tx_ref;
    NEW.flutterwave_card_token := OLD.flutterwave_card_token;
    NEW.auto_renew := OLD.auto_renew;
    NEW.next_billing_date := OLD.next_billing_date;
    NEW.locked_price_usd := OLD.locked_price_usd;
    NEW.paddle_customer_id := OLD.paddle_customer_id;
    NEW.paddle_subscription_id := OLD.paddle_subscription_id;
    NEW.billing_cycle := OLD.billing_cycle;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Coffre d'intégrations plateforme
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_integrations (
  provider       text PRIMARY KEY,
  category       text NOT NULL CHECK (category IN ('psp', 'ai', 'email', 'messaging', 'analytics', 'storage', 'other')),
  enabled        boolean NOT NULL DEFAULT false,
  mode           text NOT NULL DEFAULT 'live' CHECK (mode IN ('test', 'live')),
  public_config  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- lisible par le front (clé publique, model…)
  secret_config  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- service_role uniquement
  last_test_at   timestamptz,
  last_test_ok   boolean,
  last_test_msg  text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE platform_integrations ENABLE ROW LEVEL SECURITY;
-- Aucune policy pour authenticated/anon : la table brute n'est accessible
-- qu'au service_role (Edge Functions). Tout passe par les RPC ci-dessous.

-- Lignes de base (désactivées). Les PSP déjà en production gardent leur
-- état grâce au fallback « variables d'environnement » côté Edge Functions
-- et à PSP_DEFAULTS côté front tant qu'aucune ligne n'est activée ici.
INSERT INTO platform_integrations (provider, category, public_config) VALUES
  ('stripe',      'psp', '{}'),
  ('paddle',      'psp', '{}'),
  ('payunit',     'psp', '{}'),
  ('flutterwave', 'psp', '{}'),
  ('paystack',    'psp', '{}'),
  ('cinetpay',    'psp', '{}'),
  ('korapay',     'psp', '{}'),
  ('gemini',      'ai',  '{"model": "gemini-flash-latest"}'),
  ('resend',      'email', '{"from": "LiBooks <noreply@liafrik.com>"}'),
  ('whatsapp',    'messaging', '{}'),
  ('google_analytics', 'analytics', '{}'),
  ('cloudflare_turnstile', 'other', '{}')
ON CONFLICT (provider) DO NOTHING;

-- Masque une valeur secrète : "sk_live_ab…wxyz"
CREATE OR REPLACE FUNCTION public.mask_secret(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN v IS NULL OR v = '' THEN ''
    WHEN length(v) <= 8 THEN repeat('•', length(v))
    ELSE left(v, 4) || '••••••' || right(v, 4)
  END;
$$;

-- Liste complète pour le Super Admin, secrets masqués.
CREATE OR REPLACE FUNCTION public.admin_list_integrations()
RETURNS TABLE (
  provider text, category text, enabled boolean, mode text,
  public_config jsonb, secret_preview jsonb,
  last_test_at timestamptz, last_test_ok boolean, last_test_msg text, updated_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
    SELECT pi.provider, pi.category, pi.enabled, pi.mode, pi.public_config,
           COALESCE((SELECT jsonb_object_agg(k, public.mask_secret(v))
                       FROM jsonb_each_text(pi.secret_config) AS e(k, v)), '{}'::jsonb),
           pi.last_test_at, pi.last_test_ok, pi.last_test_msg, pi.updated_at
      FROM platform_integrations pi
     ORDER BY pi.category, pi.provider;
END;
$$;

-- Enregistre une intégration. p_secret_patch : seules les clés NON vides
-- remplacent la valeur stockée (un champ laissé vide garde le secret
-- existant) ; une valeur '__DELETE__' supprime la clé.
CREATE OR REPLACE FUNCTION public.admin_save_integration(
  p_provider text, p_category text, p_enabled boolean, p_mode text,
  p_public_config jsonb, p_secret_patch jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_secrets jsonb;
  k text; v text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_provider !~ '^[a-z0-9_]{2,40}$' THEN
    RAISE EXCEPTION 'INVALID_PROVIDER';
  END IF;

  SELECT secret_config INTO v_secrets FROM platform_integrations WHERE provider = p_provider;
  v_secrets := COALESCE(v_secrets, '{}'::jsonb);

  FOR k, v IN SELECT * FROM jsonb_each_text(COALESCE(p_secret_patch, '{}'::jsonb)) LOOP
    IF v = '__DELETE__' THEN
      v_secrets := v_secrets - k;
    ELSIF v IS NOT NULL AND btrim(v) <> '' THEN
      v_secrets := jsonb_set(v_secrets, ARRAY[k], to_jsonb(btrim(v)));
    END IF;
  END LOOP;

  INSERT INTO platform_integrations (provider, category, enabled, mode, public_config, secret_config, updated_at, updated_by)
  VALUES (p_provider, COALESCE(p_category, 'other'), COALESCE(p_enabled, false), COALESCE(p_mode, 'live'),
          COALESCE(p_public_config, '{}'::jsonb), v_secrets, now(), auth.uid())
  ON CONFLICT (provider) DO UPDATE SET
    category      = EXCLUDED.category,
    enabled       = EXCLUDED.enabled,
    mode          = EXCLUDED.mode,
    public_config = EXCLUDED.public_config,
    secret_config = EXCLUDED.secret_config,
    updated_at    = now(),
    updated_by    = auth.uid();

  INSERT INTO audit_logs (tenant_id, user_id, action, module, after_data)
  VALUES (NULL, auth.uid(), 'save_integration', 'integrations',
          jsonb_build_object('provider', p_provider, 'enabled', p_enabled, 'mode', p_mode,
                             'secret_keys_updated', (SELECT COALESCE(jsonb_agg(key), '[]'::jsonb)
                                                       FROM jsonb_each_text(COALESCE(p_secret_patch, '{}'::jsonb))
                                                      WHERE btrim(value) <> '')));
END;
$$;

-- Lecture publique (anon + authenticated) : uniquement ce qui est sans
-- danger — état activé, mode, config publique. Jamais un secret.
CREATE OR REPLACE FUNCTION public.get_public_integrations()
RETURNS TABLE (provider text, category text, enabled boolean, mode text, public_config jsonb)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT provider, category, enabled, mode, public_config
    FROM platform_integrations
   WHERE enabled = true;
$$;

REVOKE ALL ON FUNCTION public.admin_list_integrations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_integration(text, text, boolean, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_integrations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_integration(text, text, boolean, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_integrations() TO anon, authenticated;

-- ============================================================
-- 4. Transactions CinetPay & Korapay
-- ============================================================
CREATE TABLE IF NOT EXISTS cinetpay_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  text UNIQUE NOT NULL,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan            text NOT NULL,
  cycle           text NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly', 'annual')),
  expected_amount numeric(15,2) NOT NULL,  -- dans la devise facturée (XOF/XAF…)
  expected_usd    numeric(15,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'XOF',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refused', 'canceled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_cinetpay_tx_tenant ON cinetpay_transactions(tenant_id);
ALTER TABLE cinetpay_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cinetpay_tx_select" ON cinetpay_transactions;
CREATE POLICY "cinetpay_tx_select" ON cinetpay_transactions FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) OR is_super_admin());

CREATE TABLE IF NOT EXISTS korapay_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       text UNIQUE NOT NULL,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan            text NOT NULL,
  cycle           text NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly', 'annual')),
  expected_amount numeric(15,2) NOT NULL,
  expected_usd    numeric(15,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'NGN',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'processing', 'expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_korapay_tx_tenant ON korapay_transactions(tenant_id);
ALTER TABLE korapay_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "korapay_tx_select" ON korapay_transactions;
CREATE POLICY "korapay_tx_select" ON korapay_transactions FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) OR is_super_admin());

-- ============================================================
-- 6. Dashboard personnalisable (préférences par utilisateur)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_dashboard_prefs (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  layout     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);
ALTER TABLE user_dashboard_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dash_prefs_own" ON user_dashboard_prefs;
CREATE POLICY "dash_prefs_own" ON user_dashboard_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid() AND is_tenant_member(tenant_id))
  WITH CHECK (
    user_id = auth.uid() AND is_tenant_member(tenant_id)
    -- Réservé aux forfaits Premium & Entreprise (vérifié côté base, pas
    -- seulement dans l'interface).
    AND EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_id AND t.plan IN ('premium', 'enterprise'))
  );

-- ============================================================
-- 7. Blog
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,120}$'),
  lang          text NOT NULL DEFAULT 'fr' CHECK (lang IN ('fr', 'en')),
  title         text NOT NULL,
  excerpt       text NOT NULL DEFAULT '',
  content       text NOT NULL DEFAULT '',          -- Markdown léger
  cover_url     text,
  category      text NOT NULL DEFAULT 'Tech africaine',
  tags          text[] NOT NULL DEFAULT '{}',
  author        text NOT NULL DEFAULT 'Équipe LiAfrik Tech',
  reading_min   int NOT NULL DEFAULT 5,
  published     boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pub ON blog_posts(published, published_at DESC);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blog_public_read" ON blog_posts;
CREATE POLICY "blog_public_read" ON blog_posts FOR SELECT TO anon, authenticated
  USING (published = true OR is_super_admin());
DROP POLICY IF EXISTS "blog_admin_write" ON blog_posts;
CREATE POLICY "blog_admin_write" ON blog_posts FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
