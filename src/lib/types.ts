export type Role = 'civilian' | 'undercover' | 'mrwhite';

export type Phase =
  | 'home'
  | 'groups'
  | 'groupeditor'
  | 'setup'
  | 'pick'
  | 'reveal'
  | 'describe'
  | 'vote'
  | 'eliminationreveal'
  | 'mrwhiteguess'
  | 'result'
  | 'leaderboard';

export type GameMode = 'quick' | 'tracked';

export interface GamePlayer {
  id: string;
  name: string;
  role: Role;
  word: string | null;
  alive: boolean;
}

export interface Card {
  id: string;
  role: Role;
  word: string | null;
  pickedByPlayerId: string | null;
}

export type WinningTeam = 'civilians' | 'undercovers' | 'mrwhite' | null;

export interface RosterPlayer {
  id: string;
  name: string;
  createdAt: number;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  roleCounts: { civilian: number; undercover: number; mrwhite: number };
}

export interface Group {
  id: string;
  name: string;
  color: string;
  players: RosterPlayer[];
  createdAt: number;
}

export interface GameResult {
  playerId: string;
  name: string;
  role: Role;
  won: boolean;
  scoreDelta: number;
}
