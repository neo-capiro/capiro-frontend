import {
  intentsMetadata,
  receiveIntentsRequest,
  receiveIntentsResponse,
  IntentsResponseError,
  type IntentsDecideRequest,
  type IntentsDecideResponse,
  type IntentsListRequest,
  type IntentsListResponse,
  type IntentsProposal,
} from "@capiro/meri-client/intents";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";
import { frontendIntentsRefusal } from "./proxy";
import {
  createRoutinesAccess,
  type RoutinesAccess,
} from "../meri-routines/access";
import type { RoutineContext } from "../meri-routines/recovery";

export type IntentsOutcome =
  | "NOT_DISPATCHED"
  | "UNKNOWN"
  | "RESULT_NOT_RELEASED";
/**
 * What one exchange established. `ok` and `refused` are answers the public receiver admitted for exactly
 * this request. `unavailable` is everything else; `dispatched` says only whether the request may have
 * reached Meri, so a decide that is `unavailable` and dispatched is repeated identically, never replaced.
 */
export type IntentsReply<T> =
  | { kind: "ok"; value: T }
  | {
      kind: "refused";
      status: number;
      code: string;
      outcome: IntentsOutcome | null;
      field: string | null;
    }
  | { kind: "unavailable"; dispatched: boolean };

export interface IntentsAccess {
  /** Separate schedule owner: generic task decisions cannot mutate routines. */
  routines?: {
    access: RoutinesAccess;
    context: RoutineContext;
    signal: AbortSignal;
  };
  list(
    request: IntentsListRequest,
    signal: AbortSignal,
  ): Promise<IntentsReply<IntentsListResponse>>;
  /** `proposal` is the one admitted from an earlier list answer; the reply is checked against it. */
  decide(
    request: IntentsDecideRequest,
    proposal: IntentsProposal,
    signal: AbortSignal,
  ): Promise<IntentsReply<IntentsDecideResponse>>;
}

const notDispatchedStatuses = new Set([400, 401, 404, 405, 503]);
/** Our own same-origin adapter refused or could not forward; it is never a Meri answer. */
function frontendRefusal(
  status: number,
  text: string,
): "none" | "refused" | "maybe" {
  try {
    const value = JSON.parse(text) as { error?: { code?: unknown } };
    if (value?.error?.code !== frontendIntentsRefusal) return "none";
  } catch {
    return "none";
  }
  if (notDispatchedStatuses.has(status)) return "refused";
  return "maybe";
}

type RouteName = "list" | "decide";
type IntentsError = { code: string; outcome?: IntentsOutcome; field?: string };

/** Classify one answer after dispatch: only what the public receiver admits for this request is an answer. */
async function admitAnswer<T>(
  route: RouteName,
  response: Response,
  expectation: unknown,
  signal: AbortSignal,
): Promise<IntentsReply<T>> {
  try {
    signal.throwIfAborted();
    const text = await boundedJsonText(
      response,
      signal,
      intentsMetadata.limits.responseBytes,
    );
    signal.throwIfAborted();
    try {
      const value = (await receiveIntentsResponse(
        route,
        response.status,
        text,
        expectation as never,
      )) as unknown;
      const error = (value as { error?: IntentsError })?.error;
      if (error)
        return {
          kind: "refused",
          status: response.status,
          code: error.code,
          outcome: error.outcome ?? null,
          field: error.field ?? null,
        };
      return { kind: "ok", value: value as T };
    } catch (error) {
      if (!(error instanceof IntentsResponseError)) throw error;
      // A frontend refusal before forwarding sent nothing; anything else after dispatch may have taken effect.
      const ours = frontendRefusal(response.status, text);
      return { kind: "unavailable", dispatched: ours !== "refused" };
    }
  } finally {
    void response.body?.cancel().catch(() => undefined);
  }
}

const post = (body: string, token: string, signal: AbortSignal) =>
  ({
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
  }) satisfies RequestInit;

/**
 * Read and decide through the current session's lifetime. Fixed routes; the public receiver owns
 * schemas, request/proposal correlation and the closed error vocabulary. This layer holds no
 * authority: it cannot approve anything the server has not recorded.
 */
export function createIntentsAccess(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
  context?: RoutineContext,
): IntentsAccess {
  let token = lifetime.aborted ? "" : credential;
  lifetime.addEventListener("abort", () => (token = ""), { once: true });
  async function exchange<T>(
    route: RouteName,
    request: unknown,
    expectation: unknown,
    caller: AbortSignal,
  ): Promise<IntentsReply<T>> {
    if (!token || caller.aborted)
      return { kind: "unavailable", dispatched: false };
    let dispatched = false;
    try {
      const body = JSON.stringify(request);
      await receiveIntentsRequest(route, body);
      return await withActionDeadline([caller, lifetime], async (signal) => {
        if (!token) return { kind: "unavailable", dispatched: false } as const;
        dispatched = true;
        const path = intentsMetadata.routes[route].path;
        const response = await fetcher(path, post(body, token, signal));
        return admitAnswer<T>(route, response, expectation, signal);
      });
    } catch {
      // A request the contract refuses never left; after dispatch, anything may have taken effect.
      return { kind: "unavailable", dispatched };
    }
  }
  return {
    ...(context
      ? {
          routines: {
            access: createRoutinesAccess(credential, lifetime, fetcher),
            context,
            signal: lifetime,
          },
        }
      : {}),
    list: (request, signal) =>
      exchange<IntentsListResponse>("list", request, { request }, signal),
    decide: (request, proposal, signal) =>
      exchange<IntentsDecideResponse>(
        "decide",
        request,
        { request, proposal },
        signal,
      ),
  };
}
