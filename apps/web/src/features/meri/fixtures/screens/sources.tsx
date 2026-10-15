import { EvidenceSourcesScreen } from "../../screens/sources/EvidenceSourcesScreen";
import type { EvidenceSource } from "../../screens/sources/EvidenceDetail";
import {
  DataCoverageScreen,
  type DataCoverageView,
  type SourceDomainRow,
} from "../../screens/sources/DataCoverageScreen";
import {
  CoverageDetailsScreen,
  type CoverageDetailsView,
} from "../../screens/sources/CoverageDetailsScreen";
import {
  FundingEvidenceScreen,
  type FundingEvidenceView,
} from "../../screens/sources/FundingEvidenceScreen";
import { AccessChangedScreen } from "../../screens/sources/AccessChangedScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const retrieved = "9 Oct 2026, 10:44 AM";
const evidenceSources: readonly EvidenceSource[] = [
  {
    id: "funding",
    title: "[1] Public funding update",
    meta: "Public source · Published 8 Oct · Current",
    summary: "Official publication used for funding context.",
    status: { label: "Current record", tone: "success" },
    fields: [
      { label: "Scope", value: "Public · Official public sources" },
      { label: "Source type", value: "Official publication" },
      { label: "Record reference", value: "PUB-2048" },
      { label: "Last changed", value: "8 Oct 2026" },
      { label: "Retrieved", value: retrieved },
      {
        label: "Coverage",
        value: "Selected publication and its linked document",
      },
    ],
    recordReference: "PUB-2048",
    excerpt: "The FY27 funding position is published for the program line.",
    limit:
      "This source provides public funding context. It does not establish client priorities.",
  },
  {
    id: "task",
    title: "[2] Restoration request",
    meta: "Client task · Updated 8 Oct · Current",
    summary: "Open commitment from an authorized client record.",
    status: { label: "Current record", tone: "success" },
    fields: [
      { label: "Scope", value: "Anduril · Authorized client team" },
      { label: "Source type", value: "Task record" },
      { label: "Record reference", value: "TASK-2047" },
      { label: "Last changed", value: "8 Oct 2026, 4:10 PM" },
      { label: "Retrieved", value: retrieved },
      { label: "Coverage", value: "All 2 task result pages read" },
    ],
    recordReference: "TASK-2047",
    excerpt: "Confirm the owner and timing for the restoration request.",
    limit:
      "This source supports the commitment status. It does not establish an approved outreach plan.",
  },
  {
    id: "strategy",
    title: "[3] Strategy review",
    meta: "Meeting note · 7 Oct · Current",
    summary: "Client discussion and follow-up context.",
    status: { label: "Current record", tone: "success" },
    fields: [
      { label: "Scope", value: "Anduril · Authorized client team" },
      { label: "Source type", value: "Meeting note" },
      { label: "Record reference", value: "NOTE-1180" },
      { label: "Last changed", value: "7 Oct 2026, 3:30 PM" },
      { label: "Retrieved", value: retrieved },
      {
        label: "Coverage",
        value: "1 of 1 page · 1 encrypted attachment excluded",
      },
    ],
    recordReference: "NOTE-1180",
    excerpt:
      "The client asked for a concise brief with direct source references.",
    limit:
      "This source records the discussion. It does not confirm follow-up owners.",
  },
  {
    id: "mailbox",
    title: "[4] Mailbox thread",
    meta: "Connected mailbox · Current through 10:32 AM · Delayed",
    summary: "Scheduling messages for the meeting.",
    status: { label: "Refresh delayed", tone: "warning" },
    fields: [
      { label: "Scope", value: "Jordan’s permitted mailbox" },
      { label: "Source type", value: "Email thread" },
      { label: "Record reference", value: "MAIL-3307" },
      { label: "Last changed", value: "9 Oct 2026, 10:20 AM" },
      { label: "Retrieved", value: "9 Oct 2026, 10:32 AM" },
      { label: "Coverage", value: "2 of 2 pages · Refresh delayed 12 minutes" },
    ],
    recordReference: "MAIL-3307",
    excerpt: "Tuesday at 2 PM works for the program review.",
    limit:
      "Mail is current through 10:32 AM. Later messages may not be reflected.",
  },
  {
    id: "calendar",
    title: "[5] Meeting invitation",
    meta: "Calendar record · Updated 6 Oct · Current",
    summary: "Meeting time, attendees and agenda.",
    status: { label: "Current record", tone: "success" },
    fields: [
      { label: "Scope", value: "Authorized calendars" },
      { label: "Source type", value: "Calendar event" },
      { label: "Record reference", value: "CAL-0912" },
      { label: "Last changed", value: "6 Oct 2026, 9:05 AM" },
      { label: "Retrieved", value: "9 Oct 2026, 10:35 AM" },
      { label: "Coverage", value: "Selected event only" },
    ],
    recordReference: "CAL-0912",
    excerpt: "Program review with the Anduril client team.",
    limit:
      "This source confirms the meeting. It does not record what was decided.",
  },
  {
    id: "previous-funding",
    title: "[6] Previous funding position",
    meta: "Public source · Valid 1 Sep–7 Oct · Superseded",
    summary: "Earlier position kept as labeled history.",
    status: { label: "Historical", tone: "warning" },
    fields: [
      { label: "Scope", value: "Public · Qualified retained history" },
      { label: "Source type", value: "Official publication" },
      { label: "Record reference", value: "PUB-1977" },
      { label: "Last changed", value: "1 Sep 2026" },
      { label: "Retrieved", value: retrieved },
      { label: "Coverage", value: "Qualified retained period" },
    ],
    recordReference: "PUB-1977",
    excerpt: "The FY27 position will be confirmed in a later publication.",
    limit:
      "Replaced by the 8 Oct publication. It is not presented as a current fact.",
  },
];

