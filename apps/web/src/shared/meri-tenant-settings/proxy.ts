import { readConfig } from "../portfolio/config/config";
import { sameRequestOrigin } from "../request-origin";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";

const paths = {
  read: "/api/settings/tenant/read",
  save: "/api/settings/tenant/save",
} as const;
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_TENANT_SETTINGS_UNAVAILABLE" } },
    { status, headers },
  );

export function readTenantSettingsConfig(
  env: Record<string, string | undefined>,
) {
  const config = readConfig(env),
    baseUrl = config.services.meri;
  return {
    baseUrl,
    requestOrigin: config.requestOrigin,
    enabled:
      env.MERI_TENANT_SETTINGS_ENABLED === "true" &&
      config.authConfigured &&
      config.issues.length === 0 &&
      Boolean(baseUrl) &&
      new URL(baseUrl!).pathname === "/",
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Transport envelope only. Meri's existing settings owner validates the complete
 * settings document, current Core admin permission, capability ceilings and CAS. */
function validEnvelope(operation: "read" | "save", text: string): boolean {
  const value: unknown = JSON.parse(text);
  if (!record(value)) return false;
  if (operation === "read") return Object.keys(value).length === 0;
  return (
    Object.keys(value).length === 2 &&
    Object.hasOwn(value, "expectedRevision") &&
    Object.hasOwn(value, "settings") &&
    Number.isSafeInteger(value.expectedRevision) &&
    Number(value.expectedRevision) >= 0 &&
    record(value.settings)
  );
}

/** Fixed native-session transport; browser owner hints and credentials are never forwarded. */
export async function proxyTenantSettingsRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readTenantSettingsConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (operation !== "read" && operation !== "save") return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== paths[operation] ||
    url.search ||
    url.hash ||
    !sameRequestOrigin(request, config.requestOrigin) ||
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
            65536,
          );
          if (!validEnvelope(operation, body)) return unavailable(400);
        } catch {
          return unavailable(400);
        }
        signal.throwIfAborted();
        const token = await getNativeToken();
        signal.throwIfAborted();
        if (!token) return unavailable(401);
        const response = await fetcher(`${config.baseUrl}${paths[operation]}`, {
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
        });
        try {
          if (
            response.redirected ||
            (response.status >= 300 && response.status < 400)
          )
            throw new Error("Redirected settings response");
          const result = await boundedJsonText(response, signal, 262144);
          JSON.parse(result);
          return new Response(result, { status: response.status, headers });
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      30000,
    );
  } catch {
    return unavailable(502);
  }
}
