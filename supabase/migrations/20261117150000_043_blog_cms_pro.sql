/*
# 043 — CMS blog pro

- Champs SEO / éditoriaux : meta_title, cover_alt, featured.
- Publication programmée : un article publié avec une date future reste
  invisible au public jusqu'à cette date (le super admin le voit toujours).
- Bucket public « blog-media » pour les images d'articles : lecture publique,
  écriture réservée aux super admins.
*/
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS cover_alt text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "blog_public_read" ON blog_posts;
CREATE POLICY "blog_public_read" ON blog_posts FOR SELECT TO anon, authenticated
  USING ((published = true AND (published_at IS NULL OR published_at <= now())) OR is_super_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-media', 'blog-media', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

DROP POLICY IF EXISTS "blog_media_public_read" ON storage.objects;
CREATE POLICY "blog_media_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "blog_media_admin_insert" ON storage.objects;
CREATE POLICY "blog_media_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-media' AND public.is_super_admin());

DROP POLICY IF EXISTS "blog_media_admin_update" ON storage.objects;
CREATE POLICY "blog_media_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_super_admin());

DROP POLICY IF EXISTS "blog_media_admin_delete" ON storage.objects;
CREATE POLICY "blog_media_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_super_admin());
