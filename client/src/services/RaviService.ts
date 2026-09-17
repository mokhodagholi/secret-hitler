import { createSignal } from 'solid-js';
import { raviClipMs, RAVI_CLIP_MS, type RaviVoiceId } from '@secret-hitler/shared';
import { RAVI_CLIPS, type RaviWho } from '../assets/sounds/ravi/clips';
import type { MessageKey, MessageValues } from '../i18n';
import type { I18nService } from './I18nService';
import type { PrefetchService } from './prefetch';
import type { SettingsService } from './SettingsService';

export type { RaviWho };

function asVoiceId(who: RaviWho): RaviVoiceId {
  return who in RAVI_CLIP_MS ? (who as RaviVoiceId) : 'daniel';
}

/** Catalog ids — same strings as `ravi-script.md` and the mp3 filenames. */
export type RaviLineId =
  | 'deal.start'
  | 'deal.look'
  | 'night.start'
  | 'night.end'
  | 'president.first'
  | 'president.firstYou'
  | 'president.next'
  | 'president.nextYou'
  | 'president.special'
  | 'discuss.start'
  | 'discuss.afterFail'
  | 'discuss.afterPower'
  | 'discuss.afterLeave'
  | 'discuss.afterLeave2'
  | 'discuss.afterLeave3'
  | 'discuss.closing'
  | 'discuss.ended'
  | 'nominate.start'
  | 'nominate.named'
  | 'nominate.namedYou'
  | 'nominate.namedAsYou'
  | 'nominate.timeout'
  | 'kick.asked'
  | 'kick.askedYou'
  | 'kick.askedOnYou'
  | 'kick.passed'
  | 'kick.passedYou'
  | 'kick.passedOnYou'
  | 'kick.failed'
  | 'kick.failedYou'
  | 'kick.failedOnYou'
  | 'office.presidentLeft'
  | 'office.chancellorLeft'
  | 'office.roundOver'
  | 'player.left'
  | 'player.away'
  | 'player.back'
  | 'player.backYou'
  | 'vote.start'
  | 'vote.collecting'
  | 'vote.count'
  | 'vote.passed'
  | 'vote.failed'
  | 'vote.hitlerChancellor'
  | 'tracker.advance'
  | 'chaos.start'
  | 'chaos.enacted'
  | 'law.draw'
  | 'law.drawYou'
  | 'law.presidentChoosing'
  | 'law.burned'
  | 'law.pass'
  | 'law.passYou'
  | 'law.chancellorChoosing'
  | 'law.liberal'
  | 'law.fascist'
  | 'law.vetoOffered'
  | 'law.vetoAgreed'
  | 'law.vetoRejected'
  | 'law.vetoUnlocked'
  | 'power.investigate'
  | 'power.investigated'
  | 'power.investigatedYou'
  | 'power.investigatedLiberal'
  | 'power.investigatedFascist'
  | 'power.peek'
  | 'power.peekDone'
  | 'power.specialElection'
  | 'power.execution'
  | 'power.executed'
  | 'power.executedYou'
  | 'power.hitlerExecuted'
  | 'game.liberalsWin.policies'
  | 'game.fascistsWin.policies'
  | 'game.reveal'
  | 'private.youLiberal'
  | 'private.youFascist'
  | 'private.youHitler'
  | 'private.nightLiberal'
  | 'private.nightFascistSmall'
  | 'private.nightFascistLarge'
  | 'private.nightHitlerSmall'
  | 'private.nominate'
  | 'private.vote'
  | 'private.discard'
  | 'private.enact';

const HOLD_WITHOUT_CLIP_MS = 1_200;
/** Finish typing slightly before the clip so the last word is not cut off. */
const TYPE_LEAD_MS = 160;

const canPlayAudio = typeof Audio !== 'undefined';

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'] as const;

function isAutoplayBlocked(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'NotAllowedError'
  );
}

/**
 * Table narrator: a subtitle for the header and an optional spoken clip.
 * Subtitles always run; audio is gated on the Ravi Voice setting.
 */
export class RaviService {
  private readonly lineSignal = createSignal<string | null>(null);
  readonly line = this.lineSignal[0];
  private readonly setLine = this.lineSignal[1];

  private readonly lineIdSignal = createSignal<RaviLineId | null>(null);
  readonly lineId = this.lineIdSignal[0];
  private readonly setLineId = this.lineIdSignal[1];

  private readonly speakingSignal = createSignal(false);
  readonly speaking = this.speakingSignal[0];
  private readonly setSpeaking = this.speakingSignal[1];

  /** How long the current line should take to type (ms) — clip length for the active voice. */
  private readonly lineDurationSignal = createSignal(HOLD_WITHOUT_CLIP_MS);
  readonly lineDurationMs = this.lineDurationSignal[0];
  private readonly setLineDurationMs = this.lineDurationSignal[1];

  private current: HTMLAudioElement | null = null;
  private generation = 0;
  private epoch = 0;
  private queue: Promise<void> = Promise.resolve();
  private unlockGesture: (() => void) | null = null;

  constructor(
    private readonly settings: SettingsService,
    private readonly i18n: I18nService,
    private readonly prefetch?: PrefetchService,
  ) {}

  /** Resolve the line into the header and play the matching clip if voice is on. */
  speak(id: RaviLineId, params?: MessageValues): Promise<void> {
    const epoch = this.epoch;
    const run = this.queue.then(() => {
      if (this.epoch !== epoch) return;
      return this.deliver(id, params);
    });
    this.queue = run.catch(() => {});
    return run;
  }

  /** Wait until every queued line has finished (or been cancelled). */
  idle(): Promise<void> {
    return this.queue.then(() => {});
  }

