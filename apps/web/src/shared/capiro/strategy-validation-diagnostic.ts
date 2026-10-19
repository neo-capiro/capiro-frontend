import { z } from "zod";
import type { OperationDefinition } from "./contracts";
import { strategiesAgentOperations } from "./operations/strategies-agents";

const canonical = strategiesAgentOperations["strategies.proposals"];
const codes = new Set([
  "invalid_type",
  "too_big",
  "too_small",
  "invalid_format",
  "not_multiple_of",
  "unrecognized_keys",
  "invalid_union",
  "invalid_key",
  "invalid_element",
  "invalid_value",
  "custom",
]);
type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "undefined"
  | "unknown";
type Stage = "upstream" | "browser";
type DiagnosticIssue = {
  path: (string | number)[];
  code: string;
  expectedType: ValueType;
  receivedType: ValueType;
};
export type StrategyValidationDiagnostic = {
  stage: Stage;
  issues: DiagnosticIssue[];
};
function unwrap(schema: z.core.$ZodType): z.core.$ZodType {
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    schema = schema.unwrap();
  return schema;
}
function schemaPath(
  path: PropertyKey[],
): { path: (string | number)[]; schema: z.core.$ZodType } | undefined {
  let schema: z.core.$ZodType = canonical.response;
  const admitted: (string | number)[] = [];
  if (path.length > 16) return;
  for (const segment of path) {
    schema = unwrap(schema);
    if (
      schema instanceof z.ZodArray &&
      typeof segment === "number" &&
      Number.isSafeInteger(segment) &&
      segment >= 0 &&
      segment < 4294967295
    ) {
      admitted.push(segment);
      schema = schema.element;
    } else if (
      schema instanceof z.ZodObject &&
      typeof segment === "string" &&
      Object.hasOwn(schema.shape, segment)
    ) {
      admitted.push(segment);
      schema = schema.shape[segment]!;
    } else return;
  }
  return { path: admitted, schema: unwrap(schema) };
}
function expectedType(schema: z.core.$ZodType): ValueType {
  if (schema instanceof z.ZodString || schema instanceof z.ZodEnum)
    return "string";
  if (schema instanceof z.ZodNumber) return "number";
  if (schema instanceof z.ZodBoolean) return "boolean";
  if (schema instanceof z.ZodArray) return "array";
  if (schema instanceof z.ZodObject) return "object";
  return "unknown";
}
function receivedType(payload: unknown, path: (string | number)[]): ValueType {
  let value = payload;
  for (const segment of path) {
    if (value === null || typeof value !== "object") return "undefined";
    const descriptor = Object.getOwnPropertyDescriptor(value, segment);
    if (!descriptor) return "undefined";
    if (!Object.hasOwn(descriptor, "value")) return "unknown";
    value = descriptor.value;
  }
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  return type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "object" ||
    type === "undefined"
    ? type
    : "unknown";
}

/** Server-only metadata: never serialize issue messages, values, enum choices or request material. */
export function reportStrategyValidation(
  key: string | undefined,
  operation: OperationDefinition,
  stage: Stage,
  error: z.ZodError,
  payload: unknown,
  emit: (diagnostic: StrategyValidationDiagnostic) => void = (diagnostic) =>
    console.warn("strategies.proposals validation", JSON.stringify(diagnostic)),
) {
  if (
    (stage !== "upstream" && stage !== "browser") ||
    key !== "strategies.proposals" ||
    operation.service !== "strategy" ||
    operation.method !== "GET" ||
    operation.path !== "/agents/change-sets" ||
    operation.response !== canonical.response ||
    operation.request !== canonical.request
  )
    return;
  try {
    const issues: DiagnosticIssue[] = [];
    for (const issue of error.issues.slice(0, 10)) {
      const selected = schemaPath(issue.path);
      if (!selected) continue;
      issues.push({
        path: selected.path,
        code: codes.has(issue.code) ? issue.code : "unknown",
        expectedType: expectedType(selected.schema),
        receivedType: receivedType(payload, selected.path),
      });
    }
    emit({ stage, issues });
  } catch {
    // Diagnostic failure must preserve the existing generic502 response.
  }
}
