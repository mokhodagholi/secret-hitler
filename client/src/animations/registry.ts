/**
 * Every animation the game can play, by name. Adding an animation is one entry
 * here; playing it is `animation.play(element, 'name')` — the key is
 * type-checked against this registry, the same shape as SoundService's EFFECTS.
 *
 * House rule: keyframes touch `transform` and `opacity` ONLY (compositor-thread
 * work, never layout or paint). Entrances end at the element's natural state so
 * a skipped animation (Reduce Motion) needs no cleanup; exits use
 * `fill: 'forwards'` and the caller unmounts the element afterwards.
 */
export interface AnimationDefinition {
  readonly keyframes: Keyframe[];
  readonly options: KeyframeAnimationOptions;
}

export const ANIMATIONS = {
  // --- Entrances -------------------------------------------------------------
  'fade-in': {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 200, easing: 'ease-out' },
  },
  /** Screen content entering on navigation — the frame stays put. */
  'screen-enter': {
    keyframes: [
      { opacity: 0, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    options: { duration: 260, easing: 'ease-out' },
  },
  /** Dialog entrance: small overshoot so it lands with weight. */
  'pop-in': {
    keyframes: [
      { opacity: 0, transform: 'scale(0.88)' },
      { opacity: 1, transform: 'scale(1.03)', offset: 0.7 },
      { opacity: 1, transform: 'scale(1)' },
    ],
    options: { duration: 260, easing: 'ease-out' },
  },
  /** Secret-role card flip (3D rotateY), the game-start reveal. */
  'card-flip-in': {
    keyframes: [
      { opacity: 0, transform: 'perspective(700px) rotateY(85deg)' },
      { opacity: 1, transform: 'perspective(700px) rotateY(0deg)' },
    ],
    options: { duration: 450, easing: 'ease-out' },
  },
  /** President/Chancellor badge landing on a seat. */
  'badge-pop': {
    keyframes: [
      { opacity: 0, transform: 'scale(0)' },
      { opacity: 1, transform: 'scale(1.3)', offset: 0.6 },
      { opacity: 1, transform: 'scale(1)' },
    ],
    options: { duration: 320, easing: 'ease-out' },
  },

  // --- Policy enactment beats --------------------------------------------------
  /** The enacted policy rises from the board and flips face-up, centre stage. */
  'policy-reveal': {
    keyframes: [
      { opacity: 0, transform: 'translateY(48px) scale(0.7) perspective(700px) rotateY(90deg)' },
      { opacity: 1, transform: 'translateY(0) scale(1.06) perspective(700px) rotateY(0deg)', offset: 0.75 },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    options: { duration: 650, easing: 'ease-out' },
  },
  /** The revealed policy retires toward the board tracker. */
  'policy-exit': {
    keyframes: [
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(-36px) scale(0.6)' },
    ],
    options: { duration: 350, easing: 'ease-in', fill: 'forwards' },
  },

  /** A player's execution: brief swell, then collapse into the seat's dead state.
   *  The final keyframe omits opacity so it lands on the `.dead` CSS styling. */
  'seat-death': {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.9, transform: 'scale(1.08)', offset: 0.25 },
      { opacity: 0.1, transform: 'scale(0.82)', offset: 0.7 },
      { transform: 'scale(1)' },
    ],
    options: { duration: 700, easing: 'ease-in-out' },
  },

  // --- Attention ---------------------------------------------------------------
  /** Horizontal jolt for failures (failed election, rejected action). */
  shake: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(7px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ],
    options: { duration: 380, easing: 'ease-in-out' },
  },
} satisfies Record<string, AnimationDefinition>;

export type AnimationName = keyof typeof ANIMATIONS;
