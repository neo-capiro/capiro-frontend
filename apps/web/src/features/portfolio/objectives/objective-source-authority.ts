import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { scopedObjectivesSchema } from "./contracts";

export function objectiveSourceAuthority(
  api: ApiClient,
  cache: QueryClient,
  actor: ClientWriter,
  selected: { clientId: string; id: string; version: number },
) {
  const guard = () => assertClientWriter(cache, actor);
  return {
    guard,
    async authorize(signal: AbortSignal) {
      const assert = () => {
        signal.throwIfAborted();
        guard();
      };
      await verifyCoreWriter(api, actor, signal, assert);
      const values = await api.request(
        "core",
        `clients/${selected.clientId}/objectives`,
        scopedObjectivesSchema(selected.clientId),
        { signal },
      );
      assert();
      const current = values.find(
        (v) => v.id === selected.id && v.version === selected.version,
      );
      if (!current || current.status !== "ready")
        throw new Error(
          "This saved Objective is no longer ready at the selected version. Refresh it before continuing.",
        );
    },
  };
}
