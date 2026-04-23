import { Button } from '../components/Button';
import { EndGameButton } from '../components/EndGameButton';
import { useGameStore } from '../store/gameStore';

export function DescribeScreen() {
  const speakingOrder = useGameStore((s) => s.speakingOrder);
  const round = useGameStore((s) => s.round);
  const startVote = useGameStore((s) => s.startVote);

  const first = speakingOrder[0];

  return (
    <div className="screen">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="w-9" />
        <div className="flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Round {round} · Describing phase
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">Take turns describing</h2>
        </div>
        <EndGameButton />
      </div>

      <div className="mt-4 rounded-2xl border border-accent bg-accent/10 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-accent">Goes first</div>
        <div className="mt-1 font-display text-3xl font-bold text-white">{first?.name}</div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-ink-400">
          Speaking order
        </h3>
        <ol className="space-y-2">
          {speakingOrder.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800 px-4 py-3"
            >
              <span className="font-display text-lg font-bold text-accent w-6">{i + 1}</span>
              <span className="font-display text-base font-semibold">{p.name}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2 pt-4">
        <p className="text-center text-xs text-ink-400">
          Each player gives one word or phrase about their secret word. Don't be too obvious — Mr. White is listening.
        </p>
        <Button full onClick={startVote}>
          Done describing — Vote
        </Button>
      </div>
    </div>
  );
}
