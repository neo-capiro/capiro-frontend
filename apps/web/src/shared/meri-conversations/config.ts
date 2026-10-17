import { readMeriConnectionConfig } from "../meri-actions/connection-config";
import { firstChatCoreRequest } from "../capiro/operations/meri-first-chat";
import { readConversationFrontendOrigin } from "./frontend-origin";

/** Opt-in is a serving prerequisite; native acceptance remains with the runtime owner. */
export function readConversationConfig(
  env: Record<string, string | undefined>,
) {
  const config = readMeriConnectionConfig(env);
  const frontendOrigin = readConversationFrontendOrigin(env);
  const conversationEnabled =
    config.conversationEnabled && Boolean(frontendOrigin);
  const selectedClient = firstChatCoreRequest.shape.clientId.safeParse(
    env.MERI_FIRST_CHAT_CLIENT_ID,
  );
  return {
    enabled: conversationEnabled,
    baseUrl: config.baseUrl,
    frontendOrigin,
    firstChatBootstrapEnabled:
      conversationEnabled && env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED === "true",
    firstChatBootstrapClientId: selectedClient.success
      ? selectedClient.data
      : undefined,
  };
}
