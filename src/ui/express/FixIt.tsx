/**
 * Express step 4: fix the basin as the Nexus Council.
 *
 * The player starts from the broken combined plan and moves sliders until
 * every check passes. It plays like golf:
 *   - "Changes" counts the options that differ from the starting plan.
 *   - "Par" is the number of changes the cheapest working plan makes.
 *   - Hints help, but each one costs points.
 *   - "Show the best solution" and "Show the second-best solution" move every
 *     slider to that plan. Showing a solution costs points, once.
 * The points the plan would earn right now are shown live.
 */
import { useState } from "preact/hooks";
import { nextHint, type Hint } from "../../model/hints.ts";
import { changedOptions, fixPoints, POINTS_PER_HINT, POINTS_PER_SOLUTION_VIEW } from "../../model/express.ts";
import type { ReferenceResult } from "../../model/reference.ts";
import { optionsOf } from "../../model/silo.ts";
import type { Check, Outcome, Plan, Scenario } from "../../model/types.ts";
import { Meter } from "../components/Meter.tsx";
import { money } from "../format.ts";
import { hintFor, MINISTRIES, ministryColour } from "../game.ts";
import { hintText, quantity } from "../units.ts";
import { Hearts } from "./Hearts.tsx";

interface FixItProps {
  scenario: Scenario;
  /** The plan the player started from (the broken combined plan). */
  start: Plan;
  plan: Plan;
  outcome: Outcome;
  reference: ReferenceResult | null;
  /** The cheapest working plans, best first. Null while they are being worked out. */
  solutions: ReferenceResult[] | null;
  hintsUsed: number;
  solutionViewed: boolean;
  onChange: (plan: Plan) => void;
  onHint: (plan: Plan) => void;
  onSolution: (plan: Plan) => void;
  onReset: () => void;
  onAdopt: () => void;
}

const CHECK_COLOURS: Record<Check["id"], string> = {
  food: "var(--agri)",
  cityWater: "var(--water)",
  electricity: "var(--energy)",
  river: "var(--river)",
  aquifer: "var(--aquifer-deep)",
  land: "var(--land)",
  co2: "var(--muted)",
};

