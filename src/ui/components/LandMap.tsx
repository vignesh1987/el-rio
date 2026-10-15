/**
 * The land map: Utopia's usable land as a mosaic of tiles.
 *
 * One tile = 100,000 hectares (0.1 Mha). The baseline has 4.0 Mha, so the
 * mosaic has 40 tiles. Farms fill whole tiles; reservoirs and solar farms
 * fill parts of tiles. Anything beyond the limit spills into red-edged
 * tiles: land that would have to come from forest or wetland.
 *
 * With `showBlackout`, irrigated tiles that depend on pumps fade in
 * proportion to the blackout, because their water stops when the power does.
 */
import { fmt } from "../format.ts";
import { blocksOf } from "../../model/simulate.ts";
import type { Outcome, Plan, Scenario } from "../../model/types.ts";

interface LandMapProps {
  scenario: Scenario;
  plan: Plan;
  outcome: Outcome;
  showBlackout?: boolean;
  /** Show only farm uses (the Agriculture silo view). */
  farmsOnly?: boolean;
}

const MHA_PER_TILE = 0.1;

interface Use {
  key: string;
  label: string;
  colour: string;
  tiles: number;
  needsPower?: boolean;
}

export function LandMap({ scenario, plan, outcome, showBlackout, farmsOnly }: LandMapProps) {
  const land = (id: string) => (blocksOf(plan, id) * (scenario.options.find((o) => o.id === id)?.perBlock.landMha ?? 0)) / MHA_PER_TILE;

  const uses: Use[] = [
    { key: "rainfed", label: "Rain-fed", colour: "var(--tile-rainfed)", tiles: land("rainfed") },
    { key: "canal", label: "Canal", colour: "var(--tile-canal)", tiles: land("canal") },
    { key: "tubewell", label: "Tube well", colour: "var(--tile-tubewell)", tiles: land("tubewell"), needsPower: true },
    { key: "drip", label: "Drip", colour: "var(--tile-drip)", tiles: land("drip"), needsPower: true },
  ];
  if (!farmsOnly) {
    uses.push(
      { key: "reservoir", label: "Reservoirs", colour: "var(--tile-reservoir)", tiles: land("hydro") },
      { key: "solar", label: "Solar", colour: "var(--tile-solar)", tiles: land("solar") },
      { key: "thermal", label: "Power stations", colour: "var(--muted)", tiles: land("coal") + land("gas") },
    );
  }

  // Pour each use into tiles in order, splitting a use across tiles where needed.
  const capacity = Math.round(scenario.limits.landMha / MHA_PER_TILE);
  const tiles: { use: Use; share: number }[][] = [];
  let current: { use: Use; share: number }[] = [];
  let room = 1;
  for (const use of uses) {
    let left = use.tiles;
    while (left > 1e-9) {
      const piece = Math.min(left, room);
      current.push({ use, share: piece });
      left -= piece;
      room -= piece;
      if (room <= 1e-9) {
        tiles.push(current);
        current = [];
        room = 1;
      }
    }
  }
  if (current.length) tiles.push(current);
  while (tiles.length < capacity) tiles.push([]);

  // Pick a column count that fills every row (8 columns x 5 rows for 40 tiles).
  const columns = [8, 7, 10, 6, 5].find((c) => capacity % c === 0) ?? 8;

  const fade = showBlackout ? 0.25 + 0.75 * outcome.serviceFactor : 1;
  const usedMha = uses.reduce((a, u) => a + u.tiles, 0) * MHA_PER_TILE;

  return (
    <div class="land">
      <div class="tiles" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} role="img" aria-label={`Land: ${fmt(usedMha)} of ${fmt(scenario.limits.landMha)} million hectares in use.`}>
        {tiles.map((slices, i) => (
          <div key={`tile-${i}`} class={`tile ${i >= capacity ? "over" : ""}`}>
            {slices.map((sl, j) => (
              <span
                key={`s-${j}`}
                style={{
                  width: `${sl.share * 100}%`,
                  background: sl.use.colour,
                  opacity: sl.use.needsPower ? fade : 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div class="legend">
        {uses
          .filter((u) => u.tiles > 0)
          .map((u) => (
            <span key={u.key}>
              <i style={{ background: u.colour }} />
              {u.label} {fmt(u.tiles * MHA_PER_TILE, u.tiles < 1 ? 2 : 1)} Mha
            </span>
          ))}
        <span>
          <i style={{ background: "var(--tile-free)" }} />
          Unused {fmt(Math.max(scenario.limits.landMha - usedMha, 0))} Mha
        </span>
      </div>
    </div>
  );
}
