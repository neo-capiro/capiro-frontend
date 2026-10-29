import { z } from "zod";
import type { ClientMeriHandoff } from "../meri-conversations/client-handoff";

/**
 * The existing same-tab client handoff refuses a draft longer than this. The starter keeps the
 * identical bound so a draft it accepts can never be refused by the mounted receiver.
 */
export const meriHandoffDraftLimit = 32_000;

/**
 * A typed client-bound artifact draft. The starter validates these fields before handing the
 * unsent draft to the existing client conversation receiver. This is not a document write.
 */
export const artifactStarterDraftSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  format: z.enum(["docx", "txt"]),
  body: z.string().max(meriHandoffDraftLimit),
});
export type ArtifactStarterDraft = z.infer<typeof artifactStarterDraftSchema>;

export const emptyArtifactStarterDraft = (): ArtifactStarterDraft => ({
  title: "",
  format: "docx",
  body: "",
});

/** Form guidance only; the document owner still validates every created version. */
export function artifactStarterProblem(
  draft: ArtifactStarterDraft,
): string | null {
  if (!draft.title.trim()) return "Enter a document title.";
  if (draft.title.length > 200)
    return "Use a title of 200 characters or fewer.";
  // The bound is the whole handed-off draft, not just the body: the receiver measures the message.
  if (artifactStarterMessage(draft).trim().length > meriHandoffDraftLimit)
    return `This draft is longer than the ${meriHandoffDraftLimit} character limit Meri accepts. Shorten the starting content.`;
  if (draft.format === "docx" && draft.body.split(/\r\n|\r|\n/).length > 1000)
    return "DOCX text supports up to 1,000 paragraphs. Each line becomes a paragraph.";
  return null;
}

/**
 * The typed message handed to the client conversation. It asks Meri to prepare a reviewable
 * document draft. Sending, saving and filing remain the person's explicit later actions.
 */
export function artifactStarterMessage(draft: ArtifactStarterDraft): string {
  return [
    `Draft a ${draft.format.toUpperCase()} document titled "${draft.title}".`,
    "Do not save or file it yet; prepare a reviewable draft I can inspect.",
    draft.body
      ? `Starting content:\n\n${draft.body}`
      : "Start from the current client context.",
  ].join("\n\n");
}

/**
 * Write the typed artifact draft into the existing client-scoped same-tab handoff. The mounted
 * ClientHandoffDraft receiver reads it after the conversation is admitted. Nothing is sent.
 */
export function continueArtifactStarter({
  draft,
  clientId,
  writeHandoff,
}: {
  draft: ArtifactStarterDraft;
  clientId: string;
  writeHandoff: (handoff: ClientMeriHandoff) => void;
}): ClientMeriHandoff {
  const problem = artifactStarterProblem(draft);
  if (problem) throw new Error(problem);
  const handoff: ClientMeriHandoff = {
    clientId,
    draft: artifactStarterMessage(draft),
  };
  writeHandoff(handoff);
  return handoff;
}
