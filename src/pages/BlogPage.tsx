import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Clock, Search, Sparkles, ExternalLink } from 'lucide-react';
import logo from '../assets/logo.png';
import ThemeToggle from '../components/ui/ThemeToggle';
import { usePageMeta } from '../lib/usePageMeta';
import { supabase } from '../lib/supabase';
import { BlogPost, STATIC_POSTS, ECOSYSTEM, renderMarkdown } from '../lib/blog';
import { Reveal } from '../components/ui/Motion';

function usePosts(lang: 'fr' | 'en') {
  return useQuery({
    queryKey: ['blog-posts', lang],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('published', true).eq('lang', lang)
        .order('published_at', { ascending: false }).limit(100);
      const db = (data ?? []) as BlogPost[];
      const slugs = new Set(db.map((p) => p.slug));
      return [...db, ...STATIC_POSTS.filter((p) => p.lang === lang && !slugs.has(p.slug))];
    },
    staleTime: 60_000,
  });
}

function setJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
  return () => el?.remove();
}

function Shell({ children, isEn }: { children: React.ReactNode; isEn: boolean }) {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-0">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-1/80 backdrop-blur-md border-b border-gray-100 dark:border-surface-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={isEn ? '/en' : '/'} className="flex items-center gap-2">
            <img src={logo} alt="LiBooks" className="w-7 h-7" />
            <span className="text-lg text-gray-900 dark:text-white"><span className="font-bold">Li</span><span className="font-medium text-[#0057D9]">Books</span></span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0057D9]/10 text-[#0057D9]">Blog</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="subtle" />
            <Link to="/signup" className="hidden sm:inline-flex text-sm font-semibold px-4 py-2 rounded-xl text-white bg-[#0057D9] hover:bg-[#003F9E] transition-colors">
              {isEn ? 'Start free' : 'Essai gratuit 30 jours'}
            </Link>
          </div>
        </div>
      </nav>
      {children}
      <footer className="border-t border-gray-100 dark:border-surface-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} LiBooks — {isEn ? 'built by' : 'développé par'} <a className="text-[#0057D9]" href="https://liafrik.com" target="_blank" rel="noopener noreferrer">LiAfrik Tech</a>
      </footer>
    </div>
  );
}

