const mailboxGuidance =
  "Incoming files could not be read. Open the original message in your mailbox.";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Core's fixed read refusal only; no provider diagnostics or successful manifest is forwarded. */
export function incomingMailFilesReadRefusal(
  service: string,
  method: string,
  path: string[],
  status: number,
  payload: unknown,
): string | undefined {
  if (
    service !== "core" ||
    method !== "GET" ||
    status !== 503 ||
    path.length !== 7 ||
    path[0] !== "engagement" ||
    path[1] !== "mail" ||
    path[2] !== "threads" ||
    !uuid.test(path[3] ?? "") ||
    path[4] !== "messages" ||
    !uuid.test(path[5] ?? "") ||
    path[6] !== "files"
  )
    return;
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "message" in payload &&
    payload.message === mailboxGuidance
  )
    return mailboxGuidance;
}
