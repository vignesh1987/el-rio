/**
 * Small brute-force searches over plans.
 *
 * The game has few options and few blocks, so we can simply try every
 * combination instead of using an optimisation solver. This keeps the
 * code easy to read and the answers exact on the game's block grid.
 */
import type { Option, Plan } from "./types.ts";

/**
 * Call `visit` once for every possible plan made from `options`
 * (every option from 0 up to its maxBlocks).
 *
 * It works like a mileometer: the first option counts up fastest and
 * rolls over into the next one.
 */
export function forEachPlan(options: Option[], visit: (plan: Plan) => void): void {
  const counts = options.map(() => 0);
  while (true) {
    const plan: Plan = {};
    options.forEach((option, i) => (plan[option.id] = counts[i]));
    visit(plan);

    // Advance the counter.
    let i = 0;
    while (i < options.length) {
      counts[i] += 1;
      if (counts[i] <= options[i].maxBlocks) break;
      counts[i] = 0;
      i += 1;
    }
    if (i === options.length) return; // every option rolled over: done
  }
}

/** Merge several partial plans into one. */
export function mergePlans(...plans: Plan[]): Plan {
  return Object.assign({}, ...plans);
}
