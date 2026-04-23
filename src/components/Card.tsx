import { motion } from 'framer-motion';
import React from 'react';
import { sfx } from '../lib/sound';

interface Props {
  faceUp?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  number?: number;
  front?: React.ReactNode;
  small?: boolean;
}

export function Card({ faceUp = false, disabled, onClick, number, front, small }: Props) {
  function handleClick() {
    if (disabled) return;
    sfx.flip();
    onClick?.();
  }
  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={`relative ${small ? 'h-24 w-16' : 'h-36 w-24'} cursor-pointer select-none ${
        disabled ? 'cursor-not-allowed opacity-30' : ''
      }`}
      style={{ perspective: 1000 }}
      aria-label={
        faceUp ? 'Card revealed' : disabled ? 'Card already picked' : 'Tap to flip card'
      }
    >
      <motion.div
        className="preserve-3d relative h-full w-full"
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="card-back backface-hidden absolute inset-0 flex items-center justify-center rounded-2xl border border-ink-600 shadow-card">
          <div className="text-center">
            <div className="font-display text-xs uppercase tracking-widest text-accent">UC</div>
            {number !== undefined && (
              <div className="mt-1 font-display text-2xl font-bold text-ink-100">{number}</div>
            )}
          </div>
        </div>
        <div
          className="backface-hidden absolute inset-0 flex items-center justify-center rounded-2xl border border-accent bg-ink-700 p-2 text-center shadow-card"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {front}
        </div>
      </motion.div>
    </motion.button>
  );
}
