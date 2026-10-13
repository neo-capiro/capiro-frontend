import {
  receiveActionResponse,
  type ActionRoute,
  type ActionResponse,
} from "@capiro/meri-contracts/action-application";
import { boundedJsonText, withActionDeadline } from "./bounded-json";

export type ActionTransport = <R extends ActionRoute>(
  route: R,
  body: unknown,
  signal: AbortSignal,
) => Promise<{ status: number; value: ActionResponse<R> }>;

export function actionTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): ActionTransport {
  return async (route, body, caller) => {
    if (!["query", "draft", "prepare", "execute"].includes(route))
      throw new Error("Unknown action route");
    const capturedBody = JSON.stringify(body);
    return withActionDeadline([caller, lifetime], async (signal) => {
      const response = await fetcher(`/api/action-followthrough/${route}`, {
        method: "POST",
        body: capturedBody,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credential}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal,
      });
      const text = await boundedJsonText(response, signal, 16 * 1024 * 1024);
      const value = await receiveActionResponse(route, response.status, text);
      signal.throwIfAborted();
      return { status: response.status, value };
    });
  };
}
