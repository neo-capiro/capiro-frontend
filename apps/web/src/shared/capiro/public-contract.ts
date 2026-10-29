import { z } from "zod";
/** Adapt public owner codecs to the fixed-operation transport without duplicating their DTOs. */
export function publicContract<T>(parse: (raw: unknown) => T, message: string) {
  return z.unknown().transform((raw, context) => {
    try {
      return parse(raw);
    } catch {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });
}
