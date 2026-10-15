/**
 * Calibration tests: the game only teaches its lesson if these hold.
 *
 * If you change numbers in src/data/baseline.ts and one of these fails,
 * the silo trap no longer works as intended. Run `npm run calibrate`
 * to see the full picture.
 */
import { describe, expect, it } from "vitest";
import { BASELINE } from "../src/data/baseline.ts";
import { findReferencePlan } from "../src/model/reference.ts";
import { forEachPlan, mergePlans } from "../src/model/search.ts";
import { cheapestSiloPlan, optionsOf, siloChecks } from "../src/model/silo.ts";
import { simulate } from "../src/model/simulate.ts";
import type { MinistryId } from "../src/model/types.ts";

const scenario = BASELINE;
const ministries: MinistryId[] = ["agriculture", "energy", "water"];
const silo = Object.fromEntries(ministries.map((m) => [m, cheapestSiloPlan(scenario, m)])) as Record<
  MinistryId,
  ReturnType<typeof cheapestSiloPlan>
>;
const siloPlan = mergePlans(...ministries.map((m) => silo[m].plan));

describe("silo trap", () => {
  it("each ministry's cheapest plan passes its own checks", () => {
    for (const m of ministries) {
      expect(siloChecks(scenario, m, silo[m].plan).every((c) => c.ok)).toBe(true);
    }
  });

  it("the three silo plans together cause blackouts and over-pump the aquifer", () => {
    const outcome = simulate(scenario, siloPlan);
    const failed = outcome.checks.filter((c) => !c.ok).map((c) => c.id);
    expect(failed).toContain("electricity");
    expect(failed).toContain("aquifer");
    // Blackouts should be large enough to notice: more than 10% of demand.
    expect(outcome.shortfallTWh / outcome.demandTotalTWh).toBeGreaterThan(0.1);
  });

  it("no single ministry can fix the system while the other two plan in silos", () => {
    for (const player of ministries) {
      const colleagues = mergePlans(...ministries.filter((m) => m !== player).map((m) => silo[m].plan));
      let anyFeasible = false;
      forEachPlan(optionsOf(scenario, player), (own) => {
        if (!anyFeasible && simulate(scenario, mergePlans(colleagues, own)).feasible) anyFeasible = true;
      });
      expect(anyFeasible, `${player} alone fixed the system`).toBe(false);
    }
  });
});

describe("nexus council", () => {
  const reference = findReferencePlan(scenario);

  it("a plan that passes every check exists", () => {
    expect(reference).not.toBeNull();
    expect(reference!.outcome.feasible).toBe(true);
  });

  it("the working plan costs more on paper than the silo plans, but not absurdly more", () => {
    const paper = ministries.reduce((total, m) => total + silo[m].cost, 0);
    const ratio = reference!.outcome.costTotal / paper;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(1.5);
  });
});
