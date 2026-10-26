import { describe, expect, it } from "vitest";
import {
  workspaceCollaboratorOperations as people,
  collaboratorEmailReceipt,
} from "../src/shared/capiro/operations/workspace-collaborators";
import { workspaceNotificationOperations as notifications } from "../src/shared/capiro/operations/workspace-notifications";

const draftId = "d3000000-0000-4000-8000-000000000001";
const invitationId = "d3000000-0000-4000-8000-000000000002";
describe("ordinary collaboration frozen receivers", () => {
  it("accepts the synthetic owner projection and pending teammate, without treating owner as a mutation UUID", () => {
    const result = people["workspace.collaborators"].response.parse({
      collaborators: [
        {
          id: `owner:${draftId}`,
          subjectId: "owner",
          email: null,
          name: null,
          role: "owner",
          status: "active",
          isOwner: true,
        },
        {
          id: invitationId,
          subjectId: "invitee",
          email: null,
          name: "Teammate",
          role: "reviewer",
          status: "pending",
          isOwner: false,
        },
      ],
    });
    expect(result.collaborators[1]!.status).toBe("pending");
    expect(
      people["workspace.collaborator.remove"].request.safeParse({
        params: { draftId, id: result.collaborators[0]!.id },
      }).success,
    ).toBe(false);
    expect(
      people["workspace.collaborator.role"].request.safeParse({
        params: { draftId, id: invitationId },
        body: { role: "owner" },
      }).success,
    ).toBe(false);
  });
  it("admits only resolved teammate identity and frozen mail IDs, never raw mail fields", () => {
    expect(
      people["workspace.collaborator.invite"].request.parse({
        params: { draftId },
        body: { subjectId: "user_clerk", role: "viewer" },
      }).body.subjectId,
    ).toBe("user_clerk");
    expect(
      people["workspace.collaborator.invite"].request.safeParse({
        params: { draftId },
        body: { email: "synthetic@example.test", role: "viewer" },
      }).success,
    ).toBe(false);
    expect(
      people["workspace.collaborator.email.request"].request.parse({
        body: { draftId, invitationId },
      }),
    ).toEqual({ body: { draftId, invitationId } });
    expect(
      people["workspace.collaborator.email.request"].request.safeParse({
        body: {
          draftId,
          invitationId,
          recipient: "synthetic@example.test",
          link: "https://example.test",
        },
      }).success,
    ).toBe(false);
  });
  it("pins invitation and mail operation method, service and path separately", () => {
    expect(people["workspace.collaborator.accept"]).toMatchObject({
      service: "workspace",
      method: "POST",
      path: "/drafts/:draftId/collaborators/:id/accept",
    });
    expect(people["workspace.collaborator.email.request"]).toMatchObject({
      service: "core",
      method: "POST",
      path: "/workspace/collaborator-invite-email",
    });
    expect(people["workspace.collaborator.email.status"]).toMatchObject({
      service: "core",
      method: "GET",
      path: "/workspace/drafts/:draftId/collaborator-invite-email/:invitationId",
    });
    expect(people["workspace.collaborator.email.cancel"]).toMatchObject({
      method: "POST",
      path: "/workspace/drafts/:draftId/collaborator-invite-email/:invitationId/cancel",
    });
    expect(notifications["workspace.notifications.readAll"]).toMatchObject({
      service: "workspace",
      method: "POST",
      path: "/notifications/read-all",
    });
  });
  it("requires actual provider receipt only for accepted and admits unknown without claiming sent", () => {
    const receipt = {
      draftId,
      invitationId,
      status: "outcome_unknown",
      providerMessageId: null,
      errorCode: "ProviderOutcomeUnknown",
      updatedAt: "2026-10-26T00:00:00Z",
    };
    expect(collaboratorEmailReceipt.parse(receipt).status).toBe(
      "outcome_unknown",
    );
    expect(
      collaboratorEmailReceipt.safeParse({ ...receipt, status: "accepted" })
        .success,
    ).toBe(false);
    expect(
      collaboratorEmailReceipt.parse({
        ...receipt,
        status: "accepted",
        providerMessageId: "synthetic-provider-receipt",
      }).status,
    ).toBe("accepted");
    expect(
      collaboratorEmailReceipt.safeParse({ ...receipt, status: "delivered" })
        .success,
    ).toBe(false);
  });
  it("keeps raw mutation and notification schemas separate from the people list", () => {
    expect(
      people["workspace.collaborator.accept"].response.safeParse({
        id: invitationId,
        draftId,
        status: "active",
      }).success,
    ).toBe(false);
    expect(
      notifications["workspace.notifications"].response.parse({
        items: [],
        unread: 0,
      }),
    ).toEqual({ items: [], unread: 0 });
    expect(
      notifications["workspace.notifications.readAll"].response.parse({
        updated: 2,
      }),
    ).toEqual({ updated: 2 });
  });
});
