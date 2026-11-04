import { z } from "zod";

/** A selection identifies the existing owner; it never grants access or creates a client. */
export const profileSubjectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("client"), id: z.uuid() }),
  z.strictObject({ kind: z.literal("prospect"), id: z.uuid() }),
]);
export type ProfileSubject = z.infer<typeof profileSubjectSchema>;

export const profileBuildKey = (
  subject: ProfileSubject,
  actor: { tenantId: string; userId: string },
) =>
  [
    "portfolio-profile-build",
    actor.tenantId,
    actor.userId,
    subject.kind,
    subject.id,
  ] as const;

export const sameProfileSubject = (a: ProfileSubject, b: ProfileSubject) =>
  a.kind === b.kind && a.id === b.id;
