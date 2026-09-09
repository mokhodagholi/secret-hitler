import { createSignal } from 'solid-js';
import type { MessageKey, MessageValues } from '../i18n';
import type { I18nService } from './I18nService';
import type { SettingsService } from './SettingsService';

export type RaviWho = 'farid' | 'dilara';

/** Catalog ids — same strings as `ravi-script.md` and the mp3 filenames. */
export type RaviLineId =
  | 'deal.start'
  | 'deal.look'
  | 'night.start'
  | 'night.end'
  | 'president.first'
  | 'president.next'
  | 'president.special'
  | 'discuss.start'
  | 'discuss.closing'
  | 'discuss.ended'
  | 'nominate.start'
  | 'nominate.named'
  | 'nominate.timeout'
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
  | 'law.presidentChoosing'
  | 'law.burned'
  | 'law.pass'
  | 'law.chancellorChoosing'
  | 'law.liberal'
  | 'law.fascist'
  | 'law.vetoOffered'
  | 'law.vetoAgreed'
  | 'law.vetoRejected'
  | 'law.vetoUnlocked'
  | 'power.investigate'
  | 'power.investigated'
  | 'power.peek'
  | 'power.peekDone'
  | 'power.specialElection'
  | 'power.execution'
  | 'power.executed'
  | 'power.hitlerExecuted'
  | 'game.liberalsWin.policies'
  | 'game.fascistsWin.policies'
  | 'game.reveal';

const FARID_CLIPS = import.meta.glob('../assets/sounds/ravi/farid/*.mp3', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const DILARA_CLIPS = import.meta.glob('../assets/sounds/ravi/dilara/*.mp3', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const HOLD_WITHOUT_CLIP_MS = 1_200;

const canPlayAudio = typeof Audio !== 'undefined';

function indexClips(modules: Record<string, string>): Record<string, string> {
  const catalog: Record<string, string> = {};
  for (const [path, src] of Object.entries(modules)) {
    const file = path.split('/').pop() ?? '';
    catalog[file.replace(/\.mp3$/, '')] = src;
  }
  return catalog;
}

const CLIPS: Record<RaviWho, Record<string, string>> = {
  farid: indexClips(FARID_CLIPS),
  dilara: indexClips(DILARA_CLIPS),
};

/**
 * Table narrator: a subtitle for the header and an optional spoken clip.
 * Subtitles always run; audio is gated on the Ravi Voice setting.
 */
export class RaviService {
  private readonly lineSignal = createSignal<string | null>(null);
  readonly line = this.lineSignal[0];
  private readonly setLine = this.lineSignal[1];

  private readonly speakingSignal = createSignal(false);
  readonly speaking = this.speakingSignal[0];
  private readonly setSpeaking = this.speakingSignal[1];

  private current: HTMLAudioElement | null = null;
  private generation = 0;

  constructor(
    private readonly settings: SettingsService,
    private readonly i18n: I18nService,
  ) {}

  /** Resolve the line into the header and play the matching clip if voice is on. */
  speak(id: RaviLineId, params?: MessageValues): Promise<void> {
    const subtitle = this.i18n.formatMessage(`ravi.${id}` as MessageKey, params);
    this.setLine(subtitle);
    this.generation += 1;
    const generation = this.generation;
    this.stopCurrent();
    this.setSpeaking(true);

    const src = this.clipSrc(id);
    if (!canPlayAudio || !this.settings.settings.raviVoice || !src) {
      return this.hold(generation);
    }

    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.9;
    this.current = audio;
    return new Promise((resolve) => {
      const finish = () => {
        if (this.generation !== generation) return;
        this.setSpeaking(false);
        this.current = null;
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
        .catch(() => finish());
    });
  }

  /** Drop the current clip so a new beat can take the speaker. */
  cancel(): void {
    this.generation += 1;
    this.stopCurrent();
    this.setSpeaking(false);
  }

  clear(): void {
    this.cancel();
    this.setLine(null);
  }

  private clipSrc(id: RaviLineId): string | undefined {
    return CLIPS[this.settings.settings.raviWho][id];
  }

  private stopCurrent(): void {
    if (!this.current) return;
    this.current.pause();
    this.current = null;
  }

  private hold(generation: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (this.generation === generation) this.setSpeaking(false);
        resolve();
      }, HOLD_WITHOUT_CLIP_MS);
    });
  }
}
