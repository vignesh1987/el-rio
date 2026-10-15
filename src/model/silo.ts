/**
 * Silo planning: how each ministry sees the world on its own.
 *
 * In round 1 each ministry plans as if it were alone:
 *   - It sees only its own target.
 *   - It believes the whole river, the whole aquifer and all the land are
 *     available to it.
 *   - It does not count electricity that someone else pays for.
 *   - The Ministry of Energy rates its dams at the river's natural flow.
 *
 * The functions here judge a ministry's plan from that narrow view, and
 * find the cheapest plan a silo ministry would choose. The computer uses
 * that cheapest plan for the two "colleague" ministries.
 */
import { forEachPlan } from "./search.ts";
import { blocksOf, sumEffect } from "./simulate.ts";
import type { MinistryId, Option, Plan, Scenario } from "./types.ts";

/** One line of a ministry's own checklist. */
export interface SiloCheck {
  label: string;
  ok: boolean;
  value: number;
  bound: number;
  kind: "min" | "max";
  unit: string;
}

/** The options that belong to one ministry. */
export function optionsOf(scenario: Scenario, ministry: MinistryId): Option[] {
  return scenario.options.filter((o) => o.ministry === ministry);
}

/** Keep only the blocks that belong to one ministry. */
export function planOf(scenario: Scenario, ministry: MinistryId, plan: Plan): Plan {
  const part: Plan = {};
  for (const option of optionsOf(scenario, ministry)) part[option.id] = blocksOf(plan, option.id);
  return part;
}

/** The checks a ministry applies to its own plan, from its own narrow view. */
export function siloChecks(scenario: Scenario, ministry: MinistryId, plan: Plan): SiloCheck[] {
  const { limits, targets } = scenario;
  const own = planOf(scenario, ministry, plan);
  const sum = (effect: Parameters<typeof sumEffect>[2]) => sumEffect(scenario, own, effect);
  const riverAllocatable = limits.riverNaturalFlowBcm - limits.environmentalFlowBcm;

  const atLeast = (label: string, value: number, bound: number, unit: string): SiloCheck => ({
    label, value, bound, unit, kind: "min", ok: value >= bound - 1e-9,
  });
  const atMost = (label: string, value: number, bound: number, unit: string): SiloCheck => ({
    label, value, bound, unit, kind: "max", ok: value <= bound + 1e-9,
  });

  switch (ministry) {
    case "agriculture":
      return [
        atLeast("Grain grown", sum("foodMt"), targets.foodMt, "Mt/yr"),
        atMost("River water", sum("riverBcm"), riverAllocatable, "bcm/yr"),
        atMost("Groundwater", sum("aquiferBcm"), limits.aquiferRechargeBcm, "bcm/yr"),
        atMost("Land", sum("landMha"), limits.landMha, "Mha"),
      ];
    case "water":
      return [
        atLeast("Water supplied", sum("cityWaterBcm"), targets.cityWaterBcm, "bcm/yr"),
        atMost("River water", sum("riverBcm"), riverAllocatable, "bcm/yr"),
        atMost("Groundwater", sum("aquiferBcm"), limits.aquiferRechargeBcm, "bcm/yr"),
      ];
    case "energy":
      // Dams are counted at full natural flow: that is the silo assumption.
      return [
        atLeast("Electricity generated", sum("electricityTWh"), targets.electricityTWh, "TWh/yr"),
        atMost("CO₂", sum("co2Mt"), limits.co2CapMt, "Mt/yr"),
        atMost("Land", sum("landMha"), limits.landMha, "Mha"),
      ];
  }
}

/** Cost of a ministry's own plan, US$ M/yr. */
export function siloCost(scenario: Scenario, ministry: MinistryId, plan: Plan): number {
  return sumEffect(scenario, planOf(scenario, ministry, plan), "costMUSD");
}

/**
 * The cheapest plan that passes the ministry's own checks.
 * This is what a rational silo ministry submits.
 */
export function cheapestSiloPlan(scenario: Scenario, ministry: MinistryId): { plan: Plan; cost: number } {
  let best: { plan: Plan; cost: number } | null = null;
  forEachPlan(optionsOf(scenario, ministry), (plan) => {
    const cost = siloCost(scenario, ministry, plan);
    if (best && cost >= best.cost) return; // cannot beat the best so far
    if (siloChecks(scenario, ministry, plan).every((c) => c.ok)) best = { plan, cost };
  });
  if (!best) throw new Error(`No feasible silo plan for ${ministry}. Check src/data/baseline.ts.`);
  return best;
}

/**
 * Stars for a ministry's own plan: 3 stars if within 2% of the cheapest
 * silo plan, 2 stars within 10%, 1 star otherwise, 0 if a check fails.
 */
export function siloStars(scenario: Scenario, ministry: MinistryId, plan: Plan, bestCost: number): number {
  if (!siloChecks(scenario, ministry, plan).every((c) => c.ok)) return 0;
  const cost = siloCost(scenario, ministry, plan);
  if (cost <= bestCost * 1.02) return 3;
  if (cost <= bestCost * 1.1) return 2;
  return 1;
}
