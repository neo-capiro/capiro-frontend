"use client";
import {
  reconcileSettingsWrite,
  settingsWriteNeedsReadback,
} from "./security-write-reconciliation";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type { CapiroApi } from "../../shared/capiro/http";
import { capiroOperations } from "../../shared/capiro/registry";
import { useSettingsAction } from "./useSettingsAction";
import { assertTeamWriteAllowed } from "./team-permissions";
import {
  clearSettingsWrite,
  persistSettingsWrite,
  restoreSettingsWrite,
  settingsRequestHash,
  retainSettingsResult,
} from "./security-write-journal";
import {
  assertSettingsReceipt,
  isDefiniteSettingsRejection,
  snapshotSettingsWrite,
  uncertainSettingsWrite,
  type SettingsWrite,
} from "./security-writes";

type Api = CapiroApi<typeof capiroOperations>;
/** Settings recovery uses the existing session cache plus nonsecret, nonreplayable recovery metadata. */
export function useSettingsMutation(section: string) {
  const raw = useCapiro();
  const cache = useQueryClient();
  const { userId, sessionId, orgId } = useAuth();
  const storageKey = `capiro:settings-write:v1:${JSON.stringify([userId, sessionId, orgId, section])}`;
  const scope = useMemo(
    () => ({ raw, section, storageKey }),
    [raw, section, storageKey],
  );
  const action = useSettingsAction(scope);
  const journalKey = useMemo(
    () => ["settings-security-write", storageKey],
    [storageKey],
  );
  useMemo(() => {
    cache.setQueryDefaults(journalKey, { gcTime: Infinity });
    if (typeof window !== "undefined" && !cache.getQueryData(journalKey)) {
      const retained = restoreSettingsWrite(window.sessionStorage, storageKey);
      if (retained) cache.setQueryData(journalKey, retained);
    }
  }, [cache, journalKey, storageKey]);
  const clear = (write: SettingsWrite) => {
    clearSettingsWrite(window.sessionStorage, storageKey, write);
    if (
      cache.getQueryData<SettingsWrite>(journalKey)?.attemptId ===
      write.attemptId
    )
      cache.removeQueries({ queryKey: journalKey, exact: true });
  };
  const api = useMemo<Api>(
    () => ({
      ...raw,
      request: async (operation, input, options) => {
        if (capiroOperations[operation].method === "GET")
          return raw.request(operation, input, options);
        if (!userId || !sessionId)
          throw new Error(
            "Your sign-in must be verified before changing settings.",
          );
        if (cache.getQueryData<SettingsWrite>(journalKey))
          throw new Error(uncertainSettingsWrite);
        options?.signal?.throwIfAborted();
        const captured = structuredClone(input);
        const write = snapshotSettingsWrite(operation, captured);
        cache.setQueryData(journalKey, write);
        let dispatched = false;
        let accepted = false;
        try {
          if (
            operation === "me.update" ||
            operation === "me.emailSignature.update" ||
            operation === "settings.branding.update" ||
            operation === "settings.support.create" ||
            operation === "settings.contact.update"
          ) {
            const identity = await raw.request("me.read", {}, options);
            write.expectedAccount = {
              userId: identity.user.id,
              tenantId: identity.tenant.id,
            };
            if (operation === "settings.contact.update")
              write.inputFields = Object.keys(write.input.body ?? {});
          }
          if (operation.startsWith("settings.team."))
            await assertTeamWriteAllowed(raw, operation, write.input, options);
          if (operation === "settings.team.resend") {
            const invitations = await raw.request(
              "settings.team.invitations",
              {},
              options,
            );
            const invitation = invitations.find(
              (entry) => entry.id === write.input.params?.invitationId,
            );
            if (!invitation)
              throw new Error(
                "The invitation is no longer available. Reload the team before trying again.",
              );
            write.expectedInvitation = {
              email: invitation.email,
              role: invitation.role,
            };
          }
          await persistSettingsWrite(
            window.sessionStorage,
            storageKey,
            write,
            captured,
          );
          options?.signal?.throwIfAborted();
          dispatched = true;
          const result = await raw.request(operation, captured, options);
          accepted = true;
          options?.signal?.throwIfAborted();
          assertSettingsReceipt(write, result);
          if (operation === "me.emailSignature.update") {
            write.resultHash = await settingsRequestHash(result);
            retainSettingsResult(window.sessionStorage, storageKey, write);
          }
          if (
            settingsWriteNeedsReadback(operation) &&
            !(await reconcileSettingsWrite(
              raw,
              write,
              options?.signal ?? new AbortController().signal,
            ))
          )
            throw new Error(uncertainSettingsWrite);
          clearSettingsWrite(window.sessionStorage, storageKey, write);
          if (
            cache.getQueryData<SettingsWrite>(journalKey)?.attemptId ===
            write.attemptId
          )
            cache.removeQueries({ queryKey: journalKey, exact: true });
          return result;
        } catch (error) {
          if (
            !dispatched ||
            (!accepted && isDefiniteSettingsRejection(error))
          ) {
            clearSettingsWrite(window.sessionStorage, storageKey, write);
            if (
              cache.getQueryData<SettingsWrite>(journalKey)?.attemptId ===
              write.attemptId
            )
              cache.removeQueries({ queryKey: journalKey, exact: true });
          } else if (
            cache.getQueryData<SettingsWrite>(journalKey)?.attemptId ===
            write.attemptId
          )
            cache.setQueryData(journalKey, { ...write, state: "unknown" });
          throw !dispatched || (!accepted && isDefiniteSettingsRejection(error))
            ? error
            : new Error(uncertainSettingsWrite);
        }
      },
    }),
    [raw, cache, journalKey, storageKey, userId, sessionId],
  );
  const pending = useSyncExternalStore(
    useCallback((notify) => cache.getQueryCache().subscribe(notify), [cache]),
    useCallback(
      () => cache.getQueryData<SettingsWrite>(journalKey),
      [cache, journalKey],
    ),
    () => undefined,
  );
  const reconcile = () =>
    action.run(
      async (signal) => {
        const write = cache.getQueryData<SettingsWrite>(journalKey);
        if (!write || !(await reconcileSettingsWrite(raw, write, signal)))
          throw new Error(uncertainSettingsWrite);
        signal.throwIfAborted();
        clear(write);
        return write.operation;
      },
      (operation) =>
        operation === "settings.support.create"
          ? "Report saved for HQ review."
          : "The recorded target now has the requested state. Review it before making another change.",
    );
  return { api, action, pending, reconcile, locked: action.busy || !!pending };
}
