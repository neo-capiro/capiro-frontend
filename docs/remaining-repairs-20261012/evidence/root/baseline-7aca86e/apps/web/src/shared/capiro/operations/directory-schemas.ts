import { z } from "zod";

const text = z.string().nullish();
export const directoryId = z.string().min(1).max(300);
export const directoryPaging = z
  .object({
    q: z.string().max(500).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(200).optional(),
    chamber: z.string().optional(),
    state: z.string().optional(),
    issue: z.string().optional(),
    role: z.string().optional(),
    committee: z.string().optional(),
    party: z.string().optional(),
    sort: z.string().optional(),
  })
  .strict();
export const directoryStaff = z.object({
  id: z.string(),
  fullName: z.string(),
  title: text,
  email: text,
  phone: text,
  officeLocation: text,
  roles: z.array(z.string()).optional(),
  issueAreas: z.array(z.string()).optional(),
  isCurrent: z.boolean().optional(),
});
export const directoryContact = z.object({
  id: z.string(),
  fullName: z.string(),
  memberName: text,
  chamber: text,
  state: text,
  district: text,
  party: text,
  title: text,
  officeLocation: text,
  phone: text,
  email: text,
  photoUrl: text,
  focusAreas: z.array(z.string()).optional(),
  committees: z.array(z.string()).optional(),
  leadershipPositions: z.array(z.string()).optional(),
  staff: z.array(directoryStaff),
  bio: z
    .object({
      narrative: text,
      education: text,
      military: text,
      hometown: text,
      occupation: text,
    })
    .optional(),
  recentInteractions: z
    .array(
      z.object({ date: z.string(), channel: z.string(), summary: z.string() }),
    )
    .optional(),
  officialLinks: z
    .array(z.object({ label: z.string(), url: z.string(), type: z.string() }))
    .optional(),
  addresses: z
    .array(
      z.object({
        id: z.string(),
        title: text,
        address1: text,
        address2: text,
        city: text,
        state: text,
        zip: text,
        phone: text,
        isMain: z.boolean(),
      }),
    )
    .optional(),
});
export const directoryContactsResponse = z.object({
  contacts: z.array(directoryContact),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totals: z.object({
    all: z.number(),
    house: z.number(),
    senate: z.number(),
    governors: z.number(),
    staff: z.number(),
  }),
  availableStates: z.array(z.string()),
  availableFilters: z.object({
    chambers: z.array(z.string()),
    parties: z.array(z.object({ value: z.string(), label: z.string() })),
    committees: z.array(z.string()),
    issues: z.array(z.string()),
    roles: z.array(z.string()),
    states: z.array(z.string()),
  }),
});
export const directoryCommittee = z.object({
  id: z.string(),
  name: z.string(),
  chamber: z.string(),
  kind: z.string(),
  staffCount: z.number(),
  phone: text,
  officeLocation: text,
  chair: z.object({ id: z.string(), name: z.string() }).nullable(),
  rankingMember: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export const directoryCommitteesResponse = z.object({
  committees: z.array(directoryCommittee),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export const directoryCommitteeStaffResponse = z.object({
  staff: z.array(directoryStaff),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export const directoryNote = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  createdBy: z
    .object({
      id: z.string(),
      email: z.string(),
      firstName: text,
      lastName: text,
    })
    .nullable(),
});
export const stateCommittee = z.object({
  id: z.string(),
  name: z.string(),
  chamber: text,
  role: text,
});
export const stateLegislator = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  chamber: text,
  district: text,
  party: text,
  email: text,
  image: text,
  url: text,
  committeeCount: z.number(),
  billCount: z.number().nullable(),
  enactedCount: z.number().nullable(),
  committees: z.array(stateCommittee).optional(),
});
export const stateListResponse = z.object({
  rows: z.array(stateLegislator),
  total: z.number(),
});
export const personnel = z.object({
  id: z.string(),
  fullName: z.string(),
  service: text,
  organization: text,
  title: text,
  role: text,
  pePrimary: text,
  peSecondary: z.array(z.string()),
  email: text,
  phone: text,
  publicProfileUrl: text,
  confidence: z.number(),
  status: z.string(),
  sourceCount: z.number(),
  lastSeenAt: z.string(),
});
export const personnelList = z.object({
  data: z.array(personnel),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type DirectoryContact = z.infer<typeof directoryContact>;
export type DirectoryCommittee = z.infer<typeof directoryCommittee>;
export type DirectoryStaff = z.infer<typeof directoryStaff>;
export type StateLegislator = z.infer<typeof stateLegislator>;
