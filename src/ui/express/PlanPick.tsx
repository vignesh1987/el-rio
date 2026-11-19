/**
 * Express step 2: pick one of three ready-made plans for your ministry.
 *
 * Every card passes the ministry's own checks. The player is judged on
 * cost alone, exactly like a silo ministry, so the cheapest card earns
 * three stars. A 2.5-minute clock adds a speed bonus: it never stops the
 * player, it only shrinks the bonus.
 */
import { useEffect, useState } from "preact/hooks";
import { PLAN_CARDS } from "../../data/express.ts";
import { PICK_SECONDS, POINTS_PER_STAR, speedBonus } from "../../model/express.ts";
import { siloChecks, siloCost, siloStars } from "../../model/silo.ts";
import type { MinistryId, Plan, Scenario } from "../../model/types.ts";
import { fmt, money } from "../format.ts";
import { MINISTRIES, ministryColour, shortName, siloPlans } from "../game.ts";
import { describeQuantities } from "../units.ts";

interface PlanPickProps {
  scenario: Scenario;
  ministry: MinistryId;
  onChoose: (cardId: string, secondsLeft: number) => void;
}

/** "Canal irrigation 1.2 Mha, Tube-well irrigation 0.3 Mha" */
export function describePlan(scenario: Scenario, plan: Plan): string {
  return describeQuantities(scenario.options, plan);
}

/** Seconds as m:ss, e.g. 150 -> "2:30". */
function clockText(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PlanPick({ scenario, ministry, onChoose }: PlanPickProps) {
  const info = scenario.ministries.find((m) => m.id === ministry)!;
  const [left, setLeft] = useState(PICK_SECONDS);
  useEffect(() => {
    const timer = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const best = siloPlans(scenario)[ministry].cost;

  return (
    <div class="stack" style={{ "--accent": ministryColour(ministry) }}>
      <div class="round-head">
        <h1>{info.name}</h1>
        <span class="muted">Your target · {info.targetLabel}</span>
      </div>

      <div class="xhud">
        <p>
          Pick <b>one plan</b>. You are judged on cost: the cheapest plan that meets your target earns three stars.
        </p>
        <div class={`clock ${left === 0 ? "done" : ""}`} role="timer" aria-label={`${clockText(left)} of speed bonus left`}>
          <span class="clock-n">{clockText(left)}</span>
          <span class="clock-l">{left === 0 ? "no bonus left" : `+${speedBonus(left)} points`}</span>
        </div>
      </div>

      <div class="xcards">
        {PLAN_CARDS[ministry].map((card) => {
          const cost = siloCost(scenario, ministry, card.plan);
          const stars = siloStars(scenario, ministry, card.plan, best);
          const checks = siloChecks(scenario, ministry, card.plan);
          const target = checks[0];
          return (
            <section key={card.id} class="xcard panel">
              <h2>{card.name}</h2>
              <p class="muted">{card.pitch}</p>
              <p class="xblocks">{describePlan(scenario, card.plan)}</p>
              <div class="xfacts">
                <span>
                  Cost <b class="num">{money(cost)}</b>
                </span>
                <span class="stars" aria-label={`${stars} of 3 stars`}>
                  {"★".repeat(stars)}
                  {"☆".repeat(3 - stars)}
                </span>
              </div>
              <p class="xpass">
                {target.label} {fmt(target.value, target.unit === "bcm/yr" ? 2 : 1)} of {fmt(target.bound, target.unit === "bcm/yr" ? 2 : 1)} {target.unit}. Your own checks pass.
              </p>
              <button class="btn" type="button" onClick={() => onChoose(card.id, left)}>
                Choose this plan
              </button>
            </section>
          );
        })}
      </div>

      <div class="xsealed">
        {MINISTRIES.filter((m) => m !== ministry).map((m) => (
          <div key={m} class="sealed" style={{ "--accent": ministryColour(m) }}>
            <i />
            The computer is planning for the Ministry of {shortName(m)}
          </div>
        ))}
        <span class="muted">One plan is worth up to {3 * POINTS_PER_STAR} points.</span>
      </div>
    </div>
  );
}
