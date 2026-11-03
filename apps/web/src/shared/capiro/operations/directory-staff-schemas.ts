import { z } from "zod";

const text = z.string().nullish();
const method = z.object({ type: text, value: z.string(), updatedAt: text });
const position = z.object({
  title: z.string().nullable(),
  officeName: z.string().nullable(),
  isCurrent: z.boolean(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

/** Existing Portfolio contact projection; the full profile extends this owner. */
export const staffContactDetail = z.object({
  id: z.string(),
  kind: z.literal("staff"),
  emails: z.array(method),
  positions: z.array(position),
});
export const staffProfileId = z
  .string()
  .max(300)
  .regex(/^staff-[1-9]\d*$/);

/** Core DirectoryService.getStaffDetail, including roster-only staff. */
export const staffProfileDetail = staffContactDetail.extend({
  id: staffProfileId,
  identity: z.object({
    staffId: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    preferredFirstName: text,
    preferredLastName: text,
    suffix: text,
    gender: text,
  }),
  source: z.object({ lastUpdatedAt: text }).optional(),
  photoUrl: text,
  bioDetails: z
    .object({
      dob: text,
      dateOfDeath: text,
      hometown: text,
      placeOfBirth: text,
      nativeOf: text,
      majMin: text,
      partyName: text,
      occupation: text,
      pronunciation: text,
      raceName: text,
      religionName: text,
    })
    .default({}),
  socialContacts: z.array(method).default([]),
  positions: z.array(
    position.extend({
      positionType: text,
      isOnLeave: z.boolean().optional(),
      member: z
        .object({ fullName: text, party: text, state: text, district: text })
        .nullish(),
    }),
  ),
  officeAddresses: z
    .array(
      z.object({
        officeName: text,
        label: text,
        address1: text,
        address2: text,
        city: text,
        state: text,
        zip: text,
        zipExt: text,
        phone: text,
        fax: text,
        isMain: z.boolean().optional(),
        publicNotes: text,
      }),
    )
    .default([]),
  roles: z
    .array(
      z.object({
        roleName: text,
        memberName: text,
        memberId: z.number().nullish(),
      }),
    )
    .default([]),
  issues: z
    .array(
      z.object({
        issueName: text,
        memberName: text,
        memberId: z.number().nullish(),
      }),
    )
    .default([]),
  memberAssociations: z
    .array(
      z.object({
        id: z.string(),
        fullName: z.string(),
        party: text,
        state: text,
        district: text,
      }),
    )
    .default([]),
  committeeAssociations: z
    .array(
      z.object({
        committeeId: z.string(),
        committeeName: text,
        position: text,
      }),
    )
    .default([]),
});
export type StaffProfileDetail = z.infer<typeof staffProfileDetail>;

export const staffContactTrips = z.object({
  contactId: staffProfileId,
  trips: z.array(
    z.object({
      id: z.number(),
      role: z.enum(["approver", "traveler"]),
      otherPartyName: text,
      companionName: text,
      startDate: text,
      endDate: text,
      durationDays: z.number().nullable(),
      purpose: text,
      totalCost: z.number().nullable(),
      destinations: z.array(z.object({ name: text })),
      sponsors: z.array(z.object({ name: text })),
      filedDate: text,
    }),
  ),
});
