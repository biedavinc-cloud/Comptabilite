import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2, Eye, Loader2, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { slugify, BlogPost } from '../../lib/blog';

const EMPTY: Partial<BlogPost> = {
  slug: '', lang: 'fr', title: '', excerpt: '', content: '', cover_url: '', category: 'Tech africaine',
  tags: [], author: 'Équipe LiAfrik Tech', reading_min: 5, published: false,
};

export default function BlogPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<BlogPost> | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['sa-blog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<BlogPost>) => {
      const row = {
        ...p,
        slug: p.slug || slugify(p.title || ''),
        tags: typeof p.tags === 'string' ? String(p.tags).split(',').map((t) => t.trim()).filter(Boolean) : p.tags,
        published_at: p.published ? (p.published_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = p.id
        ? await supabase.from('blog_posts').update(row).eq('id', p.id)
        : await supabase.from('blog_posts').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Article enregistré'); setDraft(null); qc.invalidateQueries({ queryKey: ['sa-blog'] }); qc.invalidateQueries({ queryKey: ['blog-posts'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('blog_posts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('Article supprimé'); qc.invalidateQueries({ queryKey: ['sa-blog'] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Blog LiBooks</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Articles publiés sur /blog — en plus des articles éditoriaux intégrés au site. Markdown léger : ## titres, **gras**, listes « - », liens [texte](url).</p>
        </div>
        <button onClick={() => setDraft({ ...EMPTY })} className="btn-primary"><Plus className="w-4 h-4" /> Nouvel article</button>
      </div>

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#0057D9] mx-auto" /> : posts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />Aucun article en base pour l’instant.</div>
      ) : (
        <div className="card p-0 divide-y divide-gray-100 dark:divide-surface-3">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                <p className="text-xs text-gray-400">/{p.lang === 'en' ? 'en/' : ''}blog/{p.slug} · {p.category}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.published ? 'Publié' : 'Brouillon'}</span>
              <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-[#0057D9]"><Eye className="w-4 h-4" /></a>
              <button onClick={() => setDraft(p)} className="text-sm text-[#0057D9] hover:underline">Modifier</button>
              <button onClick={() => { if (confirm('Supprimer cet article ?')) remove.mutate(p.id); }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setDraft(null)}>
          <div className="bg-white dark:bg-surface-1 rounded-2xl w-full max-w-3xl p-6 space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{draft.id ? 'Modifier' : 'Nouvel'} article</h3>
              <button onClick={() => setDraft(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="label">Titre</label><input className="input" value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} /></div>
              <div><label className="label">Slug</label><input className="input font-mono text-xs" value={draft.slug ?? ''} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} /></div>
              <div><label className="label">Langue</label>
                <select className="input" value={draft.lang} onChange={(e) => setDraft({ ...draft, lang: e.target.value as 'fr' | 'en' })}><option value="fr">Français</option><option value="en">English</option></select>
              </div>
              <div><label className="label">Catégorie</label><input className="input" value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
              <div><label className="label">Tags (séparés par des virgules)</label><input className="input" value={Array.isArray(draft.tags) ? draft.tags.join(', ') : (draft.tags ?? '')} onChange={(e) => setDraft({ ...draft, tags: e.target.value as unknown as string[] })} /></div>
              <div className="sm:col-span-2"><label className="label">Image de couverture (URL)</label><input className="input" value={draft.cover_url ?? ''} onChange={(e) => setDraft({ ...draft, cover_url: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">Résumé (meta description SEO, ~155 caractères)</label><textarea className="input" rows={2} value={draft.excerpt ?? ''} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">Contenu (Markdown)</label><textarea className="input font-mono text-xs" rows={14} value={draft.content ?? ''} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></div>
              <div><label className="label">Auteur</label><input className="input" value={draft.author ?? ''} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></div>
              <div><label className="label">Temps de lecture (min)</label><input type="number" min={1} className="input" value={draft.reading_min ?? 5} onChange={(e) => setDraft({ ...draft, reading_min: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={!!draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Publier</label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDraft(null)} className="btn-secondary">Annuler</button>
              <button onClick={() => save.mutate(draft)} disabled={save.isPending || !draft.title} className="btn-primary">{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
