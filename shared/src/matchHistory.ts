import type { Faction, Role } from './types/GameState';

/** One seat in a match the viewer sat in. `accountId` is omitted for yourself. */
export interface HistorySeatView {
  name: string;
  role: Role;
  seat: number;
  won: boolean;
  you: boolean;
  accountId: string | null;
}

/** A finished table, scoped to the signed-in player. */
export interface HistoryMatchView {
  id: string;
  winner: Faction;
  playerCount: number;
  endedAt: string;
  youWon: boolean;
  players: HistorySeatView[];
}

export interface HistoryMineRequest {
  clientId?: string;
  initData?: string;
}
