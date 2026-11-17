import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Save, Trash2, Eye, Loader2, FileText, X, Search, Globe, CalendarClock, Star, Image as ImageIcon,
  Upload, Send, PenLine, ExternalLink, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { slugify, BlogPost, readingMinutes, renderContent, renderMarkdown, STATIC_POSTS, sanitizeEditorHtml } from '../../lib/blog';
import RichTextEditor from './RichTextEditor';

type Draft = Partial<BlogPost> & { meta_title?: string | null; cover_alt?: string | null; featured?: boolean };
type Filter = 'all' | 'published' | 'scheduled' | 'draft';

const CATEGORIES = ['Écosystème Liafrik', 'Tech africaine', 'Guides', 'Comptabilité OHADA', 'Paiements', 'Intelligence artificielle', 'Produit', 'Actualités'];

const EMPTY: Draft = {
  slug: '', lang: 'fr', title: '', excerpt: '', content: '', cover_url: '', category: 'Écosystème Liafrik',
  tags: [], author: 'Équipe Liafrik Tech', reading_min: 5, published: false, meta_title: '', cover_alt: '', featured: false,
};

function statusOf(p: Draft): Filter {
  if (!p.published) return 'draft';
  if (p.published_at && new Date(p.published_at) > new Date()) return 'scheduled';
  return 'published';
}

