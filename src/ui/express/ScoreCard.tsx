/**
 * Express step 5: the score card.
 *
 * Shows the total out of 1,000, a rank, the badges earned, and a short
 * comparison of the silo plans against the player's council plan. The
 * comparison keeps the lesson in front of the score.
 */
import { badgesFor, COST_BONUS_MAX, fixPoints, heartsLeft, pickPoints, POINTS_PER_STAR, rankFor, speedBonus } from "../../model/express.ts";
import type { ReferenceResult } from "../../model/reference.ts";
import type { MinistryId, Outcome, Scenario } from "../../model/types.ts";
import { fmt, money } from "../format.ts";
import { MINISTRIES, shortName } from "../game.ts";
import { Hearts } from "./Hearts.tsx";

interface ScoreCardProps {
  scenario: Scenario;
  player: MinistryId;
  stars: number;
  secondsLeft: number;
  hints: number;
  solutionViewed: boolean;
  changes: number;
  par: number;
  silo: Outcome;
  council: Outcome;
  reference: ReferenceResult;
  onAgain: (m: MinistryId) => void;
  onFullGame: () => void;
  onHome: () => void;
}

export function ScoreCard({ player, stars, secondsLeft, hints, solutionViewed, changes, par, silo, council, reference, onAgain, onFullGame, onHome }: ScoreCardProps) {
  const pick = pickPoints(stars, secondsLeft);
  const fix = fixPoints({ feasible: council.feasible, cost: council.costTotal, referenceCost: reference.outcome.costTotal, changes, par, hints, solutionViewed });
  const total = pick + fix.total;
  const rank = rankFor(total);
  const badges = badgesFor({ stars, secondsLeft, hints, solutionViewed, changes, par, cost: council.costTotal, referenceCost: reference.outcome.costTotal });
  const next = MINISTRIES[(MINISTRIES.indexOf(player) + 1) % MINISTRIES.length];
  const extra = council.costTotal / silo.costTotal - 1;

  const rows: [string, number][] = [
    [`Plan card (${"★".repeat(stars)}${"☆".repeat(3 - stars)} × ${POINTS_PER_STAR})`, stars * POINTS_PER_STAR],
    ["Speed bonus", speedBonus(secondsLeft)],
    ["Basin fixed", fix.base],
    [`Low-cost bonus (up to ${COST_BONUS_MAX})`, fix.costBonus],
    [`Changes above par (${Math.max(0, changes - par)})`, -fix.changePenalty],
    [`Hints used (${hints})`, -fix.hintPenalty],
    [`Solution shown (${solutionViewed ? "yes" : "no"})`, -fix.solutionPenalty],
  ];

  return (
    <div class="stack">
      <div class="panel xscore">
        <p class="eyebrow">Your score</p>
        <div class="xtotal">
          <b class="num">{total}</b>
          <span>/ 1,000</span>
        </div>
        <h1>{rank.title}</h1>
        <p class="muted">{rank.blurb}</p>
      </div>

      <div class="xtwo">
        <div class="panel table-wrap">
          <table class="plans-table">
            <tbody>
              {rows.map(([label, pts]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td class="num">{pts > 0 ? `+${pts}` : pts}</td>
                </tr>
              ))}
              <tr class="xsum">
                <td>Total</td>
                <td class="num">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel xbadges">
          <h2>Badges</h2>
          <ul>
            {badges.map((b) => (
              <li key={b.id} class={b.earned ? "earned" : ""}>
                <span aria-hidden="true">{b.earned ? "★" : "☆"}</span>
                <div>
                  <b>{b.name}</b>
                  <span>{b.how}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div class="panel xcompare">
        <h2>What the Council learned</h2>
        <div class="xcols">
          <div>
            <span class="muted">Silo plans</span>
            <Hearts outcome={silo} />
            <span class="num">Blackouts {fmt(silo.shortfallTWh)} TWh</span>
            <span class="num">{money(silo.costTotal)} a year</span>
          </div>
          <div>
            <span class="muted">Your Council plan</span>
            <Hearts outcome={council} />
            <span class="num">Blackouts {fmt(council.shortfallTWh)} TWh</span>
            <span class="num">{money(council.costTotal)} a year</span>
          </div>
          <div>
            <span class="muted">Cheapest working plan</span>
            <Hearts outcome={reference.outcome} />
            <span class="num">Blackouts {fmt(reference.outcome.shortfallTWh)} TWh</span>
            <span class="num">{money(reference.outcome.costTotal)} a year</span>
          </div>
        </div>
        <p>
          Each silo plan passed its own test, yet together they broke {3 - heartsLeft(silo)} of 3 hearts. Planning across sectors fixed it. The working plan costs {fmt(Math.abs(extra) * 100, 0)}% {extra >= 0 ? "more" : "less"} than the silo plans looked on paper, because the silo plans spent the same water twice.
        </p>
      </div>

      <div class="btn-row">
        <button class="btn" type="button" onClick={() => onAgain(next)}>
          Play as {shortName(next)}
        </button>
        <button class="btn ghost" type="button" onClick={onFullGame}>
          Play the full game (about 20 minutes)
        </button>
        <button class="btn ghost" type="button" onClick={onHome}>
          Back to the start
        </button>
      </div>
    </div>
  );
}
