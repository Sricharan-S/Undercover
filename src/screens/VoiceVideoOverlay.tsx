import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStore } from '../store/onlineStore';
import { openLocalStream, stopLocalStream, onStream } from '../lib/peer';

/**
 * Floating voice overlay for the online game.
 *
 * Layout:
 *   - Collapsed: a compact pill in the top-right corner showing up to 3 avatar
 *     initials + a mic mute toggle. A pulsing ring shows who is currently speaking.
 *   - Expanded: a full drawer slides down showing all player tiles + controls.
 *
 * Auto-starts mic when the game begins (triggered by WaitingRoomScreen).
 * If permission is denied a banner is shown with a "Join Voice" retry button.
 */
export function VoiceVideoOverlay() {
  const {
    roomPlayers,
    localPeerId,
    mediaStream,
    remoteStreams,
    micMuted,
    setMediaStream,
    addRemoteStream,
    setMicMuted,
  } = useOnlineStore();

  const [expanded, setExpanded] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  // Register remote stream handler once on mount
  useEffect(() => {
    onStream((peerId, stream) => {
      addRemoteStream(peerId, stream);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoinVoice() {
    setMicDenied(false);
    try {
      const stream = await openLocalStream(false);
      setMediaStream(stream);
    } catch {
      setMicDenied(true);
    }
  }

  function handleToggleMute() {
    setMicMuted(!micMuted);
  }

  function handleLeaveVoice() {
    stopLocalStream();
    setMediaStream(null);
  }

  const voiceActive = !!mediaStream;
  const peers = roomPlayers.filter((p) => p.peerId !== localPeerId);
  const allPeers = [
    { peerId: localPeerId ?? '', name: 'You', isLocal: true },
    ...peers.map((p) => ({ peerId: p.peerId, name: p.name, isLocal: false })),
  ];

  return (
    <>
      {/* Mic permission denied banner */}
      <AnimatePresence>
        {micDenied && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-red-900/90 px-4 py-3 text-sm text-white backdrop-blur-sm"
          >
            <span>Mic access denied. Enable it in your browser settings.</span>
            <button
              onClick={handleJoinVoice}
              className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating pill */}
      <div className="fixed top-4 right-3 z-40 flex flex-col items-end gap-2">
        {/* Pill button */}
        <motion.button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-ink-800/90 px-3 py-2 shadow-card ring-1 ring-ink-600 backdrop-blur-sm"
          whileTap={{ scale: 0.95 }}
          aria-label="Voice chat"
        >
          {/* Show up to 3 avatars */}
          <div className="flex -space-x-2">
            {allPeers.slice(0, 3).map((p) => (
              <SpeakingAvatar
                key={p.peerId}
                name={p.name}
                stream={p.isLocal ? (mediaStream ?? undefined) : remoteStreams[p.peerId]}
                isLocal={p.isLocal}
                muted={p.isLocal && micMuted}
                size="sm"
              />
            ))}
          </div>
          {allPeers.length > 3 && (
            <span className="text-[10px] font-semibold text-ink-400">
              +{allPeers.length - 3}
            </span>
          )}
          {/* Mic status icon */}
          <span className="ml-1">
            <MicIcon muted={!voiceActive || micMuted} size={13} />
          </span>
        </motion.button>

        {/* Quick mute/unmute when collapsed */}
        {voiceActive && !expanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleToggleMute}
            aria-label={micMuted ? 'Unmute' : 'Mute'}
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-card ring-1 transition-colors ${
              micMuted
                ? 'bg-red-600 ring-red-500 text-white'
                : 'bg-ink-700 ring-ink-600 text-ink-200'
            }`}
          >
            <MicIcon muted={micMuted} size={15} />
          </motion.button>
        )}

        {/* Join voice button if not active */}
        {!voiceActive && !micDenied && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleJoinVoice}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent shadow-card text-white"
            aria-label="Join voice"
          >
            <MicIcon muted={false} size={15} />
          </motion.button>
        )}
      </div>

      {/* Expanded drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed top-16 right-3 z-40 w-52 rounded-2xl bg-ink-800/95 p-3 shadow-xl ring-1 ring-ink-600 backdrop-blur-sm"
          >
            {/* Player tiles */}
            <div className="mb-3 flex flex-col gap-2">
              {allPeers.map((p) => (
                <PlayerTile
                  key={p.peerId}
                  name={p.name}
                  isLocal={p.isLocal}
                  stream={p.isLocal ? (mediaStream ?? undefined) : remoteStreams[p.peerId]}
                  muted={p.isLocal && micMuted}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between border-t border-ink-700 pt-2">
              {voiceActive ? (
                <>
                  <button
                    onClick={handleToggleMute}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      micMuted
                        ? 'bg-red-600/20 text-red-400'
                        : 'bg-ink-700 text-ink-200'
                    }`}
                  >
                    <MicIcon muted={micMuted} size={12} />
                    {micMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    onClick={() => { handleLeaveVoice(); setExpanded(false); }}
                    className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400"
                  >
                    Leave
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoinVoice}
                  className="w-full rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Join Voice
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Speaking Avatar ──────────────────────────────────────────────────────────

interface SpeakingAvatarProps {
  name: string;
  stream?: MediaStream;
  isLocal: boolean;
  muted: boolean;
  size: 'sm' | 'md';
}

function SpeakingAvatar({ name, stream, isLocal, muted, size }: SpeakingAvatarProps) {
  const speaking = useSpeaking(isLocal ? null : stream ?? null);
  const dim = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-10 w-10 text-sm';

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center rounded-full bg-ink-700 font-bold text-ink-100 ring-2 transition-all duration-150 ${dim} ${
        speaking && !muted
          ? 'ring-accent shadow-[0_0_8px_2px_rgba(14,165,233,0.5)]'
          : 'ring-ink-600'
      }`}
    >
      {name.charAt(0).toUpperCase()}
      {muted && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-white">
          <MicIcon muted size={8} />
        </span>
      )}
    </div>
  );
}

// ─── Player Tile (expanded drawer) ───────────────────────────────────────────

interface PlayerTileProps {
  name: string;
  isLocal: boolean;
  stream?: MediaStream;
  muted: boolean;
}

function PlayerTile({ name, isLocal, stream, muted }: PlayerTileProps) {
  const speaking = useSpeaking(isLocal ? null : stream ?? null);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
        speaking && !muted ? 'bg-accent/10' : 'bg-ink-700/50'
      }`}
    >
      <SpeakingAvatar name={name} stream={stream} isLocal={isLocal} muted={muted} size="md" />
      <span className="flex-1 truncate text-sm font-medium text-ink-100">{name}</span>
      {isLocal && (
        <span className="rounded-full bg-ink-600 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400">
          You
        </span>
      )}
      {!stream && !isLocal && (
        <span className="text-[10px] text-ink-500">no audio</span>
      )}
    </div>
  );
}

// ─── useSpeaking hook ─────────────────────────────────────────────────────────

/**
 * Returns true when the given remote stream has audio energy above the
 * speaking threshold. Uses Web Audio API AnalyserNode + requestAnimationFrame.
 * Passing null disables detection and always returns false.
 */
function useSpeaking(stream: MediaStream | null): boolean {
  const [speaking, setSpeaking] = useState(false);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const start = useCallback((s: MediaStream) => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(s);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(data);
      // Average energy of mid-range frequencies (voice band)
      let sum = 0;
      for (let i = 2; i < 20; i++) sum += data[i];
      setSpeaking(sum / 18 > 12);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!stream) {
      setSpeaking(false);
      return;
    }
    start(stream);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      setSpeaking(false);
    };
  }, [stream, start]);

  return speaking;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function MicIcon({ muted, size = 16 }: { muted: boolean; size?: number }) {
  return muted ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
