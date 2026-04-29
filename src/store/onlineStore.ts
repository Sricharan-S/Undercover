/**
 * Zustand store for the online multiplayer session.
 *
 * Kept separate from gameStore so that the offline path is completely
 * unaffected and so online state can be torn down independently.
 */

import { create } from 'zustand';
import type { RoomPlayer, NetMessage } from '../lib/peer';
import { onMessage } from '../lib/peer';
import { setOnlineIsHost } from './gameStore';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface OnlineState {
  // Whether this client is the room host
  isHost: boolean;
  // The 6-character room code (= host's PeerJS ID)
  roomId: string | null;
  // This client's own PeerJS ID
  localPeerId: string | null;
  // My player name in the online session
  myName: string;
  // All players currently in the waiting room (including the host)
  roomPlayers: RoomPlayer[];
  // Connection lifecycle state
  connectionStatus: ConnectionStatus;
  // Error message, if any
  errorMessage: string | null;
  // Local audio/video stream (null if voice is off)
  mediaStream: MediaStream | null;
  // Remote peer streams keyed by peerId
  remoteStreams: Record<string, MediaStream>;
  // Whether the local mic is muted
  micMuted: boolean;
  // Whether the local camera is off
  cameraOff: boolean;

  // Actions
  setIsHost: (v: boolean) => void;
  setRoomId: (id: string | null) => void;
  setLocalPeerId: (id: string | null) => void;
  setMyName: (name: string) => void;
  setRoomPlayers: (players: RoomPlayer[]) => void;
  addRoomPlayer: (player: RoomPlayer) => void;
  removeRoomPlayer: (peerId: string) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setErrorMessage: (msg: string | null) => void;
  setMediaStream: (stream: MediaStream | null) => void;
  addRemoteStream: (peerId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerId: string) => void;
  setMicMuted: (v: boolean) => void;
  setCameraOff: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  isHost: false,
  roomId: null,
  localPeerId: null,
  myName: '',
  roomPlayers: [] as RoomPlayer[],
  connectionStatus: 'idle' as ConnectionStatus,
  errorMessage: null,
  mediaStream: null,
  remoteStreams: {} as Record<string, MediaStream>,
  micMuted: false,
  cameraOff: true,
};

export const useOnlineStore = create<OnlineState>((set, get) => ({
  ...initialState,

  setIsHost: (v) => { setOnlineIsHost(v); set({ isHost: v }); },
  setRoomId: (id) => set({ roomId: id }),
  setLocalPeerId: (id) => set({ localPeerId: id }),
  setMyName: (name) => set({ myName: name }),

  setRoomPlayers: (players) => set({ roomPlayers: players }),

  addRoomPlayer: (player) =>
    set((s) => ({
      roomPlayers: s.roomPlayers.some((p) => p.peerId === player.peerId)
        ? s.roomPlayers
        : [...s.roomPlayers, player],
    })),

  removeRoomPlayer: (peerId) =>
    set((s) => ({ roomPlayers: s.roomPlayers.filter((p) => p.peerId !== peerId) })),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),

  setMediaStream: (stream) => set({ mediaStream: stream }),

  addRemoteStream: (peerId, stream) =>
    set((s) => ({ remoteStreams: { ...s.remoteStreams, [peerId]: stream } })),

  removeRemoteStream: (peerId) =>
    set((s) => {
      const next = { ...s.remoteStreams };
      delete next[peerId];
      return { remoteStreams: next };
    }),

  setMicMuted: (v) => {
    const { mediaStream } = get();
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((t) => { t.enabled = !v; });
    }
    set({ micMuted: v });
  },

  setCameraOff: (v) => {
    const { mediaStream } = get();
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach((t) => { t.enabled = !v; });
    }
    set({ cameraOff: v });
  },

  reset: () => { setOnlineIsHost(false); set({ ...initialState }); },
}));

// ─── Guest state sync ─────────────────────────────────────────────────────────

/**
 * Called by guests after joining a game. Listens for STATE_UPDATE messages
 * from the host and applies the public game state locally.
 *
 * Private data (role/word) was already set via GAME_STARTED before the game began,
 * so we merge the incoming public state without overwriting the guest's own role/word.
 */
