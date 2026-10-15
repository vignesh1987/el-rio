/**
 * The water map: a side view of the river basin, from the hills to the sea.
 *
 *   hills -> farm plain -> cities -> gorge with dams -> sea
 *                 (aquifer under the plain and the cities)
 *
 * The river is drawn as a band whose width is proportional to its flow,
 * so it visibly narrows as farms and cities take water. The aquifer band
 * shows a falling water table when pumping exceeds recharge.
 *
 * Zones that are not in `visible` are covered with fog. In round 1 a
 * ministry only sees its own part of the basin.
 */
import { fmt, pct } from "../format.ts";
import { Mountains } from "./Mountains.tsx";
import { blocksOf, sumEffect } from "../../model/simulate.ts";
import type { Outcome, Plan, Scenario } from "../../model/types.ts";

export type RiverZone = "hills" | "farms" | "aquifer" | "cities" | "gorge" | "sea";

interface RiverMapProps {
  scenario: Scenario;
  plan: Plan;
  outcome: Outcome;
  /** Zones drawn in full. Farms, cities, gorge and sea outside this list are fogged. Default: all. */
  visible?: RiverZone[];
  /** Smaller drawing with fewer labels, for the council strip. */
  compact?: boolean;
  /** Makes zones clickable (landing page). */
  onZone?: (zone: RiverZone | null) => void;
  activeZone?: RiverZone | null;
}

// Drawing constants (SVG user units).
const W = 1200;
const H = 330;
const CY = 128; // centre line of the river
const PX_PER_BCM = 2.4; // river width per bcm/yr of flow

// Horizontal extent of each zone.
const ZONES: Record<Exclude<RiverZone, "aquifer">, [number, number]> = {
  hills: [0, 205],
  farms: [205, 560],
  cities: [560, 770],
  gorge: [770, 1000],
  sea: [1000, W],
};
const AQUIFER_TOP = 238;
const AQUIFER_BOTTOM = 304;

const ZONE_NAMES: Record<RiverZone, string> = {
  hills: "Hills and river source",
  farms: "Farm plain",
  aquifer: "Aquifer",
  cities: "Cities",
  gorge: "River gorge and dam sites",
  sea: "Delta and sea",
};

/** Split eight field plots between farm types in proportion to the blocks built. */
function fieldTypes(plan: Plan): string[] {
  const types = ["rainfed", "canal", "tubewell", "drip"];
  const blocks = types.map((t) => blocksOf(plan, t));
  const total = blocks.reduce((a, b) => a + b, 0);
  if (total === 0) return Array(8).fill("free");
  // Largest-remainder rounding so the eight plots add up exactly.
  const exact = blocks.map((b) => (b / total) * 8);
  const counts = exact.map(Math.floor);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; counts.reduce((a, b) => a + b, 0) < 8; k++) counts[order[k][1]] += 1;
  return types.flatMap((t, i) => Array(counts[i]).fill(t));
}

