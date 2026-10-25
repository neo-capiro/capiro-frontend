import {
  receiveRoutinesRequest,
  receiveRoutinesResponse,
  routinesMetadata,
  type RoutinesRoute,
  type RoutinesRequestMap,
  type RoutinesExpectationMap,
  type RoutinesResponse,
} from "@capiro/meri-contracts/routines-application";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";

export class RoutinesAccessDenied extends Error {
  constructor() {
    super(
      "Routine access was denied. Reconnect to check current access. Saved requests are retained.",
    );
    this.name = "RoutinesAccessDenied";
  }
}

export interface RoutinesAccess {
  exchange<R extends RoutinesRoute>(
    route: R,
    request: RoutinesRequestMap[R],
    expectation: RoutinesExpectationMap[R],
    signal: AbortSignal,
  ): Promise<RoutinesResponse<R>>;
}

/** Fixed routine operations share the current opaque session; the canonical receiver admits every answer. */
export function createRoutinesAccess(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): RoutinesAccess {
  let token = lifetime.aborted ? "" : credential;
  lifetime.addEventListener("abort", () => (token = ""), { once: true });
  return {
    async exchange(route, request, expectation, caller) {
      const body = JSON.stringify(request);
      await receiveRoutinesRequest(route, body);
      return withActionDeadline([caller, lifetime], async (signal) => {
        if (!token) throw new Error("Current routine access is unavailable.");
        const response = await fetcher(
          `/api/action-followthrough/routine-${route}`,
          {
            method: "POST",
            body,
            headers: {
              "Content-Type": "application/json",
              [actionSessionHeader]: token,
            },
            credentials: "same-origin",
            cache: "no-store",
            redirect: "error",
            signal,
          },
        );
        // A refusal retires local access even when an intermediary returns a non-JSON body.
        if (response.status === 401 || response.status === 403) {
          token = "";
          void response.body?.cancel().catch(() => undefined);
          throw new RoutinesAccessDenied();
        }
        const text = await boundedJsonText(
          response,
          signal,
          routinesMetadata.limits.responseBytes,
        );
        signal.throwIfAborted();
        return receiveRoutinesResponse(
          route,
          response.status,
          text,
          expectation,
        );
      });
    },
  };
}
