import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { EndGameButton } from '../components/EndGameButton';
import { useGameStore } from '../store/gameStore';

export function RevealScreen() {
  const cards = useGameStore((s) => s.cards);
  const players = useGameStore((s) => s.players);
  const currentPickerIndex = useGameStore((s) => s.currentPickerIndex);
  const revealCardId = useGameStore((s) => s.revealCardId);
  const closeReveal = useGameStore((s) => s.closeReveal);

  const card = cards.find((c) => c.id === revealCardId);
  const player = players[currentPickerIndex];

  const [showWord, setShowWord] = useState(false);

  useEffect(() => {
    setShowWord(false);
    const t = setTimeout(() => setShowWord(true), 250);
    return () => clearTimeout(t);
  }, [revealCardId]);

  if (!card || !player) return null;

  const allPicked = cards.every((c) => c.pickedByPlayerId || c.id === card.id);
  const isLast = allPicked || currentPickerIndex + 1 >= players.length;
  const nextPlayer = players[currentPickerIndex + 1];

  return (
    <div className="screen items-center justify-center">
      <div className="flex w-full items-start justify-between gap-2">
        <span className="w-9" />
        <div className="flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Your role
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">{player.name}</h2>
        </div>
        <EndGameButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: showWord ? 1 : 0, y: showWord ? 0 : 10, scale: showWord ? 1 : 0.95 }}
        transition={{ duration: 0.4 }}
        className="my-8 w-full max-w-xs"
      >
        <div className="rounded-3xl border-2 border-accent bg-ink-700 p-8 text-center shadow-card">
          {card.role === 'mrwhite' ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                You are
              </div>
              <div className="mt-3 font-display text-4xl font-bold text-white">Mr. White</div>
              <p className="mt-3 text-sm text-ink-300">
                You don't have a word. Bluff. Pay attention. Try to guess the Civilians' word if voted out.
              </p>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                Your secret word
              </div>
              <div className="mt-3 break-words font-display text-3xl font-bold text-white">
                {card.word}
              </div>
              <p className="mt-3 text-xs text-ink-400">Keep it secret. You don't know yet which team you're on.</p>
            </>
          )}
        </div>
      </motion.div>

      <div className="w-full pb-2">
        <Button full onClick={closeReveal}>
          {isLast ? 'Got it — Continue' : `Got it — Pass to ${nextPlayer?.name ?? 'next player'}`}
        </Button>
        <p className="mt-2 text-center text-xs text-ink-400">
          Make sure no one else can see the screen.
        </p>
      </div>
    </div>
  );
}
