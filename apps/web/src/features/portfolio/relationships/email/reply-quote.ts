import type { MailBody } from "./read";
/** Visible draft text only: the reviewed outgoing body remains the complete send authority. */
export function replyQuote(original: MailBody | undefined): string {
  if (!original || !original.bodyStoredPresent || !original.bodyText) return "";
  const quoted = original.bodyText
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
  const complete =
    original.bodyCompleteness === "full" &&
    !original.bodyTruncated &&
    original.bodyOffset === 0 &&
    quoted.length <= 6000;
  const date = original.sentAt ?? original.receivedAt ?? original.createdAt;
  const heading = `${complete ? "Original message" : "Original message excerpt — stored text is incomplete"}\nFrom: ${original.fromName ? `${original.fromName} <${original.fromEmail ?? "unknown"}>` : (original.fromEmail ?? "Unknown sender")}\nDate: ${date}\nSubject: ${original.subject ?? "(no subject)"}`;
  return `\n\n${heading}\n\n${quoted.slice(0, 6000)}${quoted.length > 6000 ? "\n[Excerpt ends]" : ""}`;
}
