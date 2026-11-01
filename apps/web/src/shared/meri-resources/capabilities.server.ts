import { readActionConfig } from "../meri-actions/config";
import { firstChatCoreOperationKey } from "../capiro/operations/meri-first-chat";
import { readConversationConfig } from "../meri-conversations/config";
import { readDocumentConfig } from "../meri-documents/config";
import { readIntentsConfig } from "../meri-intents/config";
import { readTaskCommandConfig } from "../meri-task-commands/config";
import { readUserPreferencesConfig } from "../meri-user-preferences/config";
import { readConfig } from "../portfolio/config/config";
import { previewBackendRejection } from "../preview/backend-policy.server";
import { resolveMeriCapabilities, type MeriCapabilityId } from "./capabilities";

type Environment = Record<string, string | undefined>;
type HoldReasons = Partial<Record<MeriCapabilityId, string>>;

/** Reuse the same request-sensitive preview policy as each native route. */
function servingCheck(
  env: Environment,
  requestOrigin: string | null | undefined,
  held: HoldReasons,
) {
  return (
    id: MeriCapabilityId,
    enabled: boolean,
    path: string,
    method = "POST",
  ) => {
    if (!enabled) return false;
    // Preview predicates require the configured public origin, even when Next binds internally.
    let request: Request;
    try {
      const origin = requestOrigin ?? "https://unconfigured.invalid";
      request = new Request(new URL(path, origin), {
        method,
        headers: { Origin: origin },
      });
    } catch {
      return false;
    }
    if (previewBackendRejection(env, request)) {
      held[id] = "This capability is held in the current preview deployment.";
      return false;
    }
    return true;
  };
}

/** Reuse serving gates; do not infer deployment activation from source presence. No secrets leave here. */
export function readMeriCapabilities(env: Environment) {
  const conversation = readConversationConfig(env);
  const config = readConfig(env);
  const held: HoldReasons = {};
  const permitted = servingCheck(env, config.requestOrigin, held);
  const conversations = permitted(
    "conversations",
    conversation.enabled,
    "/api/conversations/history",
  );
  const coreAvailable =
    config.authConfigured &&
    config.issues.length === 0 &&
    Boolean(config.services.core) &&
    new URL(config.services.core!).pathname === "/api";
  return resolveMeriCapabilities(
    {
      conversations,
      runs: permitted(
        "runs",
        conversation.enabled,
        "/api/conversations/runs/list",
      ),
      approvals: permitted(
        "approvals",
        conversation.enabled,
        "/api/conversations/intents/inbox",
      ),
      dataAccess: permitted(
        "dataAccess",
        conversation.enabled,
        "/api/data-access/read",
      ),
      routines: permitted(
        "routines",
        conversation.enabled,
        "/api/action-followthrough/routine-list",
      ),
      newConversation: permitted(
        "newConversation",
        conversations && conversation.firstChatBootstrapEnabled,
        `/api/capiro/${firstChatCoreOperationKey}`,
      ),
      files: permitted(
        "files",
        readDocumentConfig(env).enabled,
        "/api/documents/create",
      ),
      actions: permitted(
        "actions",
        readActionConfig(env).enabled,
        "/api/action-followthrough/query",
      ),
      taskUpdates: permitted(
        "taskUpdates",
        readTaskCommandConfig(env).enabled,
        "/api/task-commands/prepare",
      ),
      conversationApprovals: permitted(
        "conversationApprovals",
        readIntentsConfig(env).enabled,
        "/api/conversations/intents/list",
      ),
      memory: permitted(
        "memory",
        coreAvailable && env.MERI_MEMORY_OWNER_REVIEW_ENABLED === "true",
        "/api/memory/owner/items?limit=25",
        "GET",
      ),
      preferences: permitted(
        "preferences",
        readUserPreferencesConfig(env).enabled,
        "/api/settings/user/read",
      ),
    },
    held,
  );
}
