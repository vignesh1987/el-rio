/**
 * Game logic that sits between the model and the screens.
 * Nothing here draws anything; it only prepares numbers and text.
 */
import { cheapestSiloPlan } from "../model/silo.ts";
import { mergePlans } from "../model/search.ts";
import { sumEffect } from "../model/simulate.ts";
import type { MinistryId, Outcome, Plan, Scenario } from "../model/types.ts";
import { fmt, pct } from "./format.ts";

export const MINISTRIES: MinistryId[] = ["agriculture", "energy", "water"];

/** Pick a ministry at random for a new player. */
export function randomMinistry(): MinistryId {
  return MINISTRIES[Math.floor(Math.random() * MINISTRIES.length)];
}

/** The cheapest silo plan of each ministry. Computed once and reused. */
const siloCache = new Map<string, Record<MinistryId, { plan: Plan; cost: number }>>();
export function siloPlans(scenario: Scenario) {
  if (!siloCache.has(scenario.id)) {
    siloCache.set(
      scenario.id,
      Object.fromEntries(MINISTRIES.map((m) => [m, cheapestSiloPlan(scenario, m)])) as Record<MinistryId, { plan: Plan; cost: number }>,
    );
  }
  return siloCache.get(scenario.id)!;
}

/** The plans the two computer "colleague" ministries submit in round 1. */
export function colleaguePlan(scenario: Scenario, player: MinistryId): Plan {
  const silo = siloPlans(scenario);
  return mergePlans(...MINISTRIES.filter((m) => m !== player).map((m) => silo[m].plan));
}

/** CSS colour variable for a ministry. */
export function ministryColour(m: MinistryId): string {
  return `var(${m === "agriculture" ? "--agri" : m === "energy" ? "--energy" : "--water"})`;
}

/** Short ministry name, e.g. "Agriculture". */
export function shortName(m: MinistryId): string {
  return m === "agriculture" ? "Agriculture" : m === "energy" ? "Energy" : "Water Supply";
}

/**
 * One-line explanations for failing checks. They point at the cause in
 * another sector, which is where the silo plans went wrong.
 */
export function hintFor(checkId: Outcome["checks"][number]["id"], o: Outcome): string {
  switch (checkId) {
    case "electricity":
      return `Dams get ${pct(o.hydroFlowFactor)} of natural flow. Pumps and water supply add ${fmt(o.demandPumpsTWh + o.demandWaterSupplyTWh)} TWh.`;
    case "aquifer":
      return `Pumping exceeds recharge by ${fmt(o.aquiferOverdraftBcm)} bcm. The water table falls ${fmt(o.waterTableFallMetresPerYear)} m a year.`;
    case "river":
      return `${fmt(o.riverTotalUseBcm)} bcm is taken, but only ${fmt(o.riverAllocatableBcm)} bcm can be taken without drying the delta.`;
    case "food":
      return o.serviceFactor < 1 ? "Blackouts stop the irrigation pumps." : "Grow more grain.";
    case "cityWater":
      return o.serviceFactor < 1 ? "Blackouts stop the city pumps and treatment plants." : "Supply more water.";
    case "land":
      return "Farms, reservoirs and solar need more land than Utopia has.";
    case "co2":
      return "Too much coal and gas for the emissions cap.";
  }
}

/** What the player's own round-1 plan contributed to the combined outcome. */
export function playerContribution(scenario: Scenario, player: MinistryId, plan: Plan, o: Outcome): string[] {
  const river = sumEffect(scenario, plan, "riverBcm", player);
  const aquifer = sumEffect(scenario, plan, "aquiferBcm", player);
  const power = sumEffect(scenario, plan, "powerUseTWh", player);
  const lines: string[] = [];
  if (player === "agriculture") {
    if (river > 0) lines.push(`Your irrigation took ${fmt(river)} bcm from the river above the dams.`);
    if (aquifer > 0) lines.push(`Your tube wells pumped ${fmt(aquifer)} bcm from the aquifer the cities also use.`);
    if (power > 0) lines.push(`Your pumps needed ${fmt(power, 2)} TWh that nobody planned to generate.`);
  }
  if (player === "water") {
    if (river > 0) lines.push(`Your river intake took ${fmt(river)} bcm above the dams.`);
    if (aquifer > 0) lines.push(`Your city wells pumped ${fmt(aquifer)} bcm from the aquifer the farms also use.`);
    if (power > 0) lines.push(`Your pumps and treatment plants needed ${fmt(power, 2)} TWh that nobody planned to generate.`);
  }
  if (player === "energy") {
    const hydroRated = scenario.options
      .filter((opt) => opt.dependsOnRiverFlow)
      .reduce((total, opt) => total + (plan[opt.id] ?? 0) * (opt.perBlock.electricityTWh ?? 0), 0);
    if (hydroRated > 0) lines.push(`You counted on ${fmt(hydroRated)} TWh from the dams. With farms and cities upstream, they delivered ${fmt(o.generationBySource.hydro ?? 0)} TWh.`);
    lines.push(`Your forecast left out ${fmt(o.demandPumpsTWh + o.demandWaterSupplyTWh)} TWh for pumps and water treatment.`);
  }
  if (lines.length === 0) lines.push("Your plan used few shared resources. The system still failed because the others planned alone.");
  return lines;
}
