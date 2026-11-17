/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Monitor, Check } from 'lucide-react';
import logo from '../../assets/logo.png';

// Installation de LiBooks comme application (PWA) : Android / Chrome / Edge
// via l'invite native, iPhone/iPad via la feuille de partage Safari.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try { localStorage.setItem('libooks_app_installed', '1'); } catch { /* ignore */ }
    listeners.forEach((l) => l());
  });
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

export function usePWAInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const installed = isStandalone() || (typeof localStorage !== 'undefined' && localStorage.getItem('libooks_app_installed') === '1');
  return {
    installed,
    canPrompt: !!deferred,
    ios: isIOS(),
    async install(): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> {
      if (deferred) {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        deferred = null;
        if (outcome === 'accepted') { try { localStorage.setItem('libooks_app_installed', '1'); } catch { /* ignore */ } }
        return outcome;
      }
      return isIOS() ? 'ios' : 'unavailable';
    },
  };
}

export function InstallGuideModal({ onClose }: { onClose: () => void }) {
  const ios = isIOS();
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-1 p-6 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-white ring-1 ring-black/5 shadow flex items-center justify-center"><img src={logo} alt="" className="w-8 h-8" /></span>
            <div><p className="font-semibold text-gray-900 dark:text-white">Installer LiBooks</p><p className="text-xs text-gray-500">Gratuit · moins de 3 Mo · fonctionne hors ligne</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {ios ? (
          <ol className="mt-6 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-[#0057D9] text-white text-xs font-bold flex items-center justify-center">1</span><span>Dans Safari, touchez <Share className="inline w-4 h-4 text-[#0057D9]" /> <b>Partager</b> en bas de l’écran.</span></li>
            <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-[#0057D9] text-white text-xs font-bold flex items-center justify-center">2</span><span>Choisissez <PlusSquare className="inline w-4 h-4 text-[#0057D9]" /> <b>Sur l’écran d’accueil</b>.</span></li>
            <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-[#0057D9] text-white text-xs font-bold flex items-center justify-center">3</span><span>Touchez <b>Ajouter</b> : LiBooks s’ouvre désormais comme une application.</span></li>
          </ol>
        ) : (
          <div className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p className="flex gap-3"><Smartphone className="w-5 h-5 text-[#0057D9] flex-shrink-0" /> <span><b>Android</b> : menu ⋮ de Chrome → <b>Installer l’application</b>.</span></p>
            <p className="flex gap-3"><Monitor className="w-5 h-5 text-[#0057D9] flex-shrink-0" /> <span><b>Ordinateur</b> : icône d’installation à droite de la barre d’adresse (Chrome, Edge).</span></p>
          </div>
        )}
        <button onClick={onClose} className="mt-6 w-full btn-primary">J’ai compris</button>
      </div>
    </div>
  );
}

/** Bouton d'installation prêt à l'emploi. */
export function InstallAppButton({ className = '', label = 'Installer l’application', compact = false }: { className?: string; label?: string; compact?: boolean }) {
  const pwa = usePWAInstall();
  const [guide, setGuide] = useState(false);
  if (pwa.installed) {
    return compact ? null : <span className={`inline-flex items-center gap-2 text-sm text-emerald-600 ${className}`}><Check className="w-4 h-4" /> Application installée</span>;
  }
  return (
    <>
      <button
        onClick={async () => { const r = await pwa.install(); if (r === 'ios' || r === 'unavailable') setGuide(true); }}
        className={className || 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0057D9] text-white text-sm font-semibold hover:bg-[#003F9E]'}
        title="Installer LiBooks"
      >
        <Download className="w-4 h-4" /> {!compact && label}
      </button>
      {guide && <InstallGuideModal onClose={() => setGuide(false)} />}
    </>
  );
}
