import { readMeriConnectionConfig } from "../meri-actions/connection-config";
import { readConversationFrontendOrigin } from "./frontend-origin";

/** Opt-in is a serving prerequisite; native acceptance remains with the runtime owner. */
export function readConversationConfig(
  env: Record<string, string | undefined>,
) {
  const config = readMeriConnectionConfig(env);
  const frontendOrigin = readConversationFrontendOrigin(env);
  const conversationEnabled =
    config.conversationEnabled && Boolean(frontendOrigin);
  return {
    enabled: conversationEnabled,
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
    frontendOrigin,
    firstChatBootstrapEnabled:
      conversationEnabled && env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED === "true",
  };
}
