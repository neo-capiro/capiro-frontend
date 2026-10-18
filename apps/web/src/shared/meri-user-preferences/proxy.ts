import {
  receiveUserPreferencesRequest,
  userPreferencesPaths,
  userPreferencesMetadata,
} from "@capiro/meri-client/user-preferences";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import type { readUserPreferencesConfig } from "./config";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_USER_PREFERENCES_UNAVAILABLE" } },
    { status, headers },
  );

/** Two fixed native-token routes; never forwards browser credentials or owner hints. */
export async function proxyUserPreferencesRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readUserPreferencesConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (operation !== "read" && operation !== "save") return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== userPreferencesPaths[operation] ||
    url.search ||
    request.headers.get("origin") !== url.origin ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  if (!config.enabled || !config.baseUrl) return unavailable(503);
  try {
    return await withActionDeadline(
      [request.signal],
      async (signal) => {
        let body: string;
        try {
          body = await boundedJsonText(
            new Response(request.body, { headers: request.headers }),
            signal,
            userPreferencesMetadata.limits.requestBytes,
          );
          await receiveUserPreferencesRequest(operation, body);
        } catch {
          return unavailable(400);
        }
        signal.throwIfAborted();
        const token = await getNativeToken();
        signal.throwIfAborted();
        if (!token) return unavailable(401);
        const response = await fetcher(
          `${config.baseUrl}${userPreferencesPaths[operation]}`,
          {
            method: "POST",
            body,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            signal,
          },
        );
        try {
          if (response.redirected)
            throw new Error("Redirected settings response");
          const result = await boundedJsonText(
            response,
            signal,
            userPreferencesMetadata.limits.responseBytes,
          );
          return new Response(result, { status: response.status, headers });
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      userPreferencesMetadata.limits.requestMs,
    );
  } catch {
    return unavailable(502);
  }
}
