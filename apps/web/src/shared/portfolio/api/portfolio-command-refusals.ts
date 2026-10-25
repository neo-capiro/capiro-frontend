import { z } from "zod";

const binding = {
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
};
const refusalSchema = z.discriminatedUnion("code", [
  z.strictObject({
    ...binding,
    code: z.literal("FILE_BATCH_MOVE_REFUSED"),
    clientId: z.uuid(),
    status: z.union([z.literal(400), z.literal(404), z.literal(409)]),
    message: z.string().min(1).max(500),
  }),
  z
    .object({
      ...binding,
      code: z.literal("ACTIVITY_UNDO_REFUSED"),
      commandId: z.uuid(),
      creationRequestId: z.uuid(),
      tenantId: z.uuid(),
      clientId: z.uuid(),
      actorUserId: z.uuid(),
      activityId: z.uuid(),
      status: z.literal(409),
      message: z.string().min(1).max(500),
    })
    .strict(),
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
  if (service !== "core" || !["POST", "GET"].includes(method)) return;
  const parsed = refusalSchema.safeParse(payload);
  if (!parsed.success || parsed.data.status !== status) return;
  if (method === "GET") {
    const refusal = parsed.data;
    if (
      refusal.code !== "FILE_BATCH_MOVE_REFUSED" ||
      path.length !== 5 ||
      path[0] !== "clients" ||
      path[1] !== refusal.clientId ||
      path[2] !== "files" ||
      path[3] !== "batch-moves" ||
      path[4] !== refusal.requestId
    )
      return;
    return refusal;
  }
  if (!body) return;
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
  if (refusal.code === "FILE_BATCH_MOVE_REFUSED") {
    if (
      path.length !== 4 ||
      path[0] !== "clients" ||
      path[1] !== refusal.clientId ||
      path[2] !== "files" ||
      path[3] !== "batch-moves" ||
      submitted.data.clientId !== refusal.clientId
    )
      return;
  } else if (refusal.code === "ACTIVITY_UNDO_REFUSED") {
    if (
      path.length !== 5 ||
      path[0] !== "clients" ||
      path[1] !== refusal.clientId ||
      path[2] !== "activity-commands" ||
      path[3] !== refusal.creationRequestId ||
      path[4] !== "undo" ||
      submitted.data.activityId !== refusal.activityId
    )
      return;
  } else if (refusal.code === "DIRECTORY_NOTE_REFUSED") {
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
