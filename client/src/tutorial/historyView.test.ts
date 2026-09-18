import { describe, expect, it } from '@rstest/core';
import {
  HISTORY_ACCOUNT,
  HISTORY_ADD_ACCOUNT,
  HISTORY_BEATS,
  HISTORY_LOSS_ID,
  HISTORY_WIN_ID,
  INITIAL_HISTORY_TIES,
  buildHistoryLoss,
  buildHistoryMatches,
  buildHistoryWin,
  historyBeatAt,
  historyExpandMatchIds,
  historyShowsLoss,
  historyShowsSheet,
} from './historyView';

describe('historyView — mock sheet', () => {
  it('Should cover winner, loss, roles, and every friend chip without a guest', () => {
    const you = { name: 'Ana', avatar: 0 };
    const matches = buildHistoryMatches(you);
    expect(HISTORY_BEATS.length).toBe(11);
    expect(historyBeatAt(0).wait).toBe('open');
    expect(historyShowsSheet(0)).toBe(false);
    expect(historyShowsSheet(1)).toBe(true);
    expect(historyBeatAt(6).headline).toBe('onboard.history.roles');
    expect(historyBeatAt(7).wait).toBe('open');
    expect(historyBeatAt(10).lifted).toBe(true);
    expect(historyShowsLoss(8)).toBe(false);
    expect(historyShowsLoss(9)).toBe(true);
    expect(historyExpandMatchIds(1)).toEqual([]);
    expect(historyExpandMatchIds(4)).toEqual([HISTORY_WIN_ID]);
    expect(historyExpandMatchIds(9)).toEqual([HISTORY_LOSS_ID]);

    const win = buildHistoryWin(you);
    const loss = buildHistoryLoss(you);
    expect(matches.map((match) => match.id)).toEqual([HISTORY_WIN_ID, HISTORY_LOSS_ID]);
    expect(win.winner).toBe('liberal');
    expect(win.youWon).toBe(true);
    expect(loss.winner).toBe('fascist');
    expect(loss.youWon).toBe(false);

    const youSeat = win.players.find((player) => player.you)!;
    expect(youSeat.name).toBe('Ana');
    expect(youSeat.accountId).toBeNull();
    expect(youSeat.role).toBe('liberal');

    const roles = win.players.map((player) => player.role);
    expect(roles).toContain('liberal');
    expect(roles).toContain('fascist');
    expect(roles).toContain('hitler');

    expect(INITIAL_HISTORY_TIES[HISTORY_ACCOUNT.nima]).toBe('friends');
    expect(INITIAL_HISTORY_TIES[HISTORY_ACCOUNT.sara]).toBe('outgoing');
    expect(INITIAL_HISTORY_TIES[HISTORY_ADD_ACCOUNT]).toBe('none');
    expect(INITIAL_HISTORY_TIES[HISTORY_ACCOUNT.omid]).toBe('incoming');

    expect(
      loss.players.every((player) => player.you || player.accountId != null),
    ).toBe(true);
  });
});
