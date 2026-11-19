/**
 * One option card: name, summary, a slider (stepping by one block, shown as one number in the final unit),
 * and a line of effects that updates as the slider moves.
 *
 * In the silo round ("silo" mode) the card hides electricity that another
 * ministry pays for. That blind spot is part of the lesson.
 */
import { fmt, money } from "../format.ts";
import type { Option } from "../../model/types.ts";
import { quantity } from "../units.ts";

interface OptionCardProps {
  option: Option;
  blocks: number;
  onChange: (blocks: number) => void;
  mode: "silo" | "council";
}

export function OptionCard({ option, blocks, onChange, mode }: OptionCardProps) {
  const e = option.perBlock;
  const set = (n: number) => onChange(Math.max(0, Math.min(option.maxBlocks, n)));
  const id = `opt-${option.id}`;

  // Build the list of effects for the current number of blocks.
  const effects: [string, string][] = [];
  if (e.foodMt) effects.push(["grain", `${fmt(blocks * e.foodMt)} Mt`]);
  if (e.cityWaterBcm) effects.push(["supply", `${fmt(blocks * e.cityWaterBcm, 2)} bcm`]);
  if (e.electricityTWh) effects.push(["power", `${fmt(blocks * e.electricityTWh)} TWh${option.dependsOnRiverFlow ? " at full flow" : ""}`]);
  if (e.riverBcm && e.riverBcm >= 0.01) effects.push(["river", `${fmt(blocks * e.riverBcm)} bcm`]);
  if (e.aquiferBcm) effects.push(["aquifer", `${fmt(blocks * e.aquiferBcm, 2)} bcm`]);
  if (e.landMha && option.ministry === "agriculture") effects.push(["land", `${fmt(blocks * e.landMha)} Mha`]);
  if (e.landMha && option.ministry === "energy") effects.push(["land", `${fmt(blocks * e.landMha * 1e3, 0)}k ha`]);
  if (e.co2Mt && e.co2Mt > 0.2) effects.push(["CO₂", `${fmt(blocks * e.co2Mt)} Mt`]);
  if (e.powerUseTWh) {
    effects.push(["uses", mode === "council" ? `${fmt(blocks * e.powerUseTWh, 2)} TWh` : "grid power (not on your budget)"]);
  }
  effects.push(["cost", money(blocks * e.costMUSD)]);

  return (
    <div class="option panel">
      <div class="option-top">
        <b id={`${id}-name`}>{option.name}</b>
        <span class="count">{quantity(option, blocks)}</span>
      </div>
      <p class="summary">{option.summary}</p>
      <div class="slider-row">
        <button class="step-btn" type="button" onClick={() => set(blocks - 1)} aria-label={`Less ${option.name}`}>
          −
        </button>
        <input
          id={id}
          type="range"
          min={0}
          max={option.maxBlocks}
          step={1}
          value={blocks}
          aria-labelledby={`${id}-name`}
          onInput={(ev) => set(Number((ev.target as HTMLInputElement).value))}
        />
        <button class="step-btn" type="button" onClick={() => set(blocks + 1)} aria-label={`More ${option.name}`}>
          +
        </button>
      </div>
      <div class="block">
        max {quantity(option, option.maxBlocks, true)}
      </div>
      <div class="effects">
        {effects.map(([k, v]) => (
          <span key={k}>
            {k} <em>{v}</em>
          </span>
        ))}
      </div>
    </div>
  );
}
