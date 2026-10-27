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
    quoted.length <= 5000;
  const date = original.sentAt ?? original.receivedAt ?? original.createdAt;
  let shortened = false;
  function header(value: string, limit: number) {
    const singleLine = value.replace(/[\r\n]+/g, " ");
    if (singleLine.length <= limit) return singleLine;
    shortened = true;
    return singleLine.slice(0, limit) + "…";
  }
  const sender = header(original.fromEmail ?? "Unknown sender", 254);
  const name = header(original.fromName ?? "", 160);
  const metadata = `From: ${name ? `${name} <${sender}>` : sender}\nDate: ${header(date, 60)}\nSubject: ${header(original.subject ?? "(no subject)", 300)}`;
  const partial = !complete || shortened;
  const heading = partial
    ? "Original message excerpt — some headers or text are omitted"
    : "Original message";
  return `\n\n${heading}\n${metadata}\n\n${quoted.slice(0, 5000)}${partial ? "\n[Excerpt ends]" : ""}`;
}
