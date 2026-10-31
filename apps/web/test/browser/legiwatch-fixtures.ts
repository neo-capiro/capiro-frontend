import { testIdentity } from "./fixtures";
export const folder = {
  id: "synthetic-folder",
  name: "Synthetic Florida folder",
  code: null,
  archived: false,
  ownerClerkId: "test-user",
  otherUserAccess: "view",
  clientId: null,
  defaultSession: "2026",
  jurisdiction: "FL",
  version: 1,
  canEdit: true,
  canManage: true,
  count: 0,
};
const dates = { from: "2026-09-12T00:00:00Z", to: "2026-10-12T00:00:00Z" };
export const legiwatchFixtures = {
  "me.read": testIdentity,
  "clients.list": [],
  "legiwatch.folders": [folder],
  "legiwatch.folder.members": {
    members: [{ id: "test-user", name: "Synthetic User" }],
    currentActor: "test-user",
    canAssignOwner: true,
  },
  "legiwatch.rules.record": [],
  "legiwatch.rules.agenda": [],
  "legiwatch.statute.monitors": [],
  "legiwatch.keywords": [],
  "legiwatch.workflows": [],
  "legiwatch.workflow.history": [],
  "legiwatch.notificationPreferences": {
    committeeEmailEnabled: false,
    emailAddress: null,
  },
  "legiwatch.briefing.history": {
    items: [],
    nextCursor: null,
    draftLookupState: "available",
  },
  "legiwatch.editorial.configurations": {
    configurations: [],
    draftLookupState: "available",
  },
  "legiwatch.analytics.summary": {
    ...dates,
    signalsTotal: 12,
    sourceFamiliesInvolved: 2,
    clientDecisions: 1,
    billsMoved: 2,
    billsTrackedTotal: 3,
    sourceCoveragePct: null,
    sourceFamiliesCurrent: 0,
    sourceFamiliesTotal: 2,
    freshnessAt: dates.to,
  },
  "legiwatch.analytics.volume": {
    ...dates,
    total: 12,
    days: [{ date: "2026-10-12", count: 12 }],
  },
  "legiwatch.analytics.momentum": { ...dates, topics: [] },
  "legiwatch.analytics.exposure": { ...dates, rows: [] },
  "legiwatch.analytics.committees": { ...dates, total: 0, rows: [] },
  "legiwatch.analytics.coverage": {
    freshnessAt: dates.to,
    sources: [
      {
        family: "Synthetic Florida law",
        coveragePct: null,
        total: 12,
        lastSyncedAt: null,
      },
    ],
  },
};
