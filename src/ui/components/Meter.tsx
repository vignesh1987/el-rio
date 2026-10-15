/**
 * A horizontal meter: one value against a target or a limit.
 *
 *   "min" meters (targets) fail when the value is below the bound.
 *   "max" meters (limits) fail when the value is above the bound.
 *
 * The thin vertical mark shows where the bound sits.
 */
import { fmt } from "../format.ts";

interface MeterProps {
  label: string;
  value: number;
  bound: number;
  kind: "min" | "max";
  unit: string;
  ok: boolean;
  /** CSS colour for the bar when the meter is fine, e.g. "var(--river)". */
  colour?: string;
  /** Optional one-line explanation shown under a failing meter. */
  hint?: string;
  decimals?: number;
}

export function Meter({ label, value, bound, unit, ok, colour, hint, decimals = 1 }: MeterProps) {
  // Scale so that both the value and the bound fit, with a little headroom.
  const scale = Math.max(bound * 1.25, value * 1.05, 1e-9);
  const width = Math.min(value / scale, 1) * 100;
  const mark = (bound / scale) * 100;

  return (
    <div class={`meter ${ok ? "" : "bad"}`} style={colour ? { "--bar": colour } : undefined}>
      <div class="meter-label">
        <span>{label}</span>
        <b>
          {fmt(value, decimals)} / {fmt(bound, decimals)} {unit}
        </b>
      </div>
      <div class="meter-bar" role="img" aria-label={`${label}: ${fmt(value, decimals)} of ${fmt(bound, decimals)} ${unit}${ok ? "" : ", not met"}`}>
        <i style={{ width: `${width}%` }} />
        <u style={{ left: `${mark}%` }} />
      </div>
      {!ok && hint && <div class="hint">{hint}</div>}
    </div>
  );
}
