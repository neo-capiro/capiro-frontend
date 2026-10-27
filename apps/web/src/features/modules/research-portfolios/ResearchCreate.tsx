"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { currentClientWriter } from "../../../shared/portfolio/auth/client-writer";
import { useIdentity } from "../../../shared/portfolio/auth/identity";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import {
  ResearchPortfolioCreateIntent,
  type ResearchPortfolioCreateDraft,
  type ResearchPortfolioCreateScope,
} from "./create-intent";
import styles from "./research.module.css";

export function ResearchCreateAction({
  onCreated,
}: {
  onCreated: (portfolioId: string) => void;
}) {
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = currentClientWriter(cache);
  const scope =
    identity.isSuccess && !identity.isFetching && !identity.error && actor
      ? { tenantId: actor.tenantId, actorId: actor.userId }
      : undefined;
  if (!scope)
    return (
      <ActionButton
        disabled
        title="Verify your current account to create a portfolio"
      >
        + New portfolio
      </ActionButton>
    );
  return (
    <ScopedResearchCreate
      key={JSON.stringify([scope.tenantId, scope.actorId])}
      cache={cache}
      scope={scope}
      onCreated={onCreated}
    />
  );
}

function ScopedResearchCreate({
  cache,
  scope,
  onCreated,
}: {
  cache: QueryClient;
  scope: ResearchPortfolioCreateScope;
  onCreated: (portfolioId: string) => void;
}) {
  const api = useCapiro();
  const [intent] = useState(
    () => new ResearchPortfolioCreateIntent(scope, () => window.sessionStorage),
  );
  const [recovery, setRecovery] = useState<"loading" | "ready" | "blocked">(
    "loading",
  );
  const [creating, setCreating] = useState(false);
  const [pendingDraft, setPendingDraft] =
    useState<ResearchPortfolioCreateDraft | null>(null);
  const [name, setName] = useState("");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [purpose, setPurpose] = useState("");
  const [mode, setMode] =
    useState<ResearchPortfolioCreateDraft["mode"]>("manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const pending = intent.pendingDraft();
        const saved = pending ? null : intent.wizard();
        if (pending) {
          setName(pending.name);
          setPurpose(pending.purpose ?? "");
          setMode(pending.mode);
          setPendingDraft(pending);
          setStep(2);
          setCreating(true);
        }
        if (saved) {
          setName(saved.draft.name);
          setPurpose(saved.draft.purpose ?? "");
          setMode(saved.draft.mode);
          setStep(saved.step);
          setCreating(true);
        }
        setRecovery("ready");
      } catch {
        setRecovery("blocked");
        setError("The previous portfolio request cannot be safely recovered.");
        setCreating(true);
      }
    });
    return () => {
      active = false;
    };
  }, [intent]);

  function assertCurrent() {
    const current = currentClientWriter(cache);
    if (
      !current ||
      current.tenantId !== scope.tenantId ||
      current.userId !== scope.actorId
    )
      throw new Error("The current portfolio account is unavailable.");
  }

  async function create() {
    if (intent.busy || recovery !== "ready") return;
    setBusy(true);
    setError(undefined);
    try {
      const receipt = await intent.submit(
        { name, purpose: purpose || null, mode },
        async (body) => {
          intent.clearWizard();
          const result = await api.request("research.create", { body });
          if (result.actorUserId !== scope.actorId)
            throw new Error("Portfolio creation account mismatch.");
          return result;
        },
        assertCurrent,
      );
      setPendingDraft(null);
      setCreating(false);
      onCreated(receipt.portfolioId);
    } catch (failure) {
      try {
        setPendingDraft(intent.pendingDraft());
      } catch {
        setRecovery("blocked");
      }
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not confirm portfolio creation.",
      );
    } finally {
      setBusy(false);
    }
  }

  function abandon() {
    try {
      assertCurrent();
      intent.abandon();
      setPendingDraft(null);
      setName("");
      setPurpose("");
      setMode("manual");
      setStep(0);
      intent.clearWizard();
      setError(undefined);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not abandon the pending request.",
      );
    }
  }

  function retain(
    next: { name: string; purpose: string; mode: typeof mode },
    nextStep: 0 | 1 | 2 = step,
  ) {
    if (intent.busy || pendingDraft) return;
    try {
      assertCurrent();
      intent.saveWizard({
        draft: { ...next, purpose: next.purpose || null },
        step: nextStep,
      });
      setName(next.name);
      setPurpose(next.purpose);
      setMode(next.mode);
      setStep(nextStep);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not retain this draft.",
      );
      setRecovery("blocked");
    }
  }

  return (
    <>
      <ActionButton
        primary
        disabled={recovery !== "ready"}
        onClick={() => setCreating(true)}
      >
        + New portfolio
      </ActionButton>
      <Modal
        open={creating}
        onOpenChange={(open) => {
          if (!intent.busy) setCreating(open);
        }}
        title="New research portfolio"
        footer={
          <div className={styles.actions}>
            {step > 0 && !pendingDraft && (
              <ActionButton
                disabled={busy || recovery !== "ready"}
                onClick={() =>
                  retain({ name, purpose, mode }, (step - 1) as 0 | 1)
                }
              >
                Back
              </ActionButton>
            )}
            {step < 2 ? (
              <ActionButton
                primary
                disabled={busy || recovery !== "ready" || !name.trim()}
                onClick={() =>
                  retain({ name, purpose, mode }, (step + 1) as 1 | 2)
                }
              >
                Next
              </ActionButton>
            ) : (
              <ActionButton
                primary
                disabled={busy || recovery !== "ready" || !name.trim()}
                onClick={create}
              >
                {pendingDraft ? "Retry portfolio request" : "Create portfolio"}
              </ActionButton>
            )}
          </div>
        }
      >
        <div className={styles.form}>
          <p role="status">
            Step {step + 1} of 3 ·{" "}
            {step === 0
              ? "Portfolio details"
              : step === 1
                ? "Membership"
                : "Review and create"}
          </p>
          {pendingDraft && (
            <p role="alert">
              The previous create result is unknown. Retry these exact details
              to confirm it. Starting a different request may create a second
              portfolio.
            </p>
          )}
          {step === 0 && (
            <>
              <Field label="Name" htmlFor="new-portfolio-name">
                <TextInput
                  id="new-portfolio-name"
                  disabled={busy || recovery !== "ready" || !!pendingDraft}
                  value={name}
                  maxLength={240}
                  onChange={(event) => {
                    retain({ name: event.target.value, purpose, mode });
                  }}
                />
              </Field>
              <Field label="Purpose" htmlFor="new-portfolio-purpose">
                <TextArea
                  id="new-portfolio-purpose"
                  disabled={busy || recovery !== "ready" || !!pendingDraft}
                  value={purpose}
                  maxLength={4000}
                  onChange={(event) => {
                    retain({ name, purpose: event.target.value, mode });
                  }}
                />
              </Field>
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Mode" htmlFor="new-portfolio-mode">
                <select
                  id="new-portfolio-mode"
                  className={styles.select}
                  disabled={busy || recovery !== "ready" || !!pendingDraft}
                  value={mode}
                  onChange={(event) => {
                    retain({
                      name,
                      purpose,
                      mode: event.target
                        .value as ResearchPortfolioCreateDraft["mode"],
                    });
                  }}
                >
                  {["manual", "rules", "hybrid"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <p>
                Manual membership keeps your explicit selections. Rules
                membership uses published rule results. Hybrid membership
                combines rules with your manual decisions. Add subjects and
                preview rules after creation.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <dl>
                <dt>Name</dt>
                <dd>{name}</dd>
                <dt>Purpose</dt>
                <dd>{purpose || "Not specified"}</dd>
                <dt>Membership mode</dt>
                <dd>{mode}</dd>
              </dl>
              <p>
                This creates an empty portfolio owned by your current account.
                No clients, sharing links or subscriptions are added.
              </p>
            </>
          )}
          {pendingDraft && (
            <ActionButton disabled={busy} onClick={abandon}>
              Abandon pending request and start different details
            </ActionButton>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
