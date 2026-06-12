import swapPageUrl from '../assets/sounds/effects/swap-page.mp3';
import type { SettingsService } from './SettingsService';

interface SoundDefinition {
  readonly src: string;
  /** Playback volume, 0–1. Defaults to 1. */
  readonly volume?: number;
}

// One-shot effects. Add a file here and it becomes playable as sound.play('key').
const EFFECTS = {
  'swap-page': { src: swapPageUrl, volume: 0.6 },
} satisfies Record<string, SoundDefinition>;

// Looping background tracks. Same shape — add a file and play it with playMusic().
const MUSIC = {
  // 'menu-theme': { src: menuThemeUrl, volume: 0.4 },
} satisfies Record<string, SoundDefinition>;

export type SoundEffect = keyof typeof EFFECTS;
export type MusicTrack = keyof typeof MUSIC;

// SSR and some test runners have no Audio constructor; degrade to a silent no-op.
const canPlayAudio = typeof Audio !== 'undefined';

/**
 * Owns all audio playback. One-shot effects fire on game/UI events; a single
 * looping track plays underneath. Both are gated on the user's settings toggles,
 * so callers never check the settings themselves.
 */
export class SoundService {
  // Preloaded base node per effect — cloned on each play so repeats overlap.
  private readonly samples = new Map<SoundEffect, HTMLAudioElement>();
  private music: HTMLAudioElement | null = null;
  private musicTrack: MusicTrack | null = null;

  constructor(private readonly settings: SettingsService) {
    // Decode effects at startup so the first play is instant, not delayed by a
    // load on the click that triggers it.
    if (canPlayAudio) {
      for (const effect of Object.keys(EFFECTS) as SoundEffect[]) {
        this.sampleFor(effect).load();
      }
    }
  }

  /** Fire a one-shot effect. No-op while Sound Effects are off. */
  play(effect: SoundEffect): void {
    if (!canPlayAudio || !this.settings.settings.soundEffects) return;
    const sample = this.sampleFor(effect);
    // Reuse the warm element when idle (lowest latency); clone only to overlap a
    // sound that is still playing so quick repeats don't cut each other off.
    const idle = sample.paused || sample.ended;
    const voice = idle ? sample : (sample.cloneNode() as HTMLAudioElement);
    voice.volume = sample.volume;
    this.start(voice);
  }

  /** Start a looping track, replacing whatever is playing. No-op while Music is off. */
  playMusic(track: MusicTrack): void {
    if (this.musicTrack === track && this.music) return;
    this.stopMusic();
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
      this.music = null; // keep musicTrack so re-enabling can resume it
      return;
    }
    if (this.musicTrack && !this.music) {
      const track = this.musicTrack;
      this.musicTrack = null; // let playMusic re-arm from a clean slate
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
    // Autoplay can reject until the first user gesture — ignore, it's not fatal.
    const played = audio.play() as Promise<void> | undefined;
    played?.catch(() => {});
  }
}
