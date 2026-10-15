/**
 * Landing page.
 *
 * Sections, top to bottom:
 *   1. Hero with an interactive map of the basin (hover or tap a zone).
 *   2. "Try the nexus": one slider shows irrigation starving the dams.
 *   3. Pick a ministry (or get one at random).
 *   4. How the game works.
 *   5. Notes for lecturers.
 */
import { useMemo, useState } from "preact/hooks";
import { simulate } from "../../model/simulate.ts";
import type { MinistryId, Plan, Scenario } from "../../model/types.ts";
import { MINISTRY_ICONS } from "../components/Icons.tsx";
import { RiverMap, type RiverZone } from "../components/RiverMap.tsx";
import { fmt } from "../format.ts";
import { MINISTRIES, ministryColour, randomMinistry } from "../game.ts";

interface LandingProps {
  scenario: Scenario;
  onStart: (ministry: MinistryId) => void;
  onAssumptions: () => void;
}

/** An illustrative, balanced basin for the hero map. Not a game answer. */
const HERO_PLAN: Plan = { rainfed: 20, canal: 5, tubewell: 1, wells: 5, riverIntake: 3, hydro: 3 };

const ZONE_TEXT: Record<RiverZone, { title: string; body: string }> = {
  hills: { title: "River source", body: "The River rises in the hills. It carries 14 billion m³ a year, and everyone downstream shares it." },
  farms: { title: "Farm plain · Ministry of Agriculture", body: "Canals take river water. Tube wells pump the aquifer. Rain-fed fields use neither." },
  aquifer: { title: "Aquifer · shared by farms and cities", body: "Rain refills it by 3 billion m³ a year. Pump more than that and the water table falls." },
  cities: { title: "Cities · Ministry of Water Supply", body: "Twenty million people need 2 billion m³ of clean water a year, from the river, wells or the sea." },
  gorge: { title: "River gorge · Ministry of Energy", body: "Three dam sites. A dam only generates with the water that reaches it." },
  sea: { title: "Delta and sea", body: "At least 4 billion m³ a year must reach the sea to keep the wetlands and fisheries alive." },
};

const MINISTRY_ROLE: Record<MinistryId, string> = {
  agriculture: "Feed the country. Choose between rain-fed farms, canals, tube wells and drip irrigation.",
  energy: "Keep the lights on. Choose between solar farms, dams, coal and gas within a carbon cap.",
  water: "Supply the cities. Choose between river intakes, city wells and desalination.",
};

