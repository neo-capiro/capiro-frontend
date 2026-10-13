/** Both representations belong to the same local editor revision. */
export interface MailBody {
  text: string;
  html: string;
}

export function plainMailHtml(text: string) {
  return text
    .split(/\r?\n/)
    .map(
      (line) =>
        `<p>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;") || "<br>"}</p>`,
    )
    .join("");
}

export function plainMailBody(text: string): MailBody {
  return { text, html: plainMailHtml(text) };
}

export function mailBodyError(body: MailBody) {
  if (!body.text.trim()) return "Enter a message.";
  if (body.text.length > 8000) return "Keep the message to 8,000 characters.";
  if (body.html.length > 40000)
    return "The formatted message is too large. Remove some formatting or shorten it.";
  return "";
}
