import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, Pilcrow, List, ListOrdered, Quote, Code,
  Link2, Unlink, Image as ImageIcon, Minus, Undo2, Redo2, Highlighter, Sparkles, Loader2, Check, X, ExternalLink,
} from 'lucide-react';
import { sanitizeEditorHtml } from '../../lib/blog';
import { supabase } from '../../lib/supabase';
import { ECOSYSTEM_PRODUCTS } from '../../lib/ecosystem';
import toast from 'react-hot-toast';

// Éditeur riche du CMS (contentEditable, zéro dépendance) :
//  - barre d'outils fixe + barre flottante sur sélection (gras, italique, LIEN…)
//  - sélectionnez un texte → « Lien » → collez l'URL → le texte devient un lien
//  - insertion rapide d'un lien vers un produit de l'écosystème Liafrik
//  - images (upload bucket blog-media ou URL), citations, listes, code, séparateur
//  - collage nettoyé (DOMPurify), raccourcis Ctrl/Cmd+B/I/U/K
function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function normalizeUrl(u: string) {
  const v = u.trim();
  if (!v) return '';
  if (/^(https?:|mailto:|tel:|\/)/i.test(v)) return v;
  return `https://${v}`;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Commencez à écrire…' }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [bubble, setBubble] = useState<{ x: number; y: number } | null>(null);
  const [linkBox, setLinkBox] = useState<{ x: number; y: number; url: string; newTab: boolean } | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Contenu initial / externe (sans casser le curseur pendant la frappe)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value && document.activeElement !== el) el.innerHTML = value || '';
  }, [value]);

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const refreshState = useCallback(() => {
    const sel = window.getSelection();
    const el = ref.current;
    if (!sel || !el || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) { setBubble(null); return; }
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
    });
    if (!sel.isCollapsed) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const host = el.parentElement!.getBoundingClientRect();
      setBubble({ x: r.left + r.width / 2 - host.left, y: r.top - host.top - 8 });
    } else setBubble(null);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshState);
    return () => document.removeEventListener('selectionchange', refreshState);
  }, [refreshState]);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    const sel = window.getSelection();
    if (savedRange.current && sel) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  }

  function run(cmd: string, val?: string) {
    ref.current?.focus();
    restoreSelection();
    exec(cmd, val);
    emit();
    refreshState();
  }

  function block(tag: 'h2' | 'h3' | 'p' | 'blockquote' | 'pre') {
    run('formatBlock', `<${tag}>`);
  }

  function openLink() {
    saveSelection();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { toast('Sélectionnez d’abord le texte à transformer en lien.'); return; }
    const anchor = (sel.anchorNode?.parentElement?.closest('a') as HTMLAnchorElement | null);
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const host = ref.current!.parentElement!.getBoundingClientRect();
    setLinkBox({ x: Math.max(8, r.left - host.left), y: r.bottom - host.top + 8, url: anchor?.getAttribute('href') ?? '', newTab: anchor ? anchor.target === '_blank' : true });
  }

  function applyLink(url: string, newTab: boolean) {
    const href = normalizeUrl(url);
    setLinkBox(null);
    ref.current?.focus();
    restoreSelection();
    if (!href) { exec('unlink'); emit(); return; }
    exec('createLink', href);
    // Applique target/rel sur le(s) lien(s) créé(s)
    ref.current?.querySelectorAll(`a[href="${CSS.escape(href)}"]`).forEach((a) => {
      if (newTab) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
      else { a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
    emit();
  }

  function insertProductLink(url: string, name: string) {
    setShowProducts(false);
    ref.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      exec('createLink', url);
      ref.current?.querySelectorAll(`a[href="${CSS.escape(url)}"]`).forEach((a) => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); });
    } else {
      exec('insertHTML', `<a href="${url}" target="_blank" rel="noopener">${name}</a>&nbsp;`);
    }
    emit();
  }

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (5 Mo max).'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `posts/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('blog-media').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('blog-media').getPublicUrl(path);
      const alt = (prompt('Texte alternatif de l’image (SEO / accessibilité) :') || '').replace(/"/g, '&quot;');
      ref.current?.focus();
      restoreSelection();
      exec('insertHTML', `<figure><img src="${data.publicUrl}" alt="${alt}" loading="lazy" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure><p><br></p>`);
      emit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de l’envoi');
    } finally {
      setUploading(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) exec('insertHTML', sanitizeEditorHtml(html));
    else exec('insertText', text);
    emit();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openLink(); }
  }

  const Btn = ({ on, title, onClick, children, disabled }: { on?: boolean; title: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button type="button" title={title} aria-label={title} disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${on ? 'bg-[#0057D9] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-3'}`}>
      {children}
    </button>
  );
  const Sep = () => <span className="w-px h-6 bg-gray-200 dark:bg-surface-3 mx-1" />;

  return (
    <div className="relative rounded-2xl border border-gray-200 dark:border-surface-3 bg-white dark:bg-surface-1">
      {/* Barre d'outils */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-surface-3 bg-white/95 dark:bg-surface-1/95 backdrop-blur rounded-t-2xl">
        <Btn title="Annuler" onClick={() => run('undo')}><Undo2 className="w-4 h-4" /></Btn>
        <Btn title="Rétablir" onClick={() => run('redo')}><Redo2 className="w-4 h-4" /></Btn>
        <Sep />
        <Btn title="Paragraphe" onClick={() => block('p')}><Pilcrow className="w-4 h-4" /></Btn>
        <Btn title="Titre H2" onClick={() => block('h2')}><Heading2 className="w-4 h-4" /></Btn>
        <Btn title="Sous-titre H3" onClick={() => block('h3')}><Heading3 className="w-4 h-4" /></Btn>
        <Sep />
        <Btn title="Gras (Ctrl+B)" on={active.bold} onClick={() => run('bold')}><Bold className="w-4 h-4" /></Btn>
        <Btn title="Italique (Ctrl+I)" on={active.italic} onClick={() => run('italic')}><Italic className="w-4 h-4" /></Btn>
        <Btn title="Souligné (Ctrl+U)" on={active.underline} onClick={() => run('underline')}><Underline className="w-4 h-4" /></Btn>
        <Btn title="Barré" on={active.strike} onClick={() => run('strikeThrough')}><Strikethrough className="w-4 h-4" /></Btn>
        <Btn title="Surligner" onClick={() => run('hiliteColor', '#FEF08A')}><Highlighter className="w-4 h-4" /></Btn>
        <Sep />
        <Btn title="Insérer un lien (Ctrl+K)" onClick={openLink}><Link2 className="w-4 h-4" /></Btn>
        <Btn title="Retirer le lien" onClick={() => run('unlink')}><Unlink className="w-4 h-4" /></Btn>
        <div className="relative">
          <Btn title="Lien vers un produit Liafrik" onClick={() => setShowProducts((v) => !v)}><Sparkles className="w-4 h-4" /></Btn>
          {showProducts && (
            <div className="absolute left-0 top-full mt-1 w-72 max-h-80 overflow-y-auto rounded-xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 shadow-2xl p-1.5 z-30">
              <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-gray-400">Écosystème Liafrik</p>
              {ECOSYSTEM_PRODUCTS.map((p) => (
                <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertProductLink(p.url, p.name)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-2 text-left">
                  <span className="w-6 h-6 rounded-md text-white text-[11px] font-bold flex items-center justify-center" style={{ background: p.color }}>{p.name.charAt(0).toUpperCase()}</span>
                  <span className="flex-1 min-w-0"><span className="block text-sm text-gray-900 dark:text-white">{p.name}</span><span className="block text-[11px] text-gray-400 truncate">{p.domain}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Sep />
        <Btn title="Liste à puces" on={active.ul} onClick={() => run('insertUnorderedList')}><List className="w-4 h-4" /></Btn>
        <Btn title="Liste numérotée" on={active.ol} onClick={() => run('insertOrderedList')}><ListOrdered className="w-4 h-4" /></Btn>
        <Btn title="Citation" onClick={() => block('blockquote')}><Quote className="w-4 h-4" /></Btn>
        <Btn title="Bloc de code" onClick={() => block('pre')}><Code className="w-4 h-4" /></Btn>
        <Btn title="Séparateur" onClick={() => run('insertHorizontalRule')}><Minus className="w-4 h-4" /></Btn>
        <Sep />
        <Btn title="Insérer une image (upload)" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
      </div>

      {/* Zone d'édition */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="lb-prose lb-editor min-h-[420px] px-5 sm:px-8 py-6 focus:outline-none"
      />

      {/* Barre flottante sur sélection */}
      {bubble && !linkBox && (
        <div className="absolute z-20 -translate-x-1/2 -translate-y-full flex items-center gap-0.5 px-1 py-1 rounded-xl bg-gray-900 text-white shadow-2xl animate-fade-in" style={{ left: bubble.x, top: bubble.y }}>
          {[
            { t: 'Gras', c: () => run('bold'), i: <Bold className="w-3.5 h-3.5" />, on: active.bold },
            { t: 'Italique', c: () => run('italic'), i: <Italic className="w-3.5 h-3.5" />, on: active.italic },
            { t: 'Souligné', c: () => run('underline'), i: <Underline className="w-3.5 h-3.5" />, on: active.underline },
            { t: 'Titre', c: () => block('h2'), i: <Heading2 className="w-3.5 h-3.5" />, on: false },
          ].map((b) => (
            <button key={b.t} type="button" title={b.t} onMouseDown={(e) => e.preventDefault()} onClick={b.c} className={`p-1.5 rounded-lg ${b.on ? 'bg-white/20' : 'hover:bg-white/10'}`}>{b.i}</button>
          ))}
          <span className="w-px h-4 bg-white/20 mx-0.5" />
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={openLink} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs font-semibold">
            <Link2 className="w-3.5 h-3.5" /> Lien
          </button>
        </div>
      )}

      {/* Popover lien */}
      {linkBox && (
        <div className="absolute z-30 w-[min(360px,calc(100%-16px))] rounded-xl border border-gray-100 dark:border-surface-3 bg-white dark:bg-surface-1 shadow-2xl p-3 animate-fade-in" style={{ left: linkBox.x, top: linkBox.y }}>
          <p className="text-xs font-semibold text-gray-500 mb-2">Lien sur le texte sélectionné</p>
          <div className="flex gap-2">
            <input autoFocus className="input text-sm" placeholder="https://… ou /blog/…" value={linkBox.url}
              onChange={(e) => setLinkBox({ ...linkBox, url: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(linkBox.url, linkBox.newTab); } if (e.key === 'Escape') setLinkBox(null); }} />
            <button type="button" onClick={() => applyLink(linkBox.url, linkBox.newTab)} className="px-3 rounded-lg bg-[#0057D9] text-white"><Check className="w-4 h-4" /></button>
            <button type="button" onClick={() => setLinkBox(null)} className="px-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-2"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={linkBox.newTab} onChange={(e) => setLinkBox({ ...linkBox, newTab: e.target.checked })} /> Ouvrir dans un nouvel onglet
            </label>
            {linkBox.url && <a href={normalizeUrl(linkBox.url)} target="_blank" rel="noreferrer" className="text-xs text-[#0057D9] inline-flex items-center gap-1">Tester <ExternalLink className="w-3 h-3" /></a>}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {ECOSYSTEM_PRODUCTS.slice(0, 6).map((p) => (
              <button key={p.id} type="button" onClick={() => setLinkBox({ ...linkBox, url: p.url })} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-surface-2 text-gray-600 dark:text-gray-300 hover:bg-[#0057D9] hover:text-white">{p.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