export function RiverMap({ scenario, plan, outcome, visible, compact, onZone, activeZone }: RiverMapProps) {
  const shown = new Set<RiverZone>(visible ?? ["hills", "farms", "aquifer", "cities", "gorge", "sea"]);
  shown.add("hills");

  // ---------------------------------------------------------------- Flows along the river
  const natural = scenario.limits.riverNaturalFlowBcm;
  const farmTake = sumEffect(scenario, plan, "riverBcm", "agriculture");
  const cityTake = sumEffect(scenario, plan, "riverBcm", "water");
  const afterFarms = Math.max(natural - farmTake, 0);
  const afterCities = Math.max(afterFarms - cityTake, 0);
  const atDams = outcome.flowAtDamsBcm;
  const toSea = outcome.riverRemainingBcm;
  const eflow = scenario.limits.environmentalFlowBcm;

  // (x, flow) pairs: the river outline is built from these.
  // It starts as a thin stream at the foot of the mountains and widens to full flow.
  const profile: [number, number][] = [
    [140, 1],
    [215, natural],
    [545, afterFarms],
    [600, afterFarms],
    [730, afterCities],
    [810, atDams],
    [970, toSea],
    [1010, toSea],
  ];
  const half = (flow: number) => Math.max((flow * PX_PER_BCM) / 2, 0.8);
  const top = profile.map(([x, f]) => `${x},${CY - half(f)}`);
  const bottom = profile.map(([x, f]) => `${x},${CY + half(f)}`).reverse();
  const riverOutline = [...top, ...bottom].join(" ");

  // ---------------------------------------------------------------- Aquifer
  const aquiferUse = outcome.aquiferUseBcm;
  const recharge = scenario.limits.aquiferRechargeBcm;
  const overdraft = outcome.aquiferOverdraftBcm;
  const tableDrop = Math.min((overdraft / recharge) * 60, AQUIFER_BOTTOM - AQUIFER_TOP - 10);

  // ---------------------------------------------------------------- What is built
  const fields = fieldTypes(plan);
  const dams = blocksOf(plan, "hydro");
  const damSites = scenario.options.find((o) => o.id === "hydro")?.maxBlocks ?? 3;
  const cityWells = blocksOf(plan, "wells");
  const desal = blocksOf(plan, "desal");

  const label = compact ? "map-label big" : "map-label";
  const fieldFill: Record<string, string> = {
    free: "var(--tile-free)",
    rainfed: "var(--tile-rainfed)",
    canal: "var(--tile-canal)",
    tubewell: "var(--tile-tubewell)",
    drip: "var(--tile-drip)",
  };

  const fog = (zone: Exclude<RiverZone, "aquifer" | "hills">) => {
    if (shown.has(zone)) return null;
    const [x0, x1] = ZONES[zone];
    return (
      <g key={`fog-${zone}`}>
        <rect x={x0} y={0} width={x1 - x0} height={H} fill="var(--surface)" />
        <rect x={x0} y={0} width={x1 - x0} height={H} fill="url(#fog-hatch)" />
        <text x={(x0 + x1) / 2} y={H / 2 - 20} text-anchor="middle" class={label}>
          NOT YOUR MINISTRY
        </text>
      </g>
    );
  };

  return (
    <div class={`map ${compact ? "compact" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`River: ${fmt(natural)} bcm per year at the source, ${fmt(atDams)} at the dams, ${fmt(toSea)} reaching the sea. Aquifer pumping ${fmt(aquiferUse)} of ${fmt(recharge)} bcm recharge.`}>
        <defs>
          <pattern id="fog-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--rule)" stroke-width="2" />
          </pattern>
          <pattern id="dry-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--fail)" stroke-width="2" />
          </pattern>
        </defs>

        {/* Ground line */}
        <line x1={0} y1={AQUIFER_TOP - 4} x2={1000} y2={AQUIFER_TOP - 4} stroke="var(--rule)" />

        {/* Mountains at the river source */}
        <Mountains />
        {!compact && <text x={18} y={30} class={label}>SOURCE</text>}
        <text x={18} y={compact ? 40 : 52} class="map-value">
          {fmt(natural)} bcm/yr
        </text>

        {/* Aquifer under the farm plain and the cities */}
        <rect x={205} y={AQUIFER_TOP} width={565} height={AQUIFER_BOTTOM - AQUIFER_TOP} fill="var(--aquifer)" />
        {overdraft > 0 && (
          <>
            <rect x={205} y={AQUIFER_TOP} width={565} height={tableDrop} fill="url(#dry-hatch)" opacity={0.6} />
            <line x1={205} y1={AQUIFER_TOP + tableDrop} x2={770} y2={AQUIFER_TOP + tableDrop} stroke="var(--fail)" stroke-width="2" stroke-dasharray="6 4" />
          </>
        )}
        <text x={216} y={AQUIFER_BOTTOM - 12} class={label} style={{ fill: "var(--aquifer-deep)" }}>
          AQUIFER · PUMPING {fmt(aquiferUse)} OF {fmt(recharge)} BCM/YR RECHARGE
        </text>
        {overdraft > 0 && (
          <text x={765} y={AQUIFER_BOTTOM - 12} text-anchor="end" class={label} style={{ fill: "var(--fail)" }}>
            WATER TABLE FALLS {fmt(outcome.waterTableFallMetresPerYear)} M/YR
          </text>
        )}

        {/* Farm plain: eight plots, four above and four below the river */}
        {fields.map((type, i) => {
          const above = i < 4;
          const x = 222 + (i % 4) * 82;
          const y = above ? 46 : 172;
          const fieldH = above ? 44 : 40;
          const edge = above ? CY - half(natural - (farmTake * (x + 35 - 215)) / 330) : CY + half(natural - (farmTake * (x + 35 - 215)) / 330);
          return (
            <g key={`field-${i}`}>
              <rect x={x} y={y} width={72} height={fieldH} fill={fieldFill[type]} stroke="var(--rule)" />
              {type === "canal" && <line x1={x + 36} y1={above ? y + fieldH : edge} x2={x + 36} y2={above ? edge : y} stroke="var(--river)" stroke-width={3} />}
              {type === "drip" && <line x1={x + 36} y1={above ? y + fieldH : edge} x2={x + 36} y2={above ? edge : y} stroke="var(--river)" stroke-width={2} stroke-dasharray="3 3" />}
              {type === "tubewell" && (
                <>
                  <line x1={x + 36} y1={y + fieldH / 2} x2={x + 36} y2={AQUIFER_TOP + 14} stroke="var(--aquifer-deep)" stroke-width={2} />
                  <circle cx={x + 36} cy={y + fieldH / 2} r={5} fill="var(--aquifer-deep)" />
                </>
              )}
            </g>
          );
        })}
        {!compact && <text x={222} y={30} class={label}>FARM PLAIN</text>}

        {/* Cities */}
        <g fill="var(--muted)" opacity={0.7}>
          <rect x={606} y={52} width={24} height={44} />
          <rect x={634} y={34} width={20} height={62} />
          <rect x={658} y={58} width={28} height={38} />
          <rect x={690} y={44} width={22} height={52} />
          <rect x={716} y={64} width={26} height={32} />
        </g>
        {cityTake > 0 && <line x1={664} y1={96} x2={664} y2={CY - half(afterFarms - cityTake / 2)} stroke="var(--river)" stroke-width={Math.max(cityTake * 4, 2)} />}
        {Array.from({ length: Math.min(cityWells, 4) }, (_, i) => (
          <g key={`cw-${i}`}>
            <line x1={612 + i * 38} y1={176} x2={612 + i * 38} y2={AQUIFER_TOP + 14} stroke="var(--water)" stroke-width={2} />
            <circle cx={612 + i * 38} cy={176} r={5} fill="var(--water)" />
          </g>
        ))}
        {!compact && <text x={606} y={24} class={label}>CITIES</text>}
        {!compact && shown.has("farms") && shown.has("cities") && (
          <text x={548} y={CY - half(afterFarms) - 10} class={label} text-anchor="end">
            {fmt(afterFarms)} BCM/YR LEFT
          </text>
        )}

        {/* River (drawn after the plots so canals meet its edge) */}
        <polygon points={riverOutline} fill="var(--river)" />
        {afterCities > 0.3 && <polyline points={profile.map(([x]) => `${x},${CY}`).join(" ")} class="river-flow" />}

        {/* Gorge and dams */}
        <path d={`M770 0 L1000 0 L1000 ${CY - 26} L960 ${CY - 30} L900 ${CY - 24} L850 ${CY - 30} L790 ${CY - 26} L770 ${CY - 40} Z`} fill="var(--track)" />
        <path d={`M770 ${H - 96} L790 ${CY + 28} L850 ${CY + 32} L900 ${CY + 26} L960 ${CY + 30} L1000 ${CY + 26} L1000 ${H - 96} Z`} fill="var(--track)" />
        {Array.from({ length: damSites }, (_, i) => {
          const x = 830 + i * 52;
          const built = i < dams;
          return built ? (
            <rect key={`dam-${i}`} x={x} y={CY - 24} width={8} height={48} fill="var(--ink)" />
          ) : (
            <rect key={`dam-${i}`} x={x} y={CY - 24} width={8} height={48} fill="none" stroke="var(--muted)" stroke-dasharray="3 3" />
          );
        })}
        {!compact && <text x={790} y={24} class={label}>RIVER GORGE · DAM SITES</text>}
        <text x={790} y={compact ? 40 : 46} class={`map-value ${outcome.hydroFlowFactor < 0.95 && dams > 0 ? "bad" : ""}`}>
          {fmt(atDams)} bcm/yr at the dams
        </text>
        {!compact && (
          <text x={790} y={64} class={label}>
            {pct(outcome.hydroFlowFactor)} OF NATURAL FLOW
          </text>
        )}

        {/* Sea */}
        <rect x={1010} y={0} width={190} height={H} fill="var(--river)" opacity={0.16} />
        {!compact && <text x={1022} y={24} class={label}>DELTA AND SEA</text>}
        <text x={1022} y={compact ? 210 : 214} class={`map-value ${toSea < eflow - 1e-9 ? "bad" : ""}`}>
          {fmt(toSea)} bcm/yr
        </text>
        {!compact && (
          <text x={1022} y={234} class={label}>
            MINIMUM {fmt(eflow)} FOR THE DELTA
          </text>
        )}
        {desal > 0 && (
          <g>
            <rect x={1030} y={262} width={46} height={26} fill="var(--water)" />
            {!compact && (
              <text x={1084} y={280} class={label}>
                DESALINATION
              </text>
            )}
          </g>
        )}

        {/* Fog over zones the player cannot see */}
        {fog("farms")}
        {fog("cities")}
        {fog("gorge")}
        {fog("sea")}

        {/* Clickable zones (landing page only) */}
        {onZone &&
          (["hills", "farms", "cities", "gorge", "sea"] as const).map((zone) => {
            const [x0, x1] = ZONES[zone];
            return (
              <rect
                key={`hit-${zone}`}
                class={`zone-hit ${activeZone === zone ? "active" : ""}`}
                x={x0}
                y={0}
                width={x1 - x0}
                height={AQUIFER_TOP - 6}
                tabIndex={0}
                role="button"
                aria-label={ZONE_NAMES[zone]}
                onMouseEnter={() => onZone(zone)}
                onFocus={() => onZone(zone)}
                onClick={() => onZone(zone)}
              />
            );
          })}
        {onZone && (
          <rect
            class={`zone-hit ${activeZone === "aquifer" ? "active" : ""}`}
            x={205}
            y={AQUIFER_TOP}
            width={565}
            height={AQUIFER_BOTTOM - AQUIFER_TOP}
            tabIndex={0}
            role="button"
            aria-label={ZONE_NAMES.aquifer}
            onMouseEnter={() => onZone("aquifer")}
            onFocus={() => onZone("aquifer")}
            onClick={() => onZone("aquifer")}
          />
        )}
      </svg>
    </div>
  );
}
