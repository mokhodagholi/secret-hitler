import { createEffect, onCleanup } from 'solid-js';
import { Phase, type LogCode } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { RaviLineId } from '../../services/RaviService';
import type { MessageValues } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';

const LOG_LINE: Partial<Record<LogCode, RaviLineId>> = {
  nominated: 'nominate.named',
  votePassed: 'vote.passed',
  voteFailed: 'vote.failed',
  hitlerChancellor: 'vote.hitlerChancellor',
  presidentDraws: 'law.draw',
  presidentPasses: 'law.pass',
  vetoProposed: 'law.vetoOffered',
  vetoRejected: 'law.vetoRejected',
  vetoAgreed: 'law.vetoAgreed',
  investigated: 'power.investigated',
  executed: 'power.executed',
  hitlerExecuted: 'power.hitlerExecuted',
  liberalsWin: 'game.liberalsWin.policies',
  fascistsWin: 'game.fascistsWin.policies',
  fascistsWinNumbers: 'game.fascistsWin.policies',
  chaos: 'chaos.start',
};

const POWER_LINE = {
  investigate: 'power.investigate',
  specialElection: 'power.specialElection',
  policyPeek: 'power.peek',
  execution: 'power.execution',
} as const satisfies Record<string, RaviLineId>;

const CLOSING_MS = 30_000;

function named(value: string | number | undefined): string | number {
  return typeof value === 'string' ? isolateBidi(value) : (value ?? '');
}

type PendingLine = { id: RaviLineId; params?: MessageValues };

/**
 * Drives Ravi off the snapshot and log. Lines are queued in story order so a
 * failed vote can say the rejection, then the tracker, then the next President.
 */
export function RaviNarrator(props: { ceremonyOpen: boolean; now: number }) {
  const { game, ravi } = useApp();

  let seenLog = 0;
  let sawSnapshot = false;
  let lastPhase: string | null = null;
  let lastPresident: string | null = null;
  let lastTracker = 0;
  let lastDiscussionStart = 0;
  let lastNominationOpen = false;
  let warnedClosing = false;

  onCleanup(() => ravi.clear());

  createEffect(() => {
    const state = game.view();
    if (!state || props.ceremonyOpen) return;
    props.now;

    const entries = game.logEntries();
    if (!sawSnapshot) {
      seenLog = entries.length;
      lastPhase = state.phase;
      lastPresident = state.board.president;
      lastTracker = state.board.electionTracker;
      lastDiscussionStart = state.discussionDeadline?.startedAt ?? 0;
      lastNominationOpen = state.nominationDeadline != null;
      sawSnapshot = true;
      return;
    }

    const pending: PendingLine[] = [];

    if (entries.length > seenLog) {
      for (const entry of entries.slice(seenLog)) {
        const line = LOG_LINE[entry.code];
        if (!line) continue;
        pending.push({
          id: line,
          params: {
            ...entry.params,
            name: named(entry.params?.name),
            president: named(entry.params?.president),
            chancellor: named(entry.params?.chancellor),
          },
        });
      }
      seenLog = entries.length;
    }

    const tracker = state.board.electionTracker;
    if (tracker > lastTracker) {
      pending.push({ id: 'tracker.advance', params: { count: tracker } });
    }
    lastTracker = tracker;

    const presidentId = state.board.president;
    if (presidentId && presidentId !== lastPresident) {
      pending.push({
        id: 'president.next',
        params: {
          name: named(
            state.players.find((player) => player.id === presidentId)?.name,
          ),
        },
      });
      lastPresident = presidentId;
    }

    const discussionStart = state.discussionDeadline?.startedAt ?? 0;
    if (discussionStart && discussionStart !== lastDiscussionStart) {
      lastDiscussionStart = discussionStart;
      warnedClosing = false;
      pending.push({ id: 'discuss.start' });
    }

    const nominationOpen = state.nominationDeadline != null;
    if (nominationOpen && !lastNominationOpen) {
      pending.push({ id: 'nominate.start' });
    }
    lastNominationOpen = nominationOpen;

    if (state.phase !== lastPhase) {
      if (state.phase === Phase.Voting) pending.push({ id: 'vote.start' });
      if (state.phase === Phase.SpecialPower && state.activePower) {
        pending.push({ id: POWER_LINE[state.activePower] });
      }
      if (state.phase === Phase.GameOver) pending.push({ id: 'game.reveal' });
      lastPhase = state.phase;
    }

    const endsAt = state.discussionDeadline?.endsAt;
    if (
      endsAt &&
      !warnedClosing &&
      endsAt - props.now <= CLOSING_MS &&
      endsAt - props.now > 0
    ) {
      warnedClosing = true;
      pending.push({ id: 'discuss.closing' });
    }

    for (const line of pending) {
      void ravi.speak(line.id, line.params);
    }
  });

  return null;
}
