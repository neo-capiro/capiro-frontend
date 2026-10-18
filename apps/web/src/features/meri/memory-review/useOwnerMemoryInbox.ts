"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import {
  holdOwnerDecision,
  ownerDecisionHoldKey,
  readOwnerDecisionHolds,
  releaseOwnerDecision,
} from "./owner-decision-hold";
import {
  ownerReviewPaths,
  receiveOwnerCandidates,
  type OwnerMemoryCandidate,
} from "./owner-review";

export type OwnerInbox =
  | { state: "loading" }
  | { state: "ready"; candidates: OwnerMemoryCandidate[] }
  | { state: "error"; message: string };
export type OwnerDecision = "approve" | "reject";
type Holds = { key: string; ids: Set<string> | null };

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** UI lifecycle only. Core remains the source of pending state and final decisions. */
export function useOwnerMemoryInbox(enabled: boolean) {
  const { userId, orgId } = useAuth();
  const holdKey = ownerDecisionHoldKey(userId, orgId);
  const [inbox, setInbox] = useState<OwnerInbox>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  const [working, setWorking] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [holds, setHolds] = useState<Holds | null>(null);
  const pending = useRef<string | null>(null);
  const holdStatus =
    !holdKey || holds?.key !== holdKey
      ? "loading"
      : holds.ids
        ? "ready"
        : "unavailable";
  const uncertainIds: ReadonlySet<string> =
    holds?.key === holdKey && holds.ids ? holds.ids : new Set();

  useEffect(() => {
    if (!holdKey) return;
    const sync = () => {
      const storage = browserStorage();
      setHolds({
        key: holdKey,
        ids: storage ? readOwnerDecisionHolds(storage, holdKey) : null,
      });
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === holdKey || event.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [holdKey]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function read() {
      setInbox({ state: "loading" });
      try {
        const response = await fetch(ownerReviewPaths.list, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setInbox({ state: "error", message: readFailure(response.status) });
          return;
        }
        const value: unknown = await response.json();
        const candidates = receiveOwnerCandidates(value);
        if (!controller.signal.aborted)
          setInbox({ state: "ready", candidates });
      } catch {
        if (!controller.signal.aborted)
          setInbox({
            state: "error",
            message: "Memory reviews could not be verified. Try again.",
          });
      }
    }
    void read();
    return () => controller.abort();
  }, [enabled, revision]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  async function decide(
    candidate: OwnerMemoryCandidate,
    decision: OwnerDecision,
    reason?: string,
  ) {
    const id = candidate.id;
    const version = candidate.kind !== "addition";
    if (
      pending.current ||
      holdStatus !== "ready" ||
      uncertainIds.has(id) ||
      !holdKey
    )
      return;
    pending.current = id;
    const storage = browserStorage();
    if (!storage || !holdOwnerDecision(storage, holdKey, id)) {
      pending.current = null;
      setFeedback(
        "The decision was not sent. This browser could not safely reserve it; refresh before trying again.",
      );
      return;
    }
    setHolds({ key: holdKey, ids: readOwnerDecisionHolds(storage, holdKey) });
    setWorking(id);
    setFeedback("");
    const release = () => {
      if (releaseOwnerDecision(storage, holdKey, id))
        setHolds({
          key: holdKey,
          ids: readOwnerDecisionHolds(storage, holdKey),
        });
    };
    try {
      const response = await fetch(
        version
          ? ownerReviewPaths.versionDecision(id)
          : ownerReviewPaths.decision(id),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            version && decision === "reject"
              ? { decision, reason }
              : { decision },
          ),
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      if ([400, 404, 409].includes(response.status)) {
        release();
        setFeedback(
          "This proposal changed or is no longer pending. Refreshing the current list.",
        );
        refresh();
        return;
      }
      if (response.status === 401 || response.status === 403) {
        release();
        setFeedback(
          "Your current session cannot decide this proposal. Refresh access before continuing.",
        );
        return;
      }
      if (response.status === 503) {
        const failure: unknown = await response.json().catch(() => null);
        if (
          failure &&
          typeof failure === "object" &&
          "error" in failure &&
          failure.error &&
          typeof failure.error === "object" &&
          "outcome" in failure.error &&
          failure.error.outcome === "NOT_DISPATCHED"
        ) {
          release();
          setFeedback(
            "Memory review is unavailable. This decision was not submitted; try again after the connection is restored.",
          );
          return;
        }
      }
      if (!response.ok) throw new Error("Decision not confirmed");
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== "object" ||
        !("status" in result) ||
        (decision === "reject"
          ? result.status !== "rejected"
          : version
            ? !["activated", "duplicate", "conflict"].includes(
                String(result.status),
              )
            : result.status !== "approved")
      )
        throw new Error("Decision not confirmed");
      release();
      setFeedback(decisionFeedback(result.status));
      refresh();
    } catch {
      // A transport failure after dispatch may hide a committed decision. A
      // pending-list read alone cannot establish the terminal outcome. The
      // actor-scoped storage marker survives reload and is observed by other tabs.
      setFeedback(
        "The decision status is uncertain. Refresh the list; do not submit this decision again until its outcome is verified.",
      );
    } finally {
      pending.current = null;
      setWorking(null);
    }
  }

  return {
    inbox,
    feedback,
    working,
    holdStatus,
    uncertainIds,
    refresh,
    decide,
  };
}

function readFailure(status: number) {
  if (status === 401) return "Sign in again to review personal memory.";
  if (status === 403)
    return "Your current session is not authorized to read these proposals.";
  return "Core could not confirm your pending proposals. This is not an empty inbox; try again.";
}

function decisionFeedback(status: unknown): string {
  if (status === "conflict")
    return "This version opened a memory conflict. The controlling memory still needs review.";
  if (status === "duplicate")
    return "The existing memory was confirmed as the same version. Refreshing the current list.";
  if (status === "activated")
    return "The new memory version was activated. Refreshing the current list.";
  return `Memory proposal ${status}. Refreshing the current list.`;
}