export function FixIt({ scenario, start, plan, outcome, reference, solutions, hintsUsed, solutionViewed, onChange, onHint, onSolution, onReset, onAdopt }: FixItProps) {
  const [lastHint, setLastHint] = useState<Hint | null>(null);
  const [noHint, setNoHint] = useState(false);

  const changes = changedOptions(scenario, start, plan).length;
  const par = reference ? changedOptions(scenario, start, reference.plan).length : null;
  const points = reference
    ? fixPoints({ feasible: outcome.feasible, cost: outcome.costTotal, referenceCost: reference.outcome.costTotal, changes, par: par ?? changes, hints: hintsUsed, solutionViewed }).total
    : 0;
  const failing = outcome.checks.filter((c) => !c.ok);

  // Which solution (if any) the sliders show right now.
  const shown = solutions ? solutions.findIndex((s) => changedOptions(scenario, s.plan, plan).length === 0) : -1;
  const best = solutions?.[0];
  const second = solutions?.[1];
  /** The options where the second-best plan differs from the best, e.g. "River intake 0.00 bcm/yr → 0.25 bcm/yr". */
  const secondDifferences =
    best && second
      ? changedOptions(scenario, best.plan, second.plan).map((id) => {
          const o = scenario.options.find((x) => x.id === id)!;
          return `${o.name} ${quantity(o, best.plan[id] ?? 0)} → ${quantity(o, second.plan[id] ?? 0)}`;
        })
      : [];

  const giveHint = () => {
    if (!reference) return;
    const hint = nextHint(scenario, plan, reference.plan);
    setNoHint(hint === null);
    setLastHint(hint);
    if (hint) onHint(hint.plan);
  };

  return (
    <div class="stack">
      <div class="round-head" style={{ "--accent": "var(--ink)" }}>
        <h1>Fix the basin</h1>
        <span class="muted">You now control all three ministries. Move the sliders until every check passes.</span>
      </div>

      <div class="xhud xhud-fix">
        <Hearts outcome={outcome} />
        <div class="xchips">
          <span class={`xchip ${par !== null && changes > par ? "over" : ""}`}>
            Changes <b class="num">{changes}</b> · par <b class="num">{par ?? "…"}</b>
          </span>
          <span class="xchip">
            Hints <b class="num">{hintsUsed}</b>
          </span>
          <span class="xchip pts">
            Points now <b class="num">{outcome.feasible ? points : "–"}</b>
          </span>
        </div>
      </div>

      <div class="workbench">
        <div class="groups">
          {MINISTRIES.map((m) => {
            const info = scenario.ministries.find((x) => x.id === m)!;
            return (
              <section key={m} class="group" style={{ "--accent": ministryColour(m) }}>
                <h2>
                  {info.name} <span>{money(outcome.costByMinistry[m])}</span>
                </h2>
                <div class="levers">
                  {optionsOf(scenario, m).map((option) => {
                    const n = plan[option.id] ?? 0;
                    const was = start[option.id] ?? 0;
                    const set = (v: number) => onChange({ ...plan, [option.id]: Math.max(0, Math.min(option.maxBlocks, v)) });
                    const id = `fix-${option.id}`;
                    return (
                      <div key={option.id} class={`lever panel ${n !== was ? "changed" : ""}`}>
                        <div class="option-top">
                          <b id={`${id}-name`}>{option.name}</b>
                          <span class="count">
                            {quantity(option, n)}
                            {n !== was && <small> was {quantity(option, was)}</small>}
                          </span>
                        </div>
                        <div class="slider-row">
                          <button class="step-btn" type="button" onClick={() => set(n - 1)} aria-label={`Less ${option.name}`}>
                            −
                          </button>
                          <input id={id} type="range" min={0} max={option.maxBlocks} step={1} value={n} aria-labelledby={`${id}-name`} onInput={(ev) => set(Number((ev.target as HTMLInputElement).value))} />
                          <button class="step-btn" type="button" onClick={() => set(n + 1)} aria-label={`More ${option.name}`}>
                            +
                          </button>
                        </div>
                        <div class="block">
                          max {quantity(option, option.maxBlocks, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside class="panel view" aria-label="System check">
          <h2>System check</h2>
          {(lastHint || noHint) && (
            <div class="hint-box" role="status">
              {lastHint ? (
                <>
                  <b>
                    Hint {hintsUsed}: {hintText(scenario, lastHint)}
                  </b>
                  <span>{lastHint.reason}</span>
                </>
              ) : (
                <span>Your plan already matches the cheapest working plan.</span>
              )}
            </div>
          )}
          {shown >= 0 && best && (
            <div class="hint-box" role="status">
              {shown === 0 ? (
                <>
                  <b>Best solution</b>
                  <span>The cheapest plan that passes every check: {money(best.outcome.costTotal)} a year.</span>
                </>
              ) : (
                <>
                  <b>Second-best solution</b>
                  <span>
                    {money(solutions![shown].outcome.costTotal)} a year, {money(solutions![shown].outcome.costTotal - best.outcome.costTotal)} more than the best. It differs from the best in: {secondDifferences.join("; ")}.
                  </span>
                </>
              )}
            </div>
          )}
          {outcome.checks.map((c) => (
            <Meter key={c.id} label={c.label} value={c.value} bound={c.bound} kind={c.kind} unit={c.unit} ok={c.ok} colour={CHECK_COLOURS[c.id]} hint={hintFor(c.id, outcome)} decimals={c.id === "cityWater" ? 2 : 1} />
          ))}
          <div class="cost-line">
            <span>National cost</span>
            <b>{money(outcome.costTotal)}</b>
          </div>
          <button class="btn" type="button" disabled={!outcome.feasible} onClick={onAdopt}>
            Adopt this plan
          </button>
          <button class="btn ghost" type="button" disabled={!reference} onClick={giveHint}>
            {reference ? `Give me a hint (−${POINTS_PER_HINT} points)` : "Preparing hints…"}
          </button>
          <div class="xsolutions">
            <button class="btn ghost small" type="button" disabled={!best} onClick={() => best && onSolution(best.plan)}>
              {best ? "Show the best solution" : "Preparing solutions…"}
            </button>
            <button class="btn ghost small" type="button" disabled={!second} onClick={() => second && onSolution(second.plan)}>
              Show the second-best solution
            </button>
            <p class="muted" style={{ fontSize: "13px" }}>
              {solutionViewed ? "You have shown a solution, so your score loses the points." : `The sliders move to that plan. Showing a solution costs ${POINTS_PER_SOLUTION_VIEW} points, once.`}
            </p>
          </div>
          <p class="muted" style={{ fontSize: "13px" }}>
            {outcome.feasible ? "Every check passes. Adopt it, or look for a cheaper plan with fewer changes." : `${failing.length} check${failing.length === 1 ? "" : "s"} still failing.`}
          </p>
          <button class="linkish" type="button" onClick={onReset}>
            Start again from the broken plan
          </button>
        </aside>
      </div>
    </div>
  );
}
