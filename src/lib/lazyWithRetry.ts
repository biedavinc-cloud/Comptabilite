import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'libooks:chunk-reload';

/** Vrai si l'erreur vient d'un fichier de page d'une version précédente (après un déploiement). */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed|is not a valid JavaScript MIME type|Unable to preload CSS/i.test(msg);
}

/**
 * Recharge la page une seule fois (par fenêtre de 30 s) pour récupérer la
 * nouvelle version. Renvoie false si un rechargement vient déjà d'avoir lieu,
 * afin de ne jamais boucler.
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage indisponible : on recharge quand même une fois.
  }
  window.location.reload();
  return true;
}

/** React.lazy avec une nouvelle tentative réseau, puis rechargement automatique vers la nouvelle version. */
export function lazyWithRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      await new Promise((r) => setTimeout(r, 400));
      try {
        return await factory();
      } catch (err2) {
        if (reloadForNewVersion()) return new Promise<{ default: T }>(() => {}); // la page se recharge
        throw err2;
      }
    }
  });
}
