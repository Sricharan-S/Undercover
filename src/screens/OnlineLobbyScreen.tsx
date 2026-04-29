import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useOnlineStore, setupGuestStateSync } from '../store/onlineStore';
import { createRoom, joinRoom, onMessage, onPeerJoined, onPeerLeft } from '../lib/peer';
import type { NetMessage } from '../lib/peer';
import type { RoomPlayer } from '../lib/peer';
import type { GamePlayer, Card } from '../lib/types';

export function OnlineLobbyScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const onlineStore = useOnlineStore();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [myName, setMyName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function registerListeners(isHost: boolean, myId?: string) {
    onMessage((msg: NetMessage, fromPeerId: string) => {
      if (msg.type === 'ROOM_STATE') {
        const { players } = msg.payload as { players: RoomPlayer[] };
        onlineStore.setRoomPlayers(players);
      }
      if (msg.type === 'PEER_LEFT') {
        onlineStore.removeRoomPlayer(fromPeerId);
      }
      if (msg.type === 'GAME_STARTED') {
        const payload = msg.payload as {
          players: GamePlayer[];
          cards: Card[];
          civilianWord: string;
          undercoverWord: string;
          category: string;
          currentPickerIndex: number;
          speakingOrder: GamePlayer[];
          round: number;
        };
        // Apply the full initial game state with private role/word for this guest
        useGameStore.setState({
          phase: 'pick',
          mode: 'online',
          players: payload.players,
          cards: payload.cards,
          civilianWord: payload.civilianWord,
          undercoverWord: payload.undercoverWord,
          category: payload.category,
          currentPickerIndex: payload.currentPickerIndex,
          speakingOrder: payload.speakingOrder,
          round: payload.round,
          winner: null,
          results: [],
          revealCardId: null,
          mrwhiteToGuess: null,
          lastOusted: null,
        });
        // After receiving initial state, set up ongoing state sync
        if (myId) setupGuestStateSync(myId);
        setPhase('pick');
      }
    });

    if (isHost) {
      onPeerJoined((peerId, name) => {
        if (name) {
          onlineStore.addRoomPlayer({ peerId, name });
        }
      });
      onPeerLeft((peerId) => {
        onlineStore.removeRoomPlayer(peerId);
      });
    }
  }

  async function handleCreate() {
    const trimmed = myName.trim();
    if (!trimmed) { setError('Enter your name first.'); return; }
    setError(null);
    setLoading(true);
    try {
      onlineStore.reset();
      onlineStore.setIsHost(true);
      onlineStore.setMyName(trimmed);
      onlineStore.setConnectionStatus('connecting');

      const roomId = await createRoom();

      onlineStore.setRoomId(roomId);
      onlineStore.setLocalPeerId(roomId);
      onlineStore.setConnectionStatus('connected');
      // Host adds themselves as the first room player
      onlineStore.setRoomPlayers([{ peerId: roomId, name: trimmed }]);

      registerListeners(true, roomId);

      useGameStore.setState({ mode: 'online' });
      setPhase('waitingroom');
    } catch (e) {
      onlineStore.setConnectionStatus('error');
      setError('Could not create room. Check your connection.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const trimmed = myName.trim();
    const code = roomCode.trim().toLowerCase();
    if (!trimmed) { setError('Enter your name first.'); return; }
    if (!code) { setError('Enter the room code.'); return; }
    setError(null);
    setLoading(true);
    try {
      onlineStore.reset();
      onlineStore.setIsHost(false);
      onlineStore.setMyName(trimmed);
      onlineStore.setConnectionStatus('connecting');

      const myId = await joinRoom(code, trimmed);

      onlineStore.setRoomId(code);
      onlineStore.setLocalPeerId(myId);
      onlineStore.setConnectionStatus('connected');

      registerListeners(false, myId);

      useGameStore.setState({ mode: 'online' });
      setPhase('waitingroom');
    } catch (e) {
      onlineStore.setConnectionStatus('error');
      setError('Could not join room. Check the code and your connection.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen items-center justify-between">
      {/* Back button */}
      <div className="flex w-full items-center pt-2">
        <button
          onClick={() => setPhase('home')}
          className="flex items-center gap-2 text-ink-300 hover:text-ink-50 transition-colors"
          aria-label="Back to home"
        >
          <BackIcon />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20">
            <OnlineIcon />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-50">Play Online</h1>
          <p className="mt-2 text-sm text-ink-300">
            Create a room or join with a code. No account needed.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <div className="mb-6 flex rounded-xl bg-ink-800 p-1">
          <button
            onClick={() => { setTab('create'); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === 'create'
                ? 'bg-accent text-white shadow'
                : 'text-ink-300 hover:text-ink-50'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => { setTab('join'); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === 'join'
                ? 'bg-accent text-white shadow'
                : 'text-ink-300 hover:text-ink-50'
            }`}
          >
            Join Room
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Name field — shared */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-400">
              Your Name
            </label>
            <input
              type="text"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin(); }}
              placeholder="Enter your name"
              maxLength={24}
              className="w-full rounded-xl bg-ink-800 px-4 py-3 text-ink-50 placeholder-ink-500 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Room code field — join only */}
          {tab === 'join' && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-400">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                placeholder="Paste room code here"
                className="w-full rounded-xl bg-ink-800 px-4 py-3 font-mono text-sm text-ink-50 placeholder-ink-500 outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <Button
            variant="primary"
            full
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading}
          >
            {loading
              ? (tab === 'create' ? 'Creating…' : 'Joining…')
              : (tab === 'create' ? 'Create Room' : 'Join Room')}
          </Button>
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-ink-500">
        Rooms are peer-to-peer · No data stored on servers
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

function OnlineIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
