# Animations

Moved to [`client/docs/animations.md`](../../client/docs/animations.md) — the
single source.

Short version: all animation goes through one singleton,
`client/src/services/AnimationService.ts`, reached via `AppContext`. Animations
are named registry entries (`client/src/animations/registry.ts`, transform/
opacity only); play one with `animation.play(element, 'name')`, sequence beats
with `animation.enqueue(...)` + `animation.hold(...)`. Playback is gated on the
Reduce Motion setting and `prefers-reduced-motion` — callers never check them.
See the doc for adding animations, sequencing, and testing.
