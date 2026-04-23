import { create } from 'zustand';
import type {
  Card,
  GameMode,
  GamePlayer,
  GameResult,
  Phase,
  WinningTeam,
} from '../lib/types';
import { uid } from '../lib/random';
import { applyCardsToPlayers, buildCardDeck, buildSpeakingOrder } from '../lib/roleAssigner';
import { pickWordPair } from '../lib/wordPicker';
import { checkWinner, computeResults } from '../lib/scoring';
import { useRosterStore } from './rosterStore';

interface PendingSetup {
  category: string;
  undercovers: number;
  mrwhites: number;
  groupId: string | null;
}

interface GameState {
  phase: Phase;
  mode: GameMode;
  players: GamePlayer[];
  cards: Card[];
  category: string;
  civilianWord: string;
  undercoverWord: string;
  currentPickerIndex: number;
  revealCardId: string | null;
  speakingOrder: GamePlayer[];
  round: number;
  winner: WinningTeam;
  results: GameResult[];
  // Pair keys used in this session — avoid repeating in "Play Again"
  usedPairKeys: string[];
  pendingSetup: PendingSetup | null;
  mrwhiteToGuess: GamePlayer | null;
  lastOusted: GamePlayer | null;

  setPhase: (p: Phase) => void;
  startGame: (params: {
    mode: GameMode;
    playerNames: { id?: string; name: string }[]; // id present for tracked group players
    undercovers: number;
    mrwhites: number;
    category: string;
    groupId?: string | null;
  }) => void;
  pickCard: (cardId: string) => void;
  finishCardPicking: () => void;
  closeReveal: () => void;
  startVote: () => void;
  eliminate: (playerId: string) => void;
  continueAfterElimination: () => void;
  submitMrWhiteGuess: (guessCorrect: boolean) => void;
  endGameAs: (winner: WinningTeam) => void;
  playAgainSamePlayers: () => void;
  resetToHome: () => void;
}

const initial: Omit<
  GameState,
  | 'setPhase'
  | 'startGame'
  | 'pickCard'
  | 'finishCardPicking'
  | 'closeReveal'
  | 'startVote'
  | 'eliminate'
  | 'continueAfterElimination'
  | 'submitMrWhiteGuess'
  | 'endGameAs'
  | 'playAgainSamePlayers'
  | 'resetToHome'
> = {
  phase: 'home',
  mode: 'quick',
  players: [],
  cards: [],
  category: 'random',
  civilianWord: '',
  undercoverWord: '',
  currentPickerIndex: 0,
  revealCardId: null,
  speakingOrder: [],
  round: 1,
  winner: null,
  results: [],
  usedPairKeys: [],
  pendingSetup: null,
  mrwhiteToGuess: null,
  lastOusted: null,
};

