import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useRosterStore, useSelectedGroup } from '../store/rosterStore';
import type { Role } from '../lib/types';

const ROLE_LABEL: Record<Role, string> = {
  civilian: 'Civilian',
  undercover: 'Undercover',
  mrwhite: 'Mr. White',
};

export function LeaderboardScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const selectedGroup = useSelectedGroup();
  const resetGroupStats = useRosterStore((s) => s.resetGroupStats);
  const [confirmReset, setConfirmReset] = useState(false);

  const sorted = useMemo(
    () =>
      (selectedGroup?.players ?? [])
        .slice()
        .sort((a, b) =>
          b.totalScore !== a.totalScore
            ? b.totalScore - a.totalScore
            : b.gamesPlayed - a.gamesPlayed,
        ),
    [selectedGroup],
  );

  return (
    <div className="screen">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setPhase('home')} className="text-sm text-ink-300 hover:text-ink-50">
          ← Back
        </button>
        <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
        <span className="w-10" />
      </div>

      {selectedGroup ? (
        <div
          className="mb-3 rounded-xl px-3 py-1.5 text-center text-xs font-semibold text-white"
          style={{ backgroundColor: selectedGroup.color }}
        >
          {selectedGroup.name}
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-dashed border-ink-700 px-3 py-2 text-center text-sm text-ink-400">
          No group selected.
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {selectedGroup && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 p-6 text-center text-sm text-ink-400">
            No players in this group yet. Add some, then play a Tracked Game.
          </div>
        )}
        {sorted.map((p, i) => {
          const winRate = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
          const mostRoleEntry = (Object.entries(p.roleCounts) as [Role, number][])
            .sort((a, b) => b[1] - a[1])[0];
          const mostRole =
            mostRoleEntry && mostRoleEntry[1] > 0 ? ROLE_LABEL[mostRoleEntry[0]] : '—';
          // Only award medal colors once the row has actually participated in a
          // game — otherwise every new group shows a gold/silver/bronze podium
          // for people who haven't played yet.
          const hasPlayed = p.gamesPlayed > 0;
          const medalClass = !hasPlayed
            ? 'bg-ink-700 text-ink-200'
            : i === 0
              ? 'bg-accent text-ink-900'
              : i === 1
                ? 'bg-ink-300 text-ink-900'
                : i === 2
                  ? 'bg-amber-700 text-white'
                  : 'bg-ink-700 text-ink-200';
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-800 px-4 py-3"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold ${medalClass}`}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-semibold">{p.name}</div>
                <div className="text-xs text-ink-400">
                  {p.gamesPlayed} games · {winRate}% wins · most-played: {mostRole}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold text-accent">{p.totalScore}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400">pts</div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedGroup && sorted.length > 0 && (
        <div className="pt-4">
          {!confirmReset ? (
            <Button variant="ghost" full onClick={() => setConfirmReset(true)}>
              Reset leaderboard
            </Button>
          ) : (
            <div className="space-y-2 rounded-2xl border border-danger bg-ink-800 p-3">
              <p className="text-center text-sm">
                Reset all scores and stats for {selectedGroup.name}? Players stay in the group.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    resetGroupStats(selectedGroup.id);
                    setConfirmReset(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
