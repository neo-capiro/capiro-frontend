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
        if (pending) {
          setName(pending.name);
          setPurpose(pending.purpose ?? "");
          setMode(pending.mode);
          setPendingDraft(pending);
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
      setError(undefined);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not abandon the pending request.",
      );
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
          <ActionButton
            primary
            disabled={busy || recovery !== "ready" || !name.trim()}
            onClick={create}
          >
            {pendingDraft ? "Retry portfolio request" : "Create portfolio"}
          </ActionButton>
        }
      >
        <div className={styles.form}>
          {pendingDraft && (
            <p role="alert">
              The previous create result is unknown. Retry these exact details
              to confirm it. Starting a different request may create a second
              portfolio.
            </p>
          )}
          <Field label="Name" htmlFor="new-portfolio-name">
            <TextInput
              id="new-portfolio-name"
              disabled={busy || recovery !== "ready" || !!pendingDraft}
              value={name}
              maxLength={240}
              onChange={(event) => {
                if (!intent.busy) setName(event.target.value);
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
                if (!intent.busy) setPurpose(event.target.value);
              }}
            />
          </Field>
          <Field label="Mode" htmlFor="new-portfolio-mode">
            <select
              id="new-portfolio-mode"
              className={styles.select}
              disabled={busy || recovery !== "ready" || !!pendingDraft}
              value={mode}
              onChange={(event) => {
                if (!intent.busy)
                  setMode(
                    event.target.value as ResearchPortfolioCreateDraft["mode"],
                  );
              }}
            >
              {["manual", "rules", "hybrid"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
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
