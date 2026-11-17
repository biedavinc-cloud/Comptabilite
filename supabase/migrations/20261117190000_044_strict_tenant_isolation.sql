-- 044 — Durcissement de l'isolation multi-tenant avant lancement
--
-- 1. Intégrité inter-entreprises : une ligne ne peut référencer QUE des
--    données de sa propre entreprise (compte, client, facture, produit…).
--    Avant : un membre de l'entreprise A pouvait, en appelant l'API
--    directement, faire pointer son écriture vers un compte de l'entreprise B.
-- 2. Justificatifs (OCR) : nouveau bucket PRIVÉ tenant-documents.
-- 3. tenant-assets / blog-media : plus de listing public des fichiers
--    (les URL publiques des logos continuent de fonctionner).
-- 4. Fonctions internes (stats, parrainage) retirées de l'API publique.
-- 5. client_errors : impossible de signer une erreur au nom d'un autre.
-- 6. search_path figé sur les fonctions restantes.

-- ── 1. Contrôle « même entreprise » ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
  v_col text;
  v_ref text;
  v_id uuid;
  v_ref_tenant uuid;
BEGIN
  FOR i IN 0 .. (TG_NARGS / 2) - 1 LOOP
    v_col := TG_ARGV[i * 2];
    v_ref := TG_ARGV[i * 2 + 1];
    EXECUTE format('SELECT ($1).%I::uuid', v_col) INTO v_id USING NEW;
    IF v_id IS NOT NULL THEN
      EXECUTE format('SELECT tenant_id FROM public.%I WHERE id = $1', v_ref) INTO v_ref_tenant USING v_id;
      IF v_ref_tenant IS DISTINCT FROM NEW.tenant_id THEN
        RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: %.% must belong to the same company', TG_TABLE_NAME, v_col
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_same_tenant() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl,
           (SELECT relname FROM pg_class WHERE oid = c.conrelid) AS tname,
           string_agg(quote_literal(a.attname) || ', ' || quote_literal((SELECT relname FROM pg_class WHERE oid = c.confrelid)), ', ' ORDER BY a.attname) AS args
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1
      AND c.connamespace = 'public'::regnamespace
      AND a.attname <> 'tenant_id'
      AND c.confrelid <> 'public.tenants'::regclass
      AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.conrelid AND x.attname = 'tenant_id' AND NOT x.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute y WHERE y.attrelid = c.confrelid AND y.attname = 'tenant_id' AND NOT y.attisdropped)
    GROUP BY c.conrelid
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_same_tenant ON %s', r.tbl);
    EXECUTE format('CREATE TRIGGER trg_same_tenant BEFORE INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.enforce_same_tenant(%s)', r.tbl, r.args);
  END LOOP;
END $$;

-- ── 2. Bucket privé des justificatifs ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-documents', 'tenant-documents', false, 8388608,
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS tenant_documents_select ON storage.objects;
DROP POLICY IF EXISTS tenant_documents_insert ON storage.objects;
DROP POLICY IF EXISTS tenant_documents_update ON storage.objects;
DROP POLICY IF EXISTS tenant_documents_delete ON storage.objects;
CREATE POLICY tenant_documents_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-documents' AND public.is_member_of_tenant_path((storage.foldername(name))[1]));
CREATE POLICY tenant_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-documents' AND public.is_member_of_tenant_path((storage.foldername(name))[1]));
CREATE POLICY tenant_documents_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-documents' AND public.is_member_of_tenant_path((storage.foldername(name))[1]))
  WITH CHECK (bucket_id = 'tenant-documents' AND public.is_member_of_tenant_path((storage.foldername(name))[1]));
CREATE POLICY tenant_documents_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-documents' AND public.is_member_of_tenant_path((storage.foldername(name))[1]));

-- ── 3. Plus de listing public ───────────────────────────────────────────
-- Les buckets publics servent leurs URL publiques sans passer par ces
-- règles : supprimer la lecture « tout le monde » empêche seulement de
-- LISTER les fichiers de toutes les entreprises.
DROP POLICY IF EXISTS tenant_assets_public_read ON storage.objects;
DROP POLICY IF EXISTS tenant_assets_member_read ON storage.objects;
CREATE POLICY tenant_assets_member_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-assets' AND public.is_member_of_tenant_path((storage.foldername(name))[1]));

-- Seuls logo et cachet vont dans le bucket public (les pièces comptables
-- vont dans tenant-documents).
DROP POLICY IF EXISTS tenant_assets_upload ON storage.objects;
CREATE POLICY tenant_assets_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND public.is_member_of_tenant_path((storage.foldername(name))[1])
    AND name ~ '^[0-9a-fA-F-]{36}/(logo|cachet)\.[A-Za-z0-9]{2,5}$'
  );
DROP POLICY IF EXISTS tenant_assets_update ON storage.objects;
CREATE POLICY tenant_assets_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-assets' AND public.is_member_of_tenant_path((storage.foldername(name))[1]))
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND public.is_member_of_tenant_path((storage.foldername(name))[1])
    AND name ~ '^[0-9a-fA-F-]{36}/(logo|cachet)\.[A-Za-z0-9]{2,5}$'
  );

DROP POLICY IF EXISTS blog_media_public_read ON storage.objects;
DROP POLICY IF EXISTS blog_media_admin_read ON storage.objects;
CREATE POLICY blog_media_admin_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_super_admin());

-- ── 4. Fonctions internes hors API publique ─────────────────────────────
-- (appelées uniquement par admin-manage avec la clé service, ou par triggers)
REVOKE EXECUTE ON FUNCTION public.get_churn_rate(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_conversion_funnel(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_referral_event(text, public.referral_event_type, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_staff_stats(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_staff_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_delete_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_generate_staff_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_super_admin_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_referral_on_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_referral_on_tenant_create() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_churn_rate(integer), public.get_conversion_funnel(integer),
  public.log_referral_event(text, public.referral_event_type, uuid, jsonb), public.recompute_staff_stats(text),
  public.generate_staff_code(), public.can_delete_super_admin() TO service_role;

-- ── 5. Journal d'erreurs : pas d'usurpation ─────────────────────────────
DROP POLICY IF EXISTS ce_insert ON public.client_errors;
CREATE POLICY ce_insert ON public.client_errors FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (tenant_id IS NULL OR public.is_tenant_member_raw(tenant_id))
    AND length(message) <= 2000
  );

-- ── 6. search_path figé ─────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('check_posted_transaction_has_lines', 'check_transaction_balance', 'sync_max_users_with_plan', 'next_recurrence_date')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;
