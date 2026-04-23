import type { GamePlayer, GameResult, WinningTeam } from './types';

const POINTS = {
  civilianWin: 2,
  undercoverWin: 10,
  mrwhiteSurvivedWithUndercovers: 6,
  mrwhiteCorrectGuess: 6,
} as const;

/**
 * Returns the per-player results given the players and which team won.
 * - 'civilians': each civilian (alive or eliminated) gets +2.
 * - 'undercovers': each undercover gets +10. Any Mr. White still alive at game end
 *   shares the win and gets +6.
 * - 'mrwhite' (correct guess): only Mr. White scores +6.
 */
export function computeResults(players: GamePlayer[], winner: WinningTeam): GameResult[] {
  return players.map<GameResult>((p) => {
    let won = false;
    let scoreDelta = 0;
    if (winner === 'civilians') {
      if (p.role === 'civilian') {
        won = true;
        scoreDelta = POINTS.civilianWin;
      }
    } else if (winner === 'undercovers') {
      if (p.role === 'undercover') {
        won = true;
        scoreDelta = POINTS.undercoverWin;
      } else if (p.role === 'mrwhite' && p.alive) {
        won = true;
        scoreDelta = POINTS.mrwhiteSurvivedWithUndercovers;
      }
    } else if (winner === 'mrwhite') {
      if (p.role === 'mrwhite') {
        won = true;
        scoreDelta = POINTS.mrwhiteCorrectGuess;
      }
    }
    return { playerId: p.id, name: p.name, role: p.role, won, scoreDelta };
  });
}

/**
 * After an elimination (and possibly a Mr. White guess), determine the winning team
 * (or null if the game continues).
 */
export function checkWinner(players: GamePlayer[]): WinningTeam {
  const alive = players.filter((p) => p.alive);
  const aliveCivilians = alive.filter((p) => p.role === 'civilian').length;
  const aliveUndercovers = alive.filter((p) => p.role === 'undercover').length;
  const aliveMrWhites = alive.filter((p) => p.role === 'mrwhite').length;
  const aliveInfiltrators = aliveUndercovers + aliveMrWhites;

  if (aliveInfiltrators === 0) return 'civilians';
  // Infiltrators win when they equal or outnumber the civilians.
  if (aliveInfiltrators >= aliveCivilians) {
    // Distinguish: if at least one undercover remains, undercovers win the round
    // (mr. white shares the win). If ONLY mrwhite remains with civilians (rare), still infiltrator win
    // and we treat it as undercovers-class win for scoring purposes (mrwhite alive scores +6).
    return 'undercovers';
  }
  return null;
}
