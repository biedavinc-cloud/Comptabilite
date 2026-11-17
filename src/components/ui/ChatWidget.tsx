import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Loader2, User as UserIcon, Headset, RotateCcw } from 'lucide-react';
import DOMPurify from 'dompurify';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png';

// « Libooks » — assistant IA de la plateforme.
//  1. libooks-ai (Gemini, streaming SSE) quand la clé est connectée dans
//     Super Admin > Intégrations > Gemini ;
//  2. sinon repli automatique sur support-chat (FAQ + escalade humaine) ;
//  3. taper « humain » / « agent » passe la main à l'équipe (temps réel).

interface ChatMessage {
  id: string;
  sender: 'visitor' | 'ai' | 'staff';
  content: string;
  streaming?: boolean;
}

const HUMAN_WORDS = ['humain', 'agent', 'conseiller', 'human', 'someone', 'representative', "quelqu'un"];

function getVisitorId(): string {
  const key = 'libooks_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/** Mise en forme légère des réponses IA (gras, listes, retours ligne). */
function formatAi(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 rounded bg-gray-100 dark:bg-surface-3 text-[12px]">$1</code>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong class="block mt-1">$1</strong>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<span class="block pl-3 relative before:content-[\'•\'] before:absolute before:left-0 before:text-[#0057D9]">$1</span>')
    .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<span class="block pl-4 relative"><span class="absolute left-0 text-[#0057D9] font-semibold">$1.</span>$2</span>')
    .replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(html);
}

export default function ChatWidget() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isFr = !i18n.language?.startsWith('en');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [aiMode, setAiMode] = useState<'unknown' | 'gemini' | 'faq'>('unknown');
  const [teaser, setTeaser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Bulle d'invitation : une seule fois par session, quelques secondes.
  useEffect(() => {
    if (sessionStorage.getItem('libooks_teaser_seen')) return;
    const show = setTimeout(() => { setTeaser(true); sessionStorage.setItem('libooks_teaser_seen', '1'); }, 8000);
    const hide = setTimeout(() => setTeaser(false), 14000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  // Ouverture depuis n'importe où (ex. bouton « Demander à Libooks » de la FAQ)
  useEffect(() => {
    const onOpen = () => openChat();
    window.addEventListener('libooks:open-chat', onOpen);
    return () => window.removeEventListener('libooks:open-chat', onOpen);
  });

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`support-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const row = payload.new as { id: string; sender: 'visitor' | 'ai' | 'staff'; content: string };
        if (row.sender === 'staff') {
          setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, { id: row.id, sender: row.sender, content: row.content }]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  function openChat() {
    setOpen(true);
    setTeaser(false);
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome', sender: 'ai',
        content: isFr
          ? `Bonjour${user ? '' : ' 👋'} ! Je suis **Libooks**, ton assistant IA comptable. Pose-moi une question sur la comptabilité, la TVA, la facturation ou l’application.`
          : `Hi${user ? '' : ' 👋'}! I’m **Libooks**, your AI accounting assistant. Ask me anything about bookkeeping, VAT, invoicing or the app.`,
      }]);
    }
  }

  async function authHeaders() {
    const { data: session } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY };
    headers.Authorization = `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    return headers;
  }

  async function viaFaq(text: string, headers: Record<string, string>) {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`, {
      method: 'POST', headers,
      body: JSON.stringify({ conversation_id: conversationId, message: text, visitor_id: getVisitorId(), language: isFr ? 'fr' : 'en' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setConversationId(json.conversation_id);
    if (json.escalated) setEscalated(true);
    if (json.reply) setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'ai', content: json.reply }]);
  }

  async function viaGemini(text: string, headers: Record<string, string>): Promise<boolean> {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/libooks-ai`, {
      method: 'POST', headers,
      body: JSON.stringify({ conversation_id: conversationId, message: text, visitor_id: getVisitorId(), language: isFr ? 'fr' : 'en' }),
    });
    if (res.status === 503 || res.status === 404) return false; // non configuré → repli FAQ
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/event-stream')) {
      const json = await res.json().catch(() => ({}));
      if (json.escalated) { setEscalated(true); if (json.conversation_id) setConversationId(json.conversation_id); return true; }
      throw new Error(json.error || 'AI error');
    }
    const id = crypto.randomUUID();
    setMessages(prev => [...prev, { id, sender: 'ai', content: '', streaming: true }]);
    setSending(false);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 2);
        if (!chunk.startsWith('data:')) continue;
        try {
          const evt = JSON.parse(chunk.slice(5).trim());
          if (evt.conversation_id) setConversationId(evt.conversation_id);
          if (evt.t) setMessages(prev => prev.map(m => (m.id === id ? { ...m, content: m.content + evt.t } : m)));
        } catch { /* partial */ }
      }
    }
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, streaming: false } : m)));
    return true;
  }

  async function sendMessage(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'visitor', content: text }]);
    setSending(true);
    try {
      const headers = await authHeaders();
      const wantsHuman = HUMAN_WORDS.some(w => text.toLowerCase().includes(w));
      if (escalated || wantsHuman || aiMode === 'faq') {
        await viaFaq(text, headers);
      } else {
        const ok = await viaGemini(text, headers);
        if (ok) setAiMode('gemini');
        else { setAiMode('faq'); await viaFaq(text, headers); }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), sender: 'ai',
        content: isFr ? 'Désolé, une erreur est survenue. Réessaie dans un instant.' : 'Sorry, something went wrong. Please try again shortly.',
      }]);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]); setConversationId(null); setEscalated(false);
    setTimeout(openChat, 0);
  }

  const suggestions = isFr
    ? ['Comment créer ma première facture ?', 'Explique-moi le SYSCOHADA', 'Quel forfait me convient ?', 'Parler à un humain']
    : ['How do I create my first invoice?', 'Explain OHADA accounting', 'Which plan fits me?', 'Talk to a human'];

  return (
    <>
      {!open && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex items-center gap-2">
          {teaser && (
            <button onClick={openChat} className="hidden md:block text-left bg-white dark:bg-surface-1 rounded-full shadow-lg ring-1 ring-gray-100 dark:ring-surface-3 pl-4 pr-3 py-2 text-xs text-gray-700 dark:text-gray-200 animate-fade-in">
              {isFr ? 'Une question ? Demandez à l’IA' : 'Questions? Ask the AI'}
            </button>
          )}
          <button
            onClick={openChat}
            className="lb-ai-fab group relative w-16 h-16 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-300"
            aria-label={isFr ? 'Ouvrir l’assistant IA Libooks' : 'Open the Libooks AI assistant'}
            title="Libooks IA"
          >
            <span className="lb-ai-halo absolute inset-1 rounded-full" />
            <span className="lb-ai-logo relative w-16 h-16 flex items-center justify-center">
              <span className="absolute w-[80%] h-[80%] rounded-full bg-white" />
              <img src={logo} alt="Libooks IA" className="relative w-16 h-16 object-contain drop-shadow-[0_8px_18px_rgba(0,87,217,0.35)]" />
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-5 sm:right-5 z-50 sm:w-[400px] h-[78vh] sm:h-[600px] bg-white dark:bg-surface-1 rounded-2xl shadow-2xl border border-gray-200 dark:border-surface-3 flex flex-col overflow-hidden animate-fade-in">
          <div className="relative text-white px-4 py-3.5 flex items-center justify-between flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg,#0F2A3D 0%,#0057D9 120%)' }}>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow">
                <img src={logo} alt="" className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-1.5">Libooks <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20">IA</span></p>
                <p className="text-xs text-white/70 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${escalated ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                  {escalated ? (isFr ? 'Équipe en cours de connexion…' : 'Team joining…') : (isFr ? 'En ligne · réponses instantanées' : 'Online · instant answers')}
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-1">
              <button onClick={reset} className="p-1.5 text-white/70 hover:text-white" aria-label="Nouvelle conversation"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-white/70 hover:text-white" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 dark:bg-surface-0">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[88%] ${m.sender === 'visitor' ? 'flex-row-reverse' : ''}`}>
                  {m.sender !== 'visitor' && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${m.sender === 'staff' ? 'bg-emerald-100' : 'bg-white ring-1 ring-blue-100 dark:ring-surface-3'}`}>
                      {m.sender === 'staff' ? <UserIcon className="w-3.5 h-3.5 text-emerald-600" /> : <img src={logo} alt="" className="w-4 h-4" />}
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.sender === 'visitor' ? 'bg-[#0057D9] text-white rounded-br-sm' :
                    m.sender === 'staff' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-gray-800 dark:text-gray-100 border border-emerald-200 dark:border-emerald-500/30 rounded-bl-sm' :
                    'bg-white dark:bg-surface-1 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-surface-3 rounded-bl-sm'
                  }`}>
                    {m.sender === 'staff' && <p className="text-[10px] font-semibold text-emerald-600 mb-0.5 flex items-center gap-1"><Headset className="w-3 h-3" /> {isFr ? 'Équipe LiBooks' : 'LiBooks Team'}</p>}
                    {m.sender === 'visitor'
                      ? <p className="whitespace-pre-wrap">{m.content}</p>
                      : <p dangerouslySetInnerHTML={{ __html: formatAi(m.content) + (m.streaming ? '<span class="inline-block w-1.5 h-4 ml-0.5 align-middle bg-[#0057D9] animate-pulse"></span>' : '') }} />}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-surface-1 border border-gray-200 dark:border-surface-3 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#0057D9] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}
            {messages.length <= 1 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map(sg => (
                  <button key={sg} onClick={() => sendMessage(sg)} className="text-xs px-3 py-1.5 rounded-full border border-[#0057D9]/30 text-[#0057D9] bg-white dark:bg-surface-1 hover:bg-[#0057D9] hover:text-white transition-colors">{sg}</button>
                ))}
              </div>
            )}
            {escalated && (
              <p className="text-center text-xs text-gray-400 py-1">
                {isFr ? "Un membre de l'équipe va te répondre ici même." : 'A team member will reply right here.'}
              </p>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 dark:border-surface-3 flex items-end gap-2 flex-shrink-0 bg-white dark:bg-surface-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={isFr ? 'Demande à Libooks…' : 'Ask Libooks…'}
              className="flex-1 resize-none max-h-28 px-3.5 py-2.5 border border-gray-200 dark:border-surface-3 bg-white dark:bg-surface-2 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057D9]"
            />
            <button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className="w-10 h-10 bg-[#0057D9] hover:bg-[#003F9E] disabled:opacity-40 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              aria-label="Envoyer"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 pb-2 bg-white dark:bg-surface-1">Libooks IA peut se tromper — vérifiez les points importants.</p>
        </div>
      )}
    </>
  );
}
