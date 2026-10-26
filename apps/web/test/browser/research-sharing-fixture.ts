import type { ResearchDetail } from "../../src/shared/capiro/operations/research-schemas";
import type { ResearchShareDashboard } from "../../src/shared/capiro/operations/research-share-schemas";

export const ids = {
  portfolio: "10000000-0000-4000-8000-000000000001",
  client: "10000000-0000-4000-8000-000000000002",
  snapshot: "10000000-0000-4000-8000-000000000003",
  design: "10000000-0000-4000-8000-000000000004",
  link: "10000000-0000-4000-8000-000000000005",
};
export const timestamp = "2026-10-26T12:00:00.000Z";
export const shareToken = "b".repeat(64);
export const hostileText =
  '<img src="https://external.invalid/pixel" onerror="alert(1)">';
export const portfolio: ResearchDetail = {
  id: ids.portfolio,
  name: "Synthetic research",
  purpose: null,
  mode: "manual",
  lifecycle: "active",
  revision: 1,
  ownerUserId: "owner",
  memberCount: 0,
  clientLinkCount: 1,
  myRole: "owner",
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  members: [],
  grants: [],
  recentEvents: [],
  clientLinks: [
    {
      id: "association",
      clientId: ids.client,
      clientName: "Synthetic client",
      linkedByUserId: "owner",
      createdAt: timestamp,
    },
  ],
};
const basis = {
  requestEdition: "FY2027",
  fundingFiscalYear: 2027,
  stage: "requested",
  metric: "funding",
  unit: "usd_millions",
  currency: "USD",
  priceBasis: "current",
  knownAt: timestamp,
};
export const dashboard: ResearchShareDashboard = {
  schemaVersion: 1,
  portfolioName: portfolio.name,
  portfolioPurpose: null,
  asOf: timestamp,
  preparedFor: { clientName: "Synthetic client" },
  branding: { firmName: "Synthetic firm", logoAvailable: false },
  layout: {
    columns: 12,
    widgets: [
      { id: "header", kind: "header", x: 0, y: 0, w: 12, h: 2, settings: {} },
      {
        id: "totals",
        kind: "key_totals",
        x: 0,
        y: 2,
        w: 12,
        h: 4,
        settings: {},
      },
      {
        id: "comment",
        kind: "commentary",
        x: 0,
        y: 6,
        w: 6,
        h: 3,
        settings: { title: "Commentary", text: hostileText },
      },
      {
        id: "mark",
        kind: "image",
        x: 6,
        y: 6,
        w: 6,
        h: 3,
        settings: {
          src: "https://external.invalid/logo",
          caption: hostileText,
        },
      },
    ],
    phoneOrder: ["header", "totals", "comment", "mark"],
  },
  data: {
    totals: [
      { basis, value: "9007199254740993.123456", contributionCount: 1 },
      {
        basis: { ...basis, priceBasis: "constant FY2024" },
        value: "20.000001",
        contributionCount: 1,
      },
    ],
    contributions: [],
    subjects: [],
    sources: [],
    changes: [],
    comparison: null,
    clientFit: null,
    limitations: ["Totals are partitioned by price basis."],
    coverage: {
      eligibleMembers: 0,
      supportedMembers: 0,
      includedContributions: 0,
      excludedContributions: 0,
      overlapContributions: 0,
      unavailableMembers: 0,
    },
  },
  snapshot: {
    id: ids.snapshot,
    name: "Synthetic snapshot",
    capturedAt: timestamp,
    portfolioRevision: 1,
    calculationVersion: "v2",
  },
  publishedAt: timestamp,
  expiresAt: "2026-11-02T12:00:00.000Z",
};
export const design = {
  id: ids.design,
  portfolioId: ids.portfolio,
  name: "Client dashboard",
  version: 1,
  layout: dashboard.layout,
  createdByUserId: "owner",
  updatedByUserId: "owner",
  createdAt: timestamp,
  updatedAt: timestamp,
};
export const link = {
  id: ids.link,
  portfolioId: ids.portfolio,
  clientId: ids.client,
  clientName: "Synthetic client",
  snapshotId: ids.snapshot,
  snapshotName: "Synthetic snapshot",
  designId: ids.design,
  designVersion: 1,
  branding: true,
  status: "active",
  publishedByUserId: "owner",
  publishedAt: timestamp,
  expiresAt: dashboard.expiresAt,
  revokedAt: null,
  openCount: 0,
  lastOpenedAt: null,
  failedPinAttempts: 0,
};
