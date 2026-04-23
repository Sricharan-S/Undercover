import React from 'react';

interface Props {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
  subtitle?: string;
  dimmed?: boolean;
}

export function PlayerChip({ name, selected, onClick, rightSlot, subtitle, dimmed }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
        selected
          ? 'border-accent bg-accent/10 text-ink-50'
          : 'border-ink-700 bg-ink-800 text-ink-100 hover:border-ink-500'
      } ${dimmed ? 'opacity-50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-base font-semibold">{name}</div>
        {subtitle && <div className="truncate text-xs text-ink-400">{subtitle}</div>}
      </div>
      {rightSlot}
    </button>
  );
}