export function BlogIndexPage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const lang = isEn ? 'en' : 'fr';
  const { data: posts = [] } = usePosts(lang);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  usePageMeta(
    isEn ? 'Blog — African tech, accounting & the LiAfrik ecosystem' : 'Blog — Tech africaine, comptabilité & écosystème LiAfrik',
    isEn
      ? 'Guides on online accounting software, OHADA, Mobile Money and the African tech ecosystem, by LiAfrik Tech.'
      : 'Guides logiciel de comptabilité en ligne, SYSCOHADA, Mobile Money, IA et écosystème tech africain LiAfrik.'
  );

  useEffect(() => setJsonLd('ld-blog', {
    '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog LiBooks', url: `https://libooks.liafrik.com${isEn ? '/en' : ''}/blog`,
    publisher: { '@type': 'Organization', name: 'LiAfrik Tech', url: 'https://liafrik.com' },
    blogPost: posts.slice(0, 20).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `https://libooks.liafrik.com${isEn ? '/en' : ''}/blog/${p.slug}`, datePublished: p.published_at })),
  }), [posts, isEn]);

  const categories = useMemo(() => Array.from(new Set(posts.map((p) => p.category))), [posts]);
  const filtered = posts.filter((p) => (!cat || p.category === cat) && (!q || `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())));
  const [hero, ...rest] = filtered;
  const base = isEn ? '/en/blog' : '/blog';

  return (
    <Shell isEn={isEn}>
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 lb-aurora opacity-70 dark:opacity-40" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/10 border border-blue-100 dark:border-white/10 text-sm font-medium text-[#0057D9] mb-5">
              <Sparkles className="w-4 h-4" /> {isEn ? 'African tech, first.' : 'La tech africaine, d’abord.'}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {isEn ? 'The LiBooks Blog' : 'Le Blog LiBooks'}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {isEn ? 'Accounting, payments, AI and the LiAfrik ecosystem — for businesses building Africa’s future.' : 'Comptabilité, paiements, IA et écosystème LiAfrik — pour les entreprises qui construisent l’Afrique de demain.'}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 max-w-xl mx-auto relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isEn ? 'Search an article…' : 'Rechercher un article…'}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-surface-3 bg-white/90 dark:bg-surface-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0057D9]" />
            </div>
          </Reveal>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button onClick={() => setCat(null)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${!cat ? 'bg-[#0057D9] text-white' : 'bg-white/80 dark:bg-surface-2 text-gray-600 dark:text-gray-300'}`}>{isEn ? 'All' : 'Tous'}</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${cat === c ? 'bg-[#0057D9] text-white' : 'bg-white/80 dark:bg-surface-2 text-gray-600 dark:text-gray-300'}`}>{c}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {hero && (
          <Reveal>
            <Link to={`${base}/${hero.slug}`} className="group grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 hover:shadow-2xl transition-all duration-500 mb-10">
              <div className="relative min-h-[220px] overflow-hidden" style={{ background: hero.cover_url ? undefined : 'linear-gradient(135deg,#0F2A3D,#0057D9)' }}>
                {hero.cover_url
                  ? <img src={hero.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  : <div className="absolute inset-0 flex items-center justify-center"><img src={logo} alt="" className="w-24 h-24 opacity-90 group-hover:scale-110 transition-transform duration-700" /></div>}
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#0057D9]">{hero.category}</span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white group-hover:text-[#0057D9] transition-colors">{hero.title}</h2>
                <p className="mt-3 text-gray-600 dark:text-gray-400">{hero.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0057D9]">{isEn ? 'Read' : 'Lire l’article'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
              </div>
            </Link>
          </Reveal>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 90}>
              <Link to={`${base}/${p.slug}`} className="group flex flex-col h-full rounded-2xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 lb-spotlight">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0057D9]">{p.category}</span>
                <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-[#0057D9] transition-colors">{p.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-1">{p.excerpt}</p>
                <div className="mt-5 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {p.reading_min} min</span>
                  <ArrowRight className="w-4 h-4 text-[#0057D9] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Ecosystem isEn={isEn} />
      </main>
    </Shell>
  );
}

function Ecosystem({ isEn }: { isEn: boolean }) {
  return (
    <section className="mt-20 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0F2A3D 0%,#0a1620 60%,#0057D9 140%)' }}>
      <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-[#0057D9]/40 blur-3xl" />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">{isEn ? 'The ecosystem' : 'L’écosystème'}</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">LiAfrik Tech</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ECOSYSTEM.map((e) => (
            <a key={e.name} href={e.url} target="_blank" rel="noopener noreferrer" className="group rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-5 transition-colors">
              <p className="font-semibold flex items-center gap-1.5">{e.name} <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" /></p>
              <p className="text-sm text-white/60 mt-1">{e.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const { data: posts = [], isLoading } = usePosts(isEn ? 'en' : 'fr');
  const post = posts.find((p) => p.slug === slug);
  const base = isEn ? '/en/blog' : '/blog';

  usePageMeta(post?.title ?? 'Blog', post?.excerpt);
  useEffect(() => {
    if (!post) return;
    return setJsonLd('ld-post', {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.excerpt,
      datePublished: post.published_at, author: { '@type': 'Organization', name: post.author },
      publisher: { '@type': 'Organization', name: 'LiAfrik Tech', logo: { '@type': 'ImageObject', url: 'https://libooks.liafrik.com/logo-512.png' } },
      mainEntityOfPage: `https://libooks.liafrik.com${base}/${post.slug}`, keywords: post.tags.join(', '),
      image: post.cover_url || 'https://libooks.liafrik.com/logo-512.png',
    });
  }, [post, base]);

  const html = useMemo(() => (post ? renderMarkdown(post.content) : ''), [post]);
  const related = posts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <Shell isEn={isEn}>
      {isLoading && !post ? <div className="py-32 text-center text-gray-400">…</div> : !post ? (
        <div className="py-32 text-center">
          <p className="text-gray-500">{isEn ? 'Article not found.' : 'Article introuvable.'}</p>
          <Link to={base} className="mt-4 inline-block text-[#0057D9]">← Blog</Link>
        </div>
      ) : (
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <Link to={base} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0057D9] mb-8"><ArrowLeft className="w-4 h-4" /> Blog</Link>
          <Reveal><span className="text-xs font-semibold uppercase tracking-widest text-[#0057D9]">{post.category}</span></Reveal>
          <Reveal delay={60}><h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white leading-tight">{post.title}</h1></Reveal>
          <Reveal delay={120}>
            <p className="mt-4 text-sm text-gray-400 flex items-center gap-3">
              <span>{post.author}</span>·<span>{post.published_at ? new Date(post.published_at).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</span>·<span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.reading_min} min</span>
            </p>
          </Reveal>
          {post.cover_url && <img src={post.cover_url} alt="" className="mt-8 rounded-2xl w-full object-cover max-h-[420px]" />}
          <div className="lb-prose mt-10" dangerouslySetInnerHTML={{ __html: html }} />
          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">{post.tags.map((t) => <span key={t} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-surface-2 text-gray-600 dark:text-gray-300">#{t}</span>)}</div>
          )}
          <div className="mt-12 rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0057D9] to-[#0F2A3D] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">{isEn ? 'Try LiBooks free for 30 days' : 'Essayez LiBooks gratuitement pendant 30 jours'}</p>
              <p className="text-sm text-white/70">{isEn ? 'No credit card. Cancel anytime.' : 'Sans carte bancaire. Sans engagement.'}</p>
            </div>
            <Link to="/signup" className="px-6 py-3 rounded-xl bg-white text-[#0057D9] font-semibold hover:scale-105 transition-transform">{isEn ? 'Get started' : 'Commencer'}</Link>
          </div>
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{isEn ? 'Keep reading' : 'À lire aussi'}</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {related.map((p) => (
                  <Link key={p.slug} to={`${base}/${p.slug}`} className="rounded-xl border border-gray-100 dark:border-surface-3 p-4 hover:shadow-lg transition-all">
                    <p className="text-[11px] uppercase tracking-widest text-[#0057D9]">{p.category}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{p.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      )}
    </Shell>
  );
}
