/**
 * Shows an option's size as one number in its final unit.
 *
 * The model counts "blocks" (100,000 ha of farmland, 0.25 bcm of city water,
 * one power project). Players never see blocks. They see the amount that
 * matters for the ministry:
 *   Agriculture  million hectares farmed   (Mha)
 *   Water Supply billion m3 of water a year (bcm/yr)
 *   Energy       electricity generated      (TWh/yr)
 */
import type { Hint } from "../model/hints.ts";
import type { Option, Scenario } from "../model/types.ts";
import { fmt } from "./format.ts";

/**
 * "1.2 Mha", "2.00 bcm/yr" or "12 TWh/yr" for a number of blocks.
 * With `note`, dams add "at full flow": their rating assumes the river is untouched.
 */
export function quantity(option: Option, blocks: number, note = false): string {
  const e = option.perBlock;
  if (option.ministry === "agriculture") return `${fmt(blocks * (e.landMha ?? 0), 1)} Mha`;
  if (option.ministry === "water") return `${fmt(blocks * (e.cityWaterBcm ?? 0), 2)} bcm/yr`;
  return `${fmt(blocks * (e.electricityTWh ?? 0), 0)} TWh/yr${note && option.dependsOnRiverFlow ? " at full flow" : ""}`;
}

/** "Canal irrigation 1.2 Mha, Tube-well irrigation 0.3 Mha" for the options in a plan. */
export function describeQuantities(options: Option[], plan: Record<string, number>): string {
  return options
    .filter((o) => (plan[o.id] ?? 0) > 0)
    .map((o) => `${o.name} ${quantity(o, plan[o.id], true)}`)
    .join(", ");
}

/** "Canal irrigation 1.2 Mha → 0.1 Mha" for a hint. */
export function hintText(scenario: Scenario, hint: Hint): string {
  const option = scenario.options.find((o) => o.id === hint.optionId)!;
  return `${hint.optionName} ${quantity(option, hint.from)} → ${quantity(option, hint.to)}`;
}
