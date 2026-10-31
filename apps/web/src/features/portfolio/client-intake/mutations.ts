"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  billingStateKey,
  verifyProfileCapacity,
} from "@/features/portfolio/billing/public";
import {
  clientsKey,
  clientKey,
  type Client,
} from "@/features/portfolio/index/public";
import { publishClientReceipt } from "@/features/portfolio/clients/public";
import { useCurrentActor } from "@/shared/portfolio/auth/current-actor";
import type { IntakeForm } from "./form";
import {
  archiveClient,
  ClientProfileAttemptError,
  saveClientProfile,
} from "./profile-api";
import { uploadClientLogo, type LogoAttempt } from "./logo";
import type { IntakeWriteScope } from "./authority";

export function useSaveIntake(
  capture: () => IntakeWriteScope,
  client?: Client,
) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useCurrentActor();
  return useMutation({
    retry: false,
    mutationFn: async ({
      values,
      initial,
    }: {
      values: IntakeForm;
      initial?: IntakeForm;
    }) => {
      const scope = capture();
      if (!client)
        await verifyProfileCapacity(api, 1, scope.assert, scope.signal);
      const saved = await saveClientProfile(
        api,
        values,
        initial,
        client,
        scope.assert,
      );
      try {
        scope.assert();
      } catch {
        throw new ClientProfileAttemptError(
          "Your profile session changed after saving. Review the client list before continuing.",
          true,
        );
      }
      return saved;
    },
    onSuccess: (saved) => {
      // `clientKey` is the PREFIX, not the entry a reader uses: the displayed detail lives
      // under the actor-scoped key. Publishing into the prefix array alone left the visible
      // row stale after a successful edit, so the receipt goes into the entry the current
      // actor actually reads — and when the actor is unknown the prefix is invalidated
      // instead of writing a receipt no scoped reader can see.
      publishClientReceipt(cache, saved.id, saved, actor);
    },
    // A committed write can lose its receipt. Refresh read models without replay.
    onSettled: async (_saved, error) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: billingStateKey }),
        cache.invalidateQueries({ queryKey: clientsKey }),
        ...(client &&
        error instanceof ClientProfileAttemptError &&
        error.uncertain
          ? [cache.invalidateQueries({ queryKey: clientKey(client.id) })]
          : []),
      ]);
    },
  });
}
export function useUploadLogo(capture: () => IntakeWriteScope) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useCurrentActor();
  return useMutation({
    retry: false,
    mutationFn: ({
      clientId,
      attempt,
    }: {
      clientId: string;
      attempt: LogoAttempt;
    }) => {
      const scope = capture();
      return uploadClientLogo(
        api,
        clientId,
        attempt,
        fetch,
        scope.assert,
        scope.signal,
      );
    },
    onSuccess: (saved) => {
      publishClientReceipt(cache, saved.id, saved, actor);
    },
    onSettled: async (_saved, _error, variables) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: clientsKey }),
        cache.invalidateQueries({ queryKey: clientKey(variables.clientId) }),
      ]);
    },
  });
}
export function useArchiveClient(onArchived: () => void) {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveClient(api, id),
    onSuccess: async (saved) => {
      cache.removeQueries({ queryKey: clientKey(saved.id) });
      await Promise.all([
        cache.invalidateQueries({ queryKey: clientsKey }),
        cache.invalidateQueries({ queryKey: ["account-owners"] }),
        cache.invalidateQueries({ queryKey: ["calendar", "meetings"] }),
        cache.invalidateQueries({ queryKey: billingStateKey }),
      ]);
      onArchived();
    },
  });
}
