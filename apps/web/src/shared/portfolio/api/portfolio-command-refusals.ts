import { z } from "zod";

const binding = {
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
};
const refusalSchema = z.discriminatedUnion("code", [
  z
    .object({
      ...binding,
      code: z.literal("DIRECTORY_NOTE_REFUSED"),
      memberId: z.string().regex(/^member-[1-9][0-9]*$/),
      status: z.union([z.literal(400), z.literal(404), z.literal(409)]),
      message: z.string().min(1).max(500),
    })
    .strict(),
  z
    .object({
      ...binding,
      code: z.literal("PROSPECT_NEW_CLIENT_REFUSED"),
      prospectId: z.uuid(),
      status: z.union([
        z.literal(400),
        z.literal(402),
        z.literal(404),
        z.literal(409),
      ]),
      message: z.string().min(1).max(2000),
    })
    .strict(),
]);
// Transport bindings only. Core owns command validation; the caller verifies
// the exact digest against its retained intent (Directory includes actor scope).
const requestBinding = z
  .object({ schemaVersion: z.literal(1), requestId: z.uuid() })
  .passthrough();

export function portfolioCommandRefusal(
  service: string,
  method: string,
  path: string[],
  body: string | undefined,
  status: number,
  payload: unknown,
) {
  if (service !== "core" || method !== "POST" || !body) return;
  const parsed = refusalSchema.safeParse(payload);
  if (!parsed.success || parsed.data.status !== status) return;
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return;
  }
  const submitted = requestBinding.safeParse(input);
  if (!submitted.success || submitted.data.requestId !== parsed.data.requestId)
    return;
  const refusal = parsed.data;
  if (refusal.code === "DIRECTORY_NOTE_REFUSED") {
    if (
      path.length !== 4 ||
      path[0] !== "directory" ||
      path[1] !== "members" ||
      path[2] !== refusal.memberId ||
      path[3] !== "note-commands" ||
      submitted.data.kind !== "note"
    )
      return;
  } else if (
    path.length !== 4 ||
    path[0] !== "business-development" ||
    path[1] !== "prospects" ||
    path[2] !== refusal.prospectId ||
    path[3] !== "conversion-commands" ||
    submitted.data.mode !== "new_client" ||
    submitted.data.prospectId !== refusal.prospectId
  )
    return;
  return refusal;
}
