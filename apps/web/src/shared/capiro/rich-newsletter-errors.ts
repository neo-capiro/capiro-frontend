import { parseNewsletterSaveRefusal } from "@capiro/shared/newsletter";
import type { OperationDefinition, OperationInput } from "./contracts";

export function isRichNewsletterSave(operation: OperationDefinition) {
  return (
    operation.service === "workspace" &&
    operation.method === "PATCH" &&
    operation.path === "/newsletters/documents/:id"
  );
}

/** Only the public, exact request-bound no-write proof crosses the error boundary. */
export function richNewsletterSaveRefusal(
  operation: OperationDefinition,
  status: number,
  payload: unknown,
  input: OperationInput,
) {
  if (status !== 409 || !isRichNewsletterSave(operation)) return;
  const body = input.body;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("requestId" in body) ||
    typeof body.requestId !== "string" ||
    !("revision" in body) ||
    typeof body.revision !== "number" ||
    typeof input.params?.id !== "string"
  )
    return;
  const result = parseNewsletterSaveRefusal(payload, {
    requestId: body.requestId,
    operation: "save",
    documentId: input.params.id,
    previousRevision: body.revision,
  });
  return result.ok ? result.value : undefined;
}
