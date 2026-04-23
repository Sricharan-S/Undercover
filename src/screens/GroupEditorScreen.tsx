import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useRosterStore, GROUP_COLORS } from '../store/rosterStore';

export function GroupEditorScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const editingGroupId = useRosterStore((s) => s.editingGroupId);
  const groups = useRosterStore((s) => s.groups);
  const renameGroup = useRosterStore((s) => s.renameGroup);
  const setGroupColor = useRosterStore((s) => s.setGroupColor);
  const addPlayerToGroup = useRosterStore((s) => s.addPlayerToGroup);
  const renamePlayerInGroup = useRosterStore((s) => s.renamePlayerInGroup);
  const removePlayerFromGroup = useRosterStore((s) => s.removePlayerFromGroup);
  const reorderPlayersInGroup = useRosterStore((s) => s.reorderPlayersInGroup);
  const setEditingGroup = useRosterStore((s) => s.setEditingGroup);

  const group = groups.find((g) => g.id === editingGroupId) ?? null;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group?.name ?? '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');

  useEffect(() => {
    if (!group) {
      setPhase('groups');
    }
  }, [group, setPhase]);

  if (!group) return null;

  function handleSaveName() {
    if (!group) return;
    const trimmed = nameDraft.trim();
    if (trimmed) renameGroup(group.id, trimmed);
    else setNameDraft(group.name);
    setEditingName(false);
  }

  function handleAddPlayer() {
    if (!group) return;
    setAddError(null);
    const created = addPlayerToGroup(group.id, newPlayerName);
    if (!created) {
      setAddError(
        newPlayerName.trim() ? 'That name is already in this group.' : 'Enter a name first.',
      );
      return;
    }
    setNewPlayerName('');
  }

  function commitRenamePlayer() {
    if (!group) return;
    if (editingPlayerId && editingPlayerName.trim()) {
      renamePlayerInGroup(group.id, editingPlayerId, editingPlayerName);
    }
    setEditingPlayerId(null);
    setEditingPlayerName('');
  }

  function movePlayer(index: number, dir: -1 | 1) {
    if (!group) return;
    const ids = group.players.map((p) => p.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderPlayersInGroup(group.id, ids);
  }

  function handleDone() {
    setEditingGroup(null);
    setPhase('groups');
  }

  return (
    <div className="screen">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={handleDone}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400"
          aria-label="Back"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
          {editingName ? (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setNameDraft(group.name);
                  setEditingName(false);
                }
              }}
              autoFocus
              maxLength={24}
              className="input max-w-[220px] text-center font-display text-xl font-bold"
            />
          ) : (
            <>
              <h2 className="truncate font-display text-xl font-bold">{group.name}</h2>
              <button
                onClick={() => {
                  setNameDraft(group.name);
                  setEditingName(true);
                }}
                className="text-ink-300 hover:text-ink-50"
                aria-label="Rename group"
              >
                <PencilIcon />
              </button>
            </>
          )}
        </div>
        <span className="w-9" />
      </div>

      <div className="mb-3 flex items-center justify-center gap-3">
        <span className="text-sm text-ink-300">Color:</span>
        <button
          onClick={() => setShowColorPicker((v) => !v)}
          className="h-6 w-6 rounded-full border-2 border-white/20"
          style={{ backgroundColor: group.color }}
          aria-label="Change color"
        />
      </div>

      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex flex-wrap justify-center gap-2 rounded-2xl border border-ink-700 bg-ink-800 p-3"
        >
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setGroupColor(group.id, c);
                setShowColorPicker(false);
              }}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                group.color === c ? 'scale-110 border-white' : 'border-white/10'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Use color ${c}`}
            />
          ))}
        </motion.div>
      )}

      <div className="mb-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-800">
        <div
          className="px-4 py-2 text-center font-display text-sm font-semibold text-white"
          style={{ backgroundColor: group.color }}
        >
          Add, remove or reorder players
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {group.players.length === 0 && (
            <p className="pt-6 text-center text-sm text-ink-400">
              No players yet. Add one below.
            </p>
          )}
          {group.players.map((p, i) => {
            const isEditing = editingPlayerId === p.id;
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 p-2"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                  style={{ backgroundColor: group.color }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                {isEditing ? (
                  <input
                    value={editingPlayerName}
                    onChange={(e) => setEditingPlayerName(e.target.value)}
                    onBlur={commitRenamePlayer}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRenamePlayer();
                      if (e.key === 'Escape') {
                        setEditingPlayerId(null);
                        setEditingPlayerName('');
                      }
                    }}
                    autoFocus
                    maxLength={24}
                    className="input flex-1"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingPlayerId(p.id);
                      setEditingPlayerName(p.name);
                    }}
                    className="min-w-0 flex-1 truncate text-left font-display text-sm font-semibold"
                  >
                    {p.name}
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => movePlayer(i, -1)}
                    disabled={i === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-700 hover:text-ink-50 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => movePlayer(i, 1)}
                    disabled={i === group.players.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-700 hover:text-ink-50 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removePlayerFromGroup(group.id, p.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-danger hover:text-white"
                    aria-label={`Remove ${p.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-ink-700 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddPlayer}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: group.color }}
              aria-label="Add player"
            >
              +
            </button>
            <input
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddPlayer();
              }}
              placeholder="Add new player"
              maxLength={24}
              className="input flex-1"
            />
          </div>
          {addError && <p className="mt-2 text-sm text-danger">{addError}</p>}
        </div>
      </div>

      <Button full onClick={handleDone}>
        Save changes
      </Button>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
