import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useRosterStore } from '../store/rosterStore';
import { sfx } from '../lib/sound';

export function GroupsScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const groups = useRosterStore((s) => s.groups);
  const selectedGroupId = useRosterStore((s) => s.selectedGroupId);
  const createGroup = useRosterStore((s) => s.createGroup);
  const deleteGroup = useRosterStore((s) => s.deleteGroup);
  const selectGroup = useRosterStore((s) => s.selectGroup);
  const setEditingGroup = useRosterStore((s) => s.setEditingGroup);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleCreate() {
    sfx.click();
    const g = createGroup();
    setEditingGroup(g.id);
    setPhase('groupeditor');
  }

  function handleEdit(groupId: string) {
    sfx.tap();
    setEditingGroup(groupId);
    setPhase('groupeditor');
  }

  function handleSelect(groupId: string) {
    sfx.click();
    selectGroup(selectedGroupId === groupId ? null : groupId);
  }

  return (
    <div className="screen">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setPhase('home')}
          className="text-sm text-ink-300 hover:text-ink-50"
        >
          ← Back
        </button>
        <h2 className="font-display text-2xl font-bold">Groups</h2>
        <button
          onClick={handleCreate}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-2xl font-bold text-ink-50 hover:bg-ink-600"
          aria-label="New group"
        >
          +
        </button>
      </div>

      <p className="mb-4 text-center text-sm text-ink-300">
        Create and edit groups of players to save time next time you play.
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 p-8 text-center">
            <p className="text-sm text-ink-400">
              No groups yet. Tap <span className="font-bold text-ink-200">+</span> to create your
              first group of players.
            </p>
          </div>
        )}

        {groups.map((g) => {
          const isSelected = selectedGroupId === g.id;
          const isConfirming = confirmDeleteId === g.id;
          return (
            <motion.div
              key={g.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-800"
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: g.color }}
              >
                <span className="flex-1 text-center font-display text-lg font-bold text-white drop-shadow">
                  {g.name}
                </span>
                <button
                  onClick={() => handleEdit(g.id)}
                  className="rounded-full p-1.5 text-white/90 hover:bg-white/10"
                  aria-label={`Edit ${g.name}`}
                >
                  <PencilIcon />
                </button>
              </div>

              <div className="p-3">
                {g.players.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {g.players.map((p) => (
                      <div key={p.id} className="flex flex-col items-center">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                          style={{ backgroundColor: g.color }}
                        >
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="mt-1 max-w-[60px] truncate text-xs text-ink-300">
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 text-center text-xs text-ink-400">No players yet</p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleSelect(g.id)}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'border-transparent bg-white text-ink-900'
                        : 'border-current bg-transparent'
                    }`}
                    style={!isSelected ? { color: g.color, borderColor: g.color } : undefined}
                  >
                    {isSelected ? '✓ Selected' : 'Select group'}
                  </button>
                  <button
                    onClick={() =>
                      setConfirmDeleteId(isConfirming ? null : g.id)
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      isConfirming
                        ? 'bg-danger text-white'
                        : 'text-ink-400 hover:bg-ink-700 hover:text-ink-50'
                    }`}
                    aria-label={`Delete ${g.name}`}
                  >
                    <TrashIcon />
                  </button>
                </div>

                {isConfirming && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-ink-700 p-2 text-sm">
                    <span>Delete {g.name}?</span>
                    <button
                      onClick={() => {
                        deleteGroup(g.id);
                        setConfirmDeleteId(null);
                      }}
                      className="rounded-lg bg-danger px-3 py-1 text-xs font-semibold text-white"
                    >
                      Yes, delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={() => setPhase('home')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-card hover:bg-sky-400"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}
