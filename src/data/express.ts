/**
 * Express mode: the ready-made plan cards a player chooses from in round 1.
 *
 * Every card is a complete plan for one ministry and passes that ministry's
 * own checks. The cheapest card in each set is the plan a silo ministry
 * would submit, so the computer colleagues and the "cheapest" card agree.
 * tests/express.test.ts checks all of this, so edit the plans freely and
 * run `npm test` afterwards.
 *
 * The text under "pitch" is what students read. Keep it neutral: it must
 * not warn them that a card breaks the shared system.
 */
import type { MinistryId, Plan } from "../model/types.ts";

export interface PlanCard {
  id: string;
  ministry: MinistryId;
  /** Card title. */
  name: string;
  /** One sentence under the title. */
  pitch: string;
  /** The blocks the card builds. */
  plan: Plan;
}

export const PLAN_CARDS: Record<MinistryId, PlanCard[]> = {
  agriculture: [
    {
      id: "canals",
      ministry: "agriculture",
      name: "Canals and a few wells",
      pitch: "Gravity canals do most of the work. Low cost.",
      plan: { rainfed: 3, canal: 12, tubewell: 3 },
    },
    {
      id: "rain",
      ministry: "agriculture",
      name: "Mostly rain-fed",
      pitch: "Let the rain do the work. Needs a lot of land.",
      plan: { rainfed: 35, tubewell: 2 },
    },
    {
      id: "drip",
      ministry: "agriculture",
      name: "Drip irrigation",
      pitch: "Pipes that sip water, plus rain-fed fields. Costly.",
      plan: { rainfed: 15, drip: 10 },
    },
  ],
  energy: [
    {
      id: "coal",
      ministry: "energy",
      name: "Dams, solar and coal",
      pitch: "Cheap and reliable. Highest emissions.",
      plan: { solar: 10, hydro: 3, coal: 4 },
    },
    {
      id: "gas",
      ministry: "energy",
      name: "Dams, solar and gas",
      pitch: "Half the emissions of coal. A little dearer.",
      plan: { solar: 10, hydro: 3, gas: 4 },
    },
    {
      id: "onedam",
      ministry: "energy",
      name: "Solar, gas and one dam",
      pitch: "Leans less on the river. The dearest plan.",
      plan: { solar: 10, hydro: 1, gas: 8 },
    },
  ],
  water: [
    {
      id: "wells",
      ministry: "water",
      name: "City wells",
      pitch: "Pump the aquifer under the plain. Cheapest.",
      plan: { wells: 8 },
    },
    {
      id: "mix",
      ministry: "water",
      name: "Wells and river intake",
      pitch: "Half from the aquifer, half from the river.",
      plan: { wells: 4, riverIntake: 4 },
    },
    {
      id: "desal",
      ministry: "water",
      name: "Desalination",
      pitch: "Seawater. No river water and no wells. Costly.",
      plan: { desal: 8 },
    },
  ],
};
