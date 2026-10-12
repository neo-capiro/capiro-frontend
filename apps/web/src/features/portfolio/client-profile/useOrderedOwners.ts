"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileKey, profileReadKey } from "./profile-keys";
import { useProfileMemberOptions } from "./profile-read-queries";
import {
  currentProfileSource,
  profileSourceMatches,
  type ProfileSource,
} from "./profile-source";
import {
  ownerIds,
  readOrderedOwners,
  replaceOrderedOwners,
  sameOwnerOrder,
  type OrderedOwners,
  type OwnerAttempt,
} from "./ordered-owners";

type OwnerDraft = {
  base: OrderedOwners;
  source: ProfileSource;
  slots: string[];
};
const slotsFor = (ids: string[]) => [
  ...ids,
  ...Array<string>(4 - ids.length).fill(""),
];

export function useOrderedOwners(
  clientId: string,
  actor: ProfileActor | undefined,
) {
  const api = useApi();
  const cache = useQueryClient();
  const options = useProfileMemberOptions();
  const key = profileReadKey(clientId, "ordered-owners", actor);
  const attemptKey = profileReadKey(
    clientId,
    "owner-replacement-attempt",
    actor,
  );
  const [attempt, setAttempt] = useState<OwnerAttempt | null>(
    () => cache.getQueryData<OwnerAttempt | null>(attemptKey) ?? null,
  );
  const [draft, setDraft] = useState<OwnerDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(actor),
    retry: false,
    refetchOnMount: "always",
    queryFn: ({ signal }) => {
      if (!actor) throw new ApiError(403, "A current session is required.");
      return readOrderedOwners(api, clientId, actor, signal, () =>
        assertProfileActor(cache, actor),
      );
    },
  });
  const current =
    query.isSuccess && !query.error && !query.isFetching
      ? query.data
      : undefined;
  const source = actor ? currentProfileSource(cache, key) : undefined;
  const editable = Boolean(
    actor &&
    canAdminister(actor.role) &&
    current &&
    source &&
    options.source &&
    !pending &&
    !attempt,
  );
  const stale = Boolean(draft && !profileSourceMatches(cache, draft.source));
  const slots = draft?.slots ?? slotsFor(current ? ownerIds(current) : []);
  const remember = (value: OwnerAttempt | null) => {
    cache.setQueryDefaults(attemptKey, { gcTime: Infinity });
    cache.setQueryData(attemptKey, value);
    setAttempt(value);
  };
  function edit(index: number, value: string) {
    if (!editable || !current || !source) return;
    const next = [...slots];
    next[index] = value;
    setDraft({
      base: draft?.base ?? current,
      source: draft?.source ?? source,
      slots: next,
    });
    setError(null);
    setMessage("");
  }
  async function save() {
    if (
      !editable ||
      !actor ||
      !draft ||
      !options.source ||
      stale ||
      request.current
    )
      return;
    const ids = draft.slots.filter(Boolean);
    if (
      draft.slots.slice(0, ids.length).some((id) => !id) ||
      new Set(ids).size !== ids.length
    ) {
      setError(
        new Error(
          "Assign each preceding position and use each member only once. Clearing a position does not promote later owners.",
        ),
      );
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setMessage("");
    try {
      const receipt = await replaceOrderedOwners(
        api,
        cache,
        {
          actor,
          base: draft.base,
          source: draft.source,
          options: options.source,
        },
        { expectedVersion: draft.base.version, userIds: ids },
        controller.signal,
        remember,
      );
      if (!alive.current || controller.signal.aborted) return;
      cache.setQueryData(key, receipt);
      remember(null);
      setDraft(null);
      void cache.invalidateQueries({ queryKey: profileKey(clientId, "team") });
      void cache.invalidateQueries({ queryKey: ["account-owners"] });
      setMessage("Owner order saved. Account team is refreshing.");
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause
          : new Error("Owner order could not be confirmed."),
      );
      if (
        !ambiguousClientWrite(cause) &&
        !(cause instanceof ApiError && cause.status === 409)
      )
        remember(null);
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setPending(false);
    }
  }
  function reorder(from: number, to: number) {
    if (
      !editable ||
      !current ||
      !source ||
      stale ||
      !slots[from] ||
      to < 0 ||
      to >= slots.length
    )
      return;
    const next = [...slots];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setDraft({
      base: draft?.base ?? current,
      source: draft?.source ?? source,
      slots: next,
    });
    setError(null);
    setMessage("");
  }
  async function review() {
    if (!actor || pending || request.current) return;
    const [result] = await Promise.all([query.refetch(), options.refetch()]);
    if (!alive.current || !result.isSuccess || result.error) return;
    try {
      assertProfileActor(cache, actor);
      const fresh = currentProfileSource(cache, key);
      if (!fresh) return;
      const submitted = attempt ? slotsFor(attempt.userIds) : draft?.slots;
      const reflected =
        attempt &&
        result.data.version >= attempt.expectedVersion &&
        sameOwnerOrder(result.data, attempt.userIds);
      setDraft(
        submitted && !reflected
          ? { base: result.data, source: fresh, slots: [...submitted] }
          : null,
      );
      remember(null);
      setError(null);
      setMessage(
        reflected
          ? "Current owners match the submitted order. No replacement was resent."
          : "Current owners reloaded. Review the retained order and save deliberately; nothing was resent.",
      );
    } catch {
      /* Replacement identity owns its own editor. */
    }
  }
  return {
    current,
    slots,
    edit,
    reorder,
    save,
    review,
    draft,
    stale,
    pending,
    attempt,
    editable,
    options,
    error: error ?? query.error,
    message,
    loading: Boolean(actor) && (query.isPending || query.isFetching),
  };
}
