/**
 * Express mode tests: the plan cards, the scoring and the "par" rule must
 * keep the same lesson as the full game.
 */
import { describe, expect, it } from "vitest";
import { BASELINE } from "../src/data/baseline.ts";
import { PLAN_CARDS } from "../src/data/express.ts";
import { badgesFor, changedOptions, costBonus, fixPoints, heartsLeft, PICK_SECONDS, pickPoints, rankFor, speedBonus } from "../src/model/express.ts";
import { nextHint } from "../src/model/hints.ts";
import { findBestPlans, findReferencePlan } from "../src/model/reference.ts";
import { mergePlans } from "../src/model/search.ts";
import { cheapestSiloPlan, siloChecks, siloCost } from "../src/model/silo.ts";
import { simulate } from "../src/model/simulate.ts";
import type { MinistryId } from "../src/model/types.ts";

const scenario = BASELINE;
const ministries: MinistryId[] = ["agriculture", "energy", "water"];
const silo = Object.fromEntries(ministries.map((m) => [m, cheapestSiloPlan(scenario, m)])) as Record<MinistryId, ReturnType<typeof cheapestSiloPlan>>;

describe("plan cards", () => {
  it("every ministry has three cards, and each passes the ministry's own checks", () => {
    for (const m of ministries) {
      expect(PLAN_CARDS[m]).toHaveLength(3);
      for (const card of PLAN_CARDS[m]) {
        expect(siloChecks(scenario, m, card.plan).every((c) => c.ok), `${card.id} fails its own checks`).toBe(true);
      }
    }
  });

  it("the cheapest card is the plan a silo ministry would submit", () => {
    for (const m of ministries) {
      const cheapest = Math.min(...PLAN_CARDS[m].map((c) => siloCost(scenario, m, c.plan)));
      expect(cheapest).toBeCloseTo(silo[m].cost, 6);
    }
  });

  it("every card only uses options of its own ministry", () => {
    for (const m of ministries) {
      const own = new Set(scenario.options.filter((o) => o.ministry === m).map((o) => o.id));
      for (const card of PLAN_CARDS[m]) for (const id of Object.keys(card.plan)) expect(own.has(id), `${card.id} uses ${id}`).toBe(true);
    }
  });

  it("whichever card the player picks, the combined plan still breaks the basin", () => {
    for (const player of ministries) {
      const colleagues = mergePlans(...ministries.filter((m) => m !== player).map((m) => silo[m].plan));
      for (const card of PLAN_CARDS[player]) {
        const outcome = simulate(scenario, mergePlans(colleagues, card.plan));
        expect(outcome.feasible, `${card.id} left the basin intact`).toBe(false);
        expect(heartsLeft(outcome), `${card.id} broke nothing`).toBeLessThan(3);
      }
    }
  });
});

describe("fixing the basin", () => {
  const reference = findReferencePlan(scenario)!;

  it("hints reach a working plan from every starting plan", () => {
    for (const player of ministries) {
      const colleagues = mergePlans(...ministries.filter((m) => m !== player).map((m) => silo[m].plan));
      for (const card of PLAN_CARDS[player]) {
        let plan = mergePlans(colleagues, card.plan);
        for (let i = 0; i < scenario.options.length && !simulate(scenario, plan).feasible; i++) {
          const hint = nextHint(scenario, plan, reference.plan);
          if (!hint) break;
          plan = hint.plan;
        }
        expect(simulate(scenario, plan).feasible, `hints failed from ${card.id}`).toBe(true);
      }
    }
  });

  it("the best two solutions pass every check, are different, and the best is the reference", () => {
    const [best, second] = findBestPlans(scenario, 2);
    expect(best.outcome.feasible).toBe(true);
    expect(second.outcome.feasible).toBe(true);
    expect(best.plan).toEqual(reference.plan);
    expect(changedOptions(scenario, best.plan, second.plan).length).toBeGreaterThan(0);
    expect(second.outcome.costTotal).toBeGreaterThanOrEqual(best.outcome.costTotal);
  });

  it("no working plan is cheaper than the best solution", () => {
    const [best] = findBestPlans(scenario, 1);
    expect(best.outcome.costTotal).toBeCloseTo(reference.outcome.costTotal, 6);
  });

  it("par is the number of options the cheapest working plan changes", () => {
    const start = mergePlans(...ministries.map((m) => silo[m].plan));
    expect(changedOptions(scenario, start, start)).toHaveLength(0);
    expect(changedOptions(scenario, start, reference.plan).length).toBeGreaterThan(0);
    expect(changedOptions(scenario, start, reference.plan).length).toBeLessThanOrEqual(scenario.options.length);
  });
});

describe("scoring", () => {
  it("the best possible run scores 1,000", () => {
    const fix = fixPoints({ feasible: true, cost: 3000, referenceCost: 3000, changes: 4, par: 4, hints: 0, solutionViewed: false });
    expect(pickPoints(3, PICK_SECONDS) + fix.total).toBe(1000);
  });

  it("a plan that fails scores nothing for the fix", () => {
    expect(fixPoints({ feasible: false, cost: 3000, referenceCost: 3000, changes: 1, par: 4, hints: 0, solutionViewed: false }).total).toBe(0);
  });

  it("extra changes and hints cost points, and the score never goes below zero", () => {
    const base = { feasible: true, cost: 3000, referenceCost: 3000, par: 4, solutionViewed: false };
    expect(fixPoints({ ...base, changes: 6, hints: 0 }).total).toBe(700 - 60);
    expect(fixPoints({ ...base, changes: 4, hints: 2 }).total).toBe(700 - 150);
    expect(fixPoints({ ...base, changes: 40, hints: 40 }).total).toBe(0);
  });

  it("showing a solution costs 300 points once and removes the solving badges", () => {
    const base = { feasible: true, cost: 3000, referenceCost: 3000, par: 4, changes: 4, hints: 0 };
    expect(fixPoints({ ...base, solutionViewed: true }).total).toBe(700 - 300);
    expect(fixPoints({ ...base, solutionViewed: true }).solutionPenalty).toBe(300);
    const badges = badgesFor({ ...base, stars: 3, secondsLeft: 150, solutionViewed: true });
    expect(badges.filter((b) => ["solo", "par", "cheapest"].includes(b.id)).some((b) => b.earned)).toBe(false);
  });

  it("the cost bonus fades to zero at 20% above the cheapest working plan", () => {
    expect(costBonus(3000, 3000)).toBe(200);
    expect(costBonus(3300, 3000)).toBe(100);
    expect(costBonus(3600, 3000)).toBe(0);
    expect(costBonus(9000, 3000)).toBe(0);
  });

  it("the clock gives 2.5 minutes, and the speed bonus shrinks evenly from 60 to 0", () => {
    expect(PICK_SECONDS).toBe(150);
    expect(speedBonus(150)).toBe(60);
    expect(speedBonus(75)).toBe(30);
    expect(speedBonus(0)).toBe(0);
    expect(pickPoints(0, -5)).toBe(0);
    expect(pickPoints(1, 999)).toBe(80 + 60);
  });

  it("ranks rise with the score", () => {
    expect(rankFor(300).title).toBe("Silo Survivor");
    expect(rankFor(700).title).toBe("Nexus Planner");
    expect(rankFor(900).title).toBe("Nexus Champion");
  });
});