export function Landing({ scenario, onStart, onAssumptions }: LandingProps) {
  const [zone, setZone] = useState<RiverZone | null>(null);
  const [irrigated, setIrrigated] = useState(4);

  const heroOutcome = useMemo(() => simulate(scenario, HERO_PLAN), [scenario]);

  // Demo: three dams, plus canal irrigation upstream set by the slider.
  const demoPlan: Plan = { hydro: 3, canal: irrigated };
  const demo = simulate(scenario, demoPlan);
  const hydroRated = 12;
  const hydroNow = demo.generationBySource.hydro ?? 0;
  const lit = Math.round((hydroNow / hydroRated) * 10);

  const caption = zone ? ZONE_TEXT[zone] : null;

  return (
    <>
      {/* 1. Hero */}
      <section class="hero">
        <div class="hero-grid">
          <div class="stack" style={{ "--gap": "14px" }}>
            <p class="eyebrow">A game about the climate, land, energy and water nexus</p>
            <h1 class="hero-title">El Rio</h1>
          </div>
          <div class="stack">
            <p class="hero-lede">Three ministries share one river. Each one plans alone. Your job is to find out what breaks first, and then fix it.</p>
            <div class="btn-row">
              <button class="btn" type="button" onClick={() => onStart(randomMinistry())}>
                Deal me a ministry
              </button>
              <a class="btn ghost" href="#ministries">
                Choose a ministry
              </a>
            </div>
          </div>
        </div>
        <div class="panel">
          <RiverMap scenario={scenario} plan={HERO_PLAN} outcome={heroOutcome} onZone={setZone} activeZone={zone} />
        </div>
        <p class="zone-caption" aria-live="polite">
          {caption ? (
            <>
              <b>{caption.title}.</b> <span>{caption.body}</span>
            </>
          ) : (
            <span class="muted">Hover over or tap a part of the basin to see who manages it.</span>
          )}
        </p>
      </section>

      {/* 2. Try the nexus */}
      <section class="section">
        <h2>Try the nexus in ten seconds</h2>
        <p class="section-intro">Utopia's three dams sit downstream of the farm plain. Move the slider to irrigate more farmland from the river and watch the dams.</p>
        <div class="panel demo">
          <RiverMap scenario={scenario} plan={demoPlan} outcome={demo} />
          <div class="demo-readout">
            <div class="stack" style={{ "--gap": "8px" }}>
              <label for="demo-irrigation" class="eyebrow">
                Canal-irrigated farmland
              </label>
              <div class="big">{fmt(irrigated * 0.1)} Mha</div>
              <input id="demo-irrigation" type="range" min={0} max={15} step={1} value={irrigated} onInput={(e) => setIrrigated(Number((e.target as HTMLInputElement).value))} style={{ accentColor: "var(--agri)", width: "100%" }} />
            </div>
            <div class="stack" style={{ "--gap": "8px" }}>
            <div class="stat">
              <span class="muted">Dams generate</span>
              <b>
                {fmt(hydroNow)} of {hydroRated} TWh
              </b>
            </div>
            <div class="lights" aria-label={`${lit} of 10 city lights on`}>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} class={i < lit ? "" : "off"} />
              ))}
            </div>
            </div>
            <p class="muted" style={{ fontSize: "14px" }}>
              Each 100,000 ha of canals takes 0.8 billion m³ a year. That water never reaches the turbines.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Pick a ministry */}
      <section class="section" id="ministries">
        <h2>Pick your ministry</h2>
        <p class="section-intro">You plan for one ministry. Two colleagues plan the other two at the same time. Nobody sees the others' plans.</p>
        <div class="ministry-cards">
          {MINISTRIES.map((m) => {
            const info = scenario.ministries.find((x) => x.id === m)!;
            const Icon = MINISTRY_ICONS[m];
            return (
              <button key={m} type="button" class="ministry-card" style={{ "--accent": ministryColour(m) }} onClick={() => onStart(m)}>
                <span style={{ color: ministryColour(m) }}>
                  <Icon />
                </span>
                <h3>{info.name}</h3>
                <span class="target">{info.targetLabel}</span>
                <span class="muted" style={{ fontSize: "14.5px" }}>
                  {MINISTRY_ROLE[m]}
                </span>
                <span class="go">Play as {info.name.replace("Ministry of ", "")} →</span>
              </button>
            );
          })}
        </div>
        <div class="btn-row">
          <button class="btn ghost small" type="button" onClick={() => onStart(randomMinistry())}>
            Deal me one at random
          </button>
        </div>
      </section>

      {/* 4. How it works */}
      <section class="section">
        <h2>How the game works</h2>
        <ol class="steps">
          <li class="panel">
            <span class="n">Round 1 · about 5 minutes</span>
            <h3>Plan alone</h3>
            <p>Meet your ministry's target at the lowest cost. You see only your own sector.</p>
          </li>
          <li class="panel">
            <span class="n">Reveal · about 3 minutes</span>
            <h3>See what breaks</h3>
            <p>The Cabinet combines the three plans. Follow the water, then the power, then the food.</p>
          </li>
          <li class="panel">
            <span class="n">Round 2 · about 10 minutes</span>
            <h3>Plan together</h3>
            <p>As the Nexus Council you control all three ministries. Find a plan that breaks nothing.</p>
          </li>
        </ol>
      </section>

      {/* 5. Lecturers */}
      <section class="section">
        <details class="lecturers panel">
          <summary>For lecturers: running the game in class</summary>
          <ul>
            <li>Allow about 20 minutes. Students play on their own laptops or phones.</li>
            <li>"Deal me a ministry" splits a class into roughly equal thirds. Ask students to remember their ministry.</li>
            <li>After the reveal, ask: which ministry thought it caused the blackout? Why did every plan look fine on its own?</li>
            <li>After round 2, ask: what did the council give up compared with the silo plans? Where did the pressure move?</li>
            <li>Ask which simplifications would change the result: return flows, seasons, droughts, food or power trade.</li>
            <li>
              Every number is listed with its source in{" "}
              <button class="linkish" type="button" onClick={onAssumptions}>
                Data and assumptions
              </button>
              . The country is fictional. The coefficients are order-of-magnitude values.
            </li>
          </ul>
        </details>
      </section>
    </>
  );
}
