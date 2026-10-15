/**
 * Cartoon mountains for the river source, drawn in the top-left corner of
 * the river map (x from 0 to 205, ground at y = 234).
 *
 * Two snow-capped peaks, a meltwater stream running down to where the
 * river begins (x = 140, y = 128), pine trees on the foothills and a cloud.
 * Colours come from tokens.css, so the drawing follows light and dark themes.
 */

/** A two-tier pine tree standing on the point (x, y). */
function Pine({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 1.5} y={y} width={3} height={6} fill="var(--land)" />
      <polygon points={`${x},${y - 18} ${x - 9},${y} ${x + 9},${y}`} fill="var(--pine)" />
      <polygon points={`${x},${y - 28} ${x - 7},${y - 12} ${x + 7},${y - 12}`} fill="var(--pine)" />
    </g>
  );
}

export function Mountains() {
  return (
    <g aria-hidden="true">
      {/* Foothills that slope down into the farm plain */}
      <path d="M0 234 L0 150 Q60 142 120 152 Q180 164 222 234 Z" fill="var(--track)" />

      {/* Distant ridge */}
      <polygon points="-10,150 22,104 40,118 70,82 104,150" fill="var(--rock-far)" />

      {/* Left peak: lit face, shaded face, snow cap */}
      <polygon points="-4,150 58,62 126,150" fill="var(--rock)" />
      <polygon points="58,62 126,150 72,150" fill="var(--rock-shade)" />
      <polygon points="58,62 46,80 52,77 57,85 63,77 70,82" fill="var(--snow)" />

      {/* Right peak: lit face, shaded face, snow cap */}
      <polygon points="60,150 122,74 190,150" fill="var(--rock)" />
      <polygon points="122,74 190,150 134,150" fill="var(--rock-shade)" />
      <polygon points="122,74 109,92 115,89 121,97 128,88 135,93" fill="var(--snow)" />

      {/* Meltwater stream from the snow down to the head of the river */}
      <path d="M121 98 C117 108 127 114 125 121 C123 127 132 129 141 128" fill="none" stroke="var(--river)" stroke-width={3} stroke-linecap="round" />

      {/* Pines on the foothills */}
      <Pine x={16} y={196} />
      <Pine x={34} y={206} />
      <Pine x={52} y={192} />
      <Pine x={168} y={202} />
      <Pine x={186} y={190} />

      {/* A cloud over the peaks */}
      <g fill="var(--surface)" stroke="var(--rule)" stroke-width={1.5}>
        <ellipse cx={168} cy={38} rx={26} ry={11} />
        <circle cx={160} cy={32} r={10} />
        <circle cx={175} cy={29} r={12} />
      </g>
    </g>
  );
}
