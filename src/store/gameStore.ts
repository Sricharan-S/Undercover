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
import { broadcast, sendToHost, sendToPeer } from '../lib/peer';

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

// ─── Online helpers ───────────────────────────────────────────────────────────

/**
 * After the host mutates local state, broadcast the new public state to all guests.
 * For the reveal phase, sends a private REVEAL_CARD to the current picker so they
 * see their real role/word, and sends a public STATE_UPDATE (without role/word) to all.
 */
function broadcastStateIfOnline(state: GameState) {
  if (state.mode !== 'online') return;

  const publicCards = state.cards.map((c) => ({
    id: c.id,
    pickedByPlayerId: c.pickedByPlayerId,
    role: 'civilian' as const,
    word: null as null,
  }));

  const publicPlayers = state.players.map((p) => ({
    ...p,
    word: null as null,
    role: 'civilian' as const,
  }));

  const publicSpeakingOrder = state.speakingOrder.map((p) => ({
    ...p,
    word: null as null,
    role: 'civilian' as const,
  }));

  // During reveal: privately tell the current picker their real role+word
  if (state.phase === 'reveal' && state.revealCardId) {
    const revealCard = state.cards.find((c) => c.id === state.revealCardId);
    const currentPicker = state.players[state.currentPickerIndex];
    if (revealCard && currentPicker) {
      sendToPeer(currentPicker.id, {
        type: 'REVEAL_CARD' as import('../lib/peer').NetMessageType,
        payload: {
          cardId: revealCard.id,
          role: revealCard.role,
          word: revealCard.word,
          playerId: currentPicker.id,
        },
      });
    }
  }

  broadcast({
    type: 'STATE_UPDATE',
    payload: {
      phase: state.phase,
      players: publicPlayers,
      cards: publicCards,
      speakingOrder: publicSpeakingOrder,
      round: state.round,
      winner: state.winner,
      results: state.results,
      revealCardId: state.revealCardId,
      currentPickerIndex: state.currentPickerIndex,
      lastOusted: state.lastOusted,
      mrwhiteToGuess: state.mrwhiteToGuess,
      category: state.category,
    },
  });
}

/**
 * Returns true if this client is a guest in an online game (not the host).
 * Guests must send actions to the host rather than mutating state locally.
 */
function isOnlineGuest(state: GameState): boolean {
  if (state.mode !== 'online') return false;
  return !_isHost;
}

// Lazily set by onlineStore after host/guest status is determined.
let _isHost = false;
export function setOnlineIsHost(v: boolean) { _isHost = v; }

// ─── Store ────────────────────────────────────────────────────────────────────

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
    const state = get();
    if (isOnlineGuest(state)) {
      sendToHost({ type: 'ACTION', payload: { type: 'PICK_CARD', cardId } });
      return;
    }
    const { cards, players, currentPickerIndex } = state;
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
    broadcastStateIfOnline({ ...state, cards: updatedCards, revealCardId: cardId, phase: 'reveal' });
  },

  closeReveal: () => {
    const state = get();
    if (isOnlineGuest(state)) {
      sendToHost({ type: 'ACTION', payload: { type: 'CLOSE_REVEAL' } });
      return;
    }
    const { cards, players, currentPickerIndex } = state;
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
      broadcastStateIfOnline({ ...state, players: finalized, speakingOrder: buildSpeakingOrder(finalized), revealCardId: null, phase: 'describe' });
    } else {
      set({ currentPickerIndex: nextIdx, revealCardId: null, phase: 'pick' });
      broadcastStateIfOnline({ ...state, currentPickerIndex: nextIdx, revealCardId: null, phase: 'pick' });
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

  startVote: () => {
    const state = get();
    if (isOnlineGuest(state)) {
      sendToHost({ type: 'ACTION', payload: { type: 'START_VOTE' } });
      return;
    }
    set({ phase: 'vote' });
    broadcastStateIfOnline({ ...state, phase: 'vote' });
  },

  eliminate: (playerId) => {
    const state = get();
    if (isOnlineGuest(state)) {
      sendToHost({ type: 'ACTION', payload: { type: 'VOTE', targetId: playerId } });
      return;
    }
    const { players } = state;
    const target = players.find((p) => p.id === playerId);
    if (!target || !target.alive) return;
    const updated = players.map((p) =>
      p.id === playerId ? { ...p, alive: false } : p,
    );
    const newState = {
      players: updated,
      lastOusted: { ...target, alive: false },
      phase: 'eliminationreveal' as Phase,
    };
    set(newState);
    broadcastStateIfOnline({ ...state, ...newState });
  },

  continueAfterElimination: () => {
    const state = get();
    if (isOnlineGuest(state)) {
      sendToHost({ type: 'ACTION', payload: { type: 'CONTINUE_AFTER_ELIMINATION' } });
      return;
    }
    const { players, lastOusted } = state;
    if (!lastOusted) {
      set({ phase: 'describe' });
      broadcastStateIfOnline({ ...state, phase: 'describe' });
      return;
    }

    if (lastOusted.role === 'mrwhite') {
      const newState = {
        mrwhiteToGuess: lastOusted,
        lastOusted: null as null,
        phase: 'mrwhiteguess' as Phase,
      };
      set(newState);
      broadcastStateIfOnline({ ...state, ...newState });
      return;
    }

    const winner = checkWinner(players);
    if (winner) {
      const results = computeResults(players, winner);
      const newState = {
        winner,
        results,
        mrwhiteToGuess: null as null,
        lastOusted: null as null,
        phase: 'result' as Phase,
      };
      set(newState);
      broadcastStateIfOnline({ ...state, ...newState });
      maybeRecord(results);
    } else {
      const newState = {
        round: state.round + 1,
        speakingOrder: buildSpeakingOrder(players),
        lastOusted: null as null,
        phase: 'describe' as Phase,
      };
      set(newState);
      broadcastStateIfOnline({ ...state, ...newState });
    }
  },

  submitMrWhiteGuess: (guessCorrect) => {
    const state = get();
    if (isOnlineGuest(state)) {
      sendToHost({ type: 'ACTION', payload: { type: 'MR_WHITE_GUESS', guessCorrect } });
      return;
    }
    const { players } = state;
    if (guessCorrect) {
      get().endGameAs('mrwhite');
      return;
    }
    const winner = checkWinner(players);
    if (winner) {
      get().endGameAs(winner);
    } else {
      const newState = {
        round: state.round + 1,
        mrwhiteToGuess: null as null,
        speakingOrder: buildSpeakingOrder(players),
        phase: 'describe' as Phase,
      };
      set(newState);
      broadcastStateIfOnline({ ...state, ...newState });
    }
  },

  endGameAs: (winner) => {
    const state = get();
    const { players } = state;
    const results = computeResults(players, winner);
    const newState = { winner, results, mrwhiteToGuess: null as null, phase: 'result' as Phase };
    set(newState);
    broadcastStateIfOnline({ ...state, ...newState });
    maybeRecord(results);
  },

  playAgainSamePlayers: () => {
    const state = get();
    const { players, pendingSetup } = state;
    if (!pendingSetup) {
      set({ phase: 'home' });
      return;
    }
    set((s) => dealNewRound(s, players, pendingSetup));
    // Broadcast the new round state if online (host only)
    if (state.mode === 'online') {
      const nextState = get();
      broadcastStateIfOnline(nextState);
    }
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
