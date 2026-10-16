import type { OperationRegistry } from "../capiro/contracts";
import { jsonError } from "../capiro/gateway-errors";
import {
  firstChatCoreOperationForClient,
  firstChatCoreOperationKey,
  firstChatCoreRequest,
} from "../capiro/operations/meri-first-chat";
import { capiroOperations } from "../capiro/registry";
import { previewHeldResponse } from "./backend-policy.server";
import { previewFirstChatWriteTarget } from "./first-chat-write.server";

type FirstChatGatewaySelection =
  | { response: Response; operations?: never; previewWriteTarget?: never }
  | {
      response: null;
      operations: OperationRegistry;
      previewWriteTarget: URL | null;
    };

/** Keep the preview write registry and target bound to the reviewed first-chat operation. */
export function selectFirstChatGateway(
  env: Record<string, string | undefined>,
  request: Request,
  operation: string,
): FirstChatGatewaySelection {
  if (
    operation === firstChatCoreOperationKey &&
    env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED !== "true"
  )
    return {
      response: jsonError(503, "First chat bootstrap is not enabled."),
    };
  const configuredClient =
    operation === firstChatCoreOperationKey
      ? firstChatCoreRequest.shape.clientId.safeParse(
          env.MERI_FIRST_CHAT_CLIENT_ID,
        )
      : null;
  if (configuredClient && !configuredClient.success)
    return { response: jsonError(503, "First chat client is not configured.") };
  const scopedFirstChat = configuredClient?.success
    ? firstChatCoreOperationForClient(configuredClient.data)
    : null;
  const previewWriteTarget = previewFirstChatWriteTarget(env, request);
  if (
    previewWriteTarget &&
    (operation !== firstChatCoreOperationKey || !scopedFirstChat)
  )
    return { response: previewHeldResponse() };
  const operations: OperationRegistry =
    previewWriteTarget && scopedFirstChat
      ? { [firstChatCoreOperationKey]: scopedFirstChat }
      : scopedFirstChat
        ? {
            ...capiroOperations,
            [firstChatCoreOperationKey]: scopedFirstChat,
          }
        : capiroOperations;
  return { response: null, operations, previewWriteTarget };
}
