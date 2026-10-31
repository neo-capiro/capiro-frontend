import type { OperationDefinition, OperationInput } from "./contracts";
import {
  isWorkspaceMetric,
  workspaceMetricRefusal,
} from "./workspace-metric-errors";
import {
  isRichNewsletterSave,
  richNewsletterSaveRefusal,
} from "./rich-newsletter-errors";
import {
  isOrdinarySaveOperation,
  ordinarySaveConflictCode,
  type OrdinarySaveConflictCode,
  type PublicationConflictCode,
  type GenerationConflictCode,
  isProspectPublication,
  isProspectGeneration,
} from "./workspace-ordinary-save-errors";
import { readBoundedJson } from "./gateway-input";
import {
  isObjectiveAssociationOperation,
  objectiveAssociationFailure,
} from "./objective-association-errors";
import {
  isWorkspaceBriefOperation,
  workspaceBriefConflictCode,
  type WorkspaceBriefConflictCode,
} from "./workspace-brief-copy-errors";
import {
  isResearchSharePublication,
  researchShareWidgetRefusal,
} from "./research-share-errors";

export const jsonError = (
  status: number,
  message: string,
  code?:
    | WorkspaceBriefConflictCode
    | OrdinarySaveConflictCode
    | PublicationConflictCode
    | GenerationConflictCode,
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
  input: OperationInput = {},
): Promise<Response> {
  if (
    !publicCapability &&
    response.status === 503 &&
    isWorkspaceMetric(operation)
  ) {
    try {
      const payload = await readBoundedJson(response.body, 4096, signal);
      signal.throwIfAborted();
      const refusal = workspaceMetricRefusal(payload);
      if (refusal)
        return Response.json(refusal, {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
    } catch (error) {
      if (signal.aborted) throw error;
    }
    return jsonError(503, "The service is unavailable. Please retry.");
  }
  if (
    !publicCapability &&
    response.status === 409 &&
    isRichNewsletterSave(operation)
  ) {
    try {
      const payload = await readBoundedJson(response.body, 4096, signal);
      signal.throwIfAborted();
      const refusal = richNewsletterSaveRefusal(
        operation,
        response.status,
        payload,
        input,
      );
      if (refusal)
        return Response.json(refusal, {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
    } catch (error) {
      if (signal.aborted) throw error;
      // Generic, malformed or mismatched errors cannot settle the retained save.
    }
    return jsonError(409, "The save outcome is not confirmed.");
  }
  if (!publicCapability && isObjectiveAssociationOperation(operation)) {
    try {
      const payload = await readBoundedJson(response.body, 4096, signal);
      signal.throwIfAborted();
      const failure = objectiveAssociationFailure(
        operation,
        response.status,
        payload,
      );
      if (failure)
        return Response.json(failure, {
          status: response.status,
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
    } catch (error) {
      if (signal.aborted) throw error;
      // A malformed native response cannot establish a rejected command.
    }
  }
  let code:
    | WorkspaceBriefConflictCode
    | OrdinarySaveConflictCode
    | PublicationConflictCode
    | GenerationConflictCode
    | undefined;
  if (
    !publicCapability &&
    response.status === 409 &&
    (isWorkspaceBriefOperation(operation) ||
      isOrdinarySaveOperation(operation) ||
      isProspectPublication(operation) ||
      isProspectGeneration(operation) ||
      isResearchSharePublication(operation))
  ) {
    try {
      const payload = await readBoundedJson(response.body, 4096, signal);
      if (signal.aborted)
        throw new DOMException("Request aborted.", "AbortError");
      const widgetRefusal = researchShareWidgetRefusal(operation, payload);
      if (widgetRefusal) return jsonError(409, widgetRefusal);
      code =
        workspaceBriefConflictCode(operation, response.status, payload) ??
        ordinarySaveConflictCode(operation, response.status, payload);
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
          ? "The requested action or record is unavailable from the current service."
          : response.status === 409
            ? "The record changed. Reload it before trying again."
            : response.status === 429
              ? "The service is busy. Please retry shortly."
              : response.status >= 500
                ? "The service is unavailable. Please retry."
                : "The operation was rejected.";
  return jsonError(response.status, message, code);
}
