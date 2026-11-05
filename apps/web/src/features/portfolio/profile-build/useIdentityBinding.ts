"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { assertReviewAccess } from "./actions";
import { useProfileBuildAccess } from "./queries";
import {
  confirmSourceIdentity,
  type IdentitySelection,
  type SourceIdentityCommand,
} from "./identity";
/** An explicit source choice resolves before the existing profile owner creates a record. */
export function useIdentityBinding() {
  const api = useApi();
  const cache = useQueryClient();
  const { identity, canRead } = useProfileBuildAccess();
  const actor = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
  };
  const actorKey = JSON.stringify(actor);
  const held = useRef<
    | {
        actor: string;
        key: string;
        command: SourceIdentityCommand;
      }
    | undefined
  >(undefined);
  const confirmed = useRef<
    { actor: string; key: string; id: string } | undefined
  >(undefined);
  const [locked, setLocked] = useState(false);
  async function confirm(
    selection: IdentitySelection | undefined,
    scope: { assert: () => void; signal: AbortSignal },
  ) {
    scope.assert();
    assertReviewAccess(cache, actor, false);
    if (!canRead || selection === undefined)
      throw new Error("Confirm the company before continuing.");
    if (!selection) return undefined;
    if (!("sourceCandidate" in selection)) return selection.canonicalEntityId;
    const payload = {
      sourceCandidate: selection.sourceCandidate,
      claims: selection.claims,
    };
    const key = JSON.stringify(payload);
    if (confirmed.current?.actor === actorKey && confirmed.current.key === key)
      return confirmed.current.id;
    if (
      held.current &&
      (held.current.actor !== actorKey || held.current.key !== key)
    )
      throw new Error(
        "Resolve the original company confirmation before changing the selection.",
      );
    held.current ??= {
      actor: actorKey,
      key,
      command: { ...payload, requestId: crypto.randomUUID() },
    };
    setLocked(true);
    try {
      const receipt = await confirmSourceIdentity(
        api,
        held.current.command,
        scope.signal,
      );
      scope.assert();
      assertReviewAccess(cache, actor, false);
      confirmed.current = {
        actor: actorKey,
        key,
        id: receipt.canonicalEntityId,
      };
      held.current = undefined;
      setLocked(false);
      return receipt.canonicalEntityId;
    } catch (error) {
      if (
        error instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(error.status)
      ) {
        held.current = undefined;
        setLocked(false);
      }
      throw error;
    }
  }
  return { confirm, locked, canRead };
}
