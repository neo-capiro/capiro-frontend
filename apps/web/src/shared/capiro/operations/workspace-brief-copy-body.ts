import { z } from "zod";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Validate without projecting rich fields or original source evidence. */
function validJson(value: unknown, boundedDocument: boolean): boolean {
  const pending: { value: unknown; depth: number; exit?: boolean }[] = [
    { value, depth: 0 },
  ];
  const ancestors = new WeakSet<object>();
  let nodes = 0;
  let queued = 1;
  while (pending.length) {
    const item = pending.pop()!;
    const current = item.value;
    if (item.exit) {
      ancestors.delete(current as object);
      continue;
    }
    ++nodes;
    if (boundedDocument && (nodes > 100_000 || item.depth > 32)) return false;
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    )
      continue;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) return false;
      continue;
    }
    if (typeof current !== "object" || ancestors.has(current)) return false;
    if (
      !Array.isArray(current) &&
      ![Object.prototype, null].includes(Object.getPrototypeOf(current))
    )
      return false;
    if (Object.getOwnPropertySymbols(current).length) return false;
    ancestors.add(current);
    pending.push({ value: current, depth: item.depth, exit: true });
    const entries = Array.isArray(current)
      ? current.map((child) => ["", child] as const)
      : Object.entries(current);
    for (const [key, child] of entries) {
      if (
        boundedDocument &&
        ["__proto__", "prototype", "constructor"].includes(key)
      )
        return false;
      if (boundedDocument && ++queued > 100_000) return false;
      pending.push({ value: child, depth: item.depth + 1 });
    }
  }
  // Canonical key ordering changes no JSON byte length. Digests remain opaque.
  return (
    !boundedDocument ||
    new TextEncoder().encode(JSON.stringify(value)).byteLength <= 4_000_000
  );
}

// Evidence is opaque original-source JSON, not the editable body's contract.
// The gateway's response bound remains in force; no body-only limits or
// transforms silently remove evidence fields (including inert JSON key names).
export const briefCopyEvidenceJsonSchema = z.custom<JsonValue>((value) => {
  try {
    return validJson(value, false);
  } catch {
    return false;
  }
});

export const briefCopyBodySchema = z
  .unknown()
  .refine((value) => {
    try {
      return validJson(value, true);
    } catch {
      return false;
    }
  }, "Document must be bounded complete JSON.")
  .pipe(
    z
      .object({
        blocks: z
          .array(
            z
              .object({
                id: z.string().min(1).max(64),
                type: z.enum(["section", "photo", "table", "logo"]),
                title: z.string().optional(),
                content: z.string().optional(),
              })
              .passthrough(),
          )
          .max(1000),
      })
      .passthrough(),
  )
  .refine(
    ({ blocks }) => new Set(blocks.map(({ id }) => id)).size === blocks.length,
    "Document block IDs must be unique.",
  );
export type BriefCopyBody = z.infer<typeof briefCopyBodySchema>;
