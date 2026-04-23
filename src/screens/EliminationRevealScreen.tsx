import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { EndGameButton } from '../components/EndGameButton';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../lib/sound';
import type { Role } from '../lib/types';

const ROLE_META: Record<
  Role,
  { label: string; accent: string; border: string; bg: string; tagline: string }
> = {
  civilian: {
    label: 'Civilian',
    accent: 'text-good',
    border: 'border-good',
    bg: 'bg-good/10',
    tagline: 'Oops. You just ousted one of your own.',
  },
  undercover: {
    label: 'Undercover',
    accent: 'text-accent',
    border: 'border-accent',
    bg: 'bg-accent/10',
    tagline: 'An infiltrator has been caught!',
  },
  mrwhite: {
    label: 'Mr. White',
    accent: 'text-white',
    border: 'border-white',
    bg: 'bg-white/10',
    tagline: 'Mr. White has been ousted — but they get one last guess…',
  },
};

export function EliminationRevealScreen() {
  const lastOusted = useGameStore((s) => s.lastOusted);
  const round = useGameStore((s) => s.round);
  const continueAfter = useGameStore((s) => s.continueAfterElimination);

  useEffect(() => {
    sfx.eliminate();
  }, []);

  if (!lastOusted) return null;
  const meta = ROLE_META[lastOusted.role];

  return (
    <div className="screen items-center justify-center">
      <div className="flex w-full items-start justify-between gap-2">
        <span className="w-9" />
        <div className="flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Round {round} · Ousted
          </div>
          <motion.h2
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="mt-1 font-display text-3xl font-bold"
          >
            {lastOusted.name}
          </motion.h2>
        </div>
        <EndGameButton />
      </div>

      <motion.div
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className={`my-8 w-full max-w-xs rounded-3xl border-2 p-8 text-center shadow-card ${meta.border} ${meta.bg}`}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-300">
          They were
        </div>
        <div className={`mt-3 font-display text-4xl font-bold ${meta.accent}`}>
          {meta.label}
        </div>
        {lastOusted.word && (
          <div className="mt-4 text-sm text-ink-200">
            Their word was{' '}
            <span className="font-display font-bold text-white">{lastOusted.word}</span>
          </div>
        )}
        <p className="mt-4 text-xs text-ink-300">{meta.tagline}</p>
      </motion.div>

      <div className="w-full">
        <Button full onClick={continueAfter}>
          Continue
        </Button>
      </div>
    </div>
  );
}
