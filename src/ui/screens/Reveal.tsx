/**
 * The reveal: the Cabinet combines the three round-1 plans.
 *
 * It walks through the failure in the order it happens:
 *   0. The three plans, each fine on its own.
 *   1. Water: the river narrows and the aquifer is over-pumped.
 *   2. Power: dams lose flow and hidden loads appear, so blackouts follow.
 *   3. Food and city water: blackouts stop the pumps.
 *   4. Verdict: what broke, and the player's own part in it.
 */
import type { ComponentChildren } from "preact";
import { siloChecks, siloCost } from "../../model/silo.ts";
import type { MinistryId, Outcome, Plan, Scenario } from "../../model/types.ts";
import { GridMap } from "../components/GridMap.tsx";
import { LandMap } from "../components/LandMap.tsx";
import { Meter } from "../components/Meter.tsx";
import { RiverMap } from "../components/RiverMap.tsx";
import { fmt, money, pct } from "../format.ts";
import { hintFor, MINISTRIES, playerContribution, shortName } from "../game.ts";

interface RevealProps {
  scenario: Scenario;
  player: MinistryId;
  /** The combined plan: the player's blocks plus the two colleagues' blocks. */
  plan: Plan;
  outcome: Outcome;
  step: number;
  onStep: (step: number) => void;
  onCouncil: () => void;
}

export const REVEAL_STEPS = 5;

/** A short description of one ministry's plan, e.g. "12 canal, 3 tube well". */
function describe(scenario: Scenario, ministry: MinistryId, plan: Plan): string {
  return scenario.options
    .filter((o) => o.ministry === ministry && (plan[o.id] ?? 0) > 0)
    .map((o) => `${plan[o.id]} × ${o.name.toLowerCase()}`)
    .join(", ");
}

