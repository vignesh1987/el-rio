/**
 * Round 1: the player plans for one ministry, alone.
 *
 * The player sees:
 *   - their ministry's brief and target,
 *   - their "home" map, cropped to their own sector,
 *   - their own options and their own checklist (siloChecks).
 * They do not see the other two ministries' plans. That is the point.
 */
import { optionsOf, siloChecks, siloCost, siloStars } from "../../model/silo.ts";
import { simulate } from "../../model/simulate.ts";
import type { MinistryId, Plan, Scenario } from "../../model/types.ts";
import { GridMap } from "../components/GridMap.tsx";
import { LandMap } from "../components/LandMap.tsx";
import { Meter } from "../components/Meter.tsx";
import { OptionCard } from "../components/OptionCard.tsx";
import { RiverMap } from "../components/RiverMap.tsx";
import { money } from "../format.ts";
import { MINISTRIES, ministryColour, shortName, siloPlans } from "../game.ts";

interface MinistryRoundProps {
  scenario: Scenario;
  ministry: MinistryId;
  plan: Plan;
  onChange: (plan: Plan) => void;
  onSubmit: () => void;
}

/** Bar colour for each line of a ministry's checklist. */
const METER_COLOURS: Record<string, string> = {
  "Grain grown": "var(--agri)",
  "River water": "var(--river)",
  Groundwater: "var(--aquifer-deep)",
  Land: "var(--land)",
  "Electricity generated": "var(--energy)",
  "CO₂": "var(--muted)",
  "Water supplied": "var(--water)",
};

export function MinistryRound({ scenario, ministry, plan, onChange, onSubmit }: MinistryRoundProps) {
  const info = scenario.ministries.find((m) => m.id === ministry)!;
  const outcome = simulate(scenario, plan); // only this ministry's blocks are in `plan`
  const checks = siloChecks(scenario, ministry, plan);
  const allOk = checks.every((c) => c.ok);
  const cost = siloCost(scenario, ministry, plan);
  const best = siloPlans(scenario)[ministry].cost;

  // Stars compare the player's cost with the cheapest silo plan.
  const stars = siloStars(scenario, ministry, plan, best);

  return (
    <div style={{ "--accent": ministryColour(ministry) }}>
      <div class="round-head">
        <h1>{info.name}</h1>
        <span class="muted">Your target · {info.targetLabel}</span>
      </div>

      <div class="panel brief">
        <ul>
          {info.brief.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* Home map(s), cropped to this ministry's sector */}
      <div class="stack" style={{ marginTop: "16px" }}>
        {ministry === "agriculture" && (
          <>
            <div class="panel">
              <div class="map-title">
                <h3>Your farmland</h3>
                <span class="muted">1 tile = 100,000 ha</span>
              </div>
              <LandMap scenario={scenario} plan={plan} outcome={outcome} farmsOnly />
            </div>
            <div class="panel">
              <div class="map-title">
                <h3>Your water sources</h3>
              </div>
              <RiverMap scenario={scenario} plan={plan} outcome={outcome} visible={["hills", "farms", "aquifer"]} />
            </div>
          </>
        )}
        {ministry === "water" && (
          <div class="panel">
            <div class="map-title">
              <h3>Your water sources</h3>
            </div>
            <RiverMap scenario={scenario} plan={plan} outcome={outcome} visible={["hills", "cities", "aquifer"]} />
          </div>
        )}
        {ministry === "energy" && (
          <div class="panel">
            <div class="map-title">
              <h3>Your grid</h3>
              <span class="muted">Dams rated at natural river flow</span>
            </div>
            <GridMap scenario={scenario} plan={plan} outcome={outcome} silo />
          </div>
        )}
      </div>

      <div class="workbench">
        <div class="cards">
          {optionsOf(scenario, ministry).map((option) => (
            <OptionCard key={option.id} option={option} blocks={plan[option.id] ?? 0} mode="silo" onChange={(n) => onChange({ ...plan, [option.id]: n })} />
          ))}
        </div>

        <aside class="panel view" aria-label="Your ministry's view">
          <h2>Your ministry's view</h2>
          {checks.map((c) => (
            <Meter key={c.label} {...c} colour={METER_COLOURS[c.label]} decimals={c.unit === "bcm/yr" ? 2 : 1} />
          ))}
          <div class="cost-line">
            <span>Cost to your ministry</span>
            <b>{money(cost)}</b>
          </div>
          <div class="muted" style={{ fontSize: "14px" }}>
            Rating{" "}
            <span class="stars" aria-label={`${stars} of 3 stars`}>
              {"★".repeat(stars)}
              {"☆".repeat(3 - stars)}
            </span>{" "}
            {allOk ? (stars === 3 ? "Cheapest possible plan" : "Target met. A cheaper plan exists.") : "Target not met or a limit broken"}
          </div>
          {MINISTRIES.filter((m) => m !== ministry).map((m) => (
            <div key={m} class="sealed" style={{ "--accent": ministryColour(m) }}>
              <i />
              Ministry of {shortName(m)} is drafting its plan
            </div>
          ))}
          <button class="btn" type="button" disabled={!allOk} onClick={onSubmit}>
            Submit plan to Cabinet
          </button>
          {!allOk && (
            <p class="muted" style={{ fontSize: "13px" }}>
              Meet your target and stay within your limits to submit.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
