import type { OperationDefinition } from "./contracts";
import { researchShareOperations } from "./operations/research-share";

// Core's ResearchPortfolioSharePayloadService.refusal emits only these fixed
// details after validating the layout ID. Never relay arbitrary exception text.
const widgetRefusalReasons = new Set([
  "an external image is not a frozen asset; use the firm logo",
  "the firm logo could not be frozen safely",
  "the full frozen dashboard exceeds the supported size; reduce the design before publishing",
  "a frozen source has no verifiable evidence reference",
  "a frozen source is restricted or no longer accessible",
  "a frozen source revision cannot be verified",
  "a figure has no verifiable frozen source",
  "totals have no contributing frozen evidence",
  "a frozen source is restricted or cannot be verified",
  "the comparison must use an earlier snapshot of this portfolio",
]);

export function isResearchSharePublication(operation: OperationDefinition) {
  return [
    researchShareOperations["research.sharePreview"],
    researchShareOperations["research.shareLinks.publish"],
  ].some(
    (allowed) =>
      operation.service === allowed.service &&
      operation.method === allowed.method &&
      operation.path === allowed.path,
  );
}

/** Recognize the existing bounded Nest conflict; no write-outcome proof is added. */
export function researchShareWidgetRefusal(
  operation: OperationDefinition,
  payload: unknown,
): string | undefined {
  if (
    !isResearchSharePublication(operation) ||
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).length !== 3 ||
    !("statusCode" in payload) ||
    payload.statusCode !== 409 ||
    !("error" in payload) ||
    payload.error !== "Conflict" ||
    !("message" in payload) ||
    typeof payload.message !== "string"
  )
    return undefined;
  const match =
    /^Widget ([A-Za-z0-9_-]{1,64}) cannot be published: ([\s\S]+)$/.exec(
      payload.message,
    );
  if (!match || !widgetRefusalReasons.has(match[2]!)) return undefined;
  return `Widget ${match[1]} cannot be published: ${match[2]}`;
}
