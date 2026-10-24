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
} from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { verifyProfileCapacity } from "@/features/portfolio/billing/public";
import { clientsKey } from "@/features/portfolio/index/public";
import { prospectForIdSchema, type Prospect } from "../contracts";
import { prospectKey } from "../queries";
import { searchLinkClients, type ClientChoice } from "./api";
import {
  newClientCommandRequest,
  newClientRecoveryContract,
  prepareNewClient,
  type NewClientAttempt,
  type NewClientReceipt,
} from "./new-client-command";

export function useNewClientConversion(record: Prospect) {
  const api = useApi(),
    cache = useQueryClient(),
    identity = useIdentity();
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
  const actorId = identity.data?.user.id,
    tenantId = identity.data?.tenant?.id;
  const allowed = Boolean(actor);
  const scope =
    actorId && tenantId
      ? JSON.stringify(["prospect-new-client", tenantId, actorId, record.id])
      : undefined;
  const lifetime = useRef<AbortController | null>(null),
    busy = useRef(false);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<NewClientAttempt | null>(null);
  const [receipt, setReceipt] = useState<NewClientReceipt>();
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [scope]);
  useEffect(() => {
    const controller = lifetime.current;
    let disposed = false;
    if (!allowed || !actorId || !tenantId || !scope || !controller) return;
    const session = { userId: actorId, tenantId };
    const guard = () => {
      if (disposed) throw new DOMException("Closed", "AbortError");
      controller.signal.throwIfAborted();
      assertClientWriter(cache, session);
    };
    void readRecovery(scope, newClientRecoveryContract, guard)
      .then((saved) => {
        guard();
        setPending(saved);
        setReady(true);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!disposed && !controller.signal.aborted) {
          setReady(false);
          setError(
            reason instanceof Error
              ? reason.message
              : "Conversion recovery unavailable.",
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [cache, scope, actorId, tenantId, allowed]);

  const action = useMutation({
    retry: false,
    mutationFn: async (
      input:
        | {
            kind: "create";
            website: string;
            description: string;
            duplicates: ClientChoice[];
          }
        | { kind: "recover" | "acknowledge" },
    ) => {
      const controller = lifetime.current;
      if (!actor || !scope || !ready || !controller || busy.current)
        throw new Error("Refresh your current account before continuing.");
      const guard = () => {
        controller.signal.throwIfAborted();
        assertClientWriter(cache, actor);
      };
      busy.current = true;
      try {
        await withRecoveryCommandLock(scope, guard, async () => {
          await verifyCoreWriter(api, actor, controller.signal, guard);
          const saved = await readRecovery(
            scope,
            newClientRecoveryContract,
            guard,
          );
          setPending(saved);
          if (input.kind === "create") {
            if (saved)
              throw new Error(
                "A prior conversion needs recovery. No new command was sent.",
              );
            const current = await api.request(
              "core",
              `business-development/prospects/${record.id}`,
              prospectForIdSchema(record.id),
              { signal: controller.signal },
            );
            guard();
            if (
              current.updatedAt !== record.updatedAt ||
              current.status !== "active" ||
              current.linkedClientId ||
              current.convertedAt
            )
              throw new Error(
                "The prospect changed. Close this review and reload it before converting.",
              );
            const duplicates = await searchLinkClients(
              api,
              record.displayName,
              controller.signal,
            );
            guard();
            if (
              JSON.stringify(duplicates.results) !==
              JSON.stringify(input.duplicates)
            )
              throw new Error(
                "Possible matching clients changed. Refresh and review them again.",
              );
            await verifyProfileCapacity(api, 1, guard, controller.signal);
            const prepared = await prepareNewClient(current, input);
            guard();
            const retained = await reserveRecovery(
              scope,
              prepared.command.requestId,
              prepared,
              newClientRecoveryContract,
              guard,
            );
            setPending(retained);
            if (retained.command.requestId !== prepared.command.requestId)
              throw new Error(
                "Another tab has a pending conversion. Recover it first.",
              );
            const value = await newClientCommandRequest(
              api,
              retained,
              "create",
              controller.signal,
              guard,
            );
            guard();
            setReceipt(value);
          } else {
            if (!saved)
              throw new Error(
                "No pending conversion is stored. Reopen this review.",
              );
            const value = await newClientCommandRequest(
              api,
              saved,
              "recover",
              controller.signal,
              guard,
            );
            if (input.kind === "acknowledge") {
              await acknowledgeRecovery(scope, saved.command.requestId, guard);
              setPending(null);
              setReceipt(undefined);
            } else setReceipt(value);
          }
        });
      } finally {
        busy.current = false;
        await Promise.all([
          cache.invalidateQueries({ queryKey: prospectKey(record.id) }),
          cache.invalidateQueries({ queryKey: ["prospects"] }),
          cache.invalidateQueries({ queryKey: clientsKey }),
        ]);
      }
    },
  });
  return {
    action,
    pending: actor ? pending : null,
    receipt: actor ? receipt : undefined,
    ready: Boolean(actor && ready),
    error,
  };
}
