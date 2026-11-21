import type { FinanceTournamentReport, TournamentStatus } from '../types.js';

/** The list's public query keys, which a reloaded detail page carries back to the list (navigation.md). */
export const TOURNAMENT_LIST_KEYS = ['status'] as const;

export const TOURNAMENT_STATUSES: readonly TournamentStatus[] = [
  'planning',
  'ongoing',
  'closed',
];

/** StatusBadge tone per status: planning is quiet, an ongoing tournament is live, a settled one is done. */
export const TOURNAMENT_STATUS_TONE = {
  planning: 'neutral',
  ongoing: 'info',
  closed: 'success',
} as const satisfies Record<TournamentStatus, string>;

export const TOURNAMENT_MANAGE_PERMISSION = {
  resource: { type: 'composite', id: 'finance.tournaments' },
  action: 'manage',
} as const;

export const VOUCHER_CREATE_PERMISSION = {
  resource: { type: 'composite', id: 'finance.transactions' },
  action: 'create',
} as const;

/** What the tournament detail page hands to its edit and budget dialogs. */
export interface TournamentDetailContext {
  readonly report: FinanceTournamentReport | undefined;
  readonly reload: () => void;
}

/** What the tournament list hands to its create dialog. */
export interface TournamentListContext {
  readonly reload: () => void;
}
