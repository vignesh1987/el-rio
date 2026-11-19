/**
 * Front page: why we play El Rio and what students should take away.
 *
 * The "Try the planning problem" demo (NexusDemo) shows the mechanism: one
 * ministry's request hits another's gauge. It does NOT replay the game's own
 * silo plans or the combined failure, so round 1 and the reveal still
 * surprise students. The figures in the list come from the CENG60016 lecture
 * slides.
 */
import type { Scenario } from "../../model/types.ts";
import { MINISTRY_ICONS } from "../components/Icons.tsx";
import { NexusDemo } from "../components/NexusDemo.tsx";

interface PurposeProps {
  scenario: Scenario;
  onPlay: () => void;
  /** Opens the 8-minute Quick play version. */
  onQuick: () => void;
}

/** Orders of magnitude from the lecture slides. */
const LINKS = [
  { figure: "5,000 to 10,000 m³", what: "of water to irrigate one hectare of crops for a year" },
  { figure: "1 to 3 m³", what: "of cooling water per MWh from a thermal power plant"},
  { figure: "140 kWh", what: "to lift one million litres of groundwater from 35 m"},
  { figure: "4%", what: "of the world's electricity runs the water supply chain, up to 10% in the Middle East and India"},
];

export function Purpose({ scenario, onPlay, onQuick }: PurposeProps) {
  return (
    <div class="purpose">
      <section class="purpose-hero">
        <p class="eyebrow">A simple simulation game for CENG60016 · Topic 7: Climate, land, energy and water</p>
        <h1>When ministries plan in siloes, can shared resources run short?</h1>
        <div class="btn-row">
          <button class="btn" type="button" onClick={onQuick}>
            Quick play · 8 min →
          </button>
          <button class="btn ghost" type="button" onClick={onPlay}>
            Full game · 20 min
          </button>
        </div>
      </section>

      <section class="panel purpose-box purpose-ministries">
        <h2>You plan for one ministry. The computer plays the other two.</h2>
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

      <section class="panel purpose-box">
        <h2>Try the planning problem in ten seconds</h2>
        <p class="muted">Farms, power stations and cities draw on the same river, aquifer and grid. Each ministry plans its own sector and is judged on its own target. Give two of them what they ask for and watch who pays.</p>
        <NexusDemo scenario={scenario} />
      </section>

      <div class="purpose-grid">
        <div class="stack">
          <section class="panel purpose-box">
            <h2>The links are real and measurable</h2>
            <div class="links">
              {LINKS.map((l) => (
                <div key={l.figure} class="link-row">
                  <b>{l.figure}</b>
                  <span>{l.what}</span>
                </div>
              ))}
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

          <button class="btn" type="button" onClick={onQuick}>
            Quick play · 8 min →
          </button>
        </div>
      </div>
    </div>
  );
}
