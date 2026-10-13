"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQueryClient, notifyManager } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { assertPreferenceActor, type PreferenceActor } from "./personal-access";
import { type AlertDraft } from "./contracts";
import {
  personalPreferencesKey,
  capturePreferenceReview,
  assertPreferenceReview,
  assertPreferenceClient,
  type PersonalPreferencesSource,
} from "./personal-queries";
import {
  personalBody,
  personalDraft,
  personalSignature,
  personalPreferencesPath,
  personalPreferencesSchema,
  assertSavedPreferences,
  type PersonalPreferences,
} from "./personal-contracts";
import {
  watchPreferenceInputs,
  type PreferenceInputAttempt,
} from "./preference-write-lifetime";

type EditorStatus = {
  phase: "idle" | "saving" | "saved" | "unconfirmed" | "refused" | "reloading";
  error: Error | null;
  expired: boolean;
};
const idle: EditorStatus = { phase: "idle", error: null, expired: false };
function editorError(error: unknown) {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    if (
      first?.path[0] === "quietHoursStart" ||
      first?.path[0] === "quietHoursEnd"
    )
      return new Error(
        "Use a time from 0:00 to 23:59 for quiet hours, or leave it blank.",
      );
    if (first?.path[0] === "jurisdictions")
      return new Error(
        "Separate jurisdiction codes with commas; each code can contain at most two characters.",
      );
    return new Error(first?.message ?? "Review the alert preferences.");
  }
  return error instanceof Error
    ? error
    : new Error("The preferences could not be saved.");
}

/** Owns one personal draft and its read/write receipt lifetime, never delivery. */
export function usePreferenceEditor({
  initial,
  source,
  owner,
  clientId,
  clientCurrent,
}: {
  initial: PersonalPreferences;
  source: PersonalPreferencesSource;
  owner: PreferenceActor;
  clientId: string;
  clientCurrent: boolean;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(() => personalDraft(initial, owner));
  const [status, setStatus] = useState<EditorStatus>(idle);
  const lifetime = useRef({ active: false });
  const pending = useRef<AbortController | null>(null);
  const inputs = useRef<PreferenceInputAttempt | null>(null);
  const key = personalPreferencesKey(clientId, owner);

  useLayoutEffect(() => {
    const scope = { active: true };
    lifetime.current = scope;
    const expire = notifyManager.batchCalls(() =>
      setStatus({ ...idle, expired: true }),
    );
    const unsubscribe = watchPreferenceInputs(
      cache,
      clientId,
      owner,
      () => inputs.current,
      () => {
        if (scope.active) {
          scope.active = false;
          pending.current?.abort();
          pending.current = null;
          inputs.current = null;
          expire();
        }
      },
    );
    return () => {
      scope.active = false;
      pending.current?.abort();
      pending.current = null;
      inputs.current = null;
      unsubscribe();
    };
  }, [cache, owner, clientId]);

  const current = clientCurrent && source.isSuccess && !source.error;
  const changed = Boolean(
    source.data &&
    personalSignature(source.data, owner) !==
      personalSignature(baseline, owner),
  );
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(personalDraft(baseline, owner));
  const busy = status.phase === "saving" || status.phase === "reloading";
  const needsReload =
    status.phase === "unconfirmed" || status.phase === "refused" || changed;
  const canSave =
    current &&
    !source.isFetching &&
    source.current &&
    !busy &&
    !needsReload &&
    !status.expired &&
    dirty;

  function edit(patch: Partial<AlertDraft>) {
    if (pending.current || status.expired) return;
    setDraft((value) => ({ ...value, ...patch }));
    if (status.phase !== "unconfirmed" && status.phase !== "refused")
      setStatus(idle);
  }
  function accept(record: PersonalPreferences) {
    setBaseline(record);
    setDraft(personalDraft(record, owner));
  }
  function assertCurrent(
    scope: { active: boolean },
    controller: AbortController,
  ) {
    controller.signal.throwIfAborted();
    if (
      !scope.active ||
      lifetime.current !== scope ||
      pending.current !== controller
    )
      throw new DOMException(
        "This preference editor is no longer current.",
        "AbortError",
      );
    assertPreferenceActor(cache, owner);
    assertPreferenceClient(cache, clientId, owner);
  }

  async function save() {
    if (!canSave || pending.current) return;
    const scope = lifetime.current;
    const controller = new AbortController();
    pending.current = controller;
    let dispatched = false;
    let received = false;
    try {
      assertCurrent(scope, controller);
      const review = capturePreferenceReview(cache, clientId, owner, baseline);
      inputs.current = {
        controller,
        parent: review.parent,
        review,
        ownInvalidation: true,
      };
      const body = personalBody(draft, baseline, owner);
      // Reopening after a lost response must read the server again. No PUT retry.
      void cache.invalidateQueries({ queryKey: key, refetchType: "none" });
      inputs.current.ownInvalidation = false;
      assertCurrent(scope, controller);
      setStatus({ ...idle, phase: "saving" });
      dispatched = true;
      const receipt = await api.request(
        owner.backend,
        personalPreferencesPath(clientId, owner),
        personalPreferencesSchema(clientId, owner),
        { method: "PUT", body, signal: controller.signal },
      );
      received = true;
      assertCurrent(scope, controller);
      assertPreferenceReview(cache, clientId, owner, review, true);
      assertSavedPreferences(receipt, draft, baseline, owner);
      inputs.current = null;
      cache.setQueryData(key, receipt);
      accept(receipt);
      setStatus({ ...idle, phase: "saved" });
    } catch (error) {
      if (scope.active && pending.current === controller) {
        const uncertain =
          dispatched && (received || ambiguousClientWrite(error));
        setStatus({
          ...idle,
          phase: uncertain ? "unconfirmed" : dispatched ? "refused" : "idle",
          error: editorError(error),
        });
      }
    } finally {
      if (inputs.current?.controller === controller) inputs.current = null;
      if (pending.current === controller) pending.current = null;
    }
  }

  async function reload() {
    if (pending.current || status.expired) return;
    const scope = lifetime.current;
    const controller = new AbortController();
    pending.current = controller;
    setStatus({ ...status, phase: "reloading", error: null });
    try {
      assertCurrent(scope, controller);
      inputs.current = {
        controller,
        parent: assertPreferenceClient(cache, clientId, owner),
        ownInvalidation: false,
      };
      const result = await source.refetch();
      assertCurrent(scope, controller);
      if (!result.isSuccess || result.error)
        throw (
          result.error ?? new Error("Saved preferences could not be reloaded.")
        );
      capturePreferenceReview(cache, clientId, owner, result.data);
      accept(result.data);
      setStatus(idle);
    } catch (error) {
      if (scope.active && pending.current === controller)
        setStatus({ ...status, error: editorError(error) });
    } finally {
      if (inputs.current?.controller === controller) inputs.current = null;
      if (pending.current === controller) pending.current = null;
    }
  }
  return {
    baseline,
    draft,
    status,
    current,
    changed,
    dirty,
    busy,
    needsReload,
    canSave,
    edit,
    save,
    reload,
    acceptChannelReceipt: accept,
  };
}
