/* eslint-disable react-refresh/only-export-components */
// Motion primitives — zéro dépendance, 100 % CSS transforms/opacity (GPU),
// IntersectionObserver + requestAnimationFrame, respect de
// prefers-reduced-motion. Utilisés par la landing, le blog et l'app.
import { useEffect, useRef, useState, ReactNode, CSSProperties, ElementType } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useInView<T extends HTMLElement>(threshold = 0.15, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setInView(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); if (once) obs.disconnect(); }
      else if (!once) setInView(false);
    }, { threshold, rootMargin: '0px 0px -8% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return { ref, inView };
}

type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'blur';
const HIDDEN: Record<RevealVariant, string> = {
  up: 'translate3d(0,40px,0)',
  down: 'translate3d(0,-40px,0)',
  left: 'translate3d(-48px,0,0)',
  right: 'translate3d(48px,0,0)',
  zoom: 'scale(0.92)',
  blur: 'translate3d(0,24px,0) scale(0.98)',
};

/** Apparition au scroll : fondu + flou + translation, avec délai (stagger). */
export function Reveal({
  children, delay = 0, className = '', variant = 'blur', duration = 900, as: Tag = 'div',
}: { children: ReactNode; delay?: number; className?: string; variant?: RevealVariant; duration?: number; as?: ElementType }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const style: CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? 'none' : HIDDEN[variant],
    filter: inView ? 'blur(0)' : 'blur(10px)',
    transition: `opacity ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms, filter ${duration}ms ease ${delay}ms`,
    willChange: 'opacity, transform, filter',
  };
  return <Tag ref={ref} className={className} style={style}>{children}</Tag>;
}

/** Titre révélé mot par mot (masque + translation). */
export function SplitText({ text, className = '', wordClassName = '', delay = 0, stagger = 55 }: {
  text: string; className?: string; wordClassName?: string; delay?: number; stagger?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.2);
  const words = text.split(' ');
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <span
            className={`inline-block ${wordClassName}`}
            style={{
              transform: inView ? 'translate3d(0,0,0)' : 'translate3d(0,110%,0)',
              opacity: inView ? 1 : 0,
              transition: `transform 900ms cubic-bezier(.2,.8,.2,1) ${delay + i * stagger}ms, opacity 600ms ease ${delay + i * stagger}ms`,
            }}
          >
            {w}{i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Compteur animé (ease-out) déclenché à l'apparition. */
export function CountUp({ to, duration = 1800, prefix = '', suffix = '', decimals = 0, className = '' }: {
  to: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) { setV(to); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setV(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref} className={className}>{prefix}{v.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Bouton/élément « magnétique » qui suit légèrement le curseur. */
export function Magnetic({ children, strength = 0.25, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate3d(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px, 0)`;
    };
    const leave = () => { el.style.transform = 'translate3d(0,0,0)'; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return <span ref={ref} className={`inline-block transition-transform duration-300 ease-out ${className}`}>{children}</span>;
}

/** Met à jour --mx / --my sur les éléments .lb-spotlight (halo qui suit la souris). */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('.lb-spotlight') as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${e.clientX - r.left}px`);
      target.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);
}

/** Barre de progression de lecture en haut de page. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div ref={ref} className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left bg-gradient-to-r from-[#0057D9] via-[#3B82F6] to-[#22D3EE]" style={{ transform: 'scaleX(0)' }} />;
}

/** Valeur de parallaxe liée au scroll (px), throttlée par rAF. */
export function useParallax<T extends HTMLElement>(speed = 0.15) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);
  return ref;
}

/**
 * Texte géant lié au scroll : chaque ligne glisse horizontalement, lentement,
 * en sens opposé, au rythme du défilement (pas d'animation automatique
 * rapide). Les mots marqués `outline` sont transparents avec contour.
 */
export function GiantScrollText({ lines }: { lines: { words: { text: string; outline?: boolean; accent?: boolean }[] }[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const el = wrap.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const progress = (window.innerHeight - r.top) / (window.innerHeight + r.height); // 0 → 1
      rows.current.forEach((row, i) => {
        if (!row) return;
        const dir = i % 2 === 0 ? -1 : 1;
        // 3 répétitions : on part de -33,3 % pour toujours avoir du texte des
        // deux côtés. Amplitude faible (±12 %) = défilement lent et premium.
        const x = -33.333 + (progress - 0.5) * 24 * dir;
        row.style.transform = `translate3d(${x.toFixed(2)}%, 0, 0)`;
      });
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return (
    <div ref={wrap} className="relative overflow-hidden py-10 sm:py-16 select-none" aria-hidden="true">
      {lines.map((line, i) => (
        <div key={i} ref={(n) => { rows.current[i] = n; }} className="w-max whitespace-nowrap will-change-transform" style={{ transform: 'translate3d(-33.333%,0,0)', transition: 'transform 120ms linear' }}>
          {[0, 1, 2].map((rep) => (
            <span key={rep} className="inline-block pr-[0.3em]">
              {line.words.map((w, j) => (
                <span key={j} className={`lb-giant ${w.outline ? 'lb-outline' : w.accent ? 'lb-giant-accent' : ''}`}>{w.text}{' '}</span>
              ))}
              <span className="lb-giant lb-giant-accent inline-block align-middle px-[0.25em]" style={{ fontSize: "clamp(1.5rem, 5vw, 5rem)" }}>✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Progression 0→1 d'un élément traversant le viewport (rAF-throttlé). */
export function useScrollProgress<T extends HTMLElement>(mode: 'through' | 'pinned' = 'through') {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setP(mode === 'pinned' ? 0.5 : 1); return; }
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const v = mode === 'pinned'
        ? -r.top / Math.max(1, r.height - vh)
        : (vh - r.top) / (vh + r.height);
      setP(Math.min(1, Math.max(0, v)));
      raf = 0;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    update();
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [mode]);
  return { ref, p };
}

