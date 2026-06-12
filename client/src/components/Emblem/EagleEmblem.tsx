export interface EagleEmblemProps {
  class?: string;
  width?: number;
}

/** Geometric art-deco eagle used in headers and the landing screen. */
export function EagleEmblem(props: EagleEmblemProps) {
  return (
    <svg
      class={props.class}
      width={props.width ?? 72}
      viewBox="0 0 80 44"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="40" cy="7" r="3.4" />
      <path d="M43 5.4l4.2 1.5-4.2 1.7z" />
      <path d="M40 11 45 22l-5 19-5-19z" />
      <path d="M34.5 33h11L40 41.5z" />
      <path d="M37 13 2 6l4 6 31 7z" />
      <path d="M37 21 8 16l3.5 5.5 25.5 5z" />
      <path d="M37 28.5 14 25.5l3 5 20 3z" />
      <path d="M43 13l35-7-4 6-31 7z" />
      <path d="M43 21l29-5-3.5 5.5-25.5 5z" />
      <path d="M43 28.5l23-3-3 5-20 3z" />
    </svg>
  );
}
