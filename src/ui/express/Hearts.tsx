/**
 * Basin health: three hearts, one each for water, power, and food and taps.
 * A heart is full while every check in its area passes.
 */
import { DOMAINS, domainOk } from "../../model/express.ts";
import type { Outcome } from "../../model/types.ts";

interface HeartsProps {
  outcome: Outcome;
  /** Which hearts to show as "not yet known" (greyed, neither full nor broken). */
  hidden?: number;
  large?: boolean;
}

export function Hearts({ outcome, hidden = 0, large }: HeartsProps) {
  return (
    <div class={`hearts ${large ? "large" : ""}`} role="group" aria-label="Basin health">
      {DOMAINS.map((d, i) => {
        const unknown = i >= DOMAINS.length - hidden;
        const ok = domainOk(outcome, d);
        const state = unknown ? "unknown" : ok ? "ok" : "broken";
        return (
          <span key={d.id} class={`heart ${state}`} aria-label={`${d.label}: ${unknown ? "not yet known" : ok ? "holding" : "broken"}`}>
            <i aria-hidden="true">{state === "broken" ? "♡" : "♥"}</i>
            <span>{d.label}</span>
          </span>
        );
      })}
    </div>
  );
}
