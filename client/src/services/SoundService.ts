import { EFFECT_URLS } from '../assets/sounds/effects/clips';
import { MUSIC_URLS } from '../assets/sounds/music/clips';
import type { SettingsService } from './SettingsService';

interface SoundDefinition {
  readonly src: string;
  /** Playback volume, 0–1. Defaults to 1. */
  readonly volume?: number;
}

const STING = 0.72;
const CEREMONY = 0.64;
const HIT = 0.55;
const CLOCK = 0.42;

// One-shot effects. Add a file in clips.ts and it becomes playable as sound.play('key').
const EFFECTS = {
  'swap-page': { src: EFFECT_URLS['swap-page'], volume: 0.55 },
  'player-join': { src: EFFECT_URLS['player-join'], volume: HIT },
  'player-leave': { src: EFFECT_URLS['player-leave'], volume: HIT },
  'player-ready': { src: EFFECT_URLS['player-ready'], volume: HIT },
  'room-start': { src: EFFECT_URLS['room-start'], volume: CEREMONY },
  'ui-error': { src: EFFECT_URLS['ui-error'], volume: HIT },
  'ui-copied': { src: EFFECT_URLS['ui-copied'], volume: HIT },
  'room-closed': { src: EFFECT_URLS['room-closed'], volume: CEREMONY },
  'deal-slide': { src: EFFECT_URLS['deal-slide'], volume: HIT },
  'night-fall': { src: EFFECT_URLS['night-fall'], volume: CEREMONY },
  'card-flip': { src: EFFECT_URLS['card-flip'], volume: HIT },
  'glance-tick': { src: EFFECT_URLS['glance-tick'], volume: HIT },
  'night-lift': { src: EFFECT_URLS['night-lift'], volume: CEREMONY },
  'president-seal': { src: EFFECT_URLS['president-seal'], volume: CEREMONY },
  'chancellor-seal': { src: EFFECT_URLS['chancellor-seal'], volume: CEREMONY },
  'nominate-timeout': { src: EFFECT_URLS['nominate-timeout'], volume: STING },
  'discuss-open': { src: EFFECT_URLS['discuss-open'], volume: HIT },
  'discuss-warn': { src: EFFECT_URLS['discuss-warn'], volume: HIT },
  'discuss-close': { src: EFFECT_URLS['discuss-close'], volume: HIT },
  'ballot-tap': { src: EFFECT_URLS['ballot-tap'], volume: HIT },
  'ballot-slide': { src: EFFECT_URLS['ballot-slide'], volume: HIT },
  'vote-tally': { src: EFFECT_URLS['vote-tally'], volume: CEREMONY },
  'government-elected': { src: EFFECT_URLS['government-elected'], volume: STING },
  'government-rejected': { src: EFFECT_URLS['government-rejected'], volume: STING },
  'tracker-tick': { src: EFFECT_URLS['tracker-tick'], volume: CEREMONY },
  'chaos-hit': { src: EFFECT_URLS['chaos-hit'], volume: STING },
  'chaos-enact': { src: EFFECT_URLS['chaos-enact'], volume: CEREMONY },
  'policy-draw': { src: EFFECT_URLS['policy-draw'], volume: HIT },
  'policy-burn': { src: EFFECT_URLS['policy-burn'], volume: HIT },
  'policy-pass': { src: EFFECT_URLS['policy-pass'], volume: HIT },
  'law-liberal': { src: EFFECT_URLS['law-liberal'], volume: STING },
  'law-fascist': { src: EFFECT_URLS['law-fascist'], volume: STING },
  'veto-offer': { src: EFFECT_URLS['veto-offer'], volume: CEREMONY },
  'veto-agree': { src: EFFECT_URLS['veto-agree'], volume: CEREMONY },
  'veto-refuse': { src: EFFECT_URLS['veto-refuse'], volume: CEREMONY },
  'veto-unlock': { src: EFFECT_URLS['veto-unlock'], volume: CEREMONY },
  'seal-open': { src: EFFECT_URLS['seal-open'], volume: CEREMONY },
  'party-slide': { src: EFFECT_URLS['party-slide'], volume: HIT },
  'peek-flip': { src: EFFECT_URLS['peek-flip'], volume: HIT },
  'peek-done': { src: EFFECT_URLS['peek-done'], volume: HIT },
  'execute-strike': { src: EFFECT_URLS['execute-strike'], volume: STING },
  'you-died': { src: EFFECT_URLS['you-died'], volume: STING },
  'win-liberal': { src: EFFECT_URLS['win-liberal'], volume: 0.78 },
  'win-fascist': { src: EFFECT_URLS['win-fascist'], volume: 0.78 },
  'role-cascade': { src: EFFECT_URLS['role-cascade'], volume: CEREMONY },
  'timer-tick': { src: EFFECT_URLS['timer-tick'], volume: CLOCK },
  'timer-urgent': { src: EFFECT_URLS['timer-urgent'], volume: 0.5 },
} satisfies Record<string, SoundDefinition>;

