/**
 * The reference plan: the cheapest plan that passes every check when all
 * three ministries plan together. The debrief compares the player's
 * Nexus Council plan with it.
 *
 * Method (plain brute force, split into three steps to stay fast):
 *   1. List every farm plan that meets the food target with at most one
 *      spare block of food.
 *   2. List every city-water plan that meets the target exactly.
 *   3. For each farm + water pair, try energy plans from cheapest to
 *      dearest and keep the first one that passes every check.
 *
 * Step 3 runs hundreds of thousands of times, so it uses a quick
 * arithmetic test (`energyPlanWorks`) instead of the full simulate().
 * The winning plan is then run through simulate() to confirm it, and the
 * tests check that the two always agree.
 */
import { forEachPlan, mergePlans } from "./search.ts";
import { optionsOf } from "./silo.ts";
import { simulate, sumEffect } from "./simulate.ts";
import type { Outcome, Plan, Scenario } from "./types.ts";

export interface ReferenceResult {
  plan: Plan;
  outcome: Outcome;
}

/** Totals for a farm + water pair that the energy test needs. */
interface DemandSide {
  riverBcm: number;
  landMha: number;
  extraPowerTWh: number;
}

/** Totals for one energy plan that the energy test needs. */
interface SupplySide {
  plan: Plan;
  cost: number;
  otherGenerationTWh: number; // everything except hydropower
  hydroAtNaturalFlowTWh: number;
  landMha: number;
  coolingWaterBcm: number;
}

/** Same logic as simulate(), reduced to the parts that depend on the energy plan. */
function energyPlanWorks(scenario: Scenario, demand: DemandSide, supply: SupplySide): boolean {
  const { limits, targets } = scenario;
  // Cooling water is taken below the dams, so only farms and cities reduce the flow at the dams.
  const flowFactor = Math.max(limits.riverNaturalFlowBcm - demand.riverBcm, 0) / limits.riverNaturalFlowBcm;
  const hydro = supply.hydroAtNaturalFlowTWh * flowFactor;
  const generation = supply.otherGenerationTWh + hydro;
  const riverUse = demand.riverBcm + supply.coolingWaterBcm + hydro * scenario.hydroEvaporationBcmPerTWh;
  return (
    generation >= targets.electricityTWh + demand.extraPowerTWh - 1e-9 &&
    demand.landMha + supply.landMha <= limits.landMha + 1e-9 &&
    riverUse <= limits.riverNaturalFlowBcm - limits.environmentalFlowBcm + 1e-9
  );
}

export function findReferencePlan(scenario: Scenario): ReferenceResult | null {
  const { targets, limits } = scenario;
  const riverAllocatable = limits.riverNaturalFlowBcm - limits.environmentalFlowBcm;
  const smallestFoodBlock = Math.min(
    ...optionsOf(scenario, "agriculture").map((o) => o.perBlock.foodMt ?? Infinity),
  );

  // Step 1: farm plans that meet food without much surplus and fit on the land.
  const farmPlans: Plan[] = [];
  forEachPlan(optionsOf(scenario, "agriculture"), (plan) => {
    const food = sumEffect(scenario, plan, "foodMt");
    if (food < targets.foodMt - 1e-9 || food > targets.foodMt + smallestFoodBlock + 1e-9) return;
    if (sumEffect(scenario, plan, "landMha") > limits.landMha + 1e-9) return;
    farmPlans.push(plan);
  });

  // Step 2: city water plans that meet the target exactly.
  const waterPlans: Plan[] = [];
  forEachPlan(optionsOf(scenario, "water"), (plan) => {
    if (Math.abs(sumEffect(scenario, plan, "cityWaterBcm") - targets.cityWaterBcm) < 1e-9) waterPlans.push(plan);
  });

  // Step 3: energy plans within the CO2 cap, cheapest first.
  const hydroIds = new Set(scenario.options.filter((o) => o.dependsOnRiverFlow).map((o) => o.id));
  const energyPlans: SupplySide[] = [];
  forEachPlan(optionsOf(scenario, "energy"), (plan) => {
    if (sumEffect(scenario, plan, "co2Mt") > limits.co2CapMt + 1e-9) return;
    let hydro = 0;
    let other = 0;
    for (const option of optionsOf(scenario, "energy")) {
      const twh = (plan[option.id] ?? 0) * (option.perBlock.electricityTWh ?? 0);
      if (hydroIds.has(option.id)) hydro += twh;
      else other += twh;
    }
    energyPlans.push({
      plan,
      cost: sumEffect(scenario, plan, "costMUSD"),
      otherGenerationTWh: other,
      hydroAtNaturalFlowTWh: hydro,
      landMha: sumEffect(scenario, plan, "landMha"),
      coolingWaterBcm: sumEffect(scenario, plan, "riverBcm"),
    });
  });
  energyPlans.sort((a, b) => a.cost - b.cost);

  let bestCost = Infinity;
  let bestPlan: Plan | null = null;
  for (const farm of farmPlans) {
    for (const water of waterPlans) {
      const both = mergePlans(farm, water);
      if (sumEffect(scenario, both, "aquiferBcm") > limits.aquiferRechargeBcm + 1e-9) continue;
      const demand: DemandSide = {
        riverBcm: sumEffect(scenario, both, "riverBcm"),
        landMha: sumEffect(scenario, both, "landMha"),
        extraPowerTWh: sumEffect(scenario, both, "powerUseTWh"),
      };
      if (demand.riverBcm > riverAllocatable + 1e-9) continue;
      const baseCost = sumEffect(scenario, both, "costMUSD");

      for (const supply of energyPlans) {
        if (baseCost + supply.cost >= bestCost) break; // cannot beat the best so far
        if (energyPlanWorks(scenario, demand, supply)) {
          bestCost = baseCost + supply.cost;
          bestPlan = mergePlans(both, supply.plan);
          break; // energy plans are sorted, so this is the cheapest for this pair
        }
      }
    }
  }

  if (!bestPlan) return null;
  return { plan: bestPlan, outcome: simulate(scenario, bestPlan) };
}
