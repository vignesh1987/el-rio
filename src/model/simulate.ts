/**
 * The nexus model: what happens when a plan meets the shared system.
 *
 * The calculation runs in four steps, in this order:
 *   1. Water:       add up river and aquifer use. Work out how much river
 *                   flow is left at the dams.
 *   2. Electricity: hydropower output scales with the flow at the dams.
 *                   Demand = the Energy forecast + pumps + city water supply.
 *   3. Knock-on:    if generation is short, every user gets the same share
 *                   of the power they need. Pumps that lose power deliver
 *                   less water, so less food and less city water.
 *   4. Checks:      compare everything with the targets and limits.
 *
 * Simplifications (stated so students can criticise them):
 *   - One average year. No seasons, no droughts (those come in the climate version).
 *   - All farm and city river use happens upstream of the dams.
 *   - Coal and gas plants sit on the coast. Their cooling water is taken below the dams.
 *   - All water taken is consumed. No return flows.
 *   - Blackouts are shared equally across all electricity users.
 */
import type { Check, MinistryId, Option, Outcome, Plan, Scenario } from "./types.ts";

/** Blocks of one option in a plan (zero if missing). */
export function blocksOf(plan: Plan, optionId: string): number {
  return plan[optionId] ?? 0;
}

/** Sum one effect over all options in a plan, optionally for one ministry only. */
export function sumEffect(
  scenario: Scenario,
  plan: Plan,
  effect: keyof Option["perBlock"],
  ministry?: MinistryId,
): number {
  let total = 0;
  for (const option of scenario.options) {
    if (ministry && option.ministry !== ministry) continue;
    total += blocksOf(plan, option.id) * (option.perBlock[effect] ?? 0);
  }
  return total;
}

