/**
 * Sound effects using real MP3 files shipped in public/sounds/.
 *
 * Each preset key maps to a pool of 2–3 HTMLAudioElements so rapid taps can
 * overlap cleanly instead of cutting each other off. Files are lazily warmed
 * up on the first user gesture (browsers block audio before that).
 *
 * Mute state is persisted in localStorage so the preference survives reloads.
 */

const MUTE_KEY = 'undercover.sound.muted';

type SoundKey =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'flip'
  | 'eliminate'
  | 'win';

// Per-sound configuration: file path, pool size, and playback volume (0..1).
const SOUND_CONFIG: Record<SoundKey, { src: string; pool: number; volume: number }> = {
  primary:   { src: '/sounds/primary.mp3',   pool: 3, volume: 0.8 },
  secondary: { src: '/sounds/secondary.mp3', pool: 3, volume: 0.7 },
  danger:    { src: '/sounds/danger.mp3',    pool: 2, volume: 0.8 },
  flip:      { src: '/sounds/flip.mp3',      pool: 3, volume: 0.7 },
  eliminate: { src: '/sounds/eliminate.mp3', pool: 2, volume: 0.8 },
  win:       { src: '/sounds/win.mp3',       pool: 1, volume: 0.9 },
};

// Runtime pools: SoundKey → array of preloaded Audio elements + a round-robin
// cursor that picks the next free slot.
interface Pool {
  audios: HTMLAudioElement[];
  next: number;
}

const pools: Partial<Record<SoundKey, Pool>> = {};
let warmedUp = false;

let muted: boolean = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

function makePool(key: SoundKey): Pool {
  const { src, pool, volume } = SOUND_CONFIG[key];
  const audios: HTMLAudioElement[] = [];
  for (let i = 0; i < pool; i++) {
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume = volume;
    audios.push(a);
  }
  return { audios, next: 0 };
}

function getPool(key: SoundKey): Pool {
  let p = pools[key];
  if (!p) {
    p = makePool(key);
    pools[key] = p;
  }
  return p;
}

/**
 * Prime every Audio element so the next play() is instant. Some mobile
 * browsers refuse to load audio until they see a user gesture, so we call
 * this from the first play() request.
 */
function warmUp() {
  if (warmedUp) return;
  warmedUp = true;
  for (const key of Object.keys(SOUND_CONFIG) as SoundKey[]) {
    const pool = getPool(key);
    for (const a of pool.audios) {
      // Trigger the browser to fetch and decode the audio.
      try {
        a.load();
      } catch {
        // ignore
      }
    }
  }
}

function play(key: SoundKey) {
  if (muted) return;
  if (typeof window === 'undefined') return;

  if (!warmedUp) warmUp();

  const pool = getPool(key);
  const audio = pool.audios[pool.next];
  pool.next = (pool.next + 1) % pool.audios.length;

  try {
    // Rewind — if this slot was already playing a tail-end, restart cleanly.
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      // Swallow autoplay/policy errors silently. In practice these only fire
      // before the first user gesture, and we never call play() without one.
      promise.catch(() => {});
    }
  } catch {
    // ignore
  }
}

// ───── Public API ──────────────────────────────────────────────────────────

export const sfx = {
  /** Primary button tap — most prominent actions (Start, Confirm, Save). */
  click() {
    play('primary');
  },
  /** Secondary / ghost / nav button tap. */
  tap() {
    play('secondary');
  },
  /** Danger / destructive button (End game, Oust, Reset). */
  warn() {
    play('danger');
  },
  /** Card flip — when picking a card or revealing. */
  flip() {
    play('flip');
  },
  /** Elimination sting — when a player gets ousted. */
  eliminate() {
    play('eliminate');
  },
  /** Winner fanfare — plays once on ResultScreen mount. */
  win() {
    play('win');
  },
  /** Loser sting — aliased to eliminate for now. */
  lose() {
    play('eliminate');
  },
};

// ───── Mute control ────────────────────────────────────────────────────────

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    // ignore private-mode / quota errors
  }
  // When muting, stop anything currently playing so tails don't leak through.
  if (next) {
    for (const pool of Object.values(pools)) {
      if (!pool) continue;
      for (const a of pool.audios) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