const domain = (
  id: string,
  name: string,
  availability: string,
  lastRefresh: string,
  scope: string,
): SourceDomainRow => ({ id, domain: name, availability, lastRefresh, scope });

const dataCoverage: DataCoverageView = {
  client: "Anduril",
  domains: [
    domain(
      "clients",
      "Client and relationship records",
      "Available",
      "Just now",
      "Anduril",
    ),
    domain(
      "memory",
      "Institutional memory",
      "Available",
      "Just now",
      "Approved + permitted private",
    ),
    domain(
      "documents",
      "Documents and files",
      "Available",
      "10:40 AM",
      "Authorized folders",
    ),
    domain(
      "tasks",
      "Tasks and commitments",
      "Available",
      "Just now",
      "Anduril",
    ),
    domain(
      "meetings",
      "Meeting and calendar records",
      "Available",
      "10:35 AM",
      "Authorized calendars",
    ),
    domain(
      "mailbox",
      "Connected mailbox",
      "Degraded",
      "10:32 AM",
      "Jordan’s permitted mailbox",
    ),
    domain(
      "public",
      "Public intelligence",
      "Available",
      "8 Oct",
      "Official public sources",
    ),
    domain(
      "history",
      "Historical source records",
      "Partial",
      "—",
      "Qualified retained history",
    ),
  ],
  enabledActions: [
    "Propose a memory update",
    "Create an authorized task",
    "File an artifact version",
  ],
};

const coverageDetails: CoverageDetailsView = {
  delay: {
    title: "Some mailbox results are delayed",
    detail:
      "Mail is current through 10:32 AM. Client tasks and memory were checked at 10:44 AM.",
  },
  queries: [
    {
      id: "tasks",
      query: "Client tasks · Last 30 days",
      results: "23 records",
      coverage: "2 of 2 pages",
      limitation: "Complete for selected range",
    },
    {
      id: "notes",
      query: "Meeting notes · Last 30 days",
      results: "7 records",
      coverage: "1 of 1 page",
      limitation: "1 encrypted attachment excluded",
    },
    {
      id: "mailbox",
      query: "Mailbox · Selected client",
      results: "18 messages",
      coverage: "2 of 2 pages",
      limitation: "Refresh delayed 12 minutes",
    },
    {
      id: "funding",
      query: "Historical funding records",
      results: "0 matching records",
      coverage: "Qualified retained period",
      limitation: "No matches within this period",
    },
  ],
  historical: {
    title: "Previous funding position · Superseded",
    detail:
      "Valid 1 Sep–7 Oct 2026 · Replaced by the 8 Oct publication. Historical records remain labeled and are not presented as current facts.",
  },
};

const fundingEvidence: FundingEvidenceView = {
  title: "[1] Public funding update",
  description: "Current public evidence · Retrieved 9 Oct, 10:44 AM",
  fields: [
    { label: "Source", value: "Official public funding publication" },
    { label: "Record reference", value: "PUB-2048" },
    { label: "Published", value: "8 Oct 2026" },
    { label: "Retrieved", value: retrieved },
    { label: "Status", value: "Current · Latest publication in checked scope" },
    { label: "Access", value: "Public source" },
    {
      label: "Coverage",
      value: "Selected official publication and its linked document",
    },
  ],
  usage:
    "It provides public funding context. Client priorities and recommended next actions remain separate, sourced conclusions.",
};

export const sourceScreens: readonly FixtureScreen[] = [
  {
    slug: "evidence-sources",
    figmaId: "05.01",
    figmaNode: "1064:146715",
    title: "Evidence and citations",
    Screen: () => (
      <EvidenceSourcesScreen
        view={{
          title: "Sources for the meeting brief",
          description: "6 sources · Retrieved 9 Oct, 10:44 AM · Anduril scope",
          sources: evidenceSources,
          visibleCount: 3,
          initialSourceId: "task",
        }}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "data-coverage",
    figmaId: "05.02",
    figmaNode: "1064:146817",
    title: "Data coverage and capabilities",
    Screen: () => (
      <DataCoverageScreen
        view={dataCoverage}
        limitationsHref={fixtureHref("coverage-details")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "coverage-details",
    figmaId: "05.03",
    figmaNode: "1064:146948",
    title: "Freshness, partial and historical results",
    Screen: () => (
      <CoverageDetailsScreen
        view={coverageDetails}
        connectorsHref={fixtureHref("data-coverage")}
        currentEvidenceHref={fixtureHref("funding-evidence")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "access-changed",
    figmaId: "05.07",
    figmaNode: "1064:147272",
    title: "Access changed and clean recovery",
    Screen: () => (
      <AccessChangedScreen
        currentAccessHref={fixtureHref("data-coverage")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "funding-evidence",
    figmaId: "05.09",
    figmaNode: "1064:149987",
    title: "Funding evidence detail",
    Screen: () => (
      <FundingEvidenceScreen
        view={fundingEvidence}
        sourcesHref={fixtureHref("evidence-sources")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
