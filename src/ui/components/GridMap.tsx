/**
 * The power map: a flow diagram of the national grid.
 *
 *   power plants  ->  national grid  ->  electricity users
 *
 * Band thickness is proportional to TWh per year. Hydropower shows its
 * rated output as an outline and its actual output as a fill, so a dam
 * starved of water is easy to spot. If demand exceeds generation, each
 * user's unserved share is drawn as a red hatched block.
 *
 * In the Energy silo view (`silo`), only the Ministry of Energy's own
 * forecast appears on the right. Pumps and water treatment are invisible
 * to it.
 */
import { fmt, pct } from "../format.ts";
import { blocksOf } from "../../model/simulate.ts";
import type { Outcome, Plan, Scenario } from "../../model/types.ts";

interface GridMapProps {
  scenario: Scenario;
  plan: Plan;
  outcome: Outcome;
  silo?: boolean;
  compact?: boolean;
}

const W = 1000;
const H_MAX = 330; // tallest the drawing area may be
const LABEL_SLOT = 36; // minimum vertical room for a node's two text lines
const SOURCE_X = 190;
const BUS_X = 480;
const LOAD_X = 790;
const NODE_W = 16;
const GAP = 12;

const SOURCE_COLOURS: Record<string, string> = {
  solar: "var(--tile-solar)",
  hydro: "var(--river)",
  coal: "var(--muted)",
  gas: "var(--energy)",
};

/** A filled band between two vertical spans, drawn with smooth curves. */
function ribbon(x0: number, a0: number, a1: number, x1: number, b0: number, b1: number): string {
  const mid = (x0 + x1) / 2;
  return `M${x0},${a0} C${mid},${a0} ${mid},${b0} ${x1},${b0} L${x1},${b1} C${mid},${b1} ${mid},${a1} ${x0},${a1} Z`;
}

