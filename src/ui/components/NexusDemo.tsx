/**
 * "Try the nexus": a ten-second sandbox on the front page.
 *
 * The player plays the Cabinet. Two ministries ask for more: Agriculture
 * (farmland from the river, farmland from tube wells) and Water Supply
 * (city wells, desalination). The Ministry of Energy asks for nothing and
 * never hears about any of it. Three gauges show who pays:
 *   - the river reaching the dams (water for energy),
 *   - the aquifer that farms and cities both pump,
 *   - the lights (energy for water: pumps and desalination need power).
 *
 * It uses the same model as the game (src/model/simulate.ts). The baseline
 * energy plan is the Ministry of Energy's own silo plan: it meets the
 * forecast exactly when every dam gets the full river flow and nobody else
 * needs power, so every slider move costs something visible.
 */
import { useMemo, useState } from "preact/hooks";
import { simulate } from "../../model/simulate.ts";
import type { Outcome, Plan, Scenario } from "../../model/types.ts";
import { fmt, pct } from "../format.ts";
import { ministryColour } from "../game.ts";
import { RiverMap } from "./RiverMap.tsx";

interface NexusDemoProps {
  scenario: Scenario;
}

/** The Ministry of Energy's own plan: 30 TWh at full river flow. */
const ENERGY_PLAN: Plan = { solar: 10, hydro: 3, coal: 4 };

interface Lever {
  id: string;
  ministry: "agriculture" | "water";
  label: string;
  max: number;
  /** Text for the value next to the slider, from the number of blocks. */
  show: (blocks: number) => string;
}

const LEVERS: Lever[] = [
  { id: "canal", ministry: "agriculture", label: "Irrigate farmland from the river", max: 15, show: (n) => `${fmt(n * 0.1)} Mha` },
  { id: "tubewell", ministry: "agriculture", label: "Irrigate farmland with tube wells", max: 10, show: (n) => `${fmt(n * 0.1)} Mha` },
  { id: "wells", ministry: "water", label: "Supply cities from wells", max: 8, show: (n) => `${fmt(n * 0.25, 2)} bcm` },
  { id: "desal", ministry: "water", label: "Supply cities by desalination", max: 8, show: (n) => `${fmt(n * 0.25, 2)} bcm` },
];

type State = "ok" | "warn" | "bad";

function Gauge({ title, value, share, state, note }: { title: string; value: string; share: number; state: State; note: string }) {
  return (
    <div class={`gauge ${state}`}>
      <div class="gauge-top">
        <span>{title}</span>
        <b>{value}</b>
      </div>
      <div class="gauge-bar" role="img" aria-label={`${title}: ${value}`}>
        <i style={{ width: `${Math.max(0, Math.min(share, 1)) * 100}%` }} />
      </div>
      <span class="gauge-note">{note}</span>
    </div>
  );
}

/** Plain sentences that say what the sliders did, most important first. */
function whatHappened(o: Outcome, hydroRated: number): string[] {
  const lines: string[] = [];
  const hydro = o.generationBySource.hydro ?? 0;
  const extra = o.demandPumpsTWh + o.demandWaterSupplyTWh;
  if (o.riverUpstreamBcm > 0.01) {
    lines.push(`Farms and cities take ${fmt(o.riverUpstreamBcm)} bcm from the river above the dams. The dams get ${pct(o.hydroFlowFactor)} of the natural flow and make ${fmt(hydro)} of ${fmt(hydroRated, 0)} TWh.`);
  }
  if (extra > 0.01) {
    lines.push(`Pumps and desalination need ${fmt(extra)} TWh. The Ministry of Energy did not plan for it.`);
  }
  if (o.aquiferOverdraftBcm > 0.01) {
    lines.push(`Farms and cities pump the same aquifer: ${fmt(o.aquiferUseBcm)} bcm against ${fmt(3, 0)} bcm of recharge. The water table falls ${fmt(o.waterTableFallMetresPerYear)} m a year.`);
  }
  if (o.serviceFactor < 0.995) {
    lines.push(`Result: only ${pct(o.serviceFactor)} of electricity demand is served. Nobody asked Energy to give anything up.`);
  }
  return lines;
}

