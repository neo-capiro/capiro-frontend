import type { OperationRegistry } from "../capiro/contracts";
import { jsonError } from "../capiro/gateway-errors";
import {
  firstChatCoreOperationForClient,
  firstChatCoreOperationKey,
  firstChatCoreRequest,
  firstChatV2OperationForClient,
  firstChatV2OperationKey,
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
  const bootstrap =
    operation === firstChatCoreOperationKey ||
    operation === firstChatV2OperationKey;
  if (bootstrap && env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED !== "true")
    return {
      response: jsonError(503, "First chat bootstrap is not enabled."),
    };
  const configuredClient = bootstrap
    ? firstChatCoreRequest.shape.clientId.safeParse(
        env.MERI_FIRST_CHAT_CLIENT_ID,
      )
    : null;
  if (configuredClient && !configuredClient.success)
    return { response: jsonError(503, "First chat client is not configured.") };
  const scopedFirstChat = configuredClient?.success
    ? operation === firstChatV2OperationKey
      ? firstChatV2OperationForClient(configuredClient.data)
      : firstChatCoreOperationForClient(configuredClient.data)
    : null;
  const previewWriteTarget = previewFirstChatWriteTarget(env, request);
  if (previewWriteTarget && (!bootstrap || !scopedFirstChat))
    return { response: previewHeldResponse() };
  const operations: OperationRegistry =
    previewWriteTarget && scopedFirstChat
      ? { [operation]: scopedFirstChat }
      : scopedFirstChat
        ? {
            ...capiroOperations,
            [operation]: scopedFirstChat,
          }
        : capiroOperations;
  return { response: null, operations, previewWriteTarget };
}
