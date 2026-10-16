/**
 * Front page: why we play El Rio and what students should take away.
 *
 * This page deliberately does NOT show the game's own results (blackouts,
 * aquifer overdraft and so on). Students who saw them first would not plan
 * like a silo ministry in round 1, and the reveal would lose its surprise.
 * The figures here come from the CENG60016 Topic 8 lecture slides instead.
 */
import { MINISTRY_ICONS } from "../components/Icons.tsx";

interface PurposeProps {
  onPlay: () => void;
}

/** Orders of magnitude from the lecture slides. */
const LINKS = [
  { figure: "5,000 to 10,000 m³", what: "of water to irrigate one hectare of crops for a year", source: "Slide 12" },
  { figure: "1 to 3 m³", what: "of cooling water per MWh from a thermal power plant", source: "Slide 12" },
  { figure: "140 kWh", what: "to lift one million litres of groundwater from 35 m", source: "Slide 12" },
  { figure: "4%", what: "of the world's electricity runs the water supply chain, up to 10% in the Middle East and India", source: "Slide 10" },
];

/** The silo picture: three ministries drawing on one shared system. */
function SiloDiagram() {
  const ministries = [
    { id: "agriculture", name: "Agriculture", colour: "var(--agri)", y: 18 },
    { id: "energy", name: "Energy", colour: "var(--energy)", y: 70 },
    { id: "water", name: "Water Supply", colour: "var(--water)", y: 122 },
  ] as const;
  return (
    <svg viewBox="0 0 600 180" width="100%" role="img" aria-label="Three ministries, Agriculture, Energy and Water Supply, all draw on one river, one aquifer and one grid.">
      <defs>
        <marker id="purpose-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="var(--ink)" />
        </marker>
      </defs>
      {ministries.map((m) => (
        <g key={m.id}>
          <rect x={6} y={m.y} width={160} height={40} rx={4} fill={m.colour} />
          <text x={86} y={m.y + 26} text-anchor="middle" fill="var(--bg)" style={{ font: "800 16px var(--display)" }}>
            {m.name}
          </text>
          <line x1={170} y1={m.y + 20} x2={246} y2={90 + (m.y - 70) * 0.35} stroke="var(--ink)" stroke-width={2} marker-end="url(#purpose-arrow)" />
        </g>
      ))}
      <rect x={252} y={22} width={170} height={136} rx={6} fill="var(--aquifer)" />
      <text x={337} y={84} text-anchor="middle" style={{ font: "800 18px var(--display)", fill: "var(--ink)" }}>
        One river
      </text>
      <text x={337} y={106} text-anchor="middle" class="map-label" style={{ fill: "var(--ink)" }}>
        ONE AQUIFER · ONE GRID
      </text>
      <text x={440} y={62} class="map-label">EACH PLAN ASSUMES</text>
      <text x={440} y={80} class="map-label">"THE WHOLE RIVER</text>
      <text x={440} y={98} class="map-label">IS MINE"</text>
      <text x={440} y={132} style={{ font: "800 16px var(--display)", fill: "var(--ink)" }}>
        What happens
      </text>
      <text x={440} y={152} style={{ font: "800 16px var(--display)", fill: "var(--ink)" }}>
        when they meet?
      </text>
    </svg>
  );
}

export function Purpose({ onPlay }: PurposeProps) {
  return (
    <div class="purpose">
      <section class="purpose-hero">
        <p class="eyebrow">A 20-minute game for CENG60016 · Topic 8: Climate, land, energy and water</p>
        <h1>Why do sensible sector plans waste shared resources?</h1>
        <p class="purpose-lede">You will plan for one ministry, watch the plans meet on one river, and then plan for the whole country.</p>
        <div class="btn-row">
          <button class="btn" type="button" onClick={onPlay}>
            Play El Rio →
          </button>
          <span class="muted">About 20 minutes. Works on a phone.</span>
        </div>
      </section>

      <div class="purpose-grid">
        <div class="stack">
          <section class="panel purpose-box">
            <h2>The problem, in one picture</h2>
            <SiloDiagram />
            <p class="muted">Farms, power stations and cities draw on the same river, aquifer and grid. Each ministry plans its own sector and is judged on its own target.</p>
          </section>

          <section class="panel purpose-box">
            <h2>The links are real and measurable</h2>
            <div class="links">
              {LINKS.map((l) => (
                <div key={l.figure} class="link-row">
                  <b>{l.figure}</b>
                  <span>{l.what}</span>
                  <span class="muted">{l.source}</span>
                </div>
              ))}
            </div>
          </section>

          <section class="panel purpose-box">
            <h2>It happens in real basins</h2>
            <div class="case-row">
              <b>Punjab, India</b>
              <span>Subsidised farm electricity encouraged over-pumping. Water tables fell and electricity demand rose.</span>
            </div>
            <div class="case-row">
              <b>Haryana, India</b>
              <span>A draft plan for 250 kt of green hydrogen by 2030, in a state pumping 136% of its groundwater recharge.</span>
            </div>
          </section>
        </div>

        <div class="stack">
          <section class="panel purpose-box">
            <h2>What you will do</h2>
            <ol class="purpose-steps">
              <li>
                <span>1</span>
                <div>
                  <b>Plan alone.</b> Meet one ministry's target at the lowest cost.
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <b>See what happens.</b> The three ministries' plans (one by the user and the other two by the computer) are combined to asses the resource usage limitations.
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <b>Plan together.</b> As the Nexus Council (Non siloed approach with ministries), find a plan that works for the whole country.
                </div>
              </li>
            </ol>
          </section>

          <section class="panel purpose-box">
            <h2>Take-away messages</h2>
            <ul class="purpose-outcomes">
              <li>Plans that each pass their own test can still fail together on a shared resource.</li>
              <li>Water for energy and energy for water are links you can measure, not slogans.</li>
              <li>Joint planning across sectors, or nexus planning, helps mitigate unintended outcomes that no single ministry can see from inside its silo.</li>
              <li>A joint plan still moves pressure to land, carbon or cost. Someone has to choose.</li>
            </ul>
          </section>

          <section class="panel purpose-box purpose-ministries">
            <h2>You will play one of three ministries</h2>
            <div class="ministry-icons">
              <span style={{ color: "var(--agri)" }}>
                <MINISTRY_ICONS.agriculture size={40} />
                Agriculture
              </span>
              <span style={{ color: "var(--energy)" }}>
                <MINISTRY_ICONS.energy size={40} />
                Energy
              </span>
              <span style={{ color: "var(--water)" }}>
                <MINISTRY_ICONS.water size={40} />
                Water Supply
              </span>
            </div>
          </section>

          <button class="btn" type="button" onClick={onPlay}>
            Play El Rio →
          </button>
        </div>
      </div>
    </div>
  );
}
