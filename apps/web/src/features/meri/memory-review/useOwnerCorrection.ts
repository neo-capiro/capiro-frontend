"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import {
  holdOwnerDecision,
  readOwnerDecisionHolds,
  releaseOwnerDecision,
} from "./owner-decision-hold";
import {
  ownerCorrectionHoldKey,
  ownerCorrectionPaths,
  receiveCorrectionReceipt,
  receiveOwnerCorrectionPage,
  type OwnerCorrectionItem,
} from "./owner-correction";
import { ownerReviewPaths } from "./owner-review";

type ItemsState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | {
      state: "ready";
      items: OwnerCorrectionItem[];
      nextCursor: string | null;
      moreLoading: boolean;
      moreError: string | null;
    };

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function readPage(cursor: string | null, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: "25" });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`${ownerCorrectionPaths.items}?${query}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!response.ok)
    throw new Error("Core did not verify personal memory items");
  return receiveOwnerCorrectionPage(await response.json());
}

/** Browser state only; Core selects and authorizes the exact controlling row. */
export function useOwnerCorrection(enabled: boolean) {
  const { userId, orgId } = useAuth();
  const holdKey = ownerCorrectionHoldKey(userId, orgId);
  const [items, setItems] = useState<ItemsState>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  const [holds, setHolds] = useState<{
    key: string;
    ids: Set<string> | null;
  } | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const pending = useRef(false);
  const morePending = useRef(false);
  const generation = useRef(0);
  const holdsReady = !!holdKey && holds?.key === holdKey && !!holds.ids;
  const holdStatus =
    !holdKey || holds?.key !== holdKey
      ? "loading"
      : holds.ids
        ? "ready"
        : "unavailable";
  const unknownIds: ReadonlySet<string> =
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
    const current = ++generation.current;
    const generationRef = generation;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (generationRef.current === current) setItems({ state: "loading" });
    });
    void readPage(null, controller.signal)
      .then((page) => {
        if (generation.current === current)
          setItems({
            state: "ready",
            ...page,
            moreLoading: false,
            moreError: null,
          });
      })
      .catch(() => {
        if (generation.current === current && !controller.signal.aborted)
          setItems({
            state: "error",
            message:
              "Core could not verify your current personal memories. Try again.",
          });
      });
    return () => {
      generationRef.current++;
      controller.abort();
    };
  }, [enabled, userId, orgId, revision]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  async function loadMore() {
    if (
      items.state !== "ready" ||
      !items.nextCursor ||
      items.moreLoading ||
      morePending.current
    )
      return;
    morePending.current = true;
    const cursor = items.nextCursor;
    const current = generation.current;
    setItems({ ...items, moreLoading: true, moreError: null });
    try {
      const page = await readPage(cursor);
      if (generation.current !== current) return;
      if (page.nextCursor === cursor)
        throw new Error("Core repeated a memory page cursor");
      setItems((before) => {
        if (before.state !== "ready" || before.nextCursor !== cursor)
          return before;
        const known = new Set(before.items.map((item) => item.id));
        return {
          state: "ready",
          items: [
            ...before.items,
            ...page.items.filter((item) => !known.has(item.id)),
          ],
          nextCursor: page.nextCursor,
          moreLoading: false,
          moreError: null,
        };
      });
    } catch {
      if (generation.current === current)
        setItems((before) =>
          before.state === "ready"
            ? {
                ...before,
                moreLoading: false,
                moreError:
                  "More personal memories could not be verified. Try again.",
              }
            : before,
        );
    } finally {
      morePending.current = false;
    }
  }

  async function propose(item: OwnerCorrectionItem, newContent: string) {
    if (
      !enabled ||
      pending.current ||
      !holdsReady ||
      !holdKey ||
      unknownIds.has(item.id) ||
      !newContent.trim() ||
      newContent.trim() === item.value.trim() ||
      newContent.trim().length > 8_000
    )
      return "held" as const;
    pending.current = true;
    const storage = browserStorage();
    if (!storage || !holdOwnerDecision(storage, holdKey, item.id)) {
      pending.current = false;
      setFeedback(
        "The correction was not sent. This browser could not preserve an uncertain result.",
      );
      return "held" as const;
    }
    const release = () => {
      if (releaseOwnerDecision(storage, holdKey, item.id))
        setHolds({
          key: holdKey,
          ids: readOwnerDecisionHolds(storage, holdKey),
        });
    };
    setHolds({ key: holdKey, ids: readOwnerDecisionHolds(storage, holdKey) });
    setWorkingId(item.id);
    setFeedback("");
    try {
      const response = await fetch(ownerReviewPaths.correction(item.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newContent: newContent.trim(),
          expectedUpdatedAt: item.updatedAt,
        }),
        credentials: "same-origin",
        cache: "no-store",
      });
      if ([400, 401, 403, 404, 409].includes(response.status)) {
        release();
        setFeedback(
          "Core declined this correction. Refresh the current memory before trying again.",
        );
        return "declined" as const;
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
            "Memory correction is unavailable. This proposal was not submitted.",
          );
          return "declined" as const;
        }
      }
      if (!response.ok) throw new Error("Correction result uncertain");
      receiveCorrectionReceipt(await response.json());
      release();
      setFeedback(
        "Correction submitted for review. The current memory remains unchanged; refresh your review inbox to see the proposal.",
      );
      refresh();
      return "confirmed" as const;
    } catch {
      setFeedback(
        "The correction outcome is uncertain. This item is held in this browser; do not resubmit until its Core outcome is verified.",
      );
      return "uncertain" as const;
    } finally {
      pending.current = false;
      setWorkingId(null);
    }
  }

  return {
    items,
    refresh,
    loadMore,
    propose,
    workingId,
    feedback,
    holdStatus,
    unknownIds,
  };
}
