import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useOnlineStore, setupHostActionHandler } from '../store/onlineStore';
import {
  broadcast,
  sendToPeer,
  onMessage,
  destroyPeer,
  openLocalStream,
} from '../lib/peer';
import type { NetMessage, RoomPlayer } from '../lib/peer';
import { buildCardDeck, suggestedRoles } from '../lib/roleAssigner';
import { pickWordPair } from '../lib/wordPicker';
import type { GamePlayer } from '../lib/types';

// ─── Host: start the game ─────────────────────────────────────────────────────

function hostStartGame(
  roomPlayers: RoomPlayer[],
  myPeerId: string,
  setPhase: (p: import('../lib/types').Phase) => void,
) {
  const count = roomPlayers.length;
  const { undercovers, mrwhites } = suggestedRoles(count);
  const category = 'random';
  const pair = pickWordPair(category, new Set<string>());

  // Build a shuffled deck — cards start UNASSIGNED, just like offline mode.
  // Players will tap to pick their card one by one.
  const deck = buildCardDeck(count, undercovers, mrwhites, pair.civilian, pair.undercover);

  const players: GamePlayer[] = roomPlayers.map((rp) => ({
    id: rp.peerId,
    name: rp.name,
    role: 'civilian',
    word: null,
    alive: true,
  }));

  // Cards sent to all peers — no role/word info, all unassigned
  const publicCards = deck.map((c) => ({
    id: c.id,
    role: 'civilian' as const,
    word: null as null,
    pickedByPlayerId: null as null,
  }));

  // The FULL deck (with real roles/words) is only kept on the host.
  // When a guest picks a card the host looks up the real card and reveals it.
  const privateCards = deck; // stored locally on host only

  const publicPlayers = players.map((p) => ({
    id: p.id,
    name: p.name,
    role: 'civilian' as const,
    word: null as null,
    alive: true,
  }));

  const baseState = {
    mode: 'online' as const,
    players: publicPlayers,
    cards: publicCards,
    civilianWord: '',
    undercoverWord: '',
    category: pair.category,
    currentPickerIndex: 0,
    speakingOrder: [],
    round: 1,
    winner: null,
    results: [],
    revealCardId: null,
    mrwhiteToGuess: null,
    lastOusted: null,
    pendingSetup: {
      category,
      undercovers,
      mrwhites,
      groupId: null,
    },
    usedPairKeys: [pair.key],
  };

  // Send each guest their copy of the public state (no roles/words yet)
  for (const player of players) {
    if (player.id === myPeerId) continue;
    const msg: NetMessage = {
      type: 'GAME_STARTED',
      payload: { ...baseState, phase: 'pick' },
    };
    sendToPeer(player.id, msg);
  }

  // Host stores the real deck privately so it can reveal cards correctly
  useGameStore.setState({
    ...baseState,
    phase: 'pick',
    // Host keeps the real cards with role/word so pickCard logic works
    cards: privateCards,
    civilianWord: pair.civilian,
    undercoverWord: pair.undercover,
  });

  // Broadcast public state update so all clients share phase change
  broadcast({ type: 'STATE_UPDATE', payload: { ...baseState, phase: 'pick' } });

  // Start listening for guest actions and dispatch them
  setupHostActionHandler();

  setPhase('pick');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function WaitingRoomScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const { isHost, roomId, localPeerId, roomPlayers, setRoomPlayers, removeRoomPlayer, setMediaStream } =
    useOnlineStore();

  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const canStart = roomPlayers.length >= 3;

  // Guests: listen for ROOM_STATE + GAME_STARTED updates from host
  useEffect(() => {
    if (isHost) return;

    const unsubscribe = onMessage((msg: NetMessage) => {
      if (msg.type === 'ROOM_STATE') {
        const { players } = msg.payload as { players: RoomPlayer[] };
        setRoomPlayers(players);
      }
      if (msg.type === 'GAME_STARTED' || msg.type === 'STATE_UPDATE') {
        const payload = msg.payload as { phase?: string };
        if (payload.phase === 'pick') {
          // Auto-start mic for guests so voice chat is live from the first turn
          openLocalStream(false)
            .then((stream) => useOnlineStore.getState().setMediaStream(stream))
            .catch(() => {/* mic permission denied – overlay has retry button */});
          // OnlineLobbyScreen already wires the full state; just navigate
          setPhase('pick');
        }
      }
      if (msg.type === 'HOST_LEAVING') {
        setPhase('onlinelobby');
        destroyPeer();
      }
    });

    // Return cleanup noop (onMessage doesn't return an unsubscribe fn)
    return unsubscribe as unknown as () => void;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Host: broadcast room state whenever player list changes
  useEffect(() => {
    if (!isHost) return;
    broadcast({ type: 'ROOM_STATE', payload: { players: roomPlayers } });
  }, [isHost, roomPlayers]);

  // Host: also listen for peer-left to update room players
  useEffect(() => {
    if (!isHost) return;
    const unsubscribe = onMessage((msg: NetMessage, fromPeerId: string) => {
      if (msg.type === 'PEER_LEFT') {
        removeRoomPlayer(fromPeerId);
      }
    });
    return unsubscribe as unknown as () => void;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  function handleCopyCode() {
    if (roomId) {
      navigator.clipboard.writeText(roomId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleStartGame() {
    if (!canStart || !localPeerId || starting) return;
    setStarting(true);
    // Auto-start mic (audio-only) so voice chat is live from the first turn
    openLocalStream(false)
      .then((stream) => setMediaStream(stream))
      .catch(() => {/* mic permission denied – overlay has retry button */});
    hostStartGame(roomPlayers, localPeerId, setPhase);
  }

  function handleLeave() {
    if (isHost) {
      broadcast({ type: 'HOST_LEAVING' });
    }
    destroyPeer();
    useOnlineStore.getState().reset();
    useGameStore.setState({ mode: 'quick' });
    setPhase('home');
  }

  const displayCode = roomId ?? '—';

  return (
    <div className="screen items-center justify-between">
      {/* Header */}
      <div className="flex w-full items-center justify-between pt-2">
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 text-ink-300 hover:text-ink-50 transition-colors"
          aria-label="Leave room"
        >
          <BackIcon />
          <span className="text-sm font-medium">Leave</span>
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {isHost ? 'Host' : 'Guest'}
        </span>
      </div>

      {/* Room code */}
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl bg-ink-800 p-5 text-center shadow-card"
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">
            Room Code
          </p>
          <p className="mb-3 font-mono text-4xl font-bold tracking-[0.3em] uppercase text-ink-50">
            {displayCode}
          </p>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-2 rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 transition-colors hover:bg-ink-600 active:scale-95"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </motion.div>

        {/* Player list */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-300">
              Players ({roomPlayers.length})
            </span>
            {!canStart && (
              <span className="text-xs text-ink-500">Need at least 3 to start</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {roomPlayers.map((player) => (
                <motion.div
                  key={player.peerId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center gap-3 rounded-xl bg-ink-800 px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium text-ink-100">{player.name}</span>
                  {player.peerId === localPeerId && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                      You
                    </span>
                  )}
                  {isHost && player.peerId === localPeerId && (
                    <span className="rounded-full bg-ink-600 px-2 py-0.5 text-xs font-semibold text-ink-300">
                      Host
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Action area */}
        {isHost ? (
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              full
              disabled={!canStart || starting}
              onClick={handleStartGame}
            >
              {starting ? 'Starting…' : `Start Game (${roomPlayers.length} players)`}
            </Button>
            {!canStart && (
              <p className="text-center text-xs text-ink-500">
                Share the room code above so others can join.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-ink-800 px-4 py-4 text-center">
            <div className="mb-2 flex justify-center">
              <WaitingSpinner />
            </div>
            <p className="text-sm text-ink-300">Waiting for the host to start the game…</p>
          </div>
        )}
      </div>

      <div className="pb-4 text-center text-xs text-ink-500">
        Roles are assigned automatically when the host starts
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WaitingSpinner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
