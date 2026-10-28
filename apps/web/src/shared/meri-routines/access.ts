import {
  receiveRoutinesRequest,
  receiveRoutinesResponse,
  routinesMetadata,
} from "./canonical-receiver";
import type {
  RoutineExpectationOf,
  RoutineRequestOf,
  RoutineResponseOf,
  RoutineRouteName,
} from "./consent";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";

/**
 * The installed published declarations predate the two renewal routes, so the route name is not statically known to
 * them. These two shims keep the ONE canonical receiver as the only admitting implementation while the source-stage
 * route union above supplies the caller's types; the published routes are unaffected and no answer is admitted twice.
 */
type ReceiveRequest = (route: string, text: string) => Promise<unknown>;
type ReceiveResponse = (
  route: string,
  status: number,
  text: string,
  expectation: unknown,
) => Promise<unknown>;
const receiveRequest = receiveRoutinesRequest as unknown as ReceiveRequest;
const receiveResponse = receiveRoutinesResponse as unknown as ReceiveResponse;

export class RoutinesAccessDenied extends Error {
  constructor() {
    super(
      "Routine access was denied. Reconnect to check current access. Saved requests are retained.",
    );
    this.name = "RoutinesAccessDenied";
  }
}

export interface RoutinesAccess {
  exchange<R extends RoutineRouteName>(
    route: R,
    request: RoutineRequestOf<R>,
    expectation: RoutineExpectationOf<R>,
    signal: AbortSignal,
  ): Promise<RoutineResponseOf<R>>;
}

/** Fixed routine operations share the current opaque session; the canonical receiver admits every answer. */
export function createRoutinesAccess(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): RoutinesAccess {
  let token = lifetime.aborted ? "" : credential;
  let denied = false;
  lifetime.addEventListener("abort", () => (token = ""), { once: true });
  return {
    async exchange<R extends RoutineRouteName>(
      route: R,
      request: RoutineRequestOf<R>,
      expectation: RoutineExpectationOf<R>,
      caller: AbortSignal,
    ): Promise<RoutineResponseOf<R>> {
      if (denied) throw new RoutinesAccessDenied();
      const body = JSON.stringify(request);
      await receiveRequest(route, body);
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
          denied = true;
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
        return (await receiveResponse(
          route,
          response.status,
          text,
          expectation,
        )) as RoutineResponseOf<R>;
      });
    },
  };
}
