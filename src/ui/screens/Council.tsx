/**
 * Round 2: the Nexus Council.
 *
 * The player now controls all three ministries and sees the whole basin.
 * The plan starts from the three silo plans. The player must find a plan
 * that passes every check, then submit it.
 *
 * Maps sit in tabs (Water, Power, Land) so each one stays large enough to read.
 * A tab turns red when one of its checks fails.
 *
 * The "Give me a hint" button moves one slider toward the cheapest working
 * plan and explains why (see src/model/hints.ts).
 */
import { useState } from "preact/hooks";
import { nextHint, type Hint } from "../../model/hints.ts";
import { optionsOf } from "../../model/silo.ts";
import type { Check, Outcome, Plan, Scenario } from "../../model/types.ts";
import { GridMap } from "../components/GridMap.tsx";
import { LandMap } from "../components/LandMap.tsx";
import { Meter } from "../components/Meter.tsx";
import { OptionCard } from "../components/OptionCard.tsx";
import { RiverMap } from "../components/RiverMap.tsx";
import { money } from "../format.ts";
import { hintFor, MINISTRIES, ministryColour } from "../game.ts";

interface CouncilProps {
  scenario: Scenario;
  plan: Plan;
  outcome: Outcome;
  onChange: (plan: Plan) => void;
  onReset: () => void;
  onSubmit: () => void;
  /** The cheapest working plan, or null while it is still being calculated. */
  reference: Plan | null;
  hintsUsed: number;
  onHint: (plan: Plan) => void;
}

type Tab = "water" | "power" | "land";
const TAB_CHECKS: Record<Tab, Check["id"][]> = {
  water: ["river", "aquifer", "cityWater"],
  power: ["electricity", "co2"],
  land: ["land", "food"],
};
const TAB_LABELS: Record<Tab, string> = { water: "Water", power: "Power", land: "Land and food" };

const CHECK_COLOURS: Record<Check["id"], string> = {
  food: "var(--agri)",
  cityWater: "var(--water)",
  electricity: "var(--energy)",
  river: "var(--river)",
  aquifer: "var(--aquifer-deep)",
  land: "var(--land)",
  co2: "var(--muted)",
};

export function Council({ scenario, plan, outcome, onChange, onReset, onSubmit, reference, hintsUsed, onHint }: CouncilProps) {
  const [tab, setTab] = useState<Tab>("water");
  const [lastHint, setLastHint] = useState<Hint | null>(null);
  const [noHint, setNoHint] = useState(false);

  const giveHint = () => {
    if (!reference) return;
    const hint = nextHint(scenario, plan, reference);
    setNoHint(hint === null);
    setLastHint(hint);
    if (hint) onHint(hint.plan);
  };
  const failing = new Set(outcome.checks.filter((c) => !c.ok).map((c) => c.id));
  const tabFails = (t: Tab) => TAB_CHECKS[t].some((id) => failing.has(id));

  return (
    <div>
      <div class="round-head" style={{ "--accent": "var(--ink)" }}>
        <h1>Nexus Council</h1>
        <span class="muted">You control all three ministries and see the whole basin. Find a plan that breaks nothing.</span>
      </div>

      {/* Map tabs */}
      <div class="panel">
        <div class="btn-row" role="tablist" aria-label="Maps" style={{ padding: "10px 12px 0" }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              class={`btn small ${tab === t ? "" : "ghost"}`}
              style={tabFails(t) ? { boxShadow: "inset 0 0 0 2px var(--fail)", color: tab === t ? undefined : "var(--fail)" } : undefined}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]} {tabFails(t) ? "· failing" : "· ok"}
            </button>
          ))}
        </div>
        {tab === "water" && <RiverMap scenario={scenario} plan={plan} outcome={outcome} />}
        {tab === "power" && <GridMap scenario={scenario} plan={plan} outcome={outcome} />}
        {tab === "land" && <LandMap scenario={scenario} plan={plan} outcome={outcome} showBlackout />}
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
                <div class="cards" style={{ "--cols": optionsOf(scenario, m).length === 4 ? 2 : 3 }}>
                  {optionsOf(scenario, m).map((option) => (
                    <OptionCard key={option.id} option={option} blocks={plan[option.id] ?? 0} mode="council" onChange={(n) => onChange({ ...plan, [option.id]: n })} />
                  ))}
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
                    Hint {hintsUsed}: {lastHint.optionName} {lastHint.from} → {lastHint.to}
                  </b>
                  <span>{lastHint.reason}</span>
                </>
              ) : (
                <span>Your plan already matches the cheapest working plan.</span>
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
          <button class="btn" type="button" disabled={!outcome.feasible} onClick={onSubmit}>
            Adopt this plan
          </button>
          <button class="btn ghost" type="button" disabled={!reference} onClick={giveHint}>
            {reference ? (outcome.feasible ? "Give me a hint to cut cost" : "Give me a hint") : "Preparing hints…"}
          </button>
          <p class="muted" style={{ fontSize: "13px" }}>
            {outcome.feasible ? "Every check passes. Adopt it, or keep looking for a cheaper plan." : `${failing.size} check${failing.size === 1 ? "" : "s"} still failing.`}
          </p>
          <button class="linkish" type="button" onClick={onReset}>
            Start again from the silo plans
          </button>
        </aside>
      </div>
    </div>
  );
}
