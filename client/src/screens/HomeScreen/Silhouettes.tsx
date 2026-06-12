/**
 * Background art for the landing screen: layered character silhouettes
 * over a faint capitol dome, echoing the printed box cover.
 */
export function Silhouettes(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 300 220" fill="currentColor" aria-hidden="true">
      {/* capitol dome, far background */}
      <g opacity="0.45">
        <path d="M20 200V120c0-30 18-48 40-48s40 18 40 48v80z" />
        <path d="M44 72c0-10 7-18 16-18s16 8 16 18z" />
        <rect x="58" y="40" width="4" height="16" />
      </g>
      {/* flag pole and banner, right */}
      <g opacity="0.5">
        <rect x="252" y="60" width="4" height="150" />
        <path d="M256 66h34l-8 9 8 9h-34z" />
      </g>
      {/* crowd of figures */}
      <g>
        <path d="M70 220v-46c0-16 11-27 26-27s26 11 26 27v46z" />
        <circle cx="96" cy="120" r="20" />
        <path d="M150 220v-58c0-18 13-30 29-30s29 12 29 30v58z" />
        <circle cx="179" cy="104" r="23" />
        <path d="M120 220v-40c0-15 10-25 23-25s23 10 23 25v40z" />
        <circle cx="143" cy="128" r="18" />
        <path d="M196 220v-44c0-15 11-26 25-26s25 11 25 26v44z" />
        <circle cx="221" cy="122" r="19" />
      </g>
    </svg>
  );
}
