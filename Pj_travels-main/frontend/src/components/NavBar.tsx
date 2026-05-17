import { motion } from 'framer-motion';

interface NavBarProps {
  useMock: boolean;
  onToggleMock: () => void;
  onClear: () => void;
}

export default function NavBar({ useMock, onToggleMock, onClear }: NavBarProps) {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 glass-panel border-t-0 border-x-0 rounded-none"
    >
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl tracking-tight text-night-800">
            PJ Travels
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-coral" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="px-3.5 py-1.5 text-sm font-medium text-night-600 hover:text-night-800 border border-ocean-100 rounded-lg hover:border-ocean/30 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onToggleMock}
            className={`relative px-3.5 py-1.5 text-sm font-medium rounded-lg border transition-all ${
              useMock
                ? 'bg-ocean text-white border-ocean'
                : 'text-night-600 border-ocean-100 hover:border-ocean/30'
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  useMock ? 'bg-white animate-pulse-glow' : 'bg-ocean-300'
                }`}
              />
              Sample
            </span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}