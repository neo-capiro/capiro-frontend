import { sameRequestOrigin } from "../request-origin";
import { boundedJsonText, withActionDeadline } from "./bounded-json";
import { actionSessionHints } from "./session-bootstrap";
import { conversationSessionSelector } from "../meri-conversations/session";
import { receivedActionSession } from "./session-header";
import type { readActionConfig } from "./config";
import {
  routineRoute,
  routinePaths,
  receivedRoutineManagementSession,
} from "../meri-routines/routes";
import {
  routinesMetadata,
  receiveRoutinesRequest,
  routineManagementSessionPath,
  receiveRoutineManagementSessionRequest,
} from "../meri-routines/canonical-receiver";
import {
  objectiveGenerationStartMetadata,
  requireObjectiveGenerationStartRequest,
  receiveObjectiveGenerationStartResponse,
} from "@capiro/meri-contracts/objective-generation";

const routes = new Set([
  "session",
  "browser-session",
  "query",
  "draft",
  "prepare",
  "execute",
  "objective-start",
  "routine-session",
]);
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_ACTION_UNAVAILABLE" } },
    { status, headers },
  );
// The installed published declarations predate the two renewal routes, so the admitted name is not statically known to
// them. The canonical receiver still validates the body; no header, credential or authority path changes here.
const receiveRequest = receiveRoutinesRequest as unknown as (
  route: string,
  body: string,
) => Promise<unknown>;

/** A fixed same-origin adapter. The Meri host still owns every authority check. */
export async function proxyActionRequest(
  request: Request,
  route: string,
  config: ReturnType<typeof readActionConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  const routine = routineRoute(route);
  const managementSession = route === "routine-session";
  const browserSession = route === "browser-session";
  if (!routes.has(route) && !routine) return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== `/api/action-followthrough/${route}` ||
    url.search ||
    !sameRequestOrigin(request, config.requestOrigin) ||
    // A browser bearer would shadow the native Clerk cookie; the opaque session has its own header.
    request.headers.has("authorization") ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  if (!config.enabled || !config.baseUrl) return unavailable(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return unavailable(401);
      const credential =
        route === "session" ||
        browserSession ||
        route === "objective-start" ||
        managementSession
          ? nativeToken
          : (receivedActionSession(request) ??
            (routine ? receivedRoutineManagementSession(request) : null));
      if (!credential) return unavailable(401);
      const body = await boundedJsonText(
        new Response(request.body, { headers: request.headers }),
        signal,
        routine
          ? routinesMetadata.limits.requestBytes
          : route === "objective-start"
            ? objectiveGenerationStartMetadata.requestBytes
            : route === "session" || browserSession || managementSession
              ? 4096
              : 16 * 1024 * 1024,
      );
      if (route === "session")
        actionSessionHints
          .or(conversationSessionSelector)
          .parse(JSON.parse(body));
      if (browserSession) {
        const hints = conversationSessionSelector.parse(JSON.parse(body));
        if (!hints.conversationId || !hints.runId) return unavailable(400);
      }
      if (routine) await receiveRequest(routine, body);
      if (managementSession) receiveRoutineManagementSessionRequest(body);
      const objective =
        route === "objective-start"
          ? requireObjectiveGenerationStartRequest(JSON.parse(body))
          : undefined;
      signal.throwIfAborted();
      const response = await fetcher(
        `${config.baseUrl}${managementSession ? routineManagementSessionPath : routine ? routinePaths[routine] : objective ? objectiveGenerationStartMetadata.path : `/api/action-followthrough/${route}`}`,
        {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${credential}`,
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        },
      );
      const text = await boundedJsonText(
        response,
        signal,
        routine
          ? routinesMetadata.limits.responseBytes
          : objective
            ? objectiveGenerationStartMetadata.responseBytes
            : route === "session" || browserSession || managementSession
              ? 4096
              : 16 * 1024 * 1024,
      );
      signal.throwIfAborted();
      if (objective)
        receiveObjectiveGenerationStartResponse(
          response.status,
          text,
          objective.generationJobId,
        );
      return new Response(text, { status: response.status, headers });
    });
  } catch {
    // No dispatch disposition is invented: a request may already have reached Meri.
    return unavailable(502);
  }
}
