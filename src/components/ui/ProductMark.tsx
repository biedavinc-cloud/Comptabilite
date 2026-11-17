import { EcosystemProduct } from '../../lib/ecosystem';

/** Logo d'un produit Liafrik dans une tuile blanche (ou initiale en repli). */
export default function ProductMark({ p, size = 44, className = '' }: { p: Pick<EcosystemProduct, 'name' | 'logo' | 'color'>; size?: number; className?: string }) {
  if (p.logo) {
    return (
      <span className={`inline-flex items-center justify-center rounded-2xl bg-white ring-1 ring-black/5 shadow-sm flex-shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size }}>
        <img src={p.logo} alt={p.name} loading="lazy" className="w-[78%] h-[78%] object-contain" />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center rounded-2xl text-white font-bold flex-shrink-0 shadow-sm ${className}`} style={{ width: size, height: size, background: p.color, fontSize: size * 0.4 }}>
      {p.name.charAt(0).toUpperCase()}
    </span>
  );
}
