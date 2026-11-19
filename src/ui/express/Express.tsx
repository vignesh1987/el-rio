/**
 * Express mode: the same lesson as the full game in about 8 minutes.
 *
 *   pick a ministry -> pick one of three plans (60 s clock) -> run the year
 *   -> fix the basin as the Nexus Council -> score card
 *
 * It uses the same model as the full game. Only the screens differ, so the
 * silo trap, the maps and the numbers stay in one place (src/data/baseline.ts).
 * Express keeps its own state here, so the full game is untouched.
 */
import { useEffect, useMemo, useState } from "preact/hooks";
import { PLAN_CARDS } from "../../data/express.ts";
import { changedOptions } from "../../model/express.ts";
import { findBestPlans, type ReferenceResult } from "../../model/reference.ts";
import { mergePlans } from "../../model/search.ts";
import { siloStars } from "../../model/silo.ts";
import { simulate } from "../../model/simulate.ts";
import type { MinistryId, Plan, Scenario } from "../../model/types.ts";
import { MINISTRY_ICONS } from "../components/Icons.tsx";
import { colleaguePlan, MINISTRIES, ministryColour, randomMinistry, siloPlans } from "../game.ts";
import { FixIt } from "./FixIt.tsx";
import { PlanPick } from "./PlanPick.tsx";
import { RunYear } from "./RunYear.tsx";
import { ScoreCard } from "./ScoreCard.tsx";

type Step = "pick" | "plan" | "run" | "fix" | "score";

const STEPS: { id: Step; label: string }[] = [
  { id: "pick", label: "Ministry" },
  { id: "plan", label: "Your plan" },
  { id: "run", label: "Run the year" },
  { id: "fix", label: "Fix it" },
  { id: "score", label: "Score" },
];

interface ExpressProps {
  scenario: Scenario;
  onFullGame: () => void;
  onHome: () => void;
}

export function Express({ scenario, onFullGame, onHome }: ExpressProps) {
  const [step, setStep] = useState<Step>("pick");
  const [player, setPlayer] = useState<MinistryId>("agriculture");
  const [cardId, setCardId] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [councilPlan, setCouncilPlan] = useState<Plan>({});
  const [hints, setHints] = useState(0);
  const [solutionViewed, setSolutionViewed] = useState(false);
  // The cheapest working plans, best first. The best one is the "reference" for par and hints.
  const [solutions, setSolutions] = useState<ReferenceResult[] | null>(null);
  const reference = solutions?.[0] ?? null;

  // The player's card plus the computer's two silo plans: the plan that breaks the basin.
  const startPlan = useMemo(() => {
    const card = PLAN_CARDS[player].find((c) => c.id === cardId);
    return mergePlans(colleaguePlan(scenario, player), card?.plan ?? {});
  }, [scenario, player, cardId]);
  const startOutcome = useMemo(() => simulate(scenario, startPlan), [scenario, startPlan]);
  const councilOutcome = useMemo(() => simulate(scenario, councilPlan), [scenario, councilPlan]);

  useEffect(() => window.scrollTo({ top: 0 }), [step]);

  // The cheapest working plan takes about half a second. Compute it while the player watches the year run.
  useEffect(() => {
    if (step === "pick" || step === "plan" || solutions) return;
    const t = window.setTimeout(() => setSolutions(findBestPlans(scenario, 2)), 300);
    return () => window.clearTimeout(t);
  }, [step, solutions, scenario]);

  const choosePlayer = (m: MinistryId) => {
    setPlayer(m);
    setCardId("");
    setHints(0);
    setSolutionViewed(false);
    setStep("plan");
  };
  const choosePlan = (id: string, left: number) => {
    setCardId(id);
    setSecondsLeft(left);
    setStep("run");
  };
  const toFix = () => {
    setCouncilPlan(startPlan);
    setHints(0);
    setSolutionViewed(false);
    setStep("fix");
  };

  const index = STEPS.findIndex((s) => s.id === step);
  const card = PLAN_CARDS[player].find((c) => c.id === cardId);
  const stars = card ? siloStars(scenario, player, card.plan, siloPlans(scenario)[player].cost) : 0;

  let body;
  switch (step) {
    case "pick":
      body = (
        <div class="stack">
          <div class="round-head" style={{ "--accent": "var(--ink)" }}>
            <h1>Quick play</h1>
            <span class="muted">About 8 minutes. You plan for one ministry and the computer plays the other two.</span>
          </div>
          <div class="ministry-cards">
            {MINISTRIES.map((m) => {
              const info = scenario.ministries.find((x) => x.id === m)!;
              const Icon = MINISTRY_ICONS[m];
              return (
                <button key={m} type="button" class="ministry-card" style={{ "--accent": ministryColour(m) }} onClick={() => choosePlayer(m)}>
                  <span style={{ color: ministryColour(m) }}>
                    <Icon />
                  </span>
                  <h3>{info.name}</h3>
                  <span class="target">{info.targetLabel}</span>
                  <span class="go">Play as {info.name.replace("Ministry of ", "")} →</span>
                </button>
              );
            })}
          </div>
          <div class="btn-row">
            <button class="btn ghost small" type="button" onClick={() => choosePlayer(randomMinistry())}>
              Deal me one at random
            </button>
          </div>
        </div>
      );
      break;
    case "plan":
      body = <PlanPick scenario={scenario} ministry={player} onChoose={choosePlan} />;
      break;
    case "run":
      body = <RunYear scenario={scenario} player={player} plan={startPlan} outcome={startOutcome} onFix={toFix} />;
      break;
    case "fix":
      body = (
        <FixIt
          scenario={scenario}
          start={startPlan}
          plan={councilPlan}
          outcome={councilOutcome}
          reference={reference}
          solutions={solutions}
          hintsUsed={hints}
          solutionViewed={solutionViewed}
          onChange={setCouncilPlan}
          onSolution={(plan) => {
            setCouncilPlan(plan);
            setSolutionViewed(true);
          }}
          onHint={(plan) => {
            setCouncilPlan(plan);
            setHints((n) => n + 1);
          }}
          onReset={() => setCouncilPlan(startPlan)}
          onAdopt={() => setStep("score")}
        />
      );
      break;
    case "score":
      body = reference ? (
        <ScoreCard
          scenario={scenario}
          player={player}
          stars={stars}
          secondsLeft={secondsLeft}
          hints={hints}
          solutionViewed={solutionViewed}
          changes={changedOptions(scenario, startPlan, councilPlan).length}
          par={changedOptions(scenario, startPlan, reference.plan).length}
          silo={startOutcome}
          council={councilOutcome}
          reference={reference}
          onAgain={choosePlayer}
          onFullGame={onFullGame}
          onHome={onHome}
        />
      ) : (
        <p class="muted">Working out the cheapest plan…</p>
      );
      break;
  }

  return (
    <div class="stack">
      <nav class="progress" aria-label="Quick play progress">
        {STEPS.map((s, i) => (
          <span key={s.id} class={i === index ? "on" : i < index ? "done" : ""} aria-current={i === index ? "step" : undefined}>
            {s.label}
          </span>
        ))}
      </nav>
      {body}
    </div>
  );
}
