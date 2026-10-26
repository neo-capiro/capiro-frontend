import type { Page, Route } from "@playwright/test";
import type {
  NewsletterReviewerTeam,
  NewsletterAccountInvitationReceipt,
  NewsletterReview,
} from "@capiro/shared/newsletter";
import { reviewPage } from "./newsletter-review-fixtures";
import { reviewComment } from "../../tests/newsletter-review-fixtures";

export const invitationId = "e5555555-5555-4555-8555-555555555555";
export async function collaborationPage(
  page: Page,
  role: NewsletterReviewerTeam["role"] = "owner",
) {
  const fixture = await reviewPage(page, role);
  const team: NewsletterReviewerTeam = {
    role,
    currentUserId: "test-user",
    invitationEmailAvailable: false,
    canInviteAccounts: role === "owner",
    items: [
      {
        userId: "test-user",
        name: "Synthetic reviewer",
        email: "reviewer@example.test",
        role,
        notifications: "all",
      },
      {
        userId: "user_peer",
        name: "Synthetic colleague",
        email: "colleague@example.test",
        role: "commenter",
        notifications: "mentions",
      },
    ],
    available:
      role === "owner"
        ? [
            {
              clerkUserId: "user_available",
              name: "Synthetic member",
              email: "member@example.test",
            },
          ]
        : [],
    pending:
      role === "owner"
        ? [
            {
              id: invitationId,
              email: "guest@example.test",
              role: "commenter",
              accountRole: "member",
              message: "Synthetic saved invitation",
              expiresAt: "2026-11-25T12:30:00.000Z",
            },
          ]
        : [],
  };
  const receipt: NewsletterAccountInvitationReceipt = {
    id: invitationId,
    status: "waiting",
    accountRole: "member",
    message: "Synthetic request can be attempted.",
    canRetry: true,
  };
  const calls: {
    operation: string;
    input: { params: Record<string, string>; body?: Record<string, unknown> };
  }[] = [];
  const queued = new Map<string, ((route: Route) => Promise<void>)[]>();
  const operations = new Set([
    "team",
    "commentCreate",
    "commentResolve",
    "reviewerGrant",
    "reviewerRemove",
    "invitationCreate",
    "invitationCancel",
    "reviewPreference",
    "threadDefaults",
    "threadRead",
    "threadUpdate",
    "accountInvitationRead",
    "accountInvitationDispatch",
  ]);
  await page.route(
    "**/api/capiro/workspace.richNewsletter.*",
    async (route) => {
      const url = new URL(route.request().url());
      const operation = decodeURIComponent(url.pathname).split(".").at(-1)!;
      if (!operations.has(operation)) return route.fallback();
      const input =
        route.request().method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : route.request().postDataJSON();
      calls.push({ operation, input });
      const override = queued.get(operation)?.shift();
      if (override) return override(route);
      let result: unknown = team;
      if (operation === "commentCreate") {
        fixture.review.comments.push({
          ...reviewComment(),
          id: crypto.randomUUID(),
          message: input.body.message,
          parentId: input.body.parentId ?? null,
        });
        result = { items: fixture.review.comments };
      } else if (operation === "commentResolve") {
        const comment = fixture.review.comments.find(
          (row) => row.id === input.params.commentId,
        );
        if (comment) comment.resolved = input.body.resolved;
        result = { items: fixture.review.comments };
      } else if (operation === "reviewPreference") {
        team.items[0]!.notifications = input.body.mode;
      } else if (operation === "reviewerGrant") {
        const person = team.items.find(
          (item) => item.userId === input.body.userId,
        );
        if (person) person.role = input.body.role;
        else
          team.items.push({
            userId: input.body.userId,
            name: "Synthetic member",
            email: "member@example.test",
            role: input.body.role,
            notifications: "all",
          });
      } else if (operation === "reviewerRemove") {
        team.items = team.items.filter(
          (item) => item.userId !== input.params.userId,
        );
      } else if (operation === "invitationCancel") {
        team.pending = team.pending.filter(
          (item) => item.id !== input.params.invitationId,
        );
      } else if (operation === "invitationCreate") {
        result = {
          ...team,
          invitation: {
            id: invitationId,
            email: input.body.email,
            status: "pending",
          },
        };
      } else if (operation.startsWith("thread")) {
        result = {
          rootId:
            operation === "threadDefaults" ? null : input.params.commentId,
          userIds: input.body?.userIds ?? ["test-user"],
          items: team.items.map(({ userId, name, email }) => ({
            userId,
            name,
            email,
          })),
          editable: role !== "viewer",
          emailAvailable: false,
        };
      } else if (operation === "accountInvitationRead") result = receipt;
      else if (operation === "accountInvitationDispatch") {
        receipt.status = "invited";
        receipt.canRetry = false;
        receipt.message =
          "Synthetic provider request accepted; delivery is not known.";
        result = receipt;
      }
      return route.fulfill({ json: result });
    },
  );
  return {
    ...fixture,
    review: fixture.review as NewsletterReview,
    team,
    receipt,
    collaborationCalls: calls,
    count: (operation: string) =>
      calls.filter((call) => call.operation === operation),
    queue(operation: string, callback: (route: Route) => Promise<void>) {
      queued.set(operation, [...(queued.get(operation) ?? []), callback]);
    },
  };
}
