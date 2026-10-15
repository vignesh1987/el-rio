/**
 * Unit tests for the nexus model in src/model/simulate.ts.
 * Each test isolates one link in the nexus.
 */
import { describe, expect, it } from "vitest";
import { BASELINE } from "../src/data/baseline.ts";
import { simulate } from "../src/model/simulate.ts";

const scenario = BASELINE;

describe("water for energy", () => {
  it("dams produce full output when nobody takes river water upstream", () => {
    const outcome = simulate(scenario, { hydro: 3 });
    expect(outcome.hydroFlowFactor).toBeCloseTo(1);
    expect(outcome.generationBySource.hydro).toBeCloseTo(12);
  });

  it("canal irrigation upstream cuts hydropower in proportion to the water taken", () => {
    // 10 blocks of canals take 8 bcm of the 14 bcm natural flow.
    const outcome = simulate(scenario, { hydro: 3, canal: 10 });
    expect(outcome.flowAtDamsBcm).toBeCloseTo(6);
    expect(outcome.generationBySource.hydro).toBeCloseTo(12 * (6 / 14));
  });
});

describe("energy for water", () => {
  it("tube wells add pumping demand on top of the Energy forecast", () => {
    const outcome = simulate(scenario, { tubewell: 1 });
    // 0.8 bcm lifted at 0.3 kWh/m3 = 0.24 TWh
    expect(outcome.demandPumpsTWh).toBeCloseTo(0.24);
    expect(outcome.demandTotalTWh).toBeCloseTo(30.24);
  });

  it("desalination is power-hungry", () => {
    const outcome = simulate(scenario, { desal: 8 });
    // 2 bcm at 3.5 kWh/m3 = 7 TWh
    expect(outcome.demandWaterSupplyTWh).toBeCloseTo(7);
  });
});

describe("knock-on effects of blackouts", () => {
  it("pumped farms fall back to rain-fed yields when there is no power", () => {
    // No power plants at all, so the service factor is zero.
    const outcome = simulate(scenario, { tubewell: 2 });
    expect(outcome.serviceFactor).toBe(0);
    expect(outcome.foodPlannedMt).toBeCloseTo(1.0);
    expect(outcome.foodDeliveredMt).toBeCloseTo(0.4); // rain-fed yield on the same land
  });

  it("gravity canals keep working during blackouts", () => {
    const outcome = simulate(scenario, { canal: 2 });
    expect(outcome.foodDeliveredMt).toBeCloseTo(outcome.foodPlannedMt);
  });
});

describe("shared aquifer", () => {
  it("pumping beyond recharge lowers the water table", () => {
    // 8 city well blocks (2 bcm) + 3 tube-well blocks (2.4 bcm) = 4.4 bcm against 3 bcm recharge.
    const outcome = simulate(scenario, { wells: 8, tubewell: 3 });
    expect(outcome.aquiferOverdraftBcm).toBeCloseTo(1.4);
    expect(outcome.waterTableFallMetresPerYear).toBeCloseTo(0.56);
    expect(outcome.checks.find((c) => c.id === "aquifer")!.ok).toBe(false);
  });
});