function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function BlogPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['sa-blog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Draft[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('blog_posts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('Article supprimé'); qc.invalidateQueries({ queryKey: ['sa-blog'] }); qc.invalidateQueries({ queryKey: ['blog-posts'] }); },
  });

  const counts = useMemo(() => ({
    all: posts.length,
    published: posts.filter((p) => statusOf(p) === 'published').length,
    scheduled: posts.filter((p) => statusOf(p) === 'scheduled').length,
    draft: posts.filter((p) => statusOf(p) === 'draft').length,
  }), [posts]);

  const list = posts.filter((p) => (filter === 'all' || statusOf(p) === filter) && (!q || `${p.title} ${p.slug} ${p.category}`.toLowerCase().includes(q.toLowerCase())));

  function importStatic(p: BlogPost) {
    setDraft({ ...EMPTY, ...p, id: undefined, content: renderMarkdown(p.content), published: false, published_at: null });
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#0F2A3D 0%,#0057D9 130%)' }}>
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60 flex items-center gap-2"><PenLine className="w-4 h-4" /> CMS LiBooks</p>
            <h2 className="text-2xl font-semibold mt-1">Blog & contenus</h2>
            <p className="text-sm text-white/70">Éditeur riche, liens sur sélection, images, SEO, programmation — publiés sur /blog.</p>
          </div>
          <button onClick={() => setDraft({ ...EMPTY })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0057D9] font-semibold hover:scale-105 transition-transform"><Plus className="w-4 h-4" /> Nouvel article</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([['all', 'Tous'], ['published', 'Publiés'], ['scheduled', 'Programmés'], ['draft', 'Brouillons']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${filter === k ? 'bg-[#0057D9] text-white' : 'bg-gray-100 dark:bg-surface-2 text-gray-600 dark:text-gray-300'}`}>
              {l} <span className="opacity-70">({counts[k]})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="input pl-9 sm:w-64" />
        </div>
      </div>

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#0057D9] mx-auto" /> : list.length === 0 ? (
        <div className="card text-center py-12 text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />Aucun article ici pour l’instant.</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => {
            const st = statusOf(p);
            return (
              <div key={p.id} className="group rounded-2xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 overflow-hidden hover:shadow-xl transition-all">
                <div className="h-32 relative" style={{ background: p.cover_url ? undefined : 'linear-gradient(135deg,#0F2A3D,#0057D9)' }}>
                  {p.cover_url && <img src={p.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st === 'published' ? 'bg-emerald-500 text-white' : st === 'scheduled' ? 'bg-amber-400 text-gray-900' : 'bg-white/90 text-gray-700'}`}>
                    {st === 'published' ? 'Publié' : st === 'scheduled' ? `Programmé ${new Date(p.published_at!).toLocaleDateString('fr-FR')}` : 'Brouillon'}
                  </span>
                  {p.featured && <Star className="absolute top-3 right-3 w-5 h-5 text-amber-300 fill-amber-300" />}
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-widest text-[#0057D9]">{p.category} · {p.lang?.toUpperCase()}</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-1 line-clamp-2">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">/{p.lang === 'en' ? 'en/' : ''}blog/{p.slug}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => setDraft(p)} className="flex-1 btn-primary !py-2 !px-3">Modifier</button>
                    <a href={`/${p.lang === 'en' ? 'en/' : ''}blog/${p.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-[#0057D9] hover:bg-gray-50 dark:hover:bg-surface-2"><Eye className="w-4 h-4" /></a>
                    <button onClick={() => { if (confirm('Supprimer définitivement cet article ?')) remove.mutate(p.id!); }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">Articles éditoriaux intégrés au site ({STATIC_POSTS.length}) — les copier dans le CMS pour les modifier</summary>
        <div className="mt-3 divide-y divide-gray-100 dark:divide-surface-3">
          {STATIC_POSTS.map((p) => (
            <div key={p.slug} className="flex items-center gap-3 py-2">
              <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{p.title}</p>
              <button onClick={() => importStatic(p)} className="text-xs text-[#0057D9] inline-flex items-center gap-1 hover:underline"><Copy className="w-3.5 h-3.5" /> Copier & modifier</button>
            </div>
          ))}
        </div>
      </details>

      {draft && <PostEditor initial={draft} onClose={() => setDraft(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['sa-blog'] }); qc.invalidateQueries({ queryKey: ['blog-posts'] }); }} />}
    </div>
  );
}

function PostEditor({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: () => void }) {
  const storageKey = `libooks_blog_draft_${initial.id ?? 'new'}`;
  const [d, setD] = useState<Draft>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && !initial.id && !initial.title) return { ...initial, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { ...initial, content: initial.content && !initial.content.trim().startsWith('<') ? renderMarkdown(initial.content) : (initial.content ?? '') };
  });
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [tagInput, setTagInput] = useState('');
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (initial.id) return;
    const t = setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(d)); } catch { /* quota */ } }, 600);
    return () => clearTimeout(t);
  }, [d, initial.id, storageKey]);

  const minutes = readingMinutes(d.content ?? '');
  const words = (d.content ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

  const save = useMutation({
    mutationFn: async (mode: 'save' | 'publish' | 'unpublish') => {
      if (!d.title?.trim()) throw new Error('Le titre est obligatoire.');
      const slug = d.slug || slugify(d.title);
      const published = mode === 'publish' ? true : mode === 'unpublish' ? false : !!d.published;
      const row = {
        slug, lang: d.lang ?? 'fr', title: d.title.trim(), excerpt: d.excerpt ?? '',
        content: sanitizeEditorHtml(d.content ?? ''), cover_url: d.cover_url || null, cover_alt: d.cover_alt || null,
        category: d.category || 'Tech africaine', tags: d.tags ?? [], author: d.author || 'Équipe Liafrik Tech',
        reading_min: minutes, meta_title: d.meta_title || null, featured: !!d.featured,
        published, published_at: published ? (d.published_at || new Date().toISOString()) : (d.published_at || null),
        updated_at: new Date().toISOString(),
      };
      if (d.id) {
        const { error } = await supabase.from('blog_posts').update(row).eq('id', d.id);
        if (error) throw error;
        return { ...row, id: d.id } as Draft;
      }
      const { data, error } = await supabase.from('blog_posts').insert(row).select('*').single();
      if (error) throw error;
      return data as Draft;
    },
    onSuccess: (saved, mode) => {
      setD((x) => ({ ...x, ...saved }));
      setSlugTouched(true);
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      onSaved();
      toast.success(mode === 'publish' ? 'Article publié en ligne 🎉' : mode === 'unpublish' ? 'Article repassé en brouillon' : 'Enregistré');
    },
    onError: (e: Error) => toast.error(e.message.includes('duplicate') ? 'Ce slug existe déjà — modifiez-le.' : e.message),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save.mutate('save'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `covers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('blog-media').upload(path, file, { contentType: file.type });
      if (error) throw error;
      set('cover_url', supabase.storage.from('blog-media').getPublicUrl(path).data.publicUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de l’envoi');
    } finally {
      setUploadingCover(false);
    }
  }

  function addTag(t: string) {
    const v = t.trim().replace(/,$/, '');
    if (!v) return;
    set('tags', Array.from(new Set([...(d.tags ?? []), v])));
    setTagInput('');
  }

  const metaTitle = d.meta_title || d.title || '';
  const url = `libooks.liafrik.com/${d.lang === 'en' ? 'en/' : ''}blog/${d.slug || slugify(d.title || 'mon-article')}`;
  const st = statusOf(d);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-surface-0 flex flex-col animate-fade-in">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-16 border-b border-gray-200 dark:border-surface-3 bg-white dark:bg-surface-1">
        <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{d.title || 'Nouvel article'}</p>
          <p className="text-[11px] text-gray-400 truncate">{st === 'published' ? 'Publié' : st === 'scheduled' ? 'Programmé' : 'Brouillon'} · {words} mots · {minutes} min · Ctrl+S</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-surface-3 p-0.5">
          {(['write', 'preview'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold ${tab === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500'}`}>{t === 'write' ? 'Écrire' : 'Aperçu'}</button>
          ))}
        </div>
        <button onClick={() => save.mutate('save')} disabled={save.isPending} className="btn-secondary !px-3 sm:!px-4">{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span className="hidden sm:inline">Enregistrer</span></button>
        {d.published && <button onClick={() => save.mutate('unpublish')} disabled={save.isPending} className="btn-secondary !px-4 hidden md:inline-flex">Dépublier</button>}
        <button onClick={() => save.mutate('publish')} disabled={save.isPending} className="btn-primary !px-3 sm:!px-4"><Send className="w-4 h-4" /><span className="hidden sm:inline">{d.published ? 'Mettre à jour' : 'Publier'}</span></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="min-w-0 space-y-4">
            {tab === 'write' ? (
              <>
                <textarea
                  value={d.title ?? ''}
                  onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }}
                  placeholder="Titre de l’article"
                  rows={2}
                  className="w-full resize-none bg-transparent text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none"
                />
                <textarea
                  value={d.excerpt ?? ''}
                  onChange={(e) => set('excerpt', e.target.value)}
                  placeholder="Chapô / résumé (meta description SEO)"
                  rows={2}
                  className="w-full resize-none bg-transparent text-lg text-gray-500 dark:text-gray-400 placeholder:text-gray-300 focus:outline-none"
                />
                <RichTextEditor value={d.content ?? ''} onChange={(html) => set('content', html)} />
                <p className="text-xs text-gray-400">Astuce : sélectionnez un mot puis cliquez sur « Lien » (ou Ctrl+K) pour y attacher une URL. Le bouton ✦ insère un lien vers un produit Liafrik.</p>
              </>
            ) : (
              <article className="rounded-2xl bg-white dark:bg-surface-1 border border-gray-100 dark:border-surface-3 p-6 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#0057D9]">{d.category}</p>
                <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">{d.title}</h1>
                {d.excerpt && <p className="mt-4 text-lg text-gray-500">{d.excerpt}</p>}
                {d.cover_url && <img src={d.cover_url} alt={d.cover_alt ?? ''} className="mt-8 rounded-2xl w-full max-h-[420px] object-cover" />}
                <div className="lb-prose mt-8" dangerouslySetInnerHTML={{ __html: renderContent(d.content ?? '') }} />
              </article>
            )}
          </div>

          <aside className="space-y-4">
            <Panel title="Publication" icon={<CalendarClock className="w-4 h-4" />}>
              <label className="label">Date de publication</label>
              <input type="datetime-local" className="input" value={toLocalInput(d.published_at)} onChange={(e) => set('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
              <p className="text-[11px] text-gray-400 mt-1">Une date future programme l’article : il apparaîtra automatiquement à cette date.</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><label className="label">Langue</label>
                  <select className="input" value={d.lang} onChange={(e) => set('lang', e.target.value as 'fr' | 'en')}><option value="fr">Français</option><option value="en">English</option></select>
                </div>
                <div><label className="label">Auteur</label><input className="input" value={d.author ?? ''} onChange={(e) => set('author', e.target.value)} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-3"><input type="checkbox" checked={!!d.featured} onChange={(e) => set('featured', e.target.checked)} /> Article à la une</label>
            </Panel>

            <Panel title="Image de couverture" icon={<ImageIcon className="w-4 h-4" />}>
              <div className="aspect-[16/9] rounded-xl overflow-hidden border border-dashed border-gray-200 dark:border-surface-3 flex items-center justify-center bg-gray-50 dark:bg-surface-2 relative">
                {d.cover_url ? <img src={d.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-300" />}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => coverRef.current?.click()} disabled={uploadingCover} className="btn-secondary !px-3 !py-2 flex-1">{uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importer</button>
                {d.cover_url && <button onClick={() => set('cover_url', '')} className="btn-secondary !px-3 !py-2" aria-label="Retirer"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }} />
              <input className="input mt-2 text-xs" placeholder="…ou coller une URL d’image" value={d.cover_url ?? ''} onChange={(e) => set('cover_url', e.target.value)} />
              <input className="input mt-2 text-xs" placeholder="Texte alternatif (SEO)" value={d.cover_alt ?? ''} onChange={(e) => set('cover_alt', e.target.value)} />
            </Panel>

            <Panel title="Classement" icon={<FileText className="w-4 h-4" />}>
              <label className="label">Catégorie</label>
              <input className="input" list="blog-cats" value={d.category ?? ''} onChange={(e) => set('category', e.target.value)} />
              <datalist id="blog-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
              <label className="label mt-3">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(d.tags ?? []).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#0057D9]/10 text-[#0057D9]">#{t}
                    <button onClick={() => set('tags', (d.tags ?? []).filter((x) => x !== t))} aria-label="Retirer"><X className="w-3 h-3" /></button></span>
                ))}
              </div>
              <input className="input" placeholder="Ajouter un tag + Entrée" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }} />
            </Panel>

            <Panel title="SEO" icon={<Globe className="w-4 h-4" />}>
              <label className="label flex justify-between">Titre SEO <span className={`text-[11px] ${metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>{metaTitle.length}/60</span></label>
              <input className="input" placeholder={d.title} value={d.meta_title ?? ''} onChange={(e) => set('meta_title', e.target.value)} />
              <label className="label mt-3">Slug</label>
              <input className="input font-mono text-xs" value={d.slug ?? ''} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
              <p className={`text-[11px] mt-2 ${(d.excerpt ?? '').length > 160 ? 'text-red-500' : 'text-gray-400'}`}>Meta description (chapô) : {(d.excerpt ?? '').length}/160</p>
              <div className="mt-3 rounded-xl border border-gray-100 dark:border-surface-3 p-3 bg-white dark:bg-surface-2">
                <p className="text-[11px] text-gray-500 truncate">{url}</p>
                <p className="text-[15px] text-[#1a0dab] dark:text-blue-300 leading-snug line-clamp-1">{metaTitle || 'Titre de l’article'} — LiBooks</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{d.excerpt || 'Le résumé de votre article apparaîtra ici dans Google.'}</p>
              </div>
              {d.id && st === 'published' && (
                <a href={`https://${url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-[#0057D9] hover:underline">Voir en ligne <ExternalLink className="w-3 h-3" /></a>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3"><span className="text-[#0057D9]">{icon}</span>{title}</h3>
      {children}
    </section>
  );
}
