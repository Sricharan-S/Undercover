import type { Card, GamePlayer, Role } from './types';
import { shuffle, uid } from './random';

export interface RoleCounts {
  civilians: number;
  undercovers: number;
  mrwhites: number;
}

/**
 * Distribution rules:
 *   1. Civilians >= infiltrators (undercovers + mrwhites).
 *   2. When civilians == infiltrators, the infiltrators must be mixed
 *      (at least 1 Undercover AND at least 1 Mr. White). Pure groups (all U
 *      or all MW) on a tie are rejected.
 *   3. At least 1 infiltrator total.
 *   4. Mr. Whites soft-capped at 2.
 */

function isCombinationValid(
  playerCount: number,
  undercovers: number,
  mrwhites: number,
): boolean {
  if (undercovers < 0 || mrwhites < 0) return false;
  const infiltrators = undercovers + mrwhites;
  if (infiltrators < 1) return false;
  const civilians = playerCount - infiltrators;
  if (civilians < 1) return false;
  if (civilians < infiltrators) return false;
  if (civilians === infiltrators && (undercovers < 1 || mrwhites < 1)) return false;
  return true;
}

/**
 * Largest `undercovers` value such that the combination (playerCount, U, mrwhites)
 * is still valid. Returns the current value if nothing >= current is valid, else
 * the tightest upper bound for the counter.
 */
export function maxUndercoversGiven(playerCount: number, mrwhites: number): number {
  if (playerCount < 3) return 0;
  let best = 0;
  for (let u = Math.floor(playerCount / 2) + 1; u >= 0; u--) {
    if (isCombinationValid(playerCount, u, mrwhites)) {
      best = u;
      break;
    }
  }
  return best;
}

export function maxMrWhitesGiven(playerCount: number, undercovers: number): number {
  if (playerCount < 3) return 0;
  let best = 0;
  for (let m = Math.min(2, Math.floor(playerCount / 2) + 1); m >= 0; m--) {
    if (isCombinationValid(playerCount, undercovers, m)) {
      best = m;
      break;
    }
  }
  return Math.min(best, 2);
}

export function suggestedRoles(playerCount: number): RoleCounts {
  if (playerCount <= 3) return { civilians: 2, undercovers: 1, mrwhites: 0 };
  if (playerCount <= 4) return { civilians: 3, undercovers: 1, mrwhites: 0 };
  if (playerCount <= 5) return { civilians: 3, undercovers: 1, mrwhites: 1 };
  if (playerCount <= 6) return { civilians: 4, undercovers: 1, mrwhites: 1 };
  if (playerCount <= 8) return { civilians: 5, undercovers: 2, mrwhites: 1 };
  if (playerCount <= 10) return { civilians: 7, undercovers: 2, mrwhites: 1 };
  if (playerCount <= 12) return { civilians: 8, undercovers: 3, mrwhites: 1 };
  if (playerCount <= 16) return { civilians: 11, undercovers: 4, mrwhites: 1 };
  return { civilians: 14, undercovers: 5, mrwhites: 1 };
}

export function validateRoleCounts(
  playerCount: number,
  undercovers: number,
  mrwhites: number,
): { ok: boolean; reason?: string } {
  if (playerCount < 3) return { ok: false, reason: 'Need at least 3 players.' };
  if (playerCount > 20) return { ok: false, reason: 'Maximum 20 players.' };
  if (undercovers < 0 || mrwhites < 0) return { ok: false, reason: 'Counts cannot be negative.' };
  const infiltrators = undercovers + mrwhites;
  if (infiltrators < 1) return { ok: false, reason: 'Need at least 1 Undercover or 1 Mr. White.' };
  const civilians = playerCount - infiltrators;
  if (civilians < 1) return { ok: false, reason: 'Need at least 1 Civilian.' };
  if (civilians < infiltrators) {
    return {
      ok: false,
      reason: 'Civilians must be at least as many as the Infiltrators.',
    };
  }
  if (civilians === infiltrators && (undercovers < 1 || mrwhites < 1)) {
    return {
      ok: false,
      reason:
        'When Civilians tie with Infiltrators, you need at least 1 Undercover AND 1 Mr. White.',
    };
  }
  return { ok: true };
}

/**
 * Build the deck of role cards (one per player), shuffled.
 * Cards are independent of player identity at this point.
 */
export function buildCardDeck(
  playerCount: number,
  undercovers: number,
  mrwhites: number,
  civilianWord: string,
  undercoverWord: string,
): Card[] {
  const civilians = playerCount - undercovers - mrwhites;
  const roles: Role[] = [
    ...Array<Role>(civilians).fill('civilian'),
    ...Array<Role>(undercovers).fill('undercover'),
    ...Array<Role>(mrwhites).fill('mrwhite'),
  ];
  const shuffled = shuffle(roles);
  return shuffled.map((role) => ({
    id: uid(),
    role,
    word: role === 'civilian' ? civilianWord : role === 'undercover' ? undercoverWord : null,
    pickedByPlayerId: null,
  }));
}

/**
 * After all cards are picked by players, finalize each player's role + word from
 * the cards. Returns a fresh players array with role/word/alive set.
 */
export function applyCardsToPlayers(players: GamePlayer[], cards: Card[]): GamePlayer[] {
  const cardByPlayer = new Map<string, Card>();
  for (const c of cards) {
    if (c.pickedByPlayerId) cardByPlayer.set(c.pickedByPlayerId, c);
  }
  return players.map((p) => {
    const c = cardByPlayer.get(p.id);
    if (!c) return p;
    return { ...p, role: c.role, word: c.word, alive: true };
  });
}

/**
 * Determine which speaker order to use for the describe phase.
 * Mr. White must not start (per rules — they have no word). Pick a random non-Mr.White
 * to start, then cycle through alive players in their original order.
 */
export function buildSpeakingOrder(players: GamePlayer[]): GamePlayer[] {
  const alive = players.filter((p) => p.alive);
  if (alive.length === 0) return [];
  const candidates = alive.filter((p) => p.role !== 'mrwhite');
  const startPool = candidates.length > 0 ? candidates : alive;
  const start = startPool[Math.floor(Math.random() * startPool.length)];
  const startIdx = alive.findIndex((p) => p.id === start.id);
  return [...alive.slice(startIdx), ...alive.slice(0, startIdx)];
}
