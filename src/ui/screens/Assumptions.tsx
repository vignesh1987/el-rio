/**
 * Data and assumptions: every number in the game with its basis and source.
 * The rows come from src/data/assumptions.ts.
 */
import { ASSUMPTIONS } from "../../data/assumptions.ts";

export function Assumptions({ onBack }: { onBack: () => void }) {
  const groups = [...new Set(ASSUMPTIONS.map((r) => r.group))];
  return (
    <div class="stack">
      <div class="round-head">
        <h1 style={{ color: "var(--ink)" }}>Data and assumptions</h1>
      </div>
      <p class="section-intro" style={{ color: "var(--muted)" }}>
        Utopia is fictional. The coefficients are order-of-magnitude values for teaching. Rows marked "Assumption" are rounded teaching values, not data for any real country.
      </p>
      {groups.map((g) => (
        <section key={g} class="panel table-wrap">
          <table class="plans-table assumptions">
            <thead>
              <tr>
                <th>{g}</th>
                <th>Value</th>
                <th>Basis</th>
                <th>Source or note</th>
              </tr>
            </thead>
            <tbody>
              {ASSUMPTIONS.filter((r) => r.group === g).map((r) => (
                <tr key={r.item}>
                  <td>{r.item}</td>
                  <td>{r.value}</td>
                  <td>
                    <span class={`tag ${r.basis === "Assumption" ? "" : "you"}`}>{r.basis}</span>
                  </td>
                  <td>{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <div class="btn-row">
        <button class="btn" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