export function setupGuestStateSync(myPeerId: string) {
  onMessage((msg: NetMessage) => {
    // Private reveal: host tells this guest their real card role+word
    if (msg.type === 'REVEAL_CARD') {
      const { useGameStore } = require('./gameStore') as typeof import('./gameStore');
      const payload = msg.payload as { cardId: string; role: string; word: string | null; playerId: string };
      if (payload.playerId !== myPeerId) return;

      const store = useGameStore.getState();
      // Update the specific card with real role+word
      const updatedCards = store.cards.map((c) =>
        c.id === payload.cardId
          ? { ...c, role: payload.role as import('../lib/types').Role, word: payload.word }
          : c,
      );
      // Also update this player's role+word in the players array
      const updatedPlayers = store.players.map((p) =>
        p.id === myPeerId
          ? { ...p, role: payload.role as import('../lib/types').Role, word: payload.word }
          : p,
      );
      useGameStore.setState({ cards: updatedCards, players: updatedPlayers });
      return;
    }

    if (msg.type !== 'STATE_UPDATE') return;

    const { useGameStore } = require('./gameStore') as typeof import('./gameStore');
    const payload = msg.payload as Record<string, unknown>;
    const store = useGameStore.getState();

    // Preserve the guest's own private role + word (set via REVEAL_CARD)
    const myPlayer = store.players.find((p) => p.id === myPeerId);

    const incomingPlayers = (payload.players as typeof store.players) ?? store.players;
    const mergedPlayers = incomingPlayers.map((p) => {
      if (p.id === myPeerId && myPlayer) {
        return { ...p, role: myPlayer.role, word: myPlayer.word };
      }
      return p;
    });

    const incomingSpeaking = (payload.speakingOrder as typeof store.speakingOrder) ?? [];
    const mergedSpeaking = incomingSpeaking.map((p) => {
      if (p.id === myPeerId && myPlayer) {
        return { ...p, role: myPlayer.role, word: myPlayer.word };
      }
      return p;
    });

    // Preserve real card data for this player's picked card
    const incomingCards = (payload.cards as typeof store.cards) ?? store.cards;
    const mergedCards = incomingCards.map((c) => {
      const existing = store.cards.find((sc) => sc.id === c.id);
      // If we already know this card's real role+word (from REVEAL_CARD), keep it
      if (existing && existing.role !== 'civilian') {
        return { ...c, role: existing.role, word: existing.word };
      }
      return c;
    });

    useGameStore.setState({
      phase: payload.phase as typeof store.phase,
      players: mergedPlayers,
      cards: mergedCards,
      speakingOrder: mergedSpeaking,
      round: (payload.round as number) ?? store.round,
      winner: (payload.winner as typeof store.winner) ?? null,
      results: (payload.results as typeof store.results) ?? [],
      revealCardId: (payload.revealCardId as string | null) ?? null,
      currentPickerIndex: (payload.currentPickerIndex as number) ?? 0,
      lastOusted: (payload.lastOusted as typeof store.lastOusted) ?? null,
      mrwhiteToGuess: (payload.mrwhiteToGuess as typeof store.mrwhiteToGuess) ?? null,
      category: (payload.category as string) ?? store.category,
    });
  });
}

// ─── Host action dispatcher ───────────────────────────────────────────────────

/**
 * Called by the host after a game starts. Listens for ACTION messages from
 * guests and dispatches them into the gameStore (which runs on the host side).
 *
 * Must be called after peerjs listeners are set up and gameStore is ready.
 */
export function setupHostActionHandler() {
  onMessage((msg: NetMessage) => {
    if (msg.type !== 'ACTION') return;

    const { useGameStore } = require('./gameStore') as typeof import('./gameStore');
    const store = useGameStore.getState();
    const payload = msg.payload as Record<string, unknown>;

    switch (payload.type as string) {
      case 'PICK_CARD':
        store.pickCard(payload.cardId as string);
        break;
      case 'CLOSE_REVEAL':
        store.closeReveal();
        break;
      case 'START_VOTE':
        store.startVote();
        break;
      case 'VOTE':
        store.eliminate(payload.targetId as string);
        break;
      case 'CONTINUE_AFTER_ELIMINATION':
        store.continueAfterElimination();
        break;
      case 'MR_WHITE_GUESS':
        store.submitMrWhiteGuess(payload.guessCorrect as boolean);
        break;
    }
  });
}
