import { createApiClient } from "../src/shared/portfolio/api/http";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import { testIdentity } from "../test/browser/fixtures";
import type { ClientBriefCopyAttempt } from "../src/features/portfolio/prospects/brief/client-copy/contracts";
import {
  selectClientBrief,
  type ClientBriefReview,
} from "../src/features/portfolio/prospects/brief/client-copy/review";
import {
  sectionKeys,
  sectionsSchema,
  type CurrentBrief,
} from "../src/features/portfolio/prospects/brief/contracts";
import {
  actor as coreActor,
  id,
  timestamp,
  review as contactReview,
} from "./prospect-contact-transfer-fixtures";
export { id, timestamp };
export const actor = { ...coreActor, ownerId: "user_synthetic_BriefOwner" };
export const identity = {
  ...testIdentity,
  user: { ...testIdentity.user, id: actor.userId, clerkUserId: actor.ownerId },
  tenant: { ...testIdentity.tenant, id: actor.tenantId },
};
export const savedBrief: CurrentBrief = {
  brief: {
    id: id(31),
    tenantId: actor.tenantId,
    prospectId: id(3),
    title: "Synthetic saved strategy",
    status: "draft",
    currentVersionId: id(32),
    currentVersionNumber: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdByUserId: null,
  },
  currentVersion: {
    id: id(32),
    versionNumber: 2,
    createdAt: timestamp,
    createdByUserId: null,
    sectionsHash: "a".repeat(64),
    snapshotHash: "b".repeat(64),
    citationCount: 0,
    citations: [],
    sections: sectionsSchema.parse(
      Object.fromEntries(
        sectionKeys.map((key) => [
          key,
          { text: `Saved ${key}`, provenance: "edited", citationIndexes: [] },
        ]),
      ),
    ),
    sourceSnapshot: {
      generatedAt: timestamp,
      identityBasis: "Synthetic",
      canonicalEntityId: null,
      canonicalName: null,
      evidence: [],
    },
  },
};
export const review: ClientBriefReview = {
  prospect: contactReview.prospect,
  client: contactReview.client,
  selection: selectClientBrief(
    { tenantId: actor.tenantId, prospectId: id(3) },
    savedBrief.brief,
    savedBrief.currentVersion,
  ),
};
export const receiptFor = (
  attempt: ClientBriefCopyAttempt,
  available = true,
) => ({
  schemaVersion: 1,
  operation: "copy_core_brief_to_client",
  status: "completed",
  tenantId: actor.tenantId,
  actorId: actor.ownerId,
  prospectId: id(3),
  clientId: id(4),
  requestId: attempt.command.requestId,
  payloadDigest: attempt.payloadDigest,
  draftId: id(40),
  contextItemId: id(41),
  createdAt: timestamp,
  available,
});
export function fixture(
  options: {
    current?: ClientBriefReview;
    brief?: CurrentBrief;
    identity?: unknown;
    coreResponse?: (path: string) => Response | undefined;
    copy?: (method: string, input: unknown) => unknown | Promise<unknown>;
  } = {},
) {
  const current = options.current ?? review,
    brief = options.brief ?? savedBrief;
  const calls: { path: string; method: string; input: unknown }[] = [];
  const api = createApiClient(async (url, init) => {
    const path = String(url);
    calls.push({ path, method: init?.method ?? "GET", input: undefined });
    const override = options.coreResponse?.(path);
    if (override) return override;
    if (path.endsWith("/brief")) return Response.json(brief);
    if (path.includes("/brief/versions/"))
      return Response.json(brief.currentVersion);
    if (path.includes("/business-development/prospects/"))
      return Response.json(current.prospect);
    if (path.includes("/clients/"))
      return Response.json({
        ...current.client,
        status: "active",
        profileStatus: "completed",
      });
    throw new Error("Unexpected synthetic Core read");
  });
  const workspace = createCapiroApi(capiroOperations, {
    fetcher: async (url, init) => {
      const target = new URL(String(url), "http://synthetic.local"),
        path = decodeURIComponent(target.pathname.split("/").at(-1)!);
      const method = init?.method ?? "GET",
        input =
          method === "GET"
            ? JSON.parse(target.searchParams.get("input")!)
            : JSON.parse(String(init?.body));
      calls.push({ path, method, input });
      const response =
        path === "me.read"
          ? (options.identity ?? identity)
          : await options.copy?.(method, input);
      return response instanceof Response
        ? response
        : response === undefined
          ? Response.json({ message: "No receipt" }, { status: 404 })
          : Response.json(response);
    },
  });
  return { api, workspace, calls };
}
