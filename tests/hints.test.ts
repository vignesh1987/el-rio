/**
 * Tests for the hint button in the Nexus Council round.
 */
import { describe, expect, it } from "vitest";
import { BASELINE } from "../src/data/baseline.ts";
import { nextHint, shortfallScore } from "../src/model/hints.ts";
import { findReferencePlan } from "../src/model/reference.ts";
import { mergePlans } from "../src/model/search.ts";
import { cheapestSiloPlan } from "../src/model/silo.ts";
import { simulate } from "../src/model/simulate.ts";

const scenario = BASELINE;
const reference = findReferencePlan(scenario)!.plan;
const siloPlan = mergePlans(...(["agriculture", "energy", "water"] as const).map((m) => cheapestSiloPlan(scenario, m).plan));

describe("hints", () => {
  it("the first hint reduces the failure score of the silo plans", () => {
    const before = shortfallScore(simulate(scenario, siloPlan));
    const hint = nextHint(scenario, siloPlan, reference)!;
    expect(shortfallScore(simulate(scenario, hint.plan))).toBeLessThan(before);
    expect(hint.reason.length).toBeGreaterThan(0);
  });

  it("pressing only the hint button reaches a working plan within one hint per option", () => {
    let plan = siloPlan;
    let used = 0;
    while (!simulate(scenario, plan).feasible && used < scenario.options.length) {
      plan = nextHint(scenario, plan, reference)!.plan;
      used += 1;
    }
    expect(simulate(scenario, plan).feasible).toBe(true);
    console.log(`Hints needed from the silo plans: ${used}`);
  });

  it("gives no hint once the plan matches the reference", () => {
    expect(nextHint(scenario, reference, reference)).toBeNull();
  });
});
