import { Card } from '../components/Card';
import { EndGameButton } from '../components/EndGameButton';
import { useGameStore } from '../store/gameStore';

export function CardPickScreen() {
  const players = useGameStore((s) => s.players);
  const cards = useGameStore((s) => s.cards);
  const currentPickerIndex = useGameStore((s) => s.currentPickerIndex);
  const pickCard = useGameStore((s) => s.pickCard);

  const player = players[currentPickerIndex];
  const remaining = cards.filter((c) => !c.pickedByPlayerId);
  const total = cards.length;
  const picked = total - remaining.length;

  if (!player) {
    return (
      <div className="screen items-center justify-center">
        <p className="text-ink-300">Loading…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="w-9" />
        <div className="flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Card {picked + 1} of {total}
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold">{player.name}</h2>
          <p className="mt-1 text-sm text-ink-300">Pick a card. Don't show anyone.</p>
        </div>
        <EndGameButton />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="grid grid-cols-3 place-items-center gap-3">
          {cards.map((c, i) => (
            <Card
              key={c.id}
              number={i + 1}
              disabled={!!c.pickedByPlayerId}
              onClick={() => pickCard(c.id)}
            />
          ))}
        </div>
      </div>

      <p className="pt-3 text-center text-xs text-ink-400">
        Cards are shuffled. Tap any face-down card.
      </p>
    </div>
  );
}
