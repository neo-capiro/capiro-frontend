import { z } from "zod";
import { defineOperation } from "../contracts";
const text = z.string().nullish(),
  numeric = z.union([z.number(), z.string()]).nullish();
export const explorerRecord = z.object({
  id: z.string(),
  title: text,
  name: text,
  clientName: text,
  registrantName: text,
  companyName: text,
  recipientName: text,
  contributorName: text,
  candidateName: text,
  description: text,
  summary: text,
  identifier: text,
  billType: text,
  billNumber: numeric,
  congress: numeric,
  sponsorName: text,
  sponsorParty: text,
  sponsorState: text,
  cosponsorsCount: numeric,
  latestActionText: text,
  latestActionDate: text,
  policyArea: text,
  originChamber: text,
  agency: text,
  agencyNames: z.array(z.string()).optional(),
  awardingAgency: text,
  organization: text,
  type: text,
  reportType: text,
  formType: text,
  status: text,
  lifecycle: text,
  filingYear: numeric,
  income: numeric,
  totalContracts: numeric,
  amount: numeric,
  awardAmount: numeric,
  publicationDate: text,
  publishedAt: text,
  filingDate: text,
  issueDate: text,
  postedDate: text,
  responseDeadline: text,
  commentEndDate: text,
  deadline: text,
  eventDate: text,
  startDate: text,
  state: text,
  chamber: text,
  district: text,
  party: text,
  email: text,
  source: text,
  url: text,
  htmlUrl: text,
  sourceUrl: text,
  link: text,
  topics: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
});
export const explorerResponse = z.object({
  rows: z.array(explorerRecord),
  total: z.number(),
});
const paging = z
  .object({
    q: z.string().max(2000).optional(),
    sort: z.string().max(60).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(200).optional(),
    congress: z.array(z.string()).optional(),
    subjects: z.array(z.string()).optional(),
    sponsorParty: z.array(z.string()).optional(),
    originChamber: z.array(z.string()).optional(),
    policyAreas: z.array(z.string()).optional(),
    openCommentOnly: z.boolean().optional(),
    states: z.array(z.string()).optional(),
    chambers: z.array(z.string()).optional(),
  })
  .strict();
const source =
  "apps/api/src/explorer/explorer.controller.ts; explorer.service.ts @ 4be13b0";
export const intelligenceExplorerOperations = {
  "intelligence.explorer.news": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/intel-articles",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.lda": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/lda-filings",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.contractors": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/federal-contractors",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.bills": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/congress-bills",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.federal-register": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/federal-register",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.hearings": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/hearings",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.gao": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/gao",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.crs": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/crs",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.fec": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/fec-contributions",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.fara": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/fara",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.sec": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/sec",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.sam": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/sam-opportunities",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.awards": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/federal-awards",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.grant-awards": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/federal-assistance-awards",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.grants": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/federal-grants",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.state-bills": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/state-bills",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.state-legislators": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/state-legislators",
    request: z.object({ query: paging.optional() }).strict(),
    response: explorerResponse,
    source,
  }),
  "intelligence.explorer.bill-facets": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/bill-facets",
    request: z.object({}).strict(),
    response: z.object({
      congresses: z.array(z.number()),
      subjects: z.array(z.string()),
      chambers: z.array(z.string()),
      parties: z.array(z.string()),
      policyAreas: z.array(z.string()),
    }),
    source,
  }),
} as const;
export type ExplorerRecord = z.infer<typeof explorerRecord>;
export type ExplorerDataset =
  | "news"
  | "lda"
  | "contractors"
  | "bills"
  | "federal-register"
  | "hearings"
  | "gao"
  | "crs"
  | "fec"
  | "fara"
  | "sec"
  | "sam"
  | "awards"
  | "grant-awards"
  | "grants"
  | "state-bills"
  | "state-legislators";
export const explorerDatasetOperations = {
  news: "intelligence.explorer.news",
  lda: "intelligence.explorer.lda",
  contractors: "intelligence.explorer.contractors",
  bills: "intelligence.explorer.bills",
  "federal-register": "intelligence.explorer.federal-register",
  hearings: "intelligence.explorer.hearings",
  gao: "intelligence.explorer.gao",
  crs: "intelligence.explorer.crs",
  fec: "intelligence.explorer.fec",
  fara: "intelligence.explorer.fara",
  sec: "intelligence.explorer.sec",
  sam: "intelligence.explorer.sam",
  awards: "intelligence.explorer.awards",
  "grant-awards": "intelligence.explorer.grant-awards",
  grants: "intelligence.explorer.grants",
  "state-bills": "intelligence.explorer.state-bills",
  "state-legislators": "intelligence.explorer.state-legislators",
} as const;
