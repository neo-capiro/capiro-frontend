import {
  receiveActionResponse,
  type ActionRoute,
  type ActionResponse,
} from "@capiro/meri-contracts/action-application";
import { boundedJsonText, withActionDeadline } from "./bounded-json";
import { actionSessionHeader } from "./session-header";

export type ActionTransport = <R extends ActionRoute>(
  route: R,
  body: unknown,
  signal: AbortSignal,
) => Promise<{ status: number; value: ActionResponse<R> }>;

/** Local access invalidation only; supplies no remote dispatch disposition. */
export class ActionAccessUnavailable extends Error {}

export function actionTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): ActionTransport {
  let currentCredential = lifetime.aborted ? "" : credential;
  lifetime.addEventListener(
    "abort",
    () => {
      currentCredential = "";
    },
    { once: true },
  );
  return async (route, body, caller) => {
    if (!["query", "draft", "prepare", "execute"].includes(route))
      throw new Error("Unknown action route");
    const capturedBody = JSON.stringify(body);
    let unauthorized = false;
    try {
      return await withActionDeadline([caller, lifetime], async (signal) => {
        const response = await fetcher(`/api/action-followthrough/${route}`, {
          method: "POST",
          body: capturedBody,
          headers: {
            "Content-Type": "application/json",
            [actionSessionHeader]: currentCredential,
          },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal,
        });
        unauthorized = response.status === 401;
        const text = await boundedJsonText(response, signal, 16 * 1024 * 1024);
        const value = await receiveActionResponse(route, response.status, text);
        signal.throwIfAborted();
        return { status: response.status, value };
      });
    } catch (error) {
      if (unauthorized && !caller.aborted && !lifetime.aborted)
        throw new ActionAccessUnavailable("Current action access unavailable");
      throw error;
    }
  };
}
