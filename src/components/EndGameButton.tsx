import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Button } from './Button';

interface Props {
  className?: string;
}

export function EndGameButton({ className = '' }: Props) {
  const resetToHome = useGameStore((s) => s.resetToHome);
  const mode = useGameStore((s) => s.mode);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-ink-800/80 text-ink-200 hover:bg-danger hover:text-white ${className}`}
        aria-label="End game"
      >
        <XIcon />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-ink-700 bg-ink-800 p-5 shadow-card"
            >
              <h3 className="font-display text-xl font-bold">End this game?</h3>
              <p className="mt-2 text-sm text-ink-300">
                The current round will be discarded.
                {mode === 'tracked' && ' No scores will be recorded for this game.'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setOpen(false);
                    resetToHome();
                  }}
                >
                  End game
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}
