import {
  firstChatCoreOperationKey,
  firstChatCoreRequest,
} from "../capiro/operations/meri-first-chat";
import { previewApiTarget } from "./read-config.server";

/** Reviewed Core PR #43 source binding; deployment still needs service qualification. */
export const previewFirstChatBackendSource =
  "c64f0005cf14d69683aabafa11def4964d766832";
const browserPath = `/api/capiro/${firstChatCoreOperationKey}`;

/** The only preview write candidate: exact route, method, query, client and target. */
export function previewFirstChatWriteTarget(
  env: Record<string, string | undefined>,
  request: Request,
): URL | null {
  const url = new URL(request.url);
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== "true" ||
    env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED !== "true" ||
    env.CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE !==
      previewFirstChatBackendSource ||
    !firstChatCoreRequest.shape.clientId.safeParse(
      env.MERI_FIRST_CHAT_CLIENT_ID,
    ).success ||
    request.method !== "POST" ||
    url.pathname !== browserPath ||
    url.search
  )
    return null;
  return previewApiTarget(
    env,
    request,
    env.CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL,
  );
}
