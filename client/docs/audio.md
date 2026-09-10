# Audio — Music & Sound Effects

How the client plays sound. One service owns all playback:
[`SoundService`](../src/services/SoundService.ts), a singleton reached through
[`AppContext`](../src/services/AppContext.tsx) like every other client service.

## Principles

- **One owner.** Components and effects never touch `Audio` directly — they call
  `sound.play(...)` / `sound.playMusic(...)`. Only `SoundService` constructs
  audio nodes.
- **Settings-gated at the source.** `play` is a no-op while **Sound Effects** is
  off; music is a no-op while **Music** is off. Callers never read the toggles
  themselves — just fire the sound.
- **Registries, not call sites.** Every sound is one entry in the `EFFECTS` or
  `MUSIC` registry. Adding a sound is a one-line change; playing it is a
  string-keyed call the type checker validates.
- **Bundler-imported assets.** Sound files are imported (`import url from
  '...mp3'`) so Rsbuild fingerprints and serves them — they do **not** live in
  `public/`.

## Where files live

```
client/src/assets/sounds/
  effects/   ← one-shot effects (swap-page.mp3, vote-reveal.mp3, …)
  music/     ← looping tracks (menu-theme.mp3, ingame-ambient.mp3, …)
```

Prefer `.mp3` (small, universally supported) or `.ogg`. Avoid `.wav` on the web
— the files are far larger for no gain. Keep effects short; loops should be
authored to loop seamlessly.

## Adding a one-shot effect

1. Drop the file in `client/src/assets/sounds/effects/`.
2. Import it and add one line to the `EFFECTS` registry in `SoundService.ts`:

```ts
import voteRevealUrl from '../assets/sounds/effects/vote-reveal.mp3';

const EFFECTS = {
  'swap-page': { src: swapPageUrl, volume: 0.6 },
  'vote-reveal': { src: voteRevealUrl, volume: 0.7 }, // ← added
} satisfies Record<string, SoundDefinition>;
```

3. Play it from wherever the event fires:

```ts
const { sound } = useApp();
sound.play('vote-reveal'); // key is type-checked against the registry
```

`volume` is optional (0–1, defaults to 1). Effects are decoded once at startup,
so the first play is instant rather than waiting on a load. `play` reuses the
warm element when it's idle and only clones to overlap a sound that's still
playing, so rapid repeats layer instead of cutting each other off.

## Adding background music

Same shape, in the `MUSIC` registry. A single track loops at a time;
`playMusic` replaces whatever is playing.

```ts
sound.playMusic('menu-theme'); // starts the loop (no-op if Music is off)
sound.stopMusic();             // stops it
```

The **Music** toggle is wired in `AppContext` — turning it off pauses the loop,
turning it back on resumes the last track. You do not call `setMusicEnabled`
yourself; that effect handles it.

## Event wiring

Cross-cutting sounds are triggered by effects in `AppContext`, keeping other
services audio-free. The page-swap sound is the reference example:

```ts
// Plays on every screen change, skipping the initial mount.
createEffect(
  on(services.nav.screen, () => services.sound.play('swap-page'), {
    defer: true,
  }),
);
```

Game-event sounds (policy enacted, vote reveal, execution, …) belong next to the
event that fires them — typically a `createEffect` in the relevant screen that
watches game state, or the handler that reacts to a server message.

The catalog of those one-shots — what to bake, when they fire, and how to
generate the files — is [`docs/sound-effects.md`](../../docs/sound-effects.md).
Bake with `scripts/generate-sound-effects.py`. Looping beds (Suno prompts,
when to switch tracks) are [`docs/background-music.md`](../../docs/background-music.md).
Spoken table lines stay in
[`docs/ravi-script.md`](../../docs/ravi-script.md); do not put words in an SFX.

## Testing

`SoundService` degrades to a no-op where there is no `Audio` constructor, and
[`test/setup.ts`](../test/setup.ts) stubs `HTMLMediaElement` playback so the
suite stays silent. The harness injects a real `SoundService`, so navigation
tests exercise the swap sound without noise.

Unit-test the service by spying on the prototype and asserting the toggle is
respected — restore the spy per test, since it lives on a shared prototype:

```ts
afterEach(() => rs.restoreAllMocks());

it('Should stay silent while Sound Effects are off', () => {
  const settings = new SettingsService();
  settings.set('soundEffects', false);
  const play = rs.spyOn(HTMLMediaElement.prototype, 'play');

  new SoundService(settings).play('swap-page');

  expect(play).not.toHaveBeenCalled();
});
```

See [`SoundService.test.ts`](../src/services/SoundService.test.ts) for the full
set.
