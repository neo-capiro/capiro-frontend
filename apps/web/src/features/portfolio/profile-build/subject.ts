import { z } from "zod";

export const profileSubjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("client"), id: z.uuid() }),
  z.object({ kind: z.literal("prospect"), id: z.uuid() }),
]);
export type ProfileSubject = z.infer<typeof profileSubjectSchema>;
export const sameSubject = (a: ProfileSubject, b: ProfileSubject) =>
  a.kind === b.kind && a.id === b.id;
export const profileBuildPath = (subject: ProfileSubject) =>
  `${subject.kind === "client" ? "clients" : "business-development/prospects"}/${encodeURIComponent(subject.id)}/profile-build`;
export const profileBuildKey = (subject: ProfileSubject) =>
  ["profile-build", subject.kind, subject.id] as const;
export const profileHref = (subject: ProfileSubject) =>
  `/portfolio/${subject.kind === "prospect" ? "prospects/" : ""}${encodeURIComponent(subject.id)}`;

/** Old client journals retain their original identity so pending writes remain recoverable. */
export function researchJournalKey(
  subject: ProfileSubject,
  actor: { tenantId: string; userId: string },
  kind: "start" | "review",
) {
  return JSON.stringify([
    subject.kind === "client"
      ? `client-enrichment-${kind}-v1`
      : `profile-build-prospect-${kind}-v1`,
    actor.tenantId,
    actor.userId,
    subject.id,
  ]);
}
