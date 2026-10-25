import { createApiClient } from "../src/shared/portfolio/api/http";
import type { TransferReview } from "../src/features/portfolio/prospects/contact-transfer/review";
import type { TransferAttempt } from "../src/features/portfolio/prospects/contact-transfer/contracts";
export const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const actor = { tenantId: id(1), userId: id(2) };
export const timestamp = "2026-10-25T01:00:00.123Z";
export const review: TransferReview = {
  prospect: {
    id: id(3),
    displayName: "Synthetic prospect",
    domain: null,
    website: null,
    description: null,
    serviceHypothesis: null,
    geography: null,
    ownerUserId: null,
    stage: "closed_won",
    status: "active",
    nextAction: null,
    nextActionDueAt: null,
    linkedClientId: id(4),
    convertedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  client: { id: id(4), name: "Synthetic linked client" },
  contacts: [
    {
      id: id(5),
      prospectId: id(3),
      requestId: id(20),
      name: "Synthetic Contact",
      title: "Director",
      email: "contact@example.test",
      phone: null,
      notes: "Reviewed note",
      version: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  people: [],
};
export const matchingPerson = {
  id: id(6),
  clientId: id(4),
  name: "Synthetic Contact",
  title: "Director",
  email: "contact@example.test",
  phone: null,
  notes: "Reviewed note",
  role: null,
  hierarchyLevel: "leadership" as const,
  reportsToPersonId: null,
  placementSource: "auto_title" as const,
  reviewRequired: false,
  createdAt: timestamp,
  updatedAt: timestamp,
};
export function receiptFor(
  attempt: TransferAttempt,
  status: "completed" | "refused" = "completed",
) {
  return {
    schemaVersion: 1,
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: attempt.command.requestId,
    prospectId: attempt.command.prospectId,
    clientId: attempt.command.clientId,
    payloadDigest: attempt.payloadDigest,
    status,
    createdAt: timestamp,
    result:
      status === "completed"
        ? {
            items: attempt.command.items.map((item, index) => ({
              sourceId: item.sourceId,
              sourceVersion: item.expectedVersion,
              action: item.action,
              personId:
                item.action === "skip"
                  ? null
                  : item.action === "link"
                    ? item.personId
                    : id(80 + index),
            })),
          }
        : null,
    refusal:
      status === "refused"
        ? {
            code: "PROSPECT_CONTACT_TRANSFER_REFUSED",
            message: "Review current source and target contacts.",
          }
        : null,
  };
}
export function apiFixture(
  options: {
    current?: TransferReview;
    transfer?: (method: string, body: unknown) => Promise<Response> | Response;
  } = {},
) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const current = options.current ?? review;
  const api = createApiClient(async (url, init) => {
    const path = String(url),
      method = init?.method ?? "GET",
      body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, body });
    if (path.endsWith("/me"))
      return Response.json({
        user: {
          id: actor.userId,
          email: "actor@example.test",
          name: "Synthetic actor",
        },
        tenant: { id: actor.tenantId, name: "Synthetic tenant" },
        role: "standard_user",
      });
    if (path.includes("/contacts/transfers"))
      return (
        options.transfer?.(method, body) ??
        Response.json({ message: "Not found" }, { status: 404 })
      );
    if (path.endsWith("/contacts"))
      return Response.json({
        prospectId: current.prospect.id,
        readOnly: true,
        contacts: current.contacts,
        nextCursor: null,
      });
    if (path.endsWith("/people")) return Response.json(current.people);
    if (path.includes("/business-development/prospects/"))
      return Response.json(current.prospect);
    if (path.includes("/clients/"))
      return Response.json({
        ...current.client,
        profileStatus: "completed",
        status: "active",
      });
    throw new Error("Unexpected synthetic test route");
  });
  return { api, calls };
}