  /** Drop the current clip so a new beat can take the speaker. */
  cancel(): void {
    this.epoch += 1;
    this.generation += 1;
    this.stopCurrent();
    this.setSpeaking(false);
    this.queue = Promise.resolve();
  }

  clear(): void {
    this.cancel();
    this.setLine(null);
    this.setLineId(null);
    this.setLineDurationMs(HOLD_WITHOUT_CLIP_MS);
  }

  /** Stop the current clip and subtitle immediately (DEV skip wait). */
  skip(): void {
    this.clear();
    this.setLineDurationMs(0);
  }

  /**
   * Call from the Ravi Voice toggle — that tap is a user gesture in Bale.
   * Replays the current line when turning back on; does not touch table voice.
   */
  setVoiceEnabled(enabled: boolean): void {
    if (!enabled) {
      this.stopCurrent();
      this.setSpeaking(false);
      return;
    }
    this.unlockSession();
    const id = this.lineId();
    if (id) this.replayAfterUnlock(id);
  }

  private catalogMs(id: RaviLineId): number {
    return (
      raviClipMs(asVoiceId(this.settings.settings.raviWho), id) ??
      HOLD_WITHOUT_CLIP_MS
    );
  }

  private setDurationForLine(id: RaviLineId, audioMs?: number): void {
    const catalog = this.catalogMs(id);
    const raw = audioMs != null && Number.isFinite(audioMs) && audioMs > 0 ? audioMs : catalog;
    this.setLineDurationMs(Math.max(400, Math.round(raw) - TYPE_LEAD_MS));
  }

  private deliver(id: RaviLineId, params?: MessageValues): Promise<void> {
    const subtitle = this.i18n.formatMessage(`ravi.${id}` as MessageKey, params);
    this.setLine(subtitle);
    this.setLineId(id);
    this.setDurationForLine(id);
    this.generation += 1;
    const generation = this.generation;
    this.stopCurrent();
    this.setSpeaking(true);

    const src = this.clipSrc(id);
    if (!canPlayAudio || !this.settings.settings.raviVoice || !src) {
      return this.hold(generation, this.catalogMs(id));
    }

    this.playClip(id);
    const audio = this.current;
    if (!audio) return this.hold(generation, this.catalogMs(id));

    const syncDuration = () => {
      if (this.generation !== generation) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        this.setDurationForLine(id, audio.duration * 1000);
      }
    };
    audio.addEventListener('loadedmetadata', syncDuration, { once: true });
    syncDuration();

    return new Promise((resolve) => {
      const finish = () => {
        if (this.generation === generation) {
          this.setSpeaking(false);
          if (this.current === audio) this.current = null;
        }
        resolve();
      };
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      const played = audio.play() as Promise<void> | undefined;
      played
        ?.then(() => {
          // jsdom's play stub never starts, so paused stays true — don't hang.
          if (audio.paused || audio.ended) finish();
        })
        .catch((error) => {
          if (isAutoplayBlocked(error)) this.armUnlock();
          finish();
        });
    });
  }

  private playClip(id: RaviLineId): void {
    const src = this.clipSrc(id);
    if (!canPlayAudio || !this.settings.settings.raviVoice || !src) return;
    this.stopCurrent();
    const audio = new Audio(this.prefetch?.src(src) ?? src);
    audio.preload = 'auto';
    audio.volume = 0.9;
    this.current = audio;
  }

  private unlockSession(): void {
    if (!canPlayAudio) return;
    const warm = new Audio();
    warm.muted = true;
    const played = warm.play() as Promise<void> | undefined;
    played
      ?.then(() => warm.pause())
      .catch((error) => {
        if (isAutoplayBlocked(error)) this.armUnlock();
      });
  }

  private armUnlock(): void {
    if (this.unlockGesture || typeof window === 'undefined') return;
    const onGesture = () => {
      this.disarmUnlock();
      const id = this.lineId();
      if (id && this.settings.settings.raviVoice) this.replayAfterUnlock(id);
    };
    this.unlockGesture = onGesture;
    for (const event of UNLOCK_EVENTS) {
      window.addEventListener(event, onGesture, true);
    }
  }

  private disarmUnlock(): void {
    const onGesture = this.unlockGesture;
    if (!onGesture) return;
    this.unlockGesture = null;
    for (const event of UNLOCK_EVENTS) {
      window.removeEventListener(event, onGesture, true);
    }
  }

  private replayAfterUnlock(id: RaviLineId): void {
    this.playClip(id);
    const audio = this.current;
    if (!audio) return;
    this.setSpeaking(true);
    this.setDurationForLine(id);
    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        this.setDurationForLine(id, audio.duration * 1000);
      }
    };
    audio.addEventListener('loadedmetadata', syncDuration, { once: true });
    const played = audio.play() as Promise<void> | undefined;
    played
      ?.then(() => {
        if (audio.paused || audio.ended) this.setSpeaking(false);
      })
      .catch((error) => {
        if (isAutoplayBlocked(error)) this.armUnlock();
        this.setSpeaking(false);
      });
    audio.addEventListener(
      'ended',
      () => {
        if (this.current === audio) {
          this.setSpeaking(false);
          this.current = null;
        }
      },
      { once: true },
    );
  }

  private clipSrc(id: RaviLineId): string | undefined {
    // New lines may not have a clip yet; deliver() holds on the subtitle.
    const clips: Partial<Record<RaviLineId, string>> =
      RAVI_CLIPS[this.settings.settings.raviWho];
    return clips[id];
  }

  private stopCurrent(): void {
    if (!this.current) return;
    this.current.pause();
    this.current = null;
  }

  private hold(generation: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (this.generation === generation) this.setSpeaking(false);
        resolve();
      }, durationMs);
    });
  }
}