const MUSIC_FADE_MS = 600;

const MUSIC = {
  'menu-theme': { src: MUSIC_URLS['menu-theme'], volume: 0.3 },
  'play-theme': { src: MUSIC_URLS['play-theme'], volume: 0.32 },
  'lobby-theme': { src: MUSIC_URLS['lobby-theme'], volume: 0.34 },
  'night-ambient': { src: MUSIC_URLS['night-ambient'], volume: 0.24 },
  'discuss-theme': { src: MUSIC_URLS['discuss-theme'], volume: 0.28 },
  'discuss-late': { src: MUSIC_URLS['discuss-late'], volume: 0.26 },
  'vote-theme': { src: MUSIC_URLS['vote-theme'], volume: 0.26 },
  'legislative-theme': { src: MUSIC_URLS['legislative-theme'], volume: 0.22 },
  'power-theme': { src: MUSIC_URLS['power-theme'], volume: 0.26 },
  'chaos-theme': { src: MUSIC_URLS['chaos-theme'], volume: 0.28 },
  'over-dawn': { src: MUSIC_URLS['over-dawn'], volume: 0.32 },
  'over-dusk': { src: MUSIC_URLS['over-dusk'], volume: 0.32 },
} satisfies Record<string, SoundDefinition>;

export type SoundEffect = keyof typeof EFFECTS;
export type MusicTrack = keyof typeof MUSIC;

const canPlayAudio = typeof Audio !== 'undefined';

/**
 * Owns all audio playback. One-shot effects fire on game/UI events; a single
 * looping track plays underneath. Both are gated on the user's settings toggles,
 * so callers never check the settings themselves.
 */
export class SoundService {
  private readonly samples = new Map<SoundEffect, HTMLAudioElement>();
  private music: HTMLAudioElement | null = null;
  private musicTrack: MusicTrack | null = null;

  constructor(private readonly settings: SettingsService) {}

  /** Fire a one-shot effect. No-op while Sound Effects are off. */
  play(effect: SoundEffect): void {
    if (!canPlayAudio || !this.settings.settings.soundEffects) return;
    const sample = this.sampleFor(effect);
    const idle = sample.paused || sample.ended;
    const voice = idle ? sample : (sample.cloneNode() as HTMLAudioElement);
    voice.volume = sample.volume;
    this.start(voice);
  }

  /** Start a looping track, replacing whatever is playing. No-op while Music is off. */
  playMusic(track: MusicTrack): void {
    if (this.musicTrack === track && this.music) return;
    if (this.musicTrack === track && !this.settings.settings.music) return;
    const outgoing = this.music;
    this.music = null;
    if (outgoing) {
      const from = outgoing.volume;
      const started = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - started) / MUSIC_FADE_MS);
        try {
          outgoing.volume = from * (1 - t);
        } catch {
          outgoing.pause();
          return;
        }
        if (t < 1) setTimeout(tick, 50);
        else outgoing.pause();
      };
      tick();
    }
    this.musicTrack = track;
    if (!canPlayAudio || !this.settings.settings.music) return;
    const { src, volume = 1 } = MUSIC[track];
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    this.music = audio;
    this.start(audio);
  }

  stopMusic(): void {
    this.music?.pause();
    this.music = null;
    this.musicTrack = null;
  }

  /** Reflect the Music toggle — pause the loop, or resume the chosen track. */
  setMusicEnabled(enabled: boolean): void {
    if (!enabled) {
      this.music?.pause();
      this.music = null;
      return;
    }
    if (this.musicTrack && !this.music) {
      const track = this.musicTrack;
      this.musicTrack = null;
      this.playMusic(track);
    }
  }

  private sampleFor(effect: SoundEffect): HTMLAudioElement {
    let sample = this.samples.get(effect);
    if (!sample) {
      const { src, volume = 1 } = EFFECTS[effect];
      sample = new Audio(src);
      sample.preload = 'auto';
      sample.volume = volume;
      this.samples.set(effect, sample);
    }
    return sample;
  }

  private start(audio: HTMLAudioElement): void {
    try {
      audio.currentTime = 0;
    } catch {
      /* environment can't seek (e.g. jsdom) — playback still attempts below */
    }
    const played = audio.play() as Promise<void> | undefined;
    played?.catch(() => {});
  }
}
