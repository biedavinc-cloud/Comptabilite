import logo from '../../assets/logo.png';

/** Écran de chargement premium : anneau animé + halo autour du logo LiBooks. */
export default function LogoLoader({ label = 'Chargement', fullscreen = true }: { label?: string; fullscreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${fullscreen ? 'min-h-screen' : 'py-24'} flex items-center justify-center bg-white dark:bg-surface-0`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[#0057D9]/20 lb-loader-halo" />
          <span className="absolute inset-0 rounded-full lb-loader-ring" />
          <span className="absolute inset-[10px] rounded-full bg-white dark:bg-surface-1 shadow-lg shadow-[#0057D9]/20" />
          <img src={logo} alt="LiBooks" className="relative w-12 h-12 lb-loader-logo" />
        </div>
        <div className="text-center">
          <p className="text-base tracking-tight text-[#0F2A3D] dark:text-white">
            <span className="font-bold">Li</span><span className="font-medium text-[#0057D9]">Books</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{label}…</p>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
