import { afterEach } from '@rstest/core';
import { cleanup } from '@solidjs/testing-library';

// jsdom has no media stack; make audio playback a silent no-op so SoundService
// runs without "not implemented" noise.
HTMLMediaElement.prototype.play = (() => Promise.resolve()) as never;
HTMLMediaElement.prototype.pause = (() => undefined) as never;

// Unmount any rendered tree and reset persisted state between tests so each
// one starts from a clean DOM and empty storage — no shared state, no flake.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
