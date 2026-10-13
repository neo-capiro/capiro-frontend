import { CapiroApiError } from "@/shared/capiro/http";
import type { ImportResult } from "@/shared/capiro/onboard-contracts";

export class InterruptedImport extends Error {
  constructor(
    public readonly partial: ImportResult,
    public readonly unknownIds: number[],
    public readonly unattemptedIds: number[],
    cause: unknown,
  ) {
    super(
      "Some import outcomes are unknown. Review current clients before another import.",
      { cause },
    );
    this.name = "InterruptedImport";
  }
}

/** Existing Core import limit; each receipt is retained if a later chunk reaches the cap. */
export async function importClientSelection(
  ids: number[],
  importChunk: (ids: number[]) => Promise<Omit<ImportResult, "capMessage">>,
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    items: [],
    skipped: [],
    capMessage: null,
  };
  for (let index = 0; index < ids.length; index += 100) {
    try {
      const chunk = await importChunk(ids.slice(index, index + 100));
      result.created += chunk.created;
      result.items.push(...chunk.items);
      result.skipped.push(...chunk.skipped);
    } catch (error) {
      if (!(error instanceof CapiroApiError) || error.status !== 402) {
        // Preserve the original rejection when nothing has been acknowledged.
        if (index === 0) throw error;
        throw new InterruptedImport(
          result,
          ids.slice(index, index + 100),
          ids.slice(index + 100),
          error,
        );
      }
      result.capMessage = error.message;
      break;
    }
  }
  return result;
}