export function GridMap({ scenario, plan, outcome, silo, compact }: GridMapProps) {
  // ---------------------------------------------------------------- Sources
  const sources = scenario.options
    .filter((o) => o.ministry === "energy" && blocksOf(plan, o.id) > 0)
    .map((o) => ({
      id: o.id,
      name: o.name.replace(" power plant", "").replace(" farm", "").replace("power dam", "power"),
      rated: blocksOf(plan, o.id) * (o.perBlock.electricityTWh ?? 0),
      actual: outcome.generationBySource[o.id] ?? 0,
    }));

  // ---------------------------------------------------------------- Users
  const loads = [
    { id: "forecast", name: "Homes, offices, industry", demand: outcome.demandBaseTWh, colour: "var(--energy)" },
    { id: "pumps", name: "Farm pumps", demand: outcome.demandPumpsTWh, colour: "var(--agri)" },
    { id: "water", name: "City water supply", demand: outcome.demandWaterSupplyTWh, colour: "var(--water)" },
  ].filter((l) => l.id === "forecast" || (!silo && l.demand > 0));

  // ---------------------------------------------------------------- Scale
  const totalRated = sources.reduce((a, s) => a + s.rated, 0);
  const tallest = Math.max(totalRated + GAP * sources.length, outcome.demandTotalTWh + GAP * loads.length, 1);
  const s = Math.min(7, (H_MAX - 90) / tallest); // pixels per TWh
  const service = outcome.serviceFactor;

  // Lay out source nodes from the top, each as tall as its rated output.
  let y = 40;
  const sourceNodes = sources.map((src) => {
    const node = { ...src, y, h: src.rated * s, hActual: src.actual * s };
    y += Math.max(node.h, LABEL_SLOT) + GAP;
    return node;
  });

  // The grid bus is as tall as total generation, centred.
  const busH = outcome.generationTWh * s;
  const busY = 40 + Math.max((y - 40 - GAP - busH) / 2, 0);

  // Ribbons from each source's actual output into the bus.
  let busCursor = busY;
  const inRibbons = sourceNodes.map((n) => {
    const path = ribbon(SOURCE_X + NODE_W, n.y, n.y + n.hActual, BUS_X, busCursor, busCursor + n.hActual);
    busCursor += n.hActual;
    return { id: n.id, path, colour: SOURCE_COLOURS[n.id] ?? "var(--muted)" };
  });

  // Users on the right; each is split into served and unserved parts.
  let ly = 40;
  let busOut = busY;
  const loadNodes = loads.map((l) => {
    const h = l.demand * s;
    const served = h * service;
    const path = ribbon(BUS_X + 18, busOut, busOut + served, LOAD_X, ly, ly + served);
    const node = { ...l, y: ly, h, served, path };
    busOut += served;
    ly += Math.max(h, LABEL_SLOT) + GAP;
    return node;
  });

  const lit = Math.round(service * 10);
  // Height of the drawing: tallest column plus room for the bus label and the lights.
  const H = Math.max(y, ly, busY + busH + 30) + 60;
  const label = compact ? "map-label big" : "map-label";

  return (
    <div class={`map ${compact ? "compact" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grid: generation ${fmt(outcome.generationTWh)} TWh, demand ${fmt(outcome.demandTotalTWh)} TWh, ${pct(service)} of demand served.`}>
        <defs>
          <pattern id="unserved-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--fail)" stroke-width="2.5" />
          </pattern>
        </defs>

        {!compact && (
          <>
            <text x={20} y={22} class={label}>POWER PLANTS</text>
            <text x={BUS_X - 20} y={22} class={label}>NATIONAL GRID</text>
            <text x={LOAD_X} y={22} class={label}>{silo ? "YOUR FORECAST" : "ELECTRICITY USERS"}</text>
          </>
        )}

        {sources.length === 0 && (
          <text x={20} y={80} class={label}>
            NO POWER PLANTS BUILT YET
          </text>
        )}

        {inRibbons.map((r) => (
          <path key={`in-${r.id}`} d={r.path} fill={r.colour} opacity={0.3} />
        ))}
        {loadNodes.map((l) => (
          <path key={`out-${l.id}`} d={l.path} fill={l.colour} opacity={0.3} />
        ))}

        {/* Source nodes */}
        {sourceNodes.map((n) => {
          const short = n.actual < n.rated * 0.99;
          return (
            <g key={`src-${n.id}`}>
              <rect x={SOURCE_X} y={n.y} width={NODE_W} height={Math.max(n.h, 1)} fill="none" stroke={SOURCE_COLOURS[n.id]} stroke-dasharray={short ? "3 3" : undefined} />
              <rect x={SOURCE_X} y={n.y} width={NODE_W} height={Math.max(n.hActual, 1)} fill={SOURCE_COLOURS[n.id]} />
              <text x={SOURCE_X - 10} y={n.y + 12} text-anchor="end" class={label}>
                {n.name.toUpperCase()}
              </text>
              <text x={SOURCE_X - 10} y={n.y + (compact ? 34 : 28)} text-anchor="end" class={`map-value ${short ? "bad" : ""}`}>
                {short ? `${fmt(n.actual)} of ${fmt(n.rated)}` : fmt(n.actual)} TWh
              </text>
            </g>
          );
        })}

        {/* Grid bus */}
        <rect x={BUS_X} y={busY} width={18} height={Math.max(busH, 1)} fill="var(--ink)" />
        <text x={BUS_X + 9} y={busY + busH + 22} text-anchor="middle" class="map-value">
          {fmt(outcome.generationTWh)} TWh
        </text>

        {/* User nodes, served (solid) and unserved (hatched) */}
        {loadNodes.map((l) => (
          <g key={`load-${l.id}`}>
            <rect x={LOAD_X} y={l.y} width={NODE_W} height={Math.max(l.served, 0.5)} fill={l.colour} />
            {l.h - l.served > 0.5 && <rect x={LOAD_X} y={l.y + l.served} width={NODE_W} height={l.h - l.served} fill="url(#unserved-hatch)" stroke="var(--fail)" />}
            <text x={LOAD_X + NODE_W + 10} y={l.y + 12} class={label}>
              {l.name.toUpperCase()}
            </text>
            <text x={LOAD_X + NODE_W + 10} y={l.y + (compact ? 34 : 28)} class="map-value">
              {fmt(l.demand, l.demand < 1 ? 2 : 1)} TWh
            </text>
          </g>
        ))}

        {/* Lights: one bulb per 10% of demand served */}
        <g transform={`translate(${LOAD_X}, ${H - 34})`}>
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={`bulb-${i}`} x={i * 18} y={0} width={13} height={13} rx={2} fill={i < lit ? "var(--energy)" : "var(--track)"} />
          ))}
          {outcome.shortfallTWh > 0.05 && (
            <text x={0} y={-10} class="map-value bad">
              Blackout: {fmt(outcome.shortfallTWh)} TWh ({pct(outcome.shortfallTWh / outcome.demandTotalTWh)})
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
