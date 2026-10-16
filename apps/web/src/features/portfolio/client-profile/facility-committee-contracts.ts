import { z } from "zod";

/** Narrow projection of the existing Directory member detail, not a new DTO. */
const membership = z.object({
  committeeId: z.string().min(1),
  committeeName: z.string().nullable().optional(),
  person: z.object({
    personType: z.enum(["member", "staff"]),
    id: z.string().min(1),
    sourceId: z.number().int(),
  }),
  membershipType: z.enum(["member", "staff"]),
  position: z.string().nullable(),
  party: z.string().nullable(),
  rank: z.number().nullable(),
  status: z.string().nullable(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  sourceUpdatedAt: z.string().nullable(),
});

export const validCommitteeBioguide = (value: string) =>
  /^[a-z]\d{6}$/i.test(value);

export function facilityCommitteeSnapshotSchema(bioguideId: string) {
  return z
    .object({
      kind: z.literal("member"),
      id: z.string().min(1),
      source: z.object({
        snapshotId: z.string().min(1),
        memberId: z.number().int(),
        lastUpdatedAt: z.string().nullable(),
      }),
      identity: z.object({
        memberId: z.number().int(),
        bioguideId: z.string().refine(validCommitteeBioguide),
      }),
      committees: z.array(membership),
    })
    .refine(
      (value) =>
        validCommitteeBioguide(bioguideId) &&
        value.identity.bioguideId.toUpperCase() === bioguideId.toUpperCase() &&
        value.source.memberId === value.identity.memberId &&
        value.id === `member-${value.identity.memberId}` &&
        value.committees.every(
          (row) =>
            row.person.id === value.id &&
            row.person.sourceId === value.identity.memberId &&
            row.person.personType === "member" &&
            row.membershipType === "member",
        ),
      "Directory member or committee identity does not match.",
    );
}

export type FacilityCommitteeSnapshot = z.infer<
  ReturnType<typeof facilityCommitteeSnapshotSchema>
>;

/** The existing Directory owner defines current associations by an unset end date. */
export const currentCommitteeAssignments = (
  snapshot: FacilityCommitteeSnapshot,
) => snapshot.committees.filter((row) => row.endedAt === null);
