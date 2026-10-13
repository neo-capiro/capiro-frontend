import type { OperationDefinition } from "./contracts";
import { readBoundedJson } from "./gateway-input";
import {
  isWorkspaceBriefOperation,
  workspaceBriefConflictCode,
  type WorkspaceBriefConflictCode,
} from "./workspace-brief-copy-errors";

export const jsonError = (
  status: number,
  message: string,
  code?: WorkspaceBriefConflictCode,
) =>
  Response.json(
    { message, ...(code ? { code } : {}) },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );

export async function serviceErrorResponse(
  response: Response,
  operation: OperationDefinition,
  signal: AbortSignal,
  publicCapability: boolean,
): Promise<Response> {
  let code: WorkspaceBriefConflictCode | undefined;
  if (
    !publicCapability &&
    response.status === 409 &&
    isWorkspaceBriefOperation(operation)
  ) {
    try {
      const payload = await readBoundedJson(response.body, 4096, signal);
      if (signal.aborted)
        throw new DOMException("Request aborted.", "AbortError");
      code = workspaceBriefConflictCode(operation, response.status, payload);
    } catch (error) {
      if (signal.aborted) throw error;
      // Invalid or oversized native errors retain the generic conflict hold.
    }
  } else await response.body?.cancel().catch(() => undefined);
  const message =
    response.status === 401
      ? publicCapability
        ? "This public link is unavailable or has expired."
        : "Your session expired. Sign in again."
      : response.status === 403
        ? "You do not have access to this operation."
        : response.status === 404
          ? "The requested record was not found."
          : response.status === 409
            ? "The record changed. Reload it before trying again."
            : response.status === 429
              ? "The service is busy. Please retry shortly."
              : response.status >= 500
                ? "The service is unavailable. Please retry."
                : "The operation was rejected.";
  return jsonError(response.status, message, code);
}
