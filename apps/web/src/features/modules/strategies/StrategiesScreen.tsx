"use client";
import { StrategiesLibrary } from "./StrategiesLibrary";

import { useRouter, useSearchParams } from "next/navigation";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { strategyId } from "../../../shared/capiro/operations/strategies-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  readStrategyNavigation,
  strategyHref,
  type StrategyView as View,
} from "../../../shared/capiro/strategy-navigation";
import {
  ActionButton,
  SelectInput,
  StatusPanel,
} from "../../../shared/module-ui";
import { StrategyContext } from "./context/StrategyContext";
import { StrategyReview } from "./review/StrategyReview";
import { StrategyRuns } from "./runs/StrategyRuns";
import styles from "./strategies.module.css";
import { StrategyCreate } from "./StrategyCreate";
import { StrategyTimeline } from "./StrategyTimeline";

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
  const router = useRouter();
  const selection = readStrategyNavigation(
    new URLSearchParams(searchParams.toString()),
  );
  const { clientId, view, creating, linked, stepId } = selection;
  const invalid =
    selection.invalid ||
    Boolean(clientId && !strategyId.safeParse(clientId).success) ||
    (linked &&
      (!strategyId.safeParse(selection.strategyId).success || !clientId)) ||
    (stepId !== undefined && !strategyId.safeParse(stepId).success);
  const clients = useCapiroQuery(
    "clients.list",
    {},
    { enabled: !linked && !invalid },
  );
  const navigate = (next: Parameters<typeof strategyHref>[0]) =>
    router.push(strategyHref(next, searchParams.toString()));
  const setView = (view: View) => navigate({ clientId, view });
  const create = () => navigate({ clientId, create: true });
  const open = (id: string, clientId: string) =>
    navigate({ clientId, strategyId: id, view });
  const close = () =>
    router.replace(strategyHref({ clientId, view }, searchParams.toString()));
  if (invalid)
    return (
      <>
        <StatusPanel error="This Strategy link is invalid." />
        <ActionButton
          onClick={() =>
            router.replace(strategyHref({}, searchParams.toString()))
          }
        >
          Dismiss Strategy link
        </ActionButton>
      </>
    );
  if (linked)
    return (
      <CurrentStrategyLink
        key={searchParams.toString()}
        id={selection.strategyId!}
        clientId={clientId}
        stepId={stepId}
        onClose={close}
        onStepClose={() =>
          router.replace(
            strategyHref(
              { clientId, strategyId: selection.strategyId, view },
              searchParams.toString(),
            ),
          )
        }
      />
    );
  return (
    <section
      key={clientId}
      className={styles.screen}
      data-design-node="411:119498"
    >
      <div className={styles.scope}>
        <SelectInput
          aria-label="Strategy client scope"
          value={clientId}
          disabled={clients.loading || Boolean(clients.error)}
          onValueChange={(clientId) => navigate({ clientId, view })}
          options={[
            { value: "", label: "All clients" },
            ...(clientId &&
            !clients.data?.some((client) => client.id === clientId)
              ? [
                  {
                    value: clientId,
                    label: clients.loading
                      ? "Checking selected client"
                      : "Selected client unavailable",
                  },
                ]
              : []),
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
            <ActionButton primary onClick={create}>
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
          key={clientId}
          clientId={clientId}
          onOpen={open}
          onCreate={create}
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
          key={clientId}
          initialClientId={clientId}
          onClose={close}
          onCreated={(strategy) =>
            router.replace(
              strategyHref(
                { clientId: strategy.clientId, strategyId: strategy.id, view },
                searchParams.toString(),
              ),
            )
          }
        />
      )}
    </section>
  );
}

function CurrentStrategyLink({
  id,
  clientId,
  stepId,
  onClose,
  onStepClose,
}: {
  id: string;
  clientId: string;
  stepId?: string;
  onClose: () => void;
  onStepClose: () => void;
}) {
  const scope = useSelectedClient();
  const authorized =
    scope.state === "authorized-client" && scope.client.id === clientId;
  if (!authorized)
    return (
      <>
        <StatusPanel
          loading={scope.state === "loading"}
          error={
            scope.state === "loading"
              ? undefined
              : "This Strategy is unavailable in the selected client scope."
          }
        />
        <ActionButton onClick={onClose}>Dismiss Strategy link</ActionButton>
      </>
    );
  return (
    <StrategyTimeline
      id={id}
      expectedClientId={clientId}
      requestedStepId={stepId}
      onClose={onClose}
      onStepClose={onStepClose}
    />
  );
}
