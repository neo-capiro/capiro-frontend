"use client";
import { TargetContextSection } from "./TargetContextSection";

export function TargetContext({
  clientId,
  targetId,
}: {
  clientId: string;
  targetId: string;
}) {
  return (
    <section className="card stack" aria-label="Target context">
      <h3>Target context</h3>
      <p className="muted">
        Saved links and current work for this target. Open an item to see its
        details.
      </p>
      {(["objectives", "steps"] as const).map((section) => (
        <TargetContextSection
          key={`${clientId}:${targetId}:${section}`}
          clientId={clientId}
          targetId={targetId}
          section={section}
        />
      ))}
    </section>
  );
}