export function Reveal({ scenario, player, plan, outcome: o, step, onStep, onCouncil }: RevealProps) {
  const failed = o.checks.filter((c) => !c.ok);
  const paperCost = MINISTRIES.reduce((total, m) => total + siloCost(scenario, m, plan), 0);
  const hydroRated = scenario.options.filter((x) => x.dependsOnRiverFlow).reduce((t, x) => t + (plan[x.id] ?? 0) * (x.perBlock.electricityTWh ?? 0), 0);

  let text: ComponentChildren;
  let visual: ComponentChildren;

  switch (step) {
    case 0:
      text = (
        <>
          <p class="eyebrow">The Cabinet meets</p>
          <h2>Three plans, each one fine on its own</h2>
          <p>Every ministry met its own target within the limits it could see. On paper, Utopia is fed, lit and supplied with water.</p>
          <div class="stat">
            <span class="muted">Combined cost on paper</span>
            <b>{money(paperCost)} a year</b>
          </div>
        </>
      );
      visual = (
        <div class="panel table-wrap">
          <table class="plans-table">
            <thead>
              <tr>
                <th>Ministry</th>
                <th>Plan</th>
                <th>Cost</th>
                <th>Own checks</th>
              </tr>
            </thead>
            <tbody>
              {MINISTRIES.map((m) => (
                <tr key={m}>
                  <td>
                    {shortName(m)} {m === player ? <span class="tag you">You</span> : <span class="tag">Colleague</span>}
                  </td>
                  <td>{describe(scenario, m, plan) || "Nothing built"}</td>
                  <td class="num">{money(siloCost(scenario, m, plan))}</td>
                  <td>{siloChecks(scenario, m, plan).every((c) => c.ok) ? "All passed" : "Failed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;

    case 1:
      text = (
        <>
          <p class="eyebrow">Step 1 · Water</p>
          <h2>The river runs thin before the dams</h2>
          <p>
            Farms and cities take {fmt(o.riverUpstreamBcm)} bcm a year upstream. Only {fmt(o.flowAtDamsBcm)} bcm reaches the dams, which is {pct(o.hydroFlowFactor)} of natural flow.
          </p>
          <p>
            Farms and cities both pump the same aquifer: {fmt(o.aquiferUseBcm)} bcm a year against {fmt(scenario.limits.aquiferRechargeBcm)} bcm of recharge.
            {o.aquiferOverdraftBcm > 0 ? ` The water table falls ${fmt(o.waterTableFallMetresPerYear)} m every year.` : ""}
          </p>
          <div class={`stat ${o.aquiferOverdraftBcm > 0 ? "bad" : ""}`}>
            <span class="muted">Aquifer overdraft</span>
            <b>{fmt(o.aquiferOverdraftBcm)} bcm/yr</b>
          </div>
        </>
      );
      visual = (
        <div class="panel">
          <RiverMap scenario={scenario} plan={plan} outcome={o} />
        </div>
      );
      break;

    case 2:
      text = (
        <>
          <p class="eyebrow">Step 2 · Power</p>
          <h2>The lights go out</h2>
          <p>
            The dams were rated for {fmt(hydroRated)} TWh at natural flow. With the river already tapped upstream they deliver {fmt(o.generationBySource.hydro ?? 0)} TWh.
          </p>
          <p>
            The energy forecast was {fmt(o.demandBaseTWh)} TWh. Farm pumps and city water need another {fmt(o.demandPumpsTWh + o.demandWaterSupplyTWh)} TWh that nobody planned for.
          </p>
          <div class={`stat ${o.shortfallTWh > 0 ? "bad" : ""}`}>
            <span class="muted">Blackouts</span>
            <b>
              {fmt(o.shortfallTWh)} TWh ({pct(o.shortfallTWh / o.demandTotalTWh)} of demand)
            </b>
          </div>
        </>
      );
      visual = (
        <div class="panel">
          <GridMap scenario={scenario} plan={plan} outcome={o} />
        </div>
      );
      break;

    case 3:
      text = (
        <>
          <p class="eyebrow">Step 3 · Food and city water</p>
          <h2>No power, no pumps</h2>
          <p>Blackouts stop the tube wells, drip lines and city water plants. Pumped farms fall back to rain-fed yields. Taps run dry for part of the year.</p>
          <div class={`stat ${o.foodDeliveredMt < scenario.targets.foodMt ? "bad" : ""}`}>
            <span class="muted">Grain delivered (planned {fmt(o.foodPlannedMt)} Mt)</span>
            <b>{fmt(o.foodDeliveredMt)} Mt</b>
          </div>
          <div class={`stat ${o.cityWaterDeliveredBcm < scenario.targets.cityWaterBcm ? "bad" : ""}`}>
            <span class="muted">City water delivered (planned {fmt(o.cityWaterPlannedBcm, 2)} bcm)</span>
            <b>{fmt(o.cityWaterDeliveredBcm, 2)} bcm</b>
          </div>
        </>
      );
      visual = (
        <div class="panel">
          <div class="map-title">
            <h3>Land in use</h3>
            <span class="muted">Faded tiles lose their pumps</span>
          </div>
          <LandMap scenario={scenario} plan={plan} outcome={o} showBlackout />
        </div>
      );
      break;

    default:
      text = (
        <>
          <p class="eyebrow">Verdict</p>
          <h2>
            {failed.length} of {o.checks.length} checks failed
          </h2>
          <p>Each ministry counted the same river, the same aquifer and the same grid as its own. No single ministry could have seen this coming from inside its silo.</p>
          <h3 style={{ fontSize: "16px", marginTop: "6px" }}>Your part</h3>
          <ul style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "4px" }}>
            {playerContribution(scenario, player, plan, o).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button class="btn" type="button" onClick={onCouncil} style={{ marginTop: "8px" }}>
            Convene the Nexus Council
          </button>
        </>
      );
      visual = (
        <div class="panel" style={{ padding: "16px 18px", display: "grid", gap: "12px" }}>
          {o.checks.map((c) => (
            <Meter key={c.id} label={c.label} value={c.value} bound={c.bound} kind={c.kind} unit={c.unit} ok={c.ok} hint={hintFor(c.id, o)} decimals={c.id === "cityWater" ? 2 : 1} />
          ))}
        </div>
      );
  }

  return (
    <div class="reveal">
      <div class="dots" aria-label={`Step ${step + 1} of ${REVEAL_STEPS}`}>
        {Array.from({ length: REVEAL_STEPS }, (_, i) => (
          <span key={i} class={i <= step ? "on" : ""} />
        ))}
      </div>
      <div class="reveal-step">
        <div>{visual}</div>
        <div class="panel reveal-text">
          {text}
          <div class="btn-row" style={{ marginTop: "4px" }}>
            {step > 0 && (
              <button class="btn ghost small" type="button" onClick={() => onStep(step - 1)}>
                Back
              </button>
            )}
            {step < REVEAL_STEPS - 1 && (
              <button class="btn small" type="button" onClick={() => onStep(step + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
