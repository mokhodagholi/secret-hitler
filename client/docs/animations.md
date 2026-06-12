# Animations

How the client animates. One service owns all playback:
[`AnimationService`](../src/services/AnimationService.ts), a singleton reached
through [`AppContext`](../src/services/AppContext.tsx) like every other client
service.

## Principles

- **One owner.** Components never call `element.animate` directly — they call
  `animation.play(element, 'name')`. Only `AnimationService` drives the Web
  Animations API.
- **Registries, not call sites.** Every animation is a named entry in
  [`animations/registry.ts`](../src/animations/registry.ts) — keyframes +
  options. Adding an animation is one entry; playing it is a string-keyed call
  the type checker validates (same shape as `SoundService`'s `EFFECTS`).
- **`transform` and `opacity` only.** House performance rule — keyframes never
  touch layout or paint. The service sets `will-change` before playing and
  clears it after.
- **Motion-gated at the source.** `play` and `hold` are no-ops while the
  **Reduce Motion** setting is on *or* the OS asks for
  `prefers-reduced-motion`. Callers never check either — a skipped animation
  resolves immediately and the UI lands in its final state. That's why
  entrances must end at the element's natural state, and exits use
  `fill: 'forwards'` with the caller unmounting afterwards.
- **Sequenced story beats.** Multi-step events go through `animation.enqueue`,
  a promise-chained FIFO. Simultaneous game events play one after another
  instead of over each other, and a throwing step never wedges the queue.

## Adding an animation

1. Add a named entry to `ANIMATIONS` in
   [`animations/registry.ts`](../src/animations/registry.ts):

```ts
'tracker-tick': {
  keyframes: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.35)', offset: 0.5 },
    { transform: 'scale(1)' },
  ],
  options: { duration: 300, easing: 'ease-out' },
},
```

2. Play it where the element mounts or the event fires:

```tsx
const { animation } = useApp();

// Entrance on mount — a ref callback is enough:
<span ref={(element) => void animation.play(element, 'tracker-tick')} />

// Or from an effect/event handler:
await animation.play(badgeElement, 'tracker-tick');
```

`play` resolves when the animation finishes (immediately when skipped), so
beats compose with `await`. Per-call overrides merge over the registry options:
`animation.play(el, 'fade-in', { duration: 400 })`.

## Sequencing multi-beat events

The policy-enactment reveal in
[`GameScreen`](../src/screens/GameScreen/GameScreen.tsx) is the reference
example — reveal, suspense hold, exit, cleanup, all as one queued beat:

```ts
void animation.enqueue(async () => {
  setRevealedPolicy(policy);                      // mount the overlay
  await animation.play(revealCard, 'policy-reveal');
  await animation.hold(900);                      // suspense (skipped w/o motion)
  await animation.play(revealCard, 'policy-exit');
  setRevealedPolicy(null);                        // unmount after the exit
});
```

Because state arrives as full snapshots, game events are detected as *diffs*
against the previous view (e.g. the policy total grew) — baseline on the first
snapshot of a room so a rejoin doesn't replay history.

## What's wired today

| Animation | Trigger |
|---|---|
| `screen-enter` | Every navigation — screen content rises in (`<Screen>`), paired with the swap-page sound |
| `policy-reveal` → `policy-exit` | Policy total grew — centre-stage card sequence |
| `card-flip-in` | Your secret role card appears (game start) |
| `pop-in` + `fade-in` | Voting overlay entrance |
| `badge-pop` | President/Chancellor badge lands on a seat |
| `shake` | Failed election — the whole table jolts (tracker grew; a reset is not a failure) |
| `card-flip-in` (staggered) | Game-over role cascade (`GameOverOverlay`) and the Policy Peek fan (`PowerPanel`) — `delay: index * step` + `fill: 'backwards'` to hold the hidden first frame through the delay |
| `seat-death` | A player's execution — the seat swells, collapses and settles into its `.dead` styling |

Planned (see CLAUDE.md "Animation Sequences to Build"): vote-reveal
simultaneous flip (needs the server to disclose per-player votes at
resolution — protocol change).

## Testing

jsdom has no Web Animations API; the service degrades to an instant no-op, so
rendered-screen tests run unchanged and never wait on timers (per
`docs/testing.md`, client tests don't touch animation timing). Unit tests stub
`element.animate` on a single element and assert against the registry:

```ts
const animate = rs.fn(() => ({ finished: Promise.resolve() }));
(element as unknown as { animate: unknown }).animate = animate;

await service.play(element, 'fade-in');
expect(animate).toHaveBeenCalledWith(
  ANIMATIONS['fade-in'].keyframes,
  ANIMATIONS['fade-in'].options,
);
```

See [`AnimationService.test.ts`](../src/services/AnimationService.test.ts) for
the full set (gating, queue order, failure isolation).
