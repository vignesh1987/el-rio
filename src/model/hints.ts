/**
 * Hints for the Nexus Council round.
 *
 * A hint moves ONE option from the player's value to its value in the
 * reference plan (the cheapest plan that passes every check, see
 * reference.ts). It picks the option whose move repairs the failing checks
 * the most. When every check already passes, it picks the move that saves
 * the most money.
 *
 * Each hint fixes one option at its reference value, so a player who only
 * presses the hint button reaches a working plan in at most one hint per
 * option (11 in the baseline).
 */
import { simulate } from "./simulate.ts";
import type { Outcome, Plan, Scenario } from "./types.ts";

export interface Hint {
  optionId: string;
  optionName: string;
  from: number;
  to: number;
  /** The player's plan with the hint applied. */
  plan: Plan;
  /** Why this move helps, in one or two sentences. */
  reason: string;
}

/**
 * How badly a plan fails: the sum, over failing checks, of the gap divided
 * by the target or limit. Zero means every check passes.
 */
export function shortfallScore(outcome: Outcome): number {
  return outcome.checks.reduce((total, c) => {
    if (c.ok) return total;
    const gap = c.kind === "min" ? c.bound - c.value : c.value - c.bound;
    return total + gap / Math.max(c.bound, 1e-9);
  }, 0);
}

/** The most useful single move toward the reference plan, or null if the plans already match. */
export function nextHint(scenario: Scenario, plan: Plan, reference: Plan): Hint | null {
  let best: { hint: Hint; score: number; cost: number } | null = null;

  for (const option of scenario.options) {
    const from = plan[option.id] ?? 0;
    const to = reference[option.id] ?? 0;
    if (from === to) continue;

    // Try the move and see how the whole system responds.
    const candidate: Plan = { ...plan, [option.id]: to };
    const outcome = simulate(scenario, candidate);
    const score = shortfallScore(outcome);

    // Lower failure score wins; on a tie, the cheaper plan wins.
    const isBetter = !best || score < best.score - 1e-9 || (Math.abs(score - best.score) < 1e-9 && outcome.costTotal < best.cost);
    if (isBetter) {
      best = {
        score,
        cost: outcome.costTotal,
        hint: {
          optionId: option.id,
          optionName: option.name,
          from,
          to,
          plan: candidate,
          reason: (to > from ? option.hintMore : option.hintLess) ?? "",
        },
      };
    }
  }
  return best?.hint ?? null;
}
