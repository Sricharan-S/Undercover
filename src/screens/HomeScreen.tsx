import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { useGameStore } from '../store/gameStore';
import { useRosterStore, useSelectedGroup } from '../store/rosterStore';
import { isMuted, sfx, toggleMuted } from '../lib/sound';

export function HomeScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const groupsCount = useRosterStore((s) => s.groups.length);
  const selectedGroup = useSelectedGroup();
  const [muted, setMuted] = useState(isMuted());

  function enterSetup(mode: 'quick' | 'tracked') {
    useGameStore.setState({ mode, players: [], pendingSetup: null });
    setPhase('setup');
  }

  function handleToggleSound() {
    const next = toggleMuted();
    setMuted(next);
    if (!next) sfx.click();
  }

  return (
    <div className="screen items-center justify-between">
      <div className="flex w-full items-start justify-between pt-2">
        <button
          onClick={handleToggleSound}
          className="flex flex-col items-center gap-1"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 shadow-card">
            {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
          </div>
          <span className="text-xs font-semibold text-ink-200">
            {muted ? 'Muted' : 'Sound'}
          </span>
        </button>
        <button
          onClick={() => {
            sfx.tap();
            setPhase('groups');
          }}
          className="flex flex-col items-center gap-1"
          aria-label="Groups"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full shadow-card transition-colors"
            style={{
              backgroundColor: selectedGroup?.color ?? '#0ea5e9',
            }}
          >
            <GroupsIcon />
          </div>
          <span className="text-xs font-semibold text-ink-200">
            {selectedGroup ? selectedGroup.name : 'Groups'}
          </span>
        </button>
      </div>

      <div className="w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="relative mx-auto mb-4 h-40 w-40"
        >
          <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl" aria-hidden />
          <img
            src="/icons/icon-512.png"
            alt=""
            className="relative h-40 w-40 rounded-3xl shadow-card"
            draggable={false}
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl font-bold tracking-tight text-ink-50"
        >
          Undercover
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-3 text-ink-300"
        >
          Pass-and-play party game.
          <br />
          Find the imposters before they find you.
        </motion.p>
      </div>

      <div className="flex w-full flex-col gap-3 pb-4">
        <Button variant="primary" full onClick={() => enterSetup('quick')}>
          Quick Game
        </Button>
        <Button
          variant="secondary"
          full
          onClick={() => enterSetup('tracked')}
          disabled={!selectedGroup}
        >
          Tracked Game
          {selectedGroup && (
            <span className="ml-2 text-xs opacity-70">· {selectedGroup.name}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          full
          onClick={() => {
            sfx.tap();
            setPhase('onlinelobby');
          }}
        >
          <OnlineWifiIcon />
          <span className="ml-2">Play Online</span>
        </Button>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="ghost" onClick={() => setPhase('groups')}>
            Groups {groupsCount > 0 && <span className="ml-1 opacity-60">({groupsCount})</span>}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPhase('leaderboard')}
            disabled={!selectedGroup}
          >
            Leaderboard
          </Button>
        </div>
        <p className="pt-3 text-center text-xs text-ink-400">
          {selectedGroup
            ? `Tracked games will count toward ${selectedGroup.name}.`
            : 'Quick = type names, no scoring. Tracked = pick a group first, scores saved.'}
        </p>
        <p className="pt-1 text-center text-[10px] text-ink-600">v{__APP_VERSION__}</p>
      </div>
    </div>
  );
}

function GroupsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SpeakerOnIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function OnlineWifiIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
