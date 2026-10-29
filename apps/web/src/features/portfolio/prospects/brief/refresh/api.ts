import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { PrepareBriefRefreshInput } from "@capiro/shared/prospect-brief-refresh";
import { writeSchema } from "../contracts";
import type { BriefScope } from "../api";
import {
  retainedSchema,
  refreshResultSchema,
  type RetainedRefresh,
} from "./contracts";
export type RefreshScope = BriefScope & { userId: string };
const path = (s: RefreshScope) =>
  `business-development/prospects/${encodeURIComponent(s.prospectId)}/brief`;
function assertProposal(
  scope: RefreshScope,
  request: PrepareBriefRefreshInput,
  p: RetainedRefresh,
) {
  if (
    p.tenantId !== scope.tenantId ||
    p.prospectId !== scope.prospectId ||
    p.createdByUserId !== scope.userId ||
    p.proposalId !== request.proposalId ||
    p.expectedVersionNumber !== request.expectedVersionNumber ||
    p.keepUserEdits !== request.keepUserEdits
  )
    throw new ApiError(
      502,
      "The retained refresh did not match this account and request.",
    );
}
export async function prepareRefresh(
  api: ApiClient,
  scope: RefreshScope,
  request: PrepareBriefRefreshInput,
  signal: AbortSignal,
) {
  const p = await api.request(
    "core",
    path(scope) + "/refresh-proposals",
    retainedSchema,
    { method: "POST", body: request, signal },
  );
  assertProposal(scope, request, p);
  return { proposal: p, acceptedVersion: null };
}
export async function readRefreshResult(
  api: ApiClient,
  scope: RefreshScope,
  request: PrepareBriefRefreshInput,
  signal: AbortSignal,
) {
  const r = await api.request(
    "core",
    path(scope) +
      "/refresh-proposals/" +
      encodeURIComponent(request.proposalId),
    refreshResultSchema,
    { signal },
  );
  assertProposal(scope, request, r.proposal);
  if (r.acceptedVersion) assertAccepted(r.proposal, r.acceptedVersion);
  return r;
}
function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const x = a as Record<string, unknown>,
      y = b as Record<string, unknown>;
    return (
      Object.keys(x).length === Object.keys(y).length &&
      Object.keys(x).every((k) => Object.hasOwn(y, k) && equal(x[k], y[k]))
    );
  }
  return a === b;
}
export function assertAccepted(
  p: RetainedRefresh,
  v: {
    versionNumber: number;
    sections: unknown;
    citations: unknown;
    sourceSnapshot: unknown;
    snapshotHash: string;
  },
) {
  if (
    v.versionNumber !== p.expectedVersionNumber + 1 ||
    !equal(v.sections, p.proposed) ||
    !equal(v.citations, p.citations) ||
    !equal(v.sourceSnapshot, p.sourceSnapshot) ||
    v.snapshotHash !== p.snapshotHash
  )
    throw new ApiError(
      502,
      "The saved result did not match the exact reviewed refresh. Check its original status.",
    );
}
export async function acceptRefresh(
  api: ApiClient,
  scope: RefreshScope,
  p: RetainedRefresh,
  signal: AbortSignal,
) {
  const r = await api.request(
    "core",
    path(scope) + "/refresh-accept",
    writeSchema,
    {
      method: "POST",
      body: { proposalId: p.proposalId, proposalHash: p.proposalHash },
      signal,
    },
  );
  if (
    r.brief.tenantId !== scope.tenantId ||
    r.brief.prospectId !== scope.prospectId ||
    r.brief.id !== p.briefId
  )
    throw new ApiError(502, "The saved receipt did not match this brief.");
  assertAccepted(p, r.version);
  return { proposal: p, acceptedVersion: r.version };
}
