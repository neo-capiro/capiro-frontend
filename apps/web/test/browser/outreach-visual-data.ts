import type { OutreachDraftVersion } from "../../src/shared/capiro/operations/outreach-campaign-schemas";
import type { OperationResponse } from "../../src/shared/capiro/contracts";
import type { capiroOperations } from "../../src/shared/capiro/registry";
import { newCampaign } from "../../src/features/modules/engagement/outreach/campaign-model";
import { moduleRouteFixtures } from "./module-route-fixtures";
// Explicit synthetic records; these IDs never refer to a live account.
export const clientId = "10000000-0000-4000-8000-000000000001";
export const recordId = "40000000-0000-4000-8000-000000000004";
export const simpleDraftId = "50000000-0000-4000-8000-000000000005";
export const savedDraftId = "60000000-0000-4000-8000-000000000006";
export const mailboxId = "80000000-0000-4000-8000-000000000008";
export const artifactId = "90000000-0000-4000-8000-000000000009";
export const recipient = {
  id: "synthetic-staff",
  name: "Synthetic staff contact",
  email: "staff@example.test",
  kind: "individual" as const,
  role: "to" as const,
};
export const generationKey = `individual:${recipient.id}`;
export const campaign = {
  id: recordId,
  revision: 3,
  updatedAt: "2026-10-27T00:00:00Z",
  status: "draft",
  state: {
    ...newCampaign(clientId),
    title: "Synthetic staff briefing",
    mainIdea: "Request a briefing about district impact.",
    recipients: [recipient],
    sender: { connectionId: mailboxId, signature: "" },
    lastStep: 7,
  },
};
export const current: OutreachDraftVersion = {
  id: "90000000-0000-4000-8000-000000000010",
  artifactId,
  outreachRecordId: recordId,
  version: 1,
  sourceVersionId: null,
  generationKey,
  recipientKey: recipient.id,
  audienceKind: "individual",
  subject: "Request for a district briefing",
  body: "Hello,\n\nI would welcome a short briefing on current district priorities. Please let me know a convenient time.\n\nThank you.",
  contentHash: "synthetic-content-hash",
  generationStatus: "generated",
  auditStatus: "passed",
  approvalStatus: "not_required",
  auditDecision: null,
  auditChecks: [],
  reviewRequestId: null,
  provider: null,
  model: null,
  promptSpecVersion: null,
  sendable: true,
  createdAt: "2026-10-27T00:00:00Z",
};

const simple = {
  id: simpleDraftId,
  title: "Synthetic existing outreach draft",
  type: "follow_up",
  status: "draft",
  subject: "Synthetic saved briefing request",
  body: "Hello,\n\nPlease let me know a convenient time for a district briefing.\n\nThank you.",
  client: { id: clientId, name: "Synthetic client" },
};
export const outreachVisualRecords = [
  simple,
  { ...simple, id: savedDraftId, title: "Synthetic confirmed saved draft" },
];
const state = {
  ...campaign.state,
  templateId: "synthetic-meeting-template",
  contextItems: [
    {
      id: "synthetic-note",
      kind: "note" as const,
      scope: "campaign" as const,
      customNoteText: "Synthetic district briefing background.",
      noteUse: "fact" as const,
    },
  ],
};
export const outreachVisualReads = {
  "engagement.campaign": { ...campaign, state },
  "engagement.campaigns": {
    items: [
      {
        ...campaign,
        state,
        createdAt: campaign.updatedAt,
        sentAt: null,
        category: "drafts" as const,
        recordedSendStatus: null,
        client: simple.client,
        type: "campaign",
        hasWorkflow: true,
        recipientCount: 1,
        draftReadiness: { total: 1, ready: 1 },
        delivery: null,
      },
    ],
    nextCursor: null,
  },
  "engagement.outreach.records": {
    items: outreachVisualRecords.map((row) => ({ ...row, hasWorkflow: false })),
    nextCursor: null,
  },
  "engagement.campaign.templates": [
    {
      id: "synthetic-meeting-template",
      source: "system" as const,
      name: "Synthetic meeting request",
      category: "meetings",
      prompt: "Synthetic inert template text",
      description: "Request a short meeting with a clear ask.",
      samplePreview: "Hello, I would welcome a short briefing.",
      tone: "professional",
      usageCount: 0,
    },
  ],
  "engagement.campaign.library": {
    documents: [
      {
        id: "synthetic-document",
        clientId,
        clientName: "Synthetic client",
        title: "Synthetic district briefing",
        body: "Synthetic context only.",
        tag: "Document",
      },
    ],
    debriefs: [
      {
        id: "synthetic-meeting",
        clientId,
        clientName: "Synthetic client",
        title: "Synthetic meeting notes",
        tag: "Meeting",
      },
    ],
    preps: [],
  },
  "engagement.campaign.attachments": [],
  "engagement.campaign.audiences": [],
  "directory.contacts": {
    ...moduleRouteFixtures["directory.contacts"],
    contacts: [
      {
        id: recipient.id,
        fullName: recipient.name,
        email: recipient.email,
        title: "Synthetic legislative staff",
        staff: [],
      },
    ],
    total: 1,
    totals: { all: 1, house: 0, senate: 0, governors: 0, staff: 1 },
  },
  "engagement.campaign.drafts": [
    {
      id: artifactId,
      outreachRecordId: recordId,
      generationKey,
      recipientKey: recipient.id,
      audienceKind: "individual",
      recipientSnapshot: { name: recipient.name, email: recipient.email },
      currentVersion: 1,
      current,
      history: [],
    },
  ],
  "engagement.newsletter.mailboxes": [
    {
      id: mailboxId,
      provider: "google_workspace",
      accountEmail: "sender@example.test",
      displayName: "Synthetic sender",
      availability: "available",
      signaturePolicy: "actor",
    },
  ],
} satisfies {
  [Key in keyof typeof capiroOperations]?: OperationResponse<
    (typeof capiroOperations)[Key]
  >;
};
export const outreachVisualFrames = [
  {
    node: "3220:125865",
    name: "campaigns",
    route: "/modules/engagement",
    heading: "Outreach",
  },
  ...(
    [
      [1, "3220:126118", "direction"],
      [2, "3220:126342", "campaign-setup"],
      [3, "3220:126593", "recipients"],
      [4, "3220:126882", "context-plan"],
      [5, "3220:127099", "context-builder"],
      [6, "3220:127373", "generate-review"],
      [7, "3220:127624", "send"],
    ] as const
  ).map(([step, node, name]) => ({
    node,
    name,
    route: `/modules/engagement?session=${recordId}&step=${step}`,
    heading: campaign.state.title,
  })),
  {
    node: "3223:130732",
    name: "existing-draft",
    route: `/modules/engagement?clientId=${clientId}&draft=${simpleDraftId}&detail=overview`,
    heading: "Outreach draft",
  },
  {
    node: "3223:130894",
    name: "saved",
    route: `/modules/engagement?clientId=${clientId}&draft=${savedDraftId}&detail=overview`,
    heading: "Outreach draft",
    status: "Draft saved.",
  },
  {
    node: "3223:131061",
    name: "filters",
    route: "/modules/engagement",
    heading: "Filter outreach",
    action: "More filters",
  },
  {
    node: "3226:130944",
    name: "mobile-review",
    route: `/modules/engagement?session=${recordId}&step=6`,
    heading: campaign.state.title,
    width: 390,
  },
] as const;
