import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useRosterStore, useSelectedGroup } from '../store/rosterStore';
import { getCategoryOptions } from '../lib/wordPicker';
import {
  maxMrWhitesGiven,
  maxUndercoversGiven,
  suggestedRoles,
  validateRoleCounts,
} from '../lib/roleAssigner';

const categories = getCategoryOptions();

export function SetupScreen() {
  const mode = useGameStore((s) => s.mode);
  const setPhase = useGameStore((s) => s.setPhase);
  const startGame = useGameStore((s) => s.startGame);
  const selectedGroup = useSelectedGroup();
  const addPlayerToGroup = useRosterStore((s) => s.addPlayerToGroup);

  const rosterPlayers = selectedGroup?.players ?? [];

  // Quick-mode names
  const [quickNames, setQuickNames] = useState<string[]>(['', '', '']);
  // Tracked-mode selected ids — default to all players in the selected group
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(rosterPlayers.map((p) => p.id)),
  );
  const [newRosterName, setNewRosterName] = useState('');
  const [rosterError, setRosterError] = useState<string | null>(null);

  // When the selected group changes (e.g. first entering tracked mode), default-select all.
  useEffect(() => {
    if (mode === 'tracked') {
      setSelectedIds(new Set(rosterPlayers.map((p) => p.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.id, mode]);

  const [undercovers, setUndercovers] = useState(1);
  const [mrwhites, setMrwhites] = useState(0);
  const [category, setCategory] = useState<string>('random');
  const [error, setError] = useState<string | null>(null);

  const playersForGame = useMemo<{ id?: string; name: string }[]>(() => {
    if (mode === 'quick') {
      return quickNames
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    }
    return rosterPlayers
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name }));
  }, [mode, quickNames, rosterPlayers, selectedIds]);

  const playerCount = playersForGame.length;

  // Auto-suggest / clamp counts when player count changes
  useEffect(() => {
    if (playerCount < 3) return;
    const s = suggestedRoles(playerCount);
    setUndercovers((u) => {
      const clamped = Math.min(u, maxUndercoversGiven(playerCount, mrwhites));
      return clamped === 0 && u === 0 ? 0 : clamped || s.undercovers;
    });
    setMrwhites((m) => Math.min(m, maxMrWhitesGiven(playerCount, undercovers)));
    // Intentionally only on playerCount change; individual role changes self-clamp via handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCount]);

  const maxU = maxUndercoversGiven(playerCount < 3 ? 3 : playerCount, mrwhites);
  const maxM = maxMrWhitesGiven(playerCount < 3 ? 3 : playerCount, undercovers);

  function handleSetUndercovers(next: number) {
    const clamped = Math.max(0, Math.min(next, maxU));
    setUndercovers(clamped);
    // If the new undercover count invalidates mrwhites, clamp mrwhites too.
    const newMaxM = maxMrWhitesGiven(playerCount < 3 ? 3 : playerCount, clamped);
    if (mrwhites > newMaxM) setMrwhites(newMaxM);
  }

  function handleSetMrwhites(next: number) {
    const clamped = Math.max(0, Math.min(next, maxM));
    setMrwhites(clamped);
    const newMaxU = maxUndercoversGiven(playerCount < 3 ? 3 : playerCount, clamped);
    if (undercovers > newMaxU) setUndercovers(newMaxU);
  }

  function setQuickName(idx: number, val: string) {
    const next = quickNames.slice();
    next[idx] = val;
    setQuickNames(next);
  }
  function addQuickRow() {
    if (quickNames.length >= 20) return;
    setQuickNames([...quickNames, '']);
  }
  function removeQuickRow(idx: number) {
    if (quickNames.length <= 1) return;
    setQuickNames(quickNames.filter((_, i) => i !== idx));
  }

  function toggleSelected(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function handleAddRoster() {
    setRosterError(null);
    if (!selectedGroup) {
      setRosterError('Select a group first.');
      return;
    }
    const created = addPlayerToGroup(selectedGroup.id, newRosterName);
    if (!created) {
      setRosterError(
        newRosterName.trim() ? 'That name is already in this group.' : 'Enter a name first.',
      );
      return;
    }
    const next = new Set(selectedIds);
    next.add(created.id);
    setSelectedIds(next);
    setNewRosterName('');
  }

  function handleStart() {
    setError(null);
    if (mode === 'quick') {
      const names = quickNames.map((n) => n.trim()).filter(Boolean);
      const lower = names.map((n) => n.toLowerCase());
      const dup = lower.find((n, i) => lower.indexOf(n) !== i);
      if (dup) {
        setError('Player names must be unique.');
        return;
      }
    }
    const v = validateRoleCounts(playerCount, undercovers, mrwhites);
    if (!v.ok) {
      setError(v.reason ?? 'Invalid setup.');
      return;
    }
    startGame({
      mode,
      playerNames: playersForGame,
      undercovers,
      mrwhites,
      category,
      groupId: mode === 'tracked' ? selectedGroup?.id ?? null : null,
    });
  }

  return (
    <div className="screen">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setPhase('home')} className="text-sm text-ink-300 hover:text-ink-50">
          ← Back
        </button>
        <h2 className="font-display text-xl font-bold">
          {mode === 'quick'
            ? 'Quick Game'
            : selectedGroup
              ? selectedGroup.name
              : 'Tracked Game'}
        </h2>
        <span className="w-10" />
      </div>

      {mode === 'tracked' && selectedGroup && (
        <div
          className="mb-3 rounded-xl px-3 py-1.5 text-center text-xs font-semibold text-white"
          style={{ backgroundColor: selectedGroup.color }}
        >
          Tracking scores for {selectedGroup.name}
        </div>
      )}

      {/* Players section */}
      <div className="mb-4 flex-1 overflow-y-auto pr-1">
        <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-ink-400">
          Players ({playerCount})
        </h3>
        {mode === 'quick' ? (
          <div className="space-y-2">
            {quickNames.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setQuickName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  className="input flex-1"
                  maxLength={24}
                />
                <button
                  onClick={() => removeQuickRow(i)}
                  className="rounded-xl px-3 text-ink-400 hover:bg-ink-700 hover:text-ink-50"
                  disabled={quickNames.length <= 1}
                  aria-label="Remove player"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addQuickRow}
              disabled={quickNames.length >= 20}
              className="w-full rounded-xl border border-dashed border-ink-600 py-2 text-sm text-ink-300 hover:border-accent hover:text-accent disabled:opacity-40"
            >
              + Add another player
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!selectedGroup && (
              <div className="rounded-2xl border border-dashed border-ink-700 p-4 text-center text-sm text-ink-400">
                No group selected. Pick a group first.
              </div>
            )}
            {selectedGroup && rosterPlayers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-700 p-4 text-center text-sm text-ink-400">
                This group has no players. Add one below to get started.
              </div>
            )}
            {rosterPlayers.map((p) => {
              const selected = selectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSelected(p.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-ink-700 bg-ink-800 hover:border-ink-500'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-semibold">{p.name}</div>
                    <div className="text-xs text-ink-400">
                      {p.totalScore} pts · {p.gamesPlayed} games
                    </div>
                  </div>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      selected ? 'border-accent bg-accent text-ink-900' : 'border-ink-500'
                    }`}
                  >
                    {selected && '✓'}
                  </div>
                </button>
              );
            })}
            <div className="flex gap-2 pt-2">
              <input
                value={newRosterName}
                onChange={(e) => setNewRosterName(e.target.value)}
                placeholder="+ Add new player to roster"
                className="input flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddRoster();
                }}
                maxLength={24}
              />
              <Button onClick={handleAddRoster}>Add</Button>
            </div>
            {rosterError && <p className="text-sm text-danger">{rosterError}</p>}
          </div>
        )}
      </div>

      {/* Roles + category */}
      <div className="space-y-3 border-t border-ink-700 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <ReadOnlyCounter
            label="Civilians"
            value={Math.max(0, playerCount - undercovers - mrwhites)}
            accent="good"
          />
          <Counter
            label="Undercovers"
            value={undercovers}
            min={0}
            max={maxU}
            onChange={handleSetUndercovers}
          />
          <Counter
            label="Mr. Whites"
            value={mrwhites}
            min={0}
            max={maxM}
            onChange={handleSetMrwhites}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-400">
            Word category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button full onClick={handleStart} disabled={playerCount < 3}>
          Start Game
        </Button>
        <p className="text-center text-xs text-ink-400">
          {playerCount < 3
            ? `Need at least 3 players (${3 - playerCount} more)`
            : 'Civilians are auto-calculated from the remaining players.'}
        </p>
      </div>
    </div>
  );
}

interface CounterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function Counter({ label, value, min, max, onChange }: CounterProps) {
  return (
    <div>
      <label className="mb-1 block truncate text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </label>
      <div className="flex items-center justify-between rounded-xl border border-ink-600 bg-ink-800 p-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-10 w-8 rounded-lg text-xl font-bold text-ink-200 hover:bg-ink-700 disabled:opacity-30"
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="font-display text-2xl font-bold">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-10 w-8 rounded-lg text-xl font-bold text-ink-200 hover:bg-ink-700 disabled:opacity-30"
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface ReadOnlyCounterProps {
  label: string;
  value: number;
  accent?: 'good' | 'accent' | 'white';
}

function ReadOnlyCounter({ label, value, accent = 'good' }: ReadOnlyCounterProps) {
  const color =
    accent === 'good' ? 'text-good' : accent === 'accent' ? 'text-accent' : 'text-white';
  return (
    <div>
      <label className="mb-1 block truncate text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </label>
      <div className="flex h-12 items-center justify-center rounded-xl border border-ink-700 bg-ink-800/60">
        <span className={`font-display text-2xl font-bold ${color}`}>{value}</span>
      </div>
    </div>
  );
}
