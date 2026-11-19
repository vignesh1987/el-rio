/**
 * Express mode: scoring, "par" and basin health.
 *
 * Pure calculations with no user interface code, so the tests can check
 * them. The screens only display what these functions return.
 *
 * Score (maximum 1,000):
 *   Pick a plan   80 per star (up to 240) + a speed bonus of up to 60 that shrinks
 *                 evenly over the 2.5-minute clock
 *   Fix the basin 500 for a plan that passes every check
 *                 + up to 200 for a low national cost
 *                 - 30 for each policy change above par
 *                 - 75 for each hint
 *                 - 300 once if the player shows a solution
 *
 * "Par" is the number of options the cheapest working plan changes
 * compared with the plan the player started from. A policy change is one
 * option whose number of blocks differs from the starting plan.
 */
import type { Check, Outcome, Plan, Scenario } from "./types.ts";

export const PICK_SECONDS = 150; // 2.5 minutes to choose a plan
export const SPEED_BONUS_MAX = 60;
export const POINTS_PER_STAR = 80;
export const FIX_BASE = 500;
export const COST_BONUS_MAX = 200;
export const COST_BONUS_WINDOW = 0.2; // the bonus fades to zero at 20% above the cheapest working plan
export const POINTS_PER_EXTRA_CHANGE = 30;
export const POINTS_PER_HINT = 75;
export const POINTS_PER_SOLUTION_VIEW = 300; // charged once, however many solutions are shown

// ---------------------------------------------------------------------------
// Basin health: three hearts
// ---------------------------------------------------------------------------

export type DomainId = "water" | "power" | "food";

export interface Domain {
  id: DomainId;
  label: string;
  /** Checks that decide whether this heart survives. */
  checks: Check["id"][];
}

export const DOMAINS: Domain[] = [
  { id: "water", label: "Water", checks: ["river", "aquifer"] },
  { id: "power", label: "Power", checks: ["electricity", "co2"] },
  { id: "food", label: "Food and taps", checks: ["food", "cityWater", "land"] },
];

/** True when every check of the domain passes. */
export function domainOk(outcome: Outcome, domain: Domain): boolean {
  return outcome.checks.filter((c) => domain.checks.includes(c.id)).every((c) => c.ok);
}

/** Number of hearts that survive, 0 to 3. */
export function heartsLeft(outcome: Outcome): number {
  return DOMAINS.filter((d) => domainOk(outcome, d)).length;
}

// ---------------------------------------------------------------------------
// Policy changes and par
// ---------------------------------------------------------------------------

/** Ids of the options whose number of blocks differs between two plans. */
export function changedOptions(scenario: Scenario, from: Plan, to: Plan): string[] {
  return scenario.options.filter((o) => (from[o.id] ?? 0) !== (to[o.id] ?? 0)).map((o) => o.id);
}

// ---------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------

/** Speed bonus, 0 to 60, from the seconds left on the clock. */
export function speedBonus(secondsLeft: number): number {
  const left = Math.max(0, Math.min(PICK_SECONDS, secondsLeft));
  return Math.round((SPEED_BONUS_MAX * left) / PICK_SECONDS);
}

/** Points for the plan card: stars (0 to 3) plus the speed bonus. */
export function pickPoints(stars: number, secondsLeft: number): number {
  return stars * POINTS_PER_STAR + speedBonus(secondsLeft);
}

/** Bonus for a low national cost: full at the cheapest working plan, zero at 20% above it. */
export function costBonus(cost: number, referenceCost: number): number {
  const over = Math.max(0, cost - referenceCost) / referenceCost;
  return Math.round(COST_BONUS_MAX * Math.max(0, 1 - over / COST_BONUS_WINDOW));
}

export interface FixInput {
  feasible: boolean;
  cost: number;
  referenceCost: number;
  changes: number;
  par: number;
  hints: number;
  /** True once the player has shown the best or second-best solution. */
  solutionViewed: boolean;
}

export interface FixPoints {
  base: number;
  costBonus: number;
  changePenalty: number;
  hintPenalty: number;
  solutionPenalty: number;
  total: number;
}

/** Points for the Nexus Council plan, with the parts shown on the score card. */
export function fixPoints(input: FixInput): FixPoints {
  if (!input.feasible) return { base: 0, costBonus: 0, changePenalty: 0, hintPenalty: 0, solutionPenalty: 0, total: 0 };
  const bonus = costBonus(input.cost, input.referenceCost);
  const changePenalty = POINTS_PER_EXTRA_CHANGE * Math.max(0, input.changes - input.par);
  const hintPenalty = POINTS_PER_HINT * input.hints;
  const solutionPenalty = input.solutionViewed ? POINTS_PER_SOLUTION_VIEW : 0;
  return {
    base: FIX_BASE,
    costBonus: bonus,
    changePenalty,
    hintPenalty,
    solutionPenalty,
    total: Math.max(0, FIX_BASE + bonus - changePenalty - hintPenalty - solutionPenalty),
  };
}

// ---------------------------------------------------------------------------
// Rank and badges
// ---------------------------------------------------------------------------

export function rankFor(total: number): { title: string; blurb: string } {
  if (total >= 850) return { title: "Nexus Champion", blurb: "You saw the whole basin and fixed it with few changes." };
  if (total >= 600) return { title: "Nexus Planner", blurb: "You fixed the basin. Fewer hints or changes would score higher." };
  return { title: "Silo Survivor", blurb: "You got there in the end. Try again with fewer hints." };
}

export interface BadgeInput {
  stars: number;
  secondsLeft: number;
  hints: number;
  solutionViewed: boolean;
  changes: number;
  par: number;
  cost: number;
  referenceCost: number;
}

export interface Badge {
  id: string;
  name: string;
  how: string;
  earned: boolean;
}

export function badgesFor(input: BadgeInput): Badge[] {
  return [
    { id: "penny", name: "Penny Pincher", how: "Picked the cheapest plan for your ministry", earned: input.stars === 3 },
    { id: "quick", name: "Quick Draw", how: "Chose your plan in the first half of the clock", earned: input.secondsLeft >= PICK_SECONDS / 2 },
    { id: "solo", name: "Solo Solver", how: "Fixed the basin without a hint or a solution", earned: input.hints === 0 && !input.solutionViewed },
    { id: "par", name: "Par or better", how: "Fixed it within par changes", earned: !input.solutionViewed && input.changes <= input.par },
    { id: "cheapest", name: "Cheapest Council", how: "Matched the cheapest working plan", earned: !input.solutionViewed && input.cost <= input.referenceCost + 0.5 },
  ];
}
