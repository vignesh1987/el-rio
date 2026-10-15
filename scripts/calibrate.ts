/**
 * Calibration report. Run with: npm run calibrate
 *
 * Use it after changing numbers in src/data/baseline.ts. It prints:
 *   - the cheapest plan each silo ministry would submit,
 *   - what happens when the three silo plans are combined,
 *   - the cheapest plan that works when the ministries plan together.
 */
import { BASELINE } from "../src/data/baseline.ts";
import { findReferencePlan } from "../src/model/reference.ts";
import { cheapestSiloPlan } from "../src/model/silo.ts";
import { mergePlans } from "../src/model/search.ts";
import { simulate } from "../src/model/simulate.ts";
import type { MinistryId, Outcome } from "../src/model/types.ts";

const scenario = BASELINE;
const round = (x: number) => Math.round(x * 100) / 100;

function show(title: string, o: Outcome) {
  console.log(`\n${title}`);
  for (const c of o.checks) {
    const sign = c.kind === "min" ? ">=" : "<=";
    console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.label.padEnd(12)} ${round(c.value)} ${sign} ${round(c.bound)} ${c.unit}`);
  }
  console.log(`  hydro flow factor ${round(o.hydroFlowFactor)}, generation ${round(o.generationTWh)} TWh, demand ${round(o.demandTotalTWh)} TWh (pumps ${round(o.demandPumpsTWh)}, city water ${round(o.demandWaterSupplyTWh)})`);
  console.log(`  food planned ${round(o.foodPlannedMt)} delivered ${round(o.foodDeliveredMt)} Mt; city water planned ${round(o.cityWaterPlannedBcm)} delivered ${round(o.cityWaterDeliveredBcm)} bcm`);
  console.log(`  cost ${round(o.costTotal)} US$M/yr  (agri ${o.costByMinistry.agriculture}, energy ${o.costByMinistry.energy}, water ${o.costByMinistry.water})`);
}

const ministries: MinistryId[] = ["agriculture", "energy", "water"];
const silo = Object.fromEntries(ministries.map((m) => [m, cheapestSiloPlan(scenario, m)]));
for (const m of ministries) console.log(`Silo ${m}: cost ${silo[m].cost}`, JSON.stringify(silo[m].plan));

const siloPlan = mergePlans(...ministries.map((m) => silo[m].plan));
show("Three silo plans combined", simulate(scenario, siloPlan));

const t0 = Date.now();
const ref = findReferencePlan(scenario);
console.log(`\nReference search took ${Date.now() - t0} ms`);
if (!ref) console.log("NO FEASIBLE INTEGRATED PLAN");
else {
  console.log("Reference plan:", JSON.stringify(ref.plan));
  show("Cheapest plan that works", ref.outcome);
  const paper = ministries.reduce((a, m) => a + silo[m].cost, 0);
  console.log(`\nSilo plans on paper cost ${paper}; working plan costs ${ref.outcome.costTotal} (+${round((ref.outcome.costTotal / paper - 1) * 100)}%)`);
}
