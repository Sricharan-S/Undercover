import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameResult, Group, RosterPlayer } from '../lib/types';
import { uid } from '../lib/random';

export const GROUP_COLORS = [
  '#14b8a6', // teal
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#eab308', // yellow
] as const;

interface GroupsState {
  groups: Group[];
  selectedGroupId: string | null;
  editingGroupId: string | null;

  createGroup: (name?: string, color?: string) => Group;
  renameGroup: (groupId: string, name: string) => void;
  setGroupColor: (groupId: string, color: string) => void;
  deleteGroup: (groupId: string) => void;
  selectGroup: (groupId: string | null) => void;
  setEditingGroup: (groupId: string | null) => void;

  addPlayerToGroup: (groupId: string, name: string) => RosterPlayer | null;
  renamePlayerInGroup: (groupId: string, playerId: string, name: string) => void;
  removePlayerFromGroup: (groupId: string, playerId: string) => void;
  reorderPlayersInGroup: (groupId: string, playerIds: string[]) => void;

  recordGameResult: (groupId: string, results: GameResult[]) => void;
  resetGroupStats: (groupId: string) => void;
  clearAll: () => void;
}

function blankPlayer(name: string): RosterPlayer {
  return {
    id: uid(),
    name: name.trim(),
    createdAt: Date.now(),
    totalScore: 0,
    gamesPlayed: 0,
    wins: 0,
    roleCounts: { civilian: 0, undercover: 0, mrwhite: 0 },
  };
}

function nextGroupName(groups: Group[]): string {
  let n = groups.length + 1;
  while (groups.some((g) => g.name === `New Group ${n}`)) n++;
  return `New Group ${n}`;
}

function nextGroupColor(groups: Group[]): string {
  const used = new Set(groups.map((g) => g.color));
  const free = GROUP_COLORS.find((c) => !used.has(c));
  return free ?? GROUP_COLORS[groups.length % GROUP_COLORS.length];
}

export const useRosterStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: [],
      selectedGroupId: null,
      editingGroupId: null,

      createGroup: (name, color) => {
        const groups = get().groups;
        const g: Group = {
          id: uid(),
          name: (name ?? '').trim() || nextGroupName(groups),
          color: color ?? nextGroupColor(groups),
          players: [],
          createdAt: Date.now(),
        };
        set({ groups: [...groups, g] });
        return g;
      },

      renameGroup: (groupId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          groups: get().groups.map((g) =>
            g.id === groupId ? { ...g, name: trimmed } : g,
          ),
        });
      },

      setGroupColor: (groupId, color) => {
        set({
          groups: get().groups.map((g) =>
            g.id === groupId ? { ...g, color } : g,
          ),
        });
      },

      deleteGroup: (groupId) => {
        const next = get().groups.filter((g) => g.id !== groupId);
        const selectedGroupId =
          get().selectedGroupId === groupId ? null : get().selectedGroupId;
        set({ groups: next, selectedGroupId });
      },

      selectGroup: (groupId) => set({ selectedGroupId: groupId }),

      setEditingGroup: (groupId) => set({ editingGroupId: groupId }),

      addPlayerToGroup: (groupId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return null;
        const exists = group.players.some(
          (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (exists) return null;
        const p = blankPlayer(trimmed);
        set({
          groups: get().groups.map((g) =>
            g.id === groupId ? { ...g, players: [...g.players, p] } : g,
          ),
        });
        return p;
      },

      renamePlayerInGroup: (groupId, playerId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          groups: get().groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  players: g.players.map((p) =>
                    p.id === playerId ? { ...p, name: trimmed } : p,
                  ),
                }
              : g,
          ),
        });
      },

      removePlayerFromGroup: (groupId, playerId) => {
        set({
          groups: get().groups.map((g) =>
            g.id === groupId
              ? { ...g, players: g.players.filter((p) => p.id !== playerId) }
              : g,
          ),
        });
      },

      reorderPlayersInGroup: (groupId, playerIds) => {
        set({
          groups: get().groups.map((g) => {
            if (g.id !== groupId) return g;
            const byId = new Map(g.players.map((p) => [p.id, p]));
            const ordered = playerIds
              .map((id) => byId.get(id))
              .filter((p): p is RosterPlayer => !!p);
            const missing = g.players.filter((p) => !playerIds.includes(p.id));
            return { ...g, players: [...ordered, ...missing] };
          }),
        });
      },

      recordGameResult: (groupId, results) => {
        const byId = new Map(results.map((r) => [r.playerId, r]));
        set({
          groups: get().groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              players: g.players.map((p) => {
                const r = byId.get(p.id);
                if (!r) return p;
                return {
                  ...p,
                  totalScore: p.totalScore + r.scoreDelta,
                  gamesPlayed: p.gamesPlayed + 1,
                  wins: p.wins + (r.won ? 1 : 0),
                  roleCounts: {
                    ...p.roleCounts,
                    [r.role]: p.roleCounts[r.role] + 1,
                  },
                };
              }),
            };
          }),
        });
      },

      resetGroupStats: (groupId) => {
        set({
          groups: get().groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  players: g.players.map((p) => ({
                    ...p,
                    totalScore: 0,
                    gamesPlayed: 0,
                    wins: 0,
                    roleCounts: { civilian: 0, undercover: 0, mrwhite: 0 },
                  })),
                }
              : g,
          ),
        });
      },

      clearAll: () => set({ groups: [], selectedGroupId: null, editingGroupId: null }),
    }),
    { name: 'undercover.groups.v1' },
  ),
);

export function useSelectedGroup(): Group | null {
  const selectedId = useRosterStore((s) => s.selectedGroupId);
  const groups = useRosterStore((s) => s.groups);
  return groups.find((g) => g.id === selectedId) ?? null;
}
