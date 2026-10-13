"use client";
import { StrategiesLibrary } from "./StrategiesLibrary";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, SelectInput } from "../../../shared/module-ui";
import { StrategyContext } from "./context/StrategyContext";
import { StrategyReview } from "./review/StrategyReview";
import { StrategyRuns } from "./runs/StrategyRuns";
import styles from "./strategies.module.css";
import { StrategyCreate } from "./StrategyCreate";
import { StrategyTimeline } from "./StrategyTimeline";

type View = "library" | "context" | "review" | "runs";
const tabs: { id: View; label: string }[] = [
  { id: "library", label: "Strategies" },
  { id: "context", label: "Context library" },
  { id: "review", label: "Agent review" },
  { id: "runs", label: "Execution runs" },
];
const pageText: Record<View, { title: string; description: string }> = {
  library: {
    title: "Strategies",
    description: "Turn client goals into a working timeline.",
  },
  context: {
    title: "Context library",
    description: "Client context includes shared firm documents.",
  },
  review: {
    title: "Agent review",
    description: "Review proposed changes before they enter the working plan.",
  },
  runs: {
    title: "Execution runs",
    description: "Prepare and review work staged for Workspace or Outreach.",
  },
};

export function StrategiesScreen() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const [view, setView] = useState<View>(
    requested === "context" || requested === "review" || requested === "runs"
      ? requested
      : "library",
  );
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const clients = useCapiroQuery("clients.list", {});
  if (selected)
    return (
      <StrategyTimeline id={selected} onClose={() => setSelected(undefined)} />
    );
  return (
    <section className={styles.screen} data-design-node="411:119498">
      <div className={styles.scope}>
        <SelectInput
          aria-label="Strategy client scope"
          value={clientId}
          onValueChange={setClientId}
          options={[
            { value: "", label: "All clients" },
            ...(clients.data ?? []).map((client) => ({
              value: client.id,
              label: client.name,
            })),
          ]}
        />
        <ActionButton onClick={clients.reload}>Refresh</ActionButton>
      </div>
      <header className={styles.heading}>
        <div>
          <h1>{pageText[view].title}</h1>
          <p>{pageText[view].description}</p>
        </div>
        {view === "library" && (
          <div className={styles.actions}>
            <ActionButton onClick={() => setView("review")}>
              Agent review
            </ActionButton>
            <ActionButton onClick={() => setView("context")}>
              Context library
            </ActionButton>
            <ActionButton primary onClick={() => setCreating(true)}>
              New strategy
            </ActionButton>
          </div>
        )}
      </header>
      {view !== "library" && (
        <div className={styles.pills} role="group" aria-label="Strategy views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={view === tab.id ? styles.active : ""}
              aria-pressed={view === tab.id}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      {view === "library" && (
        <StrategiesLibrary
          clientId={clientId}
          onOpen={setSelected}
          onCreate={() => setCreating(true)}
          onReview={() => setView("review")}
        />
      )}
      {view === "context" && (
        <StrategyContext clientId={clientId || undefined} />
      )}
      {view === "review" && <StrategyReview clientId={clientId || undefined} />}
      {view === "runs" && <StrategyRuns />}
      {clients.error && (
        <p role="alert" className={styles.notice}>
          Client scope unavailable · {clients.error.message}
        </p>
      )}
      {creating && (
        <StrategyCreate
          onClose={() => setCreating(false)}
          onCreated={(strategy) => setSelected(strategy.id)}
        />
      )}
    </section>
  );
}
