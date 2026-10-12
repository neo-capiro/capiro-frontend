import type {
  MatterDetail,
  TimelineEntry,
} from "../src/features/portfolio/advocacy/contracts";
export const advocacyClientId = "10000000-0000-4000-8000-000000000001";
export const advocacyMatterId = "a0000000-0000-4000-8000-000000000001";
export const advocacyOtherId = "a0000000-0000-4000-8000-000000000002";
export const advocacyIdentity = {
  user: { id: "user-test", email: "test@example.test" },
  tenant: { id: "tenant-test", name: "Synthetic tenant" },
  role: "user_admin",
};
export const advocacyMatter: MatterDetail = {
  id: advocacyMatterId,
  title: "Synthetic funding matter",
  matterType: "funding_request",
  status: "active",
  summary: "Sensor appropriation review",
  primaryPeCode: "0604134A",
  primaryBillId: "hr-987",
  openedAt: "2026-10-01T12:00:00Z",
  lastActivityAt: "2026-10-10T12:00:00Z",
  updatedAt: "2026-10-10T12:00:00Z",
  recordCount: 1,
  outcomeCount: 1,
  linkCount: 0,
  records: [
    {
      id: "b0000000-0000-4000-8000-000000000001",
      recordType: "meeting",
      title: "Synthetic meeting evidence",
      summary: "Reviewed meeting note",
      activityDate: "2026-10-09T12:00:00Z",
      sourceType: "meeting",
      sourceUrl: null,
      evidenceClass: "INFERRED",
      confidence: 0.74,
      outcome: "observed",
    },
  ],
  links: [],
};
export const advocacyOther: MatterDetail = {
  ...advocacyMatter,
  id: advocacyOtherId,
  title: "Synthetic regulatory matter",
  status: "monitoring",
  summary: "Safety requirements",
  primaryPeCode: null,
  primaryBillId: null,
  records: [],
  recordCount: 0,
  outcomeCount: 0,
};
export const advocacyEvents: TimelineEntry[] = Array.from(
  { length: 6 },
  (_, index): TimelineEntry => ({
    id: `b0000000-0000-4000-8000-00000000000${index + 1}`,
    kind: index === 2 ? "link" : "record",
    title: [
      "Synthetic meeting evidence",
      "Synthetic correspondence",
      "Synthetic legislative evidence",
      "Synthetic unassigned record",
      "Synthetic unknown association",
      "Synthetic undated evidence",
    ][index]!,
    subtype: ["meeting", "email", "bill", "note", "other", "document"][index]!,
    date: index === 5 ? null : `2026-10-0${9 - index}T12:00:00Z`,
    evidenceClass: "INFERRED",
    confidence: 0.74,
    matterId:
      index === 3
        ? null
        : index === 4
          ? "a0000000-0000-4000-8000-000000000009"
          : index === 1
            ? advocacyOtherId
            : advocacyMatterId,
    matterTitle:
      index === 3
        ? null
        : index === 4
          ? null
          : index === 1
            ? advocacyOther.title
            : advocacyMatter.title,
    attributionNeedsReview: index === 3,
  }),
);