function dealNewRound(
  state: GameState,
  players: GamePlayer[],
  setup: PendingSetup,
): Partial<GameState> {
  const used = new Set(state.usedPairKeys);
  const pair = pickWordPair(setup.category, used);
  const deck = buildCardDeck(
    players.length,
    setup.undercovers,
    setup.mrwhites,
    pair.civilian,
    pair.undercover,
  );
  return {
    phase: 'pick',
    players: players.map((p) => ({ ...p, role: 'civilian', word: null, alive: true })),
    cards: deck,
    civilianWord: pair.civilian,
    undercoverWord: pair.undercover,
    category: pair.category,
    currentPickerIndex: 0,
    revealCardId: null,
    speakingOrder: [],
    round: 1,
    winner: null,
    results: [],
    usedPairKeys: [...state.usedPairKeys, pair.key],
    pendingSetup: setup,
    mrwhiteToGuess: null,
    lastOusted: null,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initial,

  setPhase: (p) => set({ phase: p }),

  startGame: ({ mode, playerNames, undercovers, mrwhites, category, groupId }) => {
    const players: GamePlayer[] = playerNames.map((p) => ({
      id: p.id ?? uid(),
      name: p.name,
      role: 'civilian',
      word: null,
      alive: true,
    }));
    const setup: PendingSetup = {
      category,
      undercovers,
      mrwhites,
      groupId: groupId ?? null,
    };
    set({
      ...initial,
      mode,
      ...dealNewRound({ ...initial, mode } as GameState, players, setup),
    });
  },

  pickCard: (cardId) => {
    const { cards, players, currentPickerIndex } = get();
    const player = players[currentPickerIndex];
    if (!player) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.pickedByPlayerId) return;
    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, pickedByPlayerId: player.id } : c,
    );
    set({
      cards: updatedCards,
      revealCardId: cardId,
      phase: 'reveal',
    });
  },

  closeReveal: () => {
    const { cards, players, currentPickerIndex } = get();
    const allPicked = cards.every((c) => c.pickedByPlayerId);
    const nextIdx = currentPickerIndex + 1;
    if (allPicked || nextIdx >= players.length) {
      // Finalize roles on players, then go to describe
      const finalized = applyCardsToPlayers(players, cards);
      set({
        players: finalized,
        speakingOrder: buildSpeakingOrder(finalized),
        revealCardId: null,
        phase: 'describe',
      });
    } else {
      set({ currentPickerIndex: nextIdx, revealCardId: null, phase: 'pick' });
    }
  },

  finishCardPicking: () => {
    const { players, cards } = get();
    const finalized = applyCardsToPlayers(players, cards);
    set({
      players: finalized,
      speakingOrder: buildSpeakingOrder(finalized),
      revealCardId: null,
      phase: 'describe',
    });
  },

  startVote: () => set({ phase: 'vote' }),

  eliminate: (playerId) => {
    const { players } = get();
    const target = players.find((p) => p.id === playerId);
    if (!target || !target.alive) return;
    const updated = players.map((p) =>
      p.id === playerId ? { ...p, alive: false } : p,
    );
    set({
      players: updated,
      lastOusted: { ...target, alive: false },
      phase: 'eliminationreveal',
    });
  },

  continueAfterElimination: () => {
    const { players, lastOusted } = get();
    if (!lastOusted) {
      set({ phase: 'describe' });
      return;
    }

    if (lastOusted.role === 'mrwhite') {
      set({
        mrwhiteToGuess: lastOusted,
        lastOusted: null,
        phase: 'mrwhiteguess',
      });
      return;
    }

    const winner = checkWinner(players);
    if (winner) {
      const results = computeResults(players, winner);
      set({
        winner,
        results,
        mrwhiteToGuess: null,
        lastOusted: null,
        phase: 'result',
      });
      maybeRecord(results);
    } else {
      set({
        round: get().round + 1,
        speakingOrder: buildSpeakingOrder(players),
        lastOusted: null,
        phase: 'describe',
      });
    }
  },

  submitMrWhiteGuess: (guessCorrect) => {
    const { players } = get();
    if (guessCorrect) {
      get().endGameAs('mrwhite');
      return;
    }
    const winner = checkWinner(players);
    if (winner) {
      get().endGameAs(winner);
    } else {
      set({
        round: get().round + 1,
        mrwhiteToGuess: null,
        speakingOrder: buildSpeakingOrder(players),
        phase: 'describe',
      });
    }
  },

  endGameAs: (winner) => {
    const { players } = get();
    const results = computeResults(players, winner);
    set({ winner, results, mrwhiteToGuess: null, phase: 'result' });
    maybeRecord(results);
  },

  playAgainSamePlayers: () => {
    const { players, pendingSetup } = get();
    if (!pendingSetup) {
      set({ phase: 'home' });
      return;
    }
    set((state) => dealNewRound(state, players, pendingSetup));
  },

  resetToHome: () => set({ ...initial }),
}));

// Helper: only record stats in tracked mode and only once per game.
let lastRecordedRoundKey: string | null = null;
function maybeRecord(results: GameResult[]) {
  const state = useGameStore.getState();
  if (state.mode !== 'tracked') return;
  const groupId = state.pendingSetup?.groupId;
  if (!groupId) return;
  // Build a key unique to this game outcome to avoid double-record on rerenders
  const key = `${results.map((r) => `${r.playerId}:${r.scoreDelta}`).join(',')}|${state.round}|${state.civilianWord}`;
  if (lastRecordedRoundKey === key) return;
  lastRecordedRoundKey = key;
  useRosterStore.getState().recordGameResult(groupId, results);
}
