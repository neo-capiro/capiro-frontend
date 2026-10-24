"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  notifyManager,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  retireMemberNoteRefusalRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { createMemberNote, recoverMemberNote } from "./api";
import {
  memberNoteRefusal,
  prepareMemberNote,
  type RetainedNote,
} from "./command";
import { memberDetailSchema } from "../directory-contracts";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  memberNoteRecoveryContract,
  memberNoteRecoveryScope,
} from "./recovery";
import {
  memberNotesKey,
  type MemberReference,
  type MemberNoteReceipt,
} from "./contracts";

export function useMemberNote(
  member: MemberReference,
  onSaved?: (receipt: MemberNoteReceipt) => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  useSyncExternalStore(
    (notify) => {
      const batched = notifyManager.batchCalls(notify);
      return cache.getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.query.queryKey[0] === "identity")
          batched();
      });
    },
    () => cache.getQueryState(["identity"]),
    () => undefined,
  );
  const actor = currentClientWriter(cache);
  const [session] = useState<ClientWriter | undefined>(() =>
    identity.data?.tenant?.id && identity.data.user.id
      ? { tenantId: identity.data.tenant.id, userId: identity.data.user.id }
      : undefined,
  );
  const sameActor = Boolean(
    actor &&
    actor.tenantId === session?.tenantId &&
    actor.userId === session.userId,
  );
  const scope = session
    ? memberNoteRecoveryScope(session, member.id)
    : undefined;
  const lifetime = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState<RetainedNote | null>(null);
  const [receipt, setReceipt] = useState<MemberNoteReceipt>();
  const [recoveryError, setRecoveryError] = useState("");
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [member.id, session]);
  useEffect(() => {
    const controller = lifetime.current;
    if (!session || !scope || !sameActor || !controller) return;
    let disposed = false;
    const guard = () => {
      if (disposed) throw new DOMException("View closed", "AbortError");
      controller.signal.throwIfAborted();
      assertClientWriter(cache, session);
    };
    void readRecovery(scope, memberNoteRecoveryContract, guard)
      .then((saved) => {
        guard();
        setAttempt(saved);
        setLoaded(true);
        setRecoveryError("");
      })
      .catch((error: unknown) => {
        if (!disposed && !controller.signal.aborted) {
          setLoaded(false);
          setRecoveryError(
            error instanceof Error
              ? error.message
              : "Saved note recovery is unavailable.",
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [cache, sameActor, scope, session]);

  const execute = async (
    action: "save" | "recover" | "acknowledge" | "retire-refusal",
    text = "",
  ) => {
    const controller = lifetime.current;
    if (
      !loaded ||
      !session ||
      !scope ||
      !sameActor ||
      !controller ||
      busy.current
    )
      throw new Error(
        "Review this note with a current session before continuing.",
      );
    const guard = () => {
      controller.signal.throwIfAborted();
      assertClientWriter(cache, session);
    };
    busy.current = true;
    try {
      return await withRecoveryCommandLock(scope, guard, async () => {
        await verifyCoreWriter(api, session, controller.signal, guard);
        const saved = await readRecovery(
          scope,
          memberNoteRecoveryContract,
          guard,
        );
        setAttempt(saved);
        if (action === "save") {
          if (saved)
            throw new Error(
              "A prior note save needs recovery. No new note was sent.",
            );
          const prepared = await prepareMemberNote(session, member, text);
          guard();
          const value = await createMemberNote(
            api,
            session,
            prepared,
            guard,
            controller.signal,
            async () => {
              const reserved = await reserveRecovery(
                scope,
                prepared.input.requestId,
                prepared,
                memberNoteRecoveryContract,
                guard,
              );
              setAttempt(reserved);
              if (reserved.input.requestId !== prepared.input.requestId)
                throw new Error(
                  "Another tab has a pending note. Recover that save first.",
                );
            },
          ).catch(async (error: unknown) => {
            const refusal = memberNoteRefusal(error, prepared);
            if (refusal) {
              guard();
              const refused = { ...prepared, refusal };
              await updateRecovery(
                scope,
                prepared.input.requestId,
                refused,
                memberNoteRecoveryContract,
                guard,
              );
              guard();
              setAttempt(refused);
            }
            throw error;
          });
          guard();
          setReceipt(value);
          onSaved?.(value);
          return;
        }
        if (!saved)
          throw new Error(
            "The saved note was already acknowledged. Reopen this form.",
          );
        if (action === "retire-refusal") {
          const failure = saved.refusal;
          if (
            !failure ||
            !memberNoteRefusal(
              new ApiError(failure.status, failure.message, failure),
              saved,
            )
          )
            throw new Error(
              "This note has no verified refusal. Recover its exact receipt.",
            );
          await api.request(
            "core",
            `directory/members/${encodeURIComponent(member.id)}`,
            memberDetailSchema.refine((value) => value.id === member.id),
            { signal: controller.signal },
          );
          guard();
          await retireMemberNoteRefusalRecovery(
            scope,
            saved.input.requestId,
            failure,
            guard,
          );
          guard();
          setAttempt(null);
          setReceipt(undefined);
          return;
        }
        const value = await recoverMemberNote(
          api,
          session,
          saved,
          guard,
          controller.signal,
        );
        guard();
        if (action === "acknowledge") {
          await acknowledgeRecovery(scope, saved.input.requestId, guard);
          guard();
          setAttempt(null);
          setReceipt(undefined);
        } else {
          setReceipt(value);
          onSaved?.(value);
        }
      });
    } finally {
      busy.current = false;
      await cache.invalidateQueries({
        queryKey: memberNotesKey(session.tenantId, session.userId, member.id),
      });
    }
  };
  const mutation = useMutation({
    retry: false,
    mutationFn: (text: string) => execute("save", text),
  });
  const recovery = useMutation({
    retry: false,
    mutationFn: (action: "recover" | "acknowledge" | "retire-refusal") =>
      execute(action),
  });
  return {
    mutation,
    recovery,
    uncertain: sameActor && Boolean(attempt) && !attempt?.refusal && !receipt,
    refusal: sameActor ? attempt?.refusal : undefined,
    receipt: sameActor ? receipt : undefined,
    retainedText: sameActor ? attempt?.input.body : undefined,
    recoveryError,
    canWrite: Boolean(
      sameActor && loaded && !attempt && !receipt && !recovery.isPending,
    ),
    checkingIdentity:
      identity.isPending ||
      identity.isFetching ||
      (sameActor && !loaded && !recoveryError),
    identityError: identity.error,
    retryIdentity: () => void identity.refetch(),
  };
}
