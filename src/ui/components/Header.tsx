/**
 * Top bar: game name, progress through the stages, and a link to the
 * data and assumptions table.
 */

export type Stage = "landing" | "round" | "reveal" | "council" | "debrief";

const STAGES: { id: Stage; label: string }[] = [
  { id: "round", label: "1 · Your ministry" },
  { id: "reveal", label: "Reveal" },
  { id: "council", label: "2 · Nexus Council" },
  { id: "debrief", label: "Debrief" },
];

interface HeaderProps {
  stage: Stage;
  onHome: () => void;
  onAssumptions: () => void;
}

export function Header({ stage, onHome, onAssumptions }: HeaderProps) {
  const current = STAGES.findIndex((s) => s.id === stage);
  return (
    <header class="header">
      <button class="brand" type="button" onClick={onHome} aria-label="El Rio: back to the start page">
        El Rio
      </button>
      {stage !== "landing" && (
        <nav class="progress" aria-label="Game progress">
          {STAGES.map((s, i) => (
            <span key={s.id} class={i === current ? "on" : i < current ? "done" : ""} aria-current={i === current ? "step" : undefined}>
              {s.label}
            </span>
          ))}
        </nav>
      )}
      <button class="linkish" type="button" onClick={onAssumptions}>
        Data and assumptions
      </button>
    </header>
  );
}
