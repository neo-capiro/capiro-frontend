import { sameRequestOrigin } from "../request-origin";
import { boundedJsonText, withActionDeadline } from "./bounded-json";
import { actionSessionHints } from "./session-bootstrap";
import { conversationSessionHints } from "../meri-conversations/session";
import { receivedActionSession } from "./session-header";
import type { readActionConfig } from "./config";
import { routineRoute } from "../meri-routines/routes";
import {
  routinesPaths,
  routinesMetadata,
  receiveRoutinesRequest,
} from "@capiro/meri-contracts/routines-application";
import {
  objectiveGenerationStartMetadata,
  requireObjectiveGenerationStartRequest,
  receiveObjectiveGenerationStartResponse,
} from "@capiro/meri-contracts/objective-generation";

const routes = new Set([
  "session",
  "query",
  "draft",
  "prepare",
  "execute",
  "objective-start",
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

/** A fixed same-origin adapter. The Meri host still owns every authority check. */
export async function proxyActionRequest(
  request: Request,
  route: string,
  config: ReturnType<typeof readActionConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  const routine = routineRoute(route);
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
        route === "session" || route === "objective-start"
          ? nativeToken
          : receivedActionSession(request);
      if (!credential) return unavailable(401);
      const body = await boundedJsonText(
        new Response(request.body, { headers: request.headers }),
        signal,
        routine
          ? routinesMetadata.limits.requestBytes
          : route === "objective-start"
            ? objectiveGenerationStartMetadata.requestBytes
            : route === "session"
              ? 4096
              : 16 * 1024 * 1024,
      );
      if (route === "session")
        actionSessionHints.or(conversationSessionHints).parse(JSON.parse(body));
      if (routine) await receiveRoutinesRequest(routine, body);
      const objective =
        route === "objective-start"
          ? requireObjectiveGenerationStartRequest(JSON.parse(body))
          : undefined;
      signal.throwIfAborted();
      const response = await fetcher(
        `${config.baseUrl}${routine ? routinesPaths[routine] : objective ? objectiveGenerationStartMetadata.path : `/api/action-followthrough/${route}`}`,
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
            : route === "session"
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
