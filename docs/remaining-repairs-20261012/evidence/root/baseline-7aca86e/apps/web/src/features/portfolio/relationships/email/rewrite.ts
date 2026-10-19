import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";

export type MailRewriteInput = {
  rawText: string;
  recipientName: string;
  recipientTitle?: string;
};

/** The existing rewrite contract; cancellation only stops this local attempt. */
export async function requestMailRewrite(
  api: ApiClient,
  input: MailRewriteInput,
  signal: AbortSignal,
  assertCurrent: () => void,
) {
  signal.throwIfAborted();
  assertCurrent();
  const result = await api.request(
    "core",
    "engagement/mail/rewrite",
    z.object({ bodyHtml: z.string(), verified: z.boolean() }),
    { method: "POST", body: input, signal },
  );
  signal.throwIfAborted();
  assertCurrent();
  return result;
}

/** Preserve the compose field's plain-text rendering at the rewrite boundary. */
export function rewrittenMailText(bodyHtml: string, original: string) {
  const document = new DOMParser().parseFromString(bodyHtml, "text/html");
  document.querySelectorAll("script,style").forEach((node) => node.remove());
  document.querySelectorAll("p,div,li,br").forEach((node) => node.append("\n"));
  return document.body.textContent?.trim() ?? original;
}
