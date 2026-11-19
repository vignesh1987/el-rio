/**
 * Express step 3: "Run the year".
 *
 * One button combines the three plans. The result appears at once, with no
 * animation: water, then power, then food and taps. Each area costs a heart
 * if its checks fail.
 */
import { useState } from "preact/hooks";
import { siloCost } from "../../model/silo.ts";
import { DOMAINS, domainOk, heartsLeft, type Domain } from "../../model/express.ts";
import type { MinistryId, Outcome, Plan, Scenario } from "../../model/types.ts";
import { RiverMap } from "../components/RiverMap.tsx";
import { fmt, money, pct } from "../format.ts";
import { hintFor, MINISTRIES, playerContribution, shortName } from "../game.ts";
import { Hearts } from "./Hearts.tsx";
import { describePlan } from "./PlanPick.tsx";

interface RunYearProps {
  scenario: Scenario;
  player: MinistryId;
  /** The combined plan: the player's card plus the two computer plans. */
  plan: Plan;
  outcome: Outcome;
  onFix: () => void;
}

/** Headline and detail lines for one domino. */
function story(domain: Domain, o: Outcome, scenario: Scenario): { title: string; lines: string[] } {
  const ok = domainOk(o, domain);
  const failing = o.checks.filter((c) => !c.ok && domain.checks.includes(c.id)).map((c) => hintFor(c.id, o));
  switch (domain.id) {
    case "water":
      return {
        title: ok ? "Water holds" : "The river runs thin",
        lines: [`Only ${pct(o.hydroFlowFactor)} of the natural flow reaches the dams.`, ...failing],
      };
    case "power":
      return {
        title: ok ? "Power holds" : "The lights go out",
        lines: [`Blackouts: ${fmt(o.shortfallTWh)} TWh, ${pct(o.shortfallTWh / o.demandTotalTWh)} of demand.`, ...failing],
      };
    case "food":
      return {
        title: ok ? "Food and taps hold" : "No power, no pumps",
        lines: [
          `Grain delivered: ${fmt(o.foodDeliveredMt)} of ${fmt(scenario.targets.foodMt)} Mt.`,
          `City water delivered: ${fmt(o.cityWaterDeliveredBcm, 2)} of ${fmt(scenario.targets.cityWaterBcm)} bcm.`,
        ],
      };
  }
}

export function RunYear({ scenario, player, plan, outcome, onFix }: RunYearProps) {
  const [ran, setRan] = useState(false);

  const hearts = heartsLeft(outcome);

  return (
    <div class="stack">
      <div class="round-head" style={{ "--accent": "var(--ink)" }}>
        <h1>Run the year</h1>
        <span class="muted">The Cabinet combines the three plans. Each one passed its own test.</span>
      </div>

      <div class="panel table-wrap">
        <table class="plans-table">
          <thead>
            <tr>
              <th>Ministry</th>
              <th>Plan</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {MINISTRIES.map((m) => (
              <tr key={m}>
                <td>
                  {shortName(m)} {m === player ? <span class="tag you">You</span> : <span class="tag">Computer</span>}
                </td>
                <td>{describePlan(scenario, Object.fromEntries(scenario.options.filter((o) => o.ministry === m).map((o) => [o.id, plan[o.id] ?? 0])))}</td>
                <td class="num">{money(siloCost(scenario, m, plan))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!ran && (
        <div class="xrun">
          <p>On paper, Utopia is fed, lit and supplied with water. Let's see what happens on the river.</p>
          <button class="btn xbig" type="button" onClick={() => setRan(true)}>
            Run the year ▶
          </button>
        </div>
      )}

      {ran && (
        <>
          <div class="panel">
            <RiverMap scenario={scenario} plan={plan} outcome={outcome} />
          </div>

          <div class="dominoes">
            {DOMAINS.map((d) => {
              const ok = domainOk(outcome, d);
              const s = story(d, outcome, scenario);
              return (
                <section key={d.id} class={`domino ${ok ? "ok" : "broken"}`}>
                  <span class="domino-heart" aria-hidden="true">
                    {ok ? "♥" : "♡"}
                  </span>
                  <div>
                    <h2>{s.title}</h2>
                    {s.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

        </>
      )}

      {ran && (
        <div class="panel xverdict">
          <p class="eyebrow">Basin health</p>
          <Hearts outcome={outcome} large />
          <h2>
            {hearts === 3 ? "The basin held." : `${3 - hearts} of 3 hearts broke.`}
          </h2>
          <p>Every ministry counted the same river, aquifer and grid as its own. No single ministry could have seen this from inside its silo.</p>
          <h3>Your part</h3>
          <ul>
            {playerContribution(scenario, player, plan, outcome).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button class="btn xbig" type="button" onClick={onFix}>
            Fix it as the Nexus Council →
          </button>
        </div>
      )}
    </div>
  );
}
