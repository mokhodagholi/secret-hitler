import type { JSX } from 'solid-js';

export type IconName =
  | 'book'
  | 'home'
  | 'gear'
  | 'people'
  | 'masks'
  | 'clock'
  | 'chat'
  | 'palette'
  | 'globe'
  | 'menu'
  | 'music'
  | 'speaker'
  | 'question'
  | 'info'
  | 'refresh'
  | 'trash'
  | 'chevronRight'
  | 'arrowLeft'
  | 'star'
  | 'capitol'
  | 'envelope'
  | 'cards'
  | 'scroll'
  | 'skull'
  | 'door'
  | 'crown'
  | 'share'
  | 'close';

const glyphs: Record<IconName, () => JSX.Element> = {
  book: () => (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  home: () => (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </>
  ),
  gear: () => (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  people: () => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  masks: () => (
    <>
      <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7H2Z" />
      <path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z" />
      <path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  chat: () => (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  palette: () => (
    <>
      <path d="M12 22a10 10 0 1 1 10-10c0 2-1.5 3.5-3.5 3.5H16a2 2 0 0 0-1.4 3.4c.3.3.4.7.4 1.1a2 2 0 0 1-3 2z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="11" cy="7.5" r="1" />
      <circle cx="16" cy="8.5" r="1" />
    </>
  ),
  globe: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </>
  ),
  menu: () => (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  music: () => (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  speaker: () => (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  question: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
      <path d="M12 17.5v.01" />
    </>
  ),
  info: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8v.01" />
    </>
  ),
  refresh: () => (
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  trash: () => (
    <>
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  chevronRight: () => <path d="m9 18 6-6-6-6" />,
  arrowLeft: () => (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  star: () => (
    <polygon
      fill="currentColor"
      stroke="none"
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
    />
  ),
  capitol: () => (
    <>
      <path d="M3 22h18" />
      <path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7" />
      <path d="M4 11h16" />
      <path d="M12 2 4 7h16z" />
    </>
  ),
  envelope: () => (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </>
  ),
  cards: () => (
    <>
      <rect x="3" y="5" width="12" height="16" rx="2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v12" />
    </>
  ),
  scroll: () => (
    <>
      <path d="M5 4a2 2 0 0 1 2 2v12a2 2 0 0 1-4 0V8" />
      <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H7" />
      <path d="M10 9h6M10 13h6" />
    </>
  ),
  skull: () => (
    <>
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v2h8z" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="m12.5 17-.5-1-.5 1z" />
    </>
  ),
  door: () => (
    <>
      <path d="M13 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6" />
      <path d="M13 21 4 19V5l9-2z" />
      <circle cx="10.5" cy="12" r="0.75" fill="currentColor" />
    </>
  ),
  crown: () => (
    <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-1.5 10h-15z" fill="currentColor" stroke="none" />
  ),
  share: () => (
    <>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="m8.7 10.6 6.6-3.2M8.7 13.4l6.6 3.2" />
    </>
  ),
  close: () => <path d="M18 6 6 18M6 6l12 12" />,
};

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
}

export function Icon(props: IconProps) {
  return (
    <svg
      width={props.size ?? 22}
      height={props.size ?? 22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      {glyphs[props.name]()}
    </svg>
  );
}
