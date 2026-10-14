import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/** Opt-in is a serving prerequisite; native acceptance remains with the runtime owner. */
export function readConversationConfig(
  env: Record<string, string | undefined>,
) {
  const config = readMeriConnectionConfig(env);
  return { enabled: config.conversationEnabled, baseUrl: config.baseUrl };
}
