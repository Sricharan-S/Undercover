import { useState } from 'react';
import { Button } from '../components/Button';
import { EndGameButton } from '../components/EndGameButton';
import { useGameStore } from '../store/gameStore';

export function VoteScreen() {
  const players = useGameStore((s) => s.players);
  const round = useGameStore((s) => s.round);
  const eliminate = useGameStore((s) => s.eliminate);
  const setPhase = useGameStore((s) => s.setPhase);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const alive = players.filter((p) => p.alive);
  const target = alive.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="screen">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          onClick={() => setPhase('describe')}
          className="text-sm text-ink-300 hover:text-ink-50"
        >
          ← Back
        </button>
        <h2 className="font-display text-xl font-bold">Vote · Round {round}</h2>
        <EndGameButton />
      </div>
      <p className="mb-4 text-center text-sm text-ink-300">
        Discuss, then tap the player you want to oust.
      </p>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {alive.map((p) => {
          const selected = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedId(p.id);
                setConfirming(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                selected
                  ? 'border-danger bg-danger/10'
                  : 'border-ink-700 bg-ink-800 hover:border-ink-500'
              }`}
            >
              <span className="font-display text-lg font-semibold">{p.name}</span>
              {selected && (
                <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
                  OUST
                </span>
              )}
            </button>
          );
        })}
      </div>

      {target && (
        <div className="space-y-2 pt-4">
          {!confirming ? (
            <Button variant="danger" full onClick={() => setConfirming(true)}>
              Oust {target.name}
            </Button>
          ) : (
            <div className="space-y-2 rounded-2xl border border-danger bg-ink-800 p-3">
              <p className="text-center text-sm">
                Confirm: oust <span className="font-bold">{target.name}</span>?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => eliminate(target.id)}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
