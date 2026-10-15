/**
 * The game controller: holds the game state and decides which screen to show.
 *
 * Screens, in order of play:
 *   landing -> round (one ministry, alone) -> reveal -> council -> debrief
 * "assumptions" can be opened from any screen and returns to where it was.
 */
import { useEffect, useMemo, useState } from "preact/hooks";
import { BASELINE } from "../data/baseline.ts";
import { findReferencePlan, type ReferenceResult } from "../model/reference.ts";
import { mergePlans } from "../model/search.ts";
import { simulate } from "../model/simulate.ts";
import type { MinistryId, Plan } from "../model/types.ts";
import { Header, type Stage } from "./components/Header.tsx";
import { colleaguePlan } from "./game.ts";
import { Assumptions } from "./screens/Assumptions.tsx";
import { Council } from "./screens/Council.tsx";
import { Debrief } from "./screens/Debrief.tsx";
import { Landing } from "./screens/Landing.tsx";
import { MinistryRound } from "./screens/MinistryRound.tsx";
import { Reveal } from "./screens/Reveal.tsx";

type Screen = Stage | "assumptions";

// The scenario in play. A climate scenario will be a second file in src/data/.
const scenario = BASELINE;

export function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [returnTo, setReturnTo] = useState<Stage>("landing");
  const [player, setPlayer] = useState<MinistryId>("agriculture");
  const [ownPlan, setOwnPlan] = useState<Plan>({});
  const [revealStep, setRevealStep] = useState(0);
  const [councilPlan, setCouncilPlan] = useState<Plan>({});
  const [reference, setReference] = useState<ReferenceResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Round 1 result: the player's plan plus the two colleagues' silo plans.
  const siloPlan = useMemo(() => mergePlans(colleaguePlan(scenario, player), ownPlan), [player, ownPlan]);
  const siloOutcome = useMemo(() => simulate(scenario, siloPlan), [siloPlan]);
  const councilOutcome = useMemo(() => simulate(scenario, councilPlan), [councilPlan]);

  // Start each screen (and each reveal step) at the top of the page.
  useEffect(() => window.scrollTo({ top: 0 }), [screen, revealStep]);

  // ---------------------------------------------------------------- Actions
  const start = (m: MinistryId) => {
    setPlayer(m);
    setOwnPlan({});
    setRevealStep(0);
    setHintsUsed(0);
    setScreen("round");
  };
  const toCouncil = () => {
    setCouncilPlan(siloPlan);
    setScreen("council");
    // The reference plan takes about half a second. Compute it while the player works.
    if (!reference) setTimeout(() => setReference(findReferencePlan(scenario)), 300);
  };
  const openAssumptions = () => {
    if (screen !== "assumptions") setReturnTo(screen);
    setScreen("assumptions");
  };

  // ---------------------------------------------------------------- Screen
  let body;
  switch (screen) {
    case "landing":
      body = <Landing scenario={scenario} onStart={start} onAssumptions={openAssumptions} />;
      break;
    case "round":
      body = <MinistryRound scenario={scenario} ministry={player} plan={ownPlan} onChange={setOwnPlan} onSubmit={() => setScreen("reveal")} />;
      break;
    case "reveal":
      body = <Reveal scenario={scenario} player={player} plan={siloPlan} outcome={siloOutcome} step={revealStep} onStep={setRevealStep} onCouncil={toCouncil} />;
      break;
    case "council":
      body = (
        <Council
          scenario={scenario}
          plan={councilPlan}
          outcome={councilOutcome}
          onChange={setCouncilPlan}
          onReset={() => setCouncilPlan(siloPlan)}
          onSubmit={() => setScreen("debrief")}
          reference={reference?.plan ?? null}
          hintsUsed={hintsUsed}
          onHint={(plan) => {
            setCouncilPlan(plan);
            setHintsUsed((n) => n + 1);
          }}
        />
      );
      break;
    case "debrief":
      body = <Debrief scenario={scenario} player={player} silo={siloOutcome} council={councilOutcome} reference={reference} hintsUsed={hintsUsed} onPlayAnother={start} onRevise={() => setScreen("council")} onHome={() => setScreen("landing")} />;
      break;
    case "assumptions":
      body = <Assumptions onBack={() => setScreen(returnTo)} />;
      break;
  }

  return (
    <div class="page">
      <Header stage={screen === "assumptions" ? returnTo : screen} onHome={() => setScreen("landing")} onAssumptions={openAssumptions} />
      <main>{body}</main>
      <footer class="footer">
        <span>El Rio · a teaching game for CENG60016 Technologies to Combat Climate Change, Imperial College London.</span>
        <span>Utopia is fictional. Every number is listed under Data and assumptions.</span>
      </footer>
    </div>
  );
}
