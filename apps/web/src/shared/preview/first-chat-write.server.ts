import {
  firstChatCoreOperationKey,
  firstChatV2OperationKey,
} from "../capiro/operations/meri-first-chat";
import { previewApiTarget } from "./read-config.server";

/** Reviewed Core PR #43 source binding; deployment still needs service qualification. */
export const previewFirstChatBackendSource =
  "c64f0005cf14d69683aabafa11def4964d766832";
const browserPath = `/api/capiro/${firstChatCoreOperationKey}`;
/** Reviewed General owner source; running-service qualification remains separate. */
export const previewGeneralBackendSource =
  "16c3122a379481eb19cdee156ceb5d5c8b615bea";
const generalPath = `/api/capiro/${firstChatV2OperationKey}`;

/** The only preview write candidate: exact route, method, query and target; Core authorizes the selected scope. */
export function previewFirstChatWriteTarget(
  env: Record<string, string | undefined>,
  request: Request,
): URL | null {
  const url = new URL(request.url);
  const source = env.CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE;
  const current = source === previewGeneralBackendSource;
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== "true" ||
    env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED !== "true" ||
    !(
      current ||
      (source === previewFirstChatBackendSource && url.pathname === browserPath)
    ) ||
    request.method !== "POST" ||
    !(
      url.pathname === browserPath ||
      (current && url.pathname === generalPath)
    ) ||
    url.search
  )
    return null;
  return previewApiTarget(
    env,
    request,
    env.CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL,
  );
}
