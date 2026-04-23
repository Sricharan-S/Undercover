import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useSelectedGroup } from '../store/rosterStore';
import { sfx } from '../lib/sound';
import type { Role } from '../lib/types';

const ROLE_LABEL: Record<Role, string> = {
  civilian: 'Civilian',
  undercover: 'Undercover',
  mrwhite: 'Mr. White',
};

const ROLE_COLOR: Record<Role, string> = {
  civilian: 'text-good',
  undercover: 'text-accent',
  mrwhite: 'text-white',
};

export function ResultScreen() {
  const winner = useGameStore((s) => s.winner);
  const players = useGameStore((s) => s.players);
  const results = useGameStore((s) => s.results);
  const civilianWord = useGameStore((s) => s.civilianWord);
  const undercoverWord = useGameStore((s) => s.undercoverWord);
  const mode = useGameStore((s) => s.mode);
  const playAgain = useGameStore((s) => s.playAgainSamePlayers);
  const resetToHome = useGameStore((s) => s.resetToHome);
  const setPhase = useGameStore((s) => s.setPhase);
  const selectedGroup = useSelectedGroup();
  const rosterPlayers = selectedGroup?.players ?? [];

  useEffect(() => {
    sfx.win();
  }, []);

  const winnerLabel =
    winner === 'civilians'
      ? 'Civilians win!'
      : winner === 'undercovers'
        ? 'Infiltrators win!'
        : winner === 'mrwhite'
          ? 'Mr. White wins!'
          : 'Game over';

  const winnerColor =
    winner === 'civilians' ? 'text-good' : winner === 'undercovers' ? 'text-accent' : 'text-white';

  return (
    <div className="screen">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">Result</div>
          <h2 className={`mt-1 font-display text-4xl font-bold ${winnerColor}`}>{winnerLabel}</h2>
        </motion.div>

        <div className="mt-4 inline-flex flex-col gap-1 rounded-2xl border border-ink-700 bg-ink-800 px-4 py-3 text-sm">
          <div>
            <span className="text-ink-400">Civilian word: </span>
            <span className="font-display font-bold text-good">{civilianWord}</span>
          </div>
          <div>
            <span className="text-ink-400">Undercover word: </span>
            <span className="font-display font-bold text-accent">{undercoverWord}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
        <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-ink-400">
          Roles revealed
        </h3>
        {players.map((p, i) => {
          const r = results.find((x) => x.playerId === p.id);
          const rosterPlayer =
            mode === 'tracked' ? rosterPlayers.find((x) => x.id === p.id) : undefined;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-800 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display text-base font-semibold">{p.name}</span>
                  {!p.alive && (
                    <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] uppercase text-ink-400">
                      out
                    </span>
                  )}
                </div>
                <div className={`text-xs ${ROLE_COLOR[p.role]}`}>{ROLE_LABEL[p.role]}</div>
              </div>
              {mode === 'tracked' && r && (
                <div className="text-right">
                  <div
                    className={`font-display text-lg font-bold ${
                      r.scoreDelta > 0 ? 'text-good' : 'text-ink-400'
                    }`}
                  >
                    {r.scoreDelta > 0 ? `+${r.scoreDelta}` : '0'}
                  </div>
                  {rosterPlayer && (
                    <div className="text-[10px] text-ink-400">
                      total {rosterPlayer.totalScore}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2 pt-4">
        <Button full onClick={playAgain}>
          Play Again — same players
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setPhase('setup')}>
            New Setup
          </Button>
          {mode === 'tracked' ? (
            <Button variant="secondary" onClick={() => setPhase('leaderboard')}>
              Leaderboard
            </Button>
          ) : (
            <Button variant="secondary" onClick={resetToHome}>
              Home
            </Button>
          )}
        </div>
        {mode === 'tracked' && (
          <Button variant="ghost" full onClick={resetToHome}>
            Home
          </Button>
        )}
      </div>
    </div>
  );
}
