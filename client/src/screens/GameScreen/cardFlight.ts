import { LEGISLATIVE_TRAVEL_CARD_MS } from '@secret-hitler/shared';
import type { AnimationService } from '../../services/AnimationService';

export function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

export function offsetFrom(
  card: HTMLElement,
  origin: Element | null,
): { x: number; y: number } | null {
  if (!origin) return null;
  const from = centerOf(origin);
  const here = centerOf(card);
  return { x: from.x - here.x, y: from.y - here.y };
}

/** Face-down deal: pile → seat → hand. */
export function flyCard(
  animation: AnimationService,
  card: HTMLImageElement | undefined,
  from: Element | null,
  via: Element | null,
): Promise<void> {
  if (!card) return Promise.resolve();
  const start = offsetFrom(card, from);
  const mid = offsetFrom(card, via);
  if (!start) {
    card.style.opacity = '1';
    return Promise.resolve();
  }
  const tilt = mid ? 10 : -12;
  const keyframes: Keyframe[] = mid
    ? [
        {
          opacity: 1,
          transform: `translate(${start.x}px, ${start.y}px) scale(0.32) rotate(-18deg)`,
        },
        {
          opacity: 1,
          transform: `translate(${mid.x}px, ${mid.y}px) scale(0.44) rotate(${tilt}deg)`,
          offset: 0.55,
        },
        { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      ]
    : [
        {
          opacity: 1,
          transform: `translate(${start.x}px, ${start.y}px) scale(0.32) rotate(-12deg)`,
        },
        { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      ];
  return animation
    .playCustom(card, keyframes, {
      duration: LEGISLATIVE_TRAVEL_CARD_MS,
      easing: 'ease-in-out',
    })
    .then(() => {
      card.style.opacity = '1';
      card.style.transform = '';
    });
}

/**
 * Send a card from its current spot to a pile or board well. Lands small so
 * it reads as sitting in the destination, then the caller unmounts it.
 */
export function flyToTarget(
  animation: AnimationService,
  card: HTMLElement | undefined,
  target: Element | null,
  options: { duration?: number; landScale?: number } = {},
): Promise<void> {
  if (!card) return Promise.resolve();
  const end = offsetFrom(card, target);
  if (!end) return Promise.resolve();
  const landScale = options.landScale ?? 0.38;
  const duration = options.duration ?? LEGISLATIVE_TRAVEL_CARD_MS;
  return animation
    .playCustom(
      card,
      [
        { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
        {
          opacity: 1,
          transform: `translate(${end.x * 0.55}px, ${end.y * 0.45}px) scale(0.72) rotate(-16deg)`,
          offset: 0.45,
        },
        {
          opacity: 1,
          transform: `translate(${end.x}px, ${end.y}px) scale(${landScale}) rotate(-8deg)`,
        },
      ],
      { duration, easing: 'ease-in-out', fill: 'forwards' },
    )
    .then(() => {
      card.style.opacity = '1';
      card.style.transform = `translate(${end.x}px, ${end.y}px) scale(${landScale}) rotate(-8deg)`;
    });
}

/**
 * Office ribbon: previous seat → next, no card spin. The ribbon is pinned to
 * the destination in viewport space, then translated from the origin.
 */
export function flyRibbon(
  animation: AnimationService,
  ribbon: HTMLElement | undefined,
  from: Element | null,
  to: Element | null,
): Promise<void> {
  if (!ribbon || !to) return Promise.resolve();
  const dest = centerOf(to);
  const start = from ? centerOf(from) : dest;
  ribbon.style.left = `${dest.x}px`;
  ribbon.style.top = `${dest.y}px`;
  const dx = start.x - dest.x;
  const dy = start.y - dest.y;
  ribbon.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  ribbon.style.opacity = '1';
  return animation
    .playCustom(
      ribbon,
      [
        {
          opacity: 1,
          transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
        },
        { opacity: 1, transform: 'translate(-50%, -50%) translate(0px, 0px)' },
      ],
      { duration: 560, easing: 'ease-in-out', fill: 'forwards' },
    )
    .then(() => {
      ribbon.style.transform = 'translate(-50%, -50%)';
    });
}

export function officeAnchor(seatId: string): Element | null {
  return (
    document.querySelector(`[data-seat-id="${seatId}"] [data-office-anchor]`) ??
    document.querySelector(`[data-seat-id="${seatId}"]`)
  );
}

export function pileEl(pile: 'draw' | 'discard'): Element | null {
  return document.querySelector(`[data-pile="${pile}"]`);
}

export function emptyWell(party: 'liberal' | 'fascist'): Element | null {
  return document.querySelector(
    `[data-policy-party="${party}"]:not([data-filled])`,
  );
}

export function filledWell(party: 'liberal' | 'fascist'): Element | null {
  const wells = document.querySelectorAll(
    `[data-policy-party="${party}"][data-filled]`,
  );
  return wells[wells.length - 1] ?? null;
}
