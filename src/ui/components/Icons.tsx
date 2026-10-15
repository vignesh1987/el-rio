/**
 * Small line illustrations for the three ministries.
 * Drawn with `currentColor`, so they take the colour of the surrounding text.
 */

export function WheatIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
      <path d="M32 60V18" />
      {[22, 31, 40].map((y) => (
        <g key={y}>
          <path d={`M32 ${y} C24 ${y - 2} 21 ${y - 9} 22 ${y - 14} C28 ${y - 12} 31 ${y - 7} 32 ${y}`} />
          <path d={`M32 ${y} C40 ${y - 2} 43 ${y - 9} 42 ${y - 14} C36 ${y - 12} 33 ${y - 7} 32 ${y}`} />
        </g>
      ))}
      <path d="M32 18 C30 12 31 7 32 4 C33 7 34 12 32 18" />
      <path d="M10 60 H54" />
    </svg>
  );
}

export function PylonIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
      <path d="M22 60 L29 8 H35 L42 60" />
      <path d="M14 16 H50 M17 26 H47" />
      <path d="M26 30 L38 42 M38 30 L26 42 M24 46 L40 58 M40 46 L24 58" />
      <path d="M14 16 V20 M50 16 V20 M17 26 V30 M47 26 V30" />
    </svg>
  );
}

export function TapIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 22 H34 C42 22 46 26 46 34 V38 H38 V34 C38 31 36 30 34 30 H8 Z" />
      <path d="M22 22 V14 M14 14 H30" />
      <path d="M42 46 C42 46 37 52 37 55 A5 5 0 0 0 47 55 C47 52 42 46 42 46 Z" />
    </svg>
  );
}

export const MINISTRY_ICONS = {
  agriculture: WheatIcon,
  energy: PylonIcon,
  water: TapIcon,
} as const;
