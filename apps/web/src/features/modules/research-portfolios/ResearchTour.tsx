"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../shared/module-ui";
import type { ResearchPortfolioView } from "./research-navigation";
import styles from "./research.module.css";
const steps: { title: string; detail: string; view: ResearchPortfolioView }[] =
  [
    {
      title: "Choose portfolio members",
      detail:
        "Add typed subjects and record why each is included or excluded. Rules preview their changes before you publish.",
      view: "members",
    },
    {
      title: "Review changes and evidence",
      detail:
        "Use your review queue to decide, assign or discuss changes. Personal change state and bookmarks belong to your account.",
      view: "reviews",
    },
    {
      title: "Read qualified results",
      detail:
        "Analytics separates incompatible funding bases and identifies missing evidence. Linked-client fit shows the supported basis.",
      view: "analytics",
    },
    {
      title: "Capture and export",
      detail:
        "Capture an immutable snapshot or export qualified CSV results. Check receipts in Operations after an interrupted action.",
      view: "snapshots",
    },
    {
      title: "Share with a client",
      detail:
        "Publish a PIN-protected dashboard from a snapshot. Shared links expire after one week; manage the PIN, design and revocation in Sharing.",
      view: "sharing",
    },
  ];
export function ResearchTour({
  onView,
}: {
  onView: (view: ResearchPortfolioView) => void;
}) {
  const params = { tourVersion: "research-portfolios-v1" };
  const query = useCapiroQuery("research.tour", { params });
  const mutation = useCapiroMutation("research.tour.update");
  const [index, setIndex] = useState(0);
  const state = mutation.data ?? query.data;
  async function setStatus(status: "active" | "dismissed" | "completed") {
    try {
      await mutation.run({ params, body: { status } });
      if (status === "active") setIndex(0);
    } catch {
      /* No optimistic completion. */
    }
  }
  if (!state || state.status !== "active")
    return (
      <div className={styles.actions}>
        <ActionButton
          disabled={query.loading || mutation.pending}
          onClick={() => void setStatus("active")}
        >
          Start portfolio tour
        </ActionButton>
        <StatusPanel
          error={query.error || mutation.error}
          onRetry={query.reload}
        />
      </div>
    );
  const step = steps[index]!;
  return (
    <Panel
      title={`Portfolio tour · ${index + 1} of ${steps.length}: ${step.title}`}
      description={step.detail}
    >
      <StatusPanel error={mutation.error} />
      <div className={styles.actions}>
        <ActionButton onClick={() => onView(step.view)}>
          Open this view
        </ActionButton>
        <ActionButton
          disabled={!index || mutation.pending}
          onClick={() => setIndex(index - 1)}
        >
          Previous step
        </ActionButton>
        {index < steps.length - 1 ? (
          <ActionButton onClick={() => setIndex(index + 1)}>
            Next step
          </ActionButton>
        ) : (
          <ActionButton
            disabled={mutation.pending}
            onClick={() => void setStatus("completed")}
          >
            Complete tour
          </ActionButton>
        )}
        <ActionButton
          disabled={mutation.pending}
          onClick={() => void setStatus("dismissed")}
        >
          Dismiss tour
        </ActionButton>
      </div>
    </Panel>
  );
}