export function simulate(scenario: Scenario, plan: Plan): Outcome {
  const { limits, targets } = scenario;

  // ---------------------------------------------------------------- 1. Water
  // Farms and cities take water upstream of the dams.
  const riverUpstreamBcm = sumEffect(scenario, plan, "riverBcm", "agriculture") + sumEffect(scenario, plan, "riverBcm", "water");
  // Power stations take cooling water below the dams.
  const coolingWaterBcm = sumEffect(scenario, plan, "riverBcm", "energy");
  const flowAtDamsBcm = Math.max(limits.riverNaturalFlowBcm - riverUpstreamBcm, 0);
  const hydroFlowFactor = flowAtDamsBcm / limits.riverNaturalFlowBcm;

  const aquiferUseBcm = sumEffect(scenario, plan, "aquiferBcm");
  const aquiferOverdraftBcm = Math.max(aquiferUseBcm - limits.aquiferRechargeBcm, 0);
  const waterTableFallMetresPerYear = aquiferOverdraftBcm / scenario.aquiferStorageBcmPerMetre;

  // ---------------------------------------------------------------- 2. Electricity
  // Generation by source. Hydropower is scaled by the flow left at the dams.
  const generationBySource: Record<string, number> = {};
  for (const option of scenario.options) {
    const perBlock = option.perBlock.electricityTWh ?? 0;
    if (perBlock === 0) continue;
    const factor = option.dependsOnRiverFlow ? hydroFlowFactor : 1;
    generationBySource[option.id] = blocksOf(plan, option.id) * perBlock * factor;
  }
  const generationTWh = Object.values(generationBySource).reduce((a, b) => a + b, 0);

  // Reservoirs lose water to evaporation in proportion to hydropower output.
  const hydroTWh = scenario.options
    .filter((o) => o.dependsOnRiverFlow)
    .reduce((total, o) => total + (generationBySource[o.id] ?? 0), 0);
  const riverTotalUseBcm = riverUpstreamBcm + coolingWaterBcm + hydroTWh * scenario.hydroEvaporationBcmPerTWh;
  const riverAllocatableBcm = limits.riverNaturalFlowBcm - limits.environmentalFlowBcm;
  const riverRemainingBcm = Math.max(limits.riverNaturalFlowBcm - riverTotalUseBcm, 0);

  // Demand: the Energy forecast plus electricity used by the other two ministries.
  const demandBaseTWh = targets.electricityTWh;
  const demandPumpsTWh = sumEffect(scenario, plan, "powerUseTWh", "agriculture");
  const demandWaterSupplyTWh = sumEffect(scenario, plan, "powerUseTWh", "water");
  const demandTotalTWh = demandBaseTWh + demandPumpsTWh + demandWaterSupplyTWh;

  const shortfallTWh = Math.max(demandTotalTWh - generationTWh, 0);
  const serviceFactor = demandTotalTWh > 0 ? Math.min(generationTWh / demandTotalTWh, 1) : 1;

  // ---------------------------------------------------------------- 3. Knock-on effects of blackouts
  // Options that need power deliver only `serviceFactor` of their output.
  // Irrigated land without power still yields the rain-fed amount.
  let foodPlannedMt = 0;
  let foodDeliveredMt = 0;
  let cityWaterPlannedBcm = 0;
  let cityWaterDeliveredBcm = 0;
  for (const option of scenario.options) {
    const blocks = blocksOf(plan, option.id);
    const food = blocks * (option.perBlock.foodMt ?? 0);
    const water = blocks * (option.perBlock.cityWaterBcm ?? 0);
    foodPlannedMt += food;
    cityWaterPlannedBcm += water;

    if (option.needsPower) {
      const fallback = blocks * (option.fallbackFoodMt ?? 0);
      foodDeliveredMt += fallback + (food - fallback) * serviceFactor;
      cityWaterDeliveredBcm += water * serviceFactor;
    } else {
      foodDeliveredMt += food;
      cityWaterDeliveredBcm += water;
    }
  }

  // ---------------------------------------------------------------- Land, carbon and cost
  const landUseMha = sumEffect(scenario, plan, "landMha");
  const co2Mt = sumEffect(scenario, plan, "co2Mt");
  const costByMinistry: Record<MinistryId, number> = {
    agriculture: sumEffect(scenario, plan, "costMUSD", "agriculture"),
    energy: sumEffect(scenario, plan, "costMUSD", "energy"),
    water: sumEffect(scenario, plan, "costMUSD", "water"),
  };
  const costTotal = costByMinistry.agriculture + costByMinistry.energy + costByMinistry.water;

  // ---------------------------------------------------------------- 4. Checks
  // A small tolerance stops rounding errors from failing a check.
  const EPS = 1e-9;
  const checks: Check[] = [
    {
      id: "food",
      label: "Food",
      kind: "min",
      value: foodDeliveredMt,
      bound: targets.foodMt,
      unit: "Mt/yr",
      ok: foodDeliveredMt >= targets.foodMt - EPS,
    },
    {
      id: "cityWater",
      label: "City water",
      kind: "min",
      value: cityWaterDeliveredBcm,
      bound: targets.cityWaterBcm,
      unit: "bcm/yr",
      ok: cityWaterDeliveredBcm >= targets.cityWaterBcm - EPS,
    },
    {
      id: "electricity",
      label: "Electricity",
      kind: "min",
      value: generationTWh,
      bound: demandTotalTWh,
      unit: "TWh/yr",
      ok: generationTWh >= demandTotalTWh - EPS,
    },
    {
      id: "river",
      label: "River",
      kind: "max",
      value: riverTotalUseBcm,
      bound: riverAllocatableBcm,
      unit: "bcm/yr",
      ok: riverTotalUseBcm <= riverAllocatableBcm + EPS,
    },
    {
      id: "aquifer",
      label: "Aquifer",
      kind: "max",
      value: aquiferUseBcm,
      bound: limits.aquiferRechargeBcm,
      unit: "bcm/yr",
      ok: aquiferUseBcm <= limits.aquiferRechargeBcm + EPS,
    },
    {
      id: "land",
      label: "Land",
      kind: "max",
      value: landUseMha,
      bound: limits.landMha,
      unit: "Mha",
      ok: landUseMha <= limits.landMha + EPS,
    },
    {
      id: "co2",
      label: "CO₂",
      kind: "max",
      value: co2Mt,
      bound: limits.co2CapMt,
      unit: "Mt/yr",
      ok: co2Mt <= limits.co2CapMt + EPS,
    },
  ];

  return {
    riverUpstreamBcm,
    riverTotalUseBcm,
    riverAllocatableBcm,
    flowAtDamsBcm,
    riverRemainingBcm,
    aquiferUseBcm,
    aquiferOverdraftBcm,
    waterTableFallMetresPerYear,
    hydroFlowFactor,
    generationBySource,
    generationTWh,
    demandBaseTWh,
    demandPumpsTWh,
    demandWaterSupplyTWh,
    demandTotalTWh,
    shortfallTWh,
    serviceFactor,
    landUseMha,
    co2Mt,
    costByMinistry,
    costTotal,
    foodPlannedMt,
    foodDeliveredMt,
    cityWaterPlannedBcm,
    cityWaterDeliveredBcm,
    checks,
    feasible: checks.every((c) => c.ok),
  };
}