export function NexusDemo({ scenario }: NexusDemoProps) {
  const [blocks, setBlocks] = useState<Record<string, number>>({ canal: 0, tubewell: 0, wells: 0, desal: 0 });
  const plan: Plan = { ...ENERGY_PLAN, ...blocks };
  const o = useMemo(() => simulate(scenario, plan), [scenario, blocks]);

  const hydroOption = scenario.options.find((x) => x.id === "hydro")!;
  const hydroRated = (ENERGY_PLAN.hydro ?? 0) * (hydroOption.perBlock.electricityTWh ?? 0);
  const recharge = scenario.limits.aquiferRechargeBcm;
  const moved = Object.values(blocks).some((n) => n > 0);
  const lines = whatHappened(o, hydroRated);

  const riverState: State = o.hydroFlowFactor >= 0.9 ? "ok" : o.hydroFlowFactor >= 0.6 ? "warn" : "bad";
  const aquiferShare = o.aquiferUseBcm / recharge;
  const aquiferState: State = aquiferShare <= 0.8 ? "ok" : aquiferShare <= 1 ? "warn" : "bad";
  const lightsState: State = o.serviceFactor >= 0.99 ? "ok" : o.serviceFactor >= 0.85 ? "warn" : "bad";
  const lit = Math.round(o.serviceFactor * 10);

  const groups: { id: "agriculture" | "water"; name: string }[] = [
    { id: "agriculture", name: "Ministry of Agriculture asks for more" },
    { id: "water", name: "Ministry of Water Supply asks for more" },
  ];

  return (
    <div class="nexus-demo stack">
      <RiverMap scenario={scenario} plan={plan} outcome={o} />

      <div class="demo-cols">
        <div class="stack" style={{ "--gap": "14px" }}>
          {groups.map((g) => (
            <section key={g.id} class="demo-group" style={{ "--accent": ministryColour(g.id) }}>
              <h3>{g.name}</h3>
              {LEVERS.filter((l) => l.ministry === g.id).map((l) => {
                const n = blocks[l.id] ?? 0;
                const set = (v: number) => setBlocks({ ...blocks, [l.id]: Math.max(0, Math.min(l.max, v)) });
                const id = `demo-${l.id}`;
                return (
                  <div key={l.id} class="demo-lever">
                    <label for={id}>
                      <span>{l.label}</span>
                      <b class="num">{l.show(n)}</b>
                    </label>
                    <div class="slider-row">
                      <button class="step-btn" type="button" onClick={() => set(n - 1)} aria-label={`Less: ${l.label}`}>
                        −
                      </button>
                      <input id={id} type="range" min={0} max={l.max} step={1} value={n} onInput={(e) => set(Number((e.target as HTMLInputElement).value))} />
                      <button class="step-btn" type="button" onClick={() => set(n + 1)} aria-label={`More: ${l.label}`}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
          <div class="sealed demo-energy" style={{ "--accent": ministryColour("energy") }}>
            <i />
            <span>
              <b>Ministry of Energy</b> planned for {fmt(scenario.targets.electricityTWh, 0)} TWh, with every dam on full river flow. Nobody tells it what the others are doing.
            </span>
          </div>
        </div>

        <div class="stack" style={{ "--gap": "12px" }}>
          <Gauge title="River reaching the dams" value={pct(o.hydroFlowFactor)} share={o.hydroFlowFactor} state={riverState} note={`${fmt(o.flowAtDamsBcm)} of ${fmt(scenario.limits.riverNaturalFlowBcm, 0)} bcm a year`} />
          <Gauge title="Aquifer pumping" value={`${fmt(o.aquiferUseBcm)} bcm`} share={Math.min(aquiferShare, 1.5) / 1.5} state={aquiferState} note={`recharge is ${fmt(recharge, 0)} bcm a year`} />
          <div class={`gauge ${lightsState}`}>
            <div class="gauge-top">
              <span>Lights on</span>
              <b>{pct(o.serviceFactor)}</b>
            </div>
            <div class="lights" aria-label={`${lit} of 10 city lights on`}>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} class={i < lit ? "" : "off"} />
              ))}
            </div>
            <span class="gauge-note">
              {fmt(o.generationTWh)} TWh generated, {fmt(o.demandTotalTWh)} TWh wanted
            </span>
          </div>

          <div class="demo-happened" aria-live="polite">
            {moved ? (
              <ul>
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p class="muted">Everything is in balance. Drag a slider to give a ministry what it asks for, and watch who pays.</p>
            )}
          </div>
          {moved && (
            <button class="linkish" type="button" onClick={() => setBlocks({ canal: 0, tubewell: 0, wells: 0, desal: 0 })}>
              Reset the sliders
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
