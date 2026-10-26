import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  collaborationPage,
  invitationId,
} from "./newsletter-collaboration-fixture";
import { reviewUrl } from "./newsletter-review-fixtures";
import {
  reviewId,
  otherReviewId,
} from "../../tests/newsletter-review-fixtures";
import {
  button,
  enterEditor,
  adoptDocument,
  heldResponse,
} from "./newsletter-document-fixtures";
import {
  capturePresentation,
  contained,
  auditPresentation,
} from "./ordinary-presentation-evidence";

test("commenter posts a literal mention, replies to the loaded root and resolves only the selected row", async ({
  page,
}, info) => {
  const fixture = await collaborationPage(page, "commenter");
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  expect(fixture.collaborationCalls).toEqual([]);
  await button(page, "Add comment").click();
  const dialog = page.getByRole("dialog", { name: "Add comment" });
  await dialog.getByLabel("Message", { exact: true }).fill("Synthetic comment");
  await dialog.getByLabel("Mention a participant").click();
  await page.getByRole("option", { name: "Synthetic colleague" }).click();
  await dialog.getByRole("button", { name: "Insert mention" }).click();
  await expect(dialog.getByLabel("Message", { exact: true })).toHaveValue(
    "Synthetic comment @Synthetic colleague ",
  );
  await capturePresentation(page, info, "compose-desktop", dialog);
  await dialog
    .getByRole("button", { name: "Post comment", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(fixture.count("commentCreate")[0]!.input).toEqual({
    params: { id: reviewId },
    body: { message: "Synthetic comment @Synthetic colleague" },
  });
  await button(page, "Reply").first().click();
  await page
    .getByRole("dialog")
    .getByLabel("Message", { exact: true })
    .fill("Synthetic reply");
  await button(page, "Post reply").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.count("commentCreate")[1]!.input.body?.parentId).toBe(
    fixture.review.comments[0]!.id,
  );
  await button(page, "Resolve comment").first().click();
  await expect(button(page, "Reopen comment").first()).toBeVisible();
  expect(fixture.count("commentResolve")[0]!.input).toEqual({
    params: { id: reviewId, commentId: fixture.review.comments[0]!.id },
    body: { resolved: true },
  });
  expect(fixture.calls("save")).toHaveLength(0);
});

test("unknown comment stays unconfirmed after closing and refresh, without repost", async ({
  page,
}) => {
  const fixture = await collaborationPage(page, "commenter");
  fixture.queue("commentCreate", (route) =>
    route.fulfill({
      json: {
        items: fixture.review.comments.map((comment) => ({
          ...comment,
          documentId: otherReviewId,
          campaignId: otherReviewId,
        })),
      },
    }),
  );
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Add comment").click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Unconfirmed synthetic comment");
  await button(page, "Post comment").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Comment outcome unconfirmed",
  );
  await expect(button(page, "Post comment")).toBeDisabled();
  await button(page, "Close").click();
  await button(page, "Refresh comments").click();
  await expect(page.getByRole("alert")).toContainText(
    "Comment outcome unconfirmed",
  );
  await expect(button(page, "Add comment")).toBeDisabled();
  expect(fixture.count("commentCreate")).toHaveLength(1);
});

test("viewer changes only own in-app preference and cannot comment or share", async ({
  page,
}) => {
  const fixture = await collaborationPage(page, "viewer");
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await expect(button(page, "Add comment")).toHaveCount(0);
  await expect(button(page, "Sharing and invitations")).toHaveCount(0);
  await button(page, "In-app notifications").click();
  await page.getByLabel("Notification mode", { exact: true }).click();
  await page
    .getByRole("option", { name: "Mentions and replies", exact: true })
    .click();
  await button(page, "Save preference").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.count("reviewPreference")[0]!.input).toEqual({
    params: { id: reviewId },
    body: { mode: "mentions" },
  });
  expect(fixture.count("commentCreate")).toHaveLength(0);
});

test("owner uses actual member ID, immutable owner, frozen invitation recovery and separate account status", async ({
  page,
}, info) => {
  const fixture = await collaborationPage(page);
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Sharing and invitations").click();
  const dialog = page.getByRole("dialog", { name: "Invite your team" });
  await expect(dialog.getByLabel("Access for Synthetic reviewer")).toHaveCount(
    0,
  );
  await dialog.getByLabel("Active member", { exact: true }).click();
  await page.getByRole("option", { name: /Synthetic member/ }).click();
  await button(page, "Grant newsletter access").click();
  await expect(dialog).toContainText("Newsletter access acknowledged");
  expect(fixture.count("reviewerGrant")[0]!.input.body).toEqual({
    userId: "user_available",
    role: "commenter",
  });
  fixture.queue("invitationCreate", (route) =>
    route.fulfill({
      json: {
        ...fixture.team,
        invitation: {
          id: invitationId,
          email: "wrong@example.test",
          status: "pending",
        },
      },
    }),
  );
  await dialog
    .getByLabel("Email address", { exact: true })
    .fill("Guest@Example.test");
  await button(page, "Save invitation request").click();
  await expect(dialog).toContainText("outcome unconfirmed");
  const frozen = fixture.count("invitationCreate")[0]!.input;
  await expect(
    dialog.getByLabel("Email address", { exact: true }),
  ).toBeDisabled();
  await button(page, "Recover original invitation request").click();
  await expect(dialog).toContainText("Newsletter request: pending");
  expect(fixture.count("invitationCreate")).toHaveLength(2);
  expect(fixture.count("invitationCreate")[1]!.input).toEqual(frozen);
  expect(fixture.count("accountInvitationDispatch")).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await contained(page, dialog);
  await capturePresentation(page, info, "sharing-narrow", dialog);
  await auditPresentation(page, info, "sharing-narrow", '[role="dialog"]');
  await button(page, "Firm invitation status").first().click();
  await expect(button(page, "Send firm invitation")).toBeDisabled();
  expect(fixture.count("accountInvitationRead")).toHaveLength(0);
  fixture.receipt.status = "failed";
  fixture.receipt.canRetry = false;
  await button(page, "Check firm invitation").click();
  await expect(button(page, "Send firm invitation")).toBeDisabled();
  fixture.receipt.canRetry = true;
  await button(page, "Check firm invitation").click();
  await expect(button(page, "Send firm invitation")).toBeEnabled();
  await button(page, "Send firm invitation").click();
  await expect(button(page, "Send firm invitation")).toBeDisabled();
  expect(fixture.count("accountInvitationDispatch")[0]!.input).toEqual({
    params: { invitationId },
    body: {},
  });
  await expect(page.getByRole("dialog")).toContainText("delivery is not known");
});

test("thread choices use the known root, preserve empty selection and keyboard focus", async ({
  page,
}, info) => {
  const fixture = await collaborationPage(page, "commenter");
  const rootId = fixture.review.comments[0]!.id;
  fixture.review.comments.push({
    ...fixture.review.comments[0]!,
    id: otherReviewId,
    parentId: rootId,
    message: "Loaded synthetic reply",
  });
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  const opener = button(page, "Thread email choices").last();
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Thread email notifications",
  });
  await expect(dialog.getByRole("switch").first()).toBeChecked();
  expect(fixture.count("threadRead")[0]!.input.params.commentId).toBe(rootId);
  await dialog.getByRole("switch").first().focus();
  await page.keyboard.press("Space");
  await expect(dialog.getByRole("switch").first()).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await contained(page, dialog);
  await capturePresentation(page, info, "thread-choices-narrow", dialog);
  await button(page, "Save notifications").click();
  await expect(dialog).toHaveCount(0);
  expect(fixture.count("threadUpdate")[0]!.input).toEqual({
    params: { id: reviewId, commentId: rootId },
    body: { userIds: [] },
  });
  await expect(opener).toBeFocused();
  fixture.queue("threadRead", (route) =>
    route.fulfill({
      json: {
        rootId: otherReviewId,
        userIds: [],
        items: [],
        editable: true,
        emailAvailable: false,
      },
    }),
  );
  await opener.click();
  await expect(button(page, "Save notifications")).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText(
    "Notification choices could not be loaded",
  );
});

test("foreign actor and current access loss clear private content and prevent writes", async ({
  page,
}) => {
  const fixture = await collaborationPage(page);
  fixture.queue("team", (route) =>
    route.fulfill({
      json: { ...fixture.team, currentUserId: "another-actor" },
    }),
  );
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Sharing and invitations").click();
  await expect(
    page.getByRole("heading", { name: "Review unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await button(page, "Retry review").click();
  await button(page, "Add comment").click();
  fixture.queue("commentCreate", (route) =>
    route.fulfill({ status: 403, json: { message: "Current access denied" } }),
  );
  await page
    .getByLabel("Message", { exact: true })
    .fill("Denied synthetic action");
  await button(page, "Post comment").click();
  await expect(
    page.getByRole("heading", { name: "Review unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.count("commentCreate")).toHaveLength(1);
});

test("comment from the builder preserves dirty subject and never saves it", async ({
  page,
}) => {
  const fixture = await collaborationPage(page);
  await enterEditor(page);
  await adoptDocument(page);
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Unsaved collaboration draft");
  await button(page, "Comments").click();
  await button(page, "Open review").click();
  await button(page, "Add comment").click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Saved content comment");
  await button(page, "Post comment").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await button(page, "Edit newsletter").click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Unsaved collaboration draft",
  );
  expect(fixture.calls("save")).toHaveLength(0);
  expect(fixture.calls("stage")).toHaveLength(0);
});

test("pending comment dispatch is single and a changed actor cannot receive its late completion", async ({
  page,
}) => {
  const fixture = await collaborationPage(page, "commenter");
  const held = heldResponse();
  fixture.queue("commentCreate", async (route) => {
    await held.wait;
    try {
      await route.fulfill({ json: { items: fixture.review.comments } });
    } catch {
      /* The replaced actor's request may already be aborted. */
    } finally {
      held.finished();
    }
  });
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Add comment").click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Late synthetic comment");
  await button(page, "Post comment").click();
  await expect(button(page, "Post comment")).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "another-synthetic-user",
          sessionId: "another-session",
        },
      }),
    ),
  );
  held.release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Comment acknowledged.", { exact: false }),
  ).toHaveCount(0);
  expect(fixture.count("commentCreate")).toHaveLength(1);
});

test("a fresh team role downgrade removes sharing, comment and edit affordances", async ({
  page,
}) => {
  const fixture = await collaborationPage(page);
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  fixture.team.role = "viewer";
  fixture.team.items[0]!.role = "viewer";
  fixture.team.canInviteAccounts = false;
  fixture.team.available = [];
  fixture.team.pending = [];
  await button(page, "In-app notifications").click();
  await expect(
    page.getByRole("dialog", { name: "In-app notifications" }),
  ).toBeVisible();
  await button(page, "Cancel").click();
  await expect(page.getByText("Your role: Viewer")).toBeVisible();
  await expect(button(page, "Sharing and invitations")).toHaveCount(0);
  await expect(button(page, "Add comment")).toHaveCount(0);
  await expect(button(page, "Edit newsletter")).toHaveCount(0);
});

test("access revocation retires a pending comment even when review is reopened before it completes", async ({
  page,
}) => {
  const fixture = await collaborationPage(page, "commenter");
  const team = heldResponse();
  const comment = heldResponse();
  fixture.queue("team", async (route) => {
    await team.wait;
    await route.fulfill({ status: 403, json: { message: "Access revoked" } });
    team.finished();
  });
  fixture.queue("commentCreate", async (route) => {
    await comment.wait;
    await route.fulfill({
      json: {
        items: [
          {
            ...fixture.review.comments[0],
            message: "Retired private completion",
          },
        ],
      },
    });
    comment.finished();
  });
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Add comment").click();
  await page.getByLabel("Message", { exact: true }).fill("Pending comment");
  await button(page, "Post comment").click();
  await expect.poll(() => fixture.count("commentCreate").length).toBe(1);
  team.release();
  await expect(
    page.getByRole("heading", { name: "Review unavailable" }),
  ).toBeVisible();
  await button(page, "Retry review").click();
  await expect(page.getByText("Your role: Commenter")).toBeVisible();
  comment.release();
  await comment.settled;
  await expect(button(page, "Add comment")).toBeEnabled();
  await expect(
    page.getByText("Retired private completion", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Comment acknowledged.", { exact: true }),
  ).toHaveCount(0);
});

test("owner changes and removes newsletter access, cancels a saved request and checks an unknown firm dispatch", async ({
  page,
}, info) => {
  const fixture = await collaborationPage(page);
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Sharing and invitations").click();
  await page.getByLabel("Access for Synthetic colleague").click();
  await page.getByRole("option", { name: "Can preview", exact: true }).click();
  await button(page, "Save access").click();
  await expect.poll(() => fixture.team.items[1]!.role).toBe("viewer");
  await button(page, "Remove access").click();
  await expect(page.getByLabel("Access for Synthetic colleague")).toHaveCount(
    0,
  );
  expect(fixture.count("reviewerRemove")[0]!.input.params.userId).toBe(
    "user_peer",
  );
  await button(page, "Firm invitation status").click();
  await button(page, "Check firm invitation").click();
  await expect(button(page, "Send firm invitation")).toBeEnabled();
  await capturePresentation(
    page,
    info,
    "account-desktop",
    page.getByRole("dialog"),
  );
  fixture.queue("accountInvitationDispatch", (route) => route.abort("failed"));
  await button(page, "Send firm invitation").click();
  await expect(page.getByRole("dialog")).toContainText("outcome unconfirmed");
  await expect(button(page, "Send firm invitation")).toBeDisabled();
  fixture.receipt.status = "outcome_unknown";
  fixture.receipt.canRetry = false;
  fixture.receipt.message = "Synthetic outcome remains unknown; check again.";
  await button(page, "Check firm invitation").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Synthetic outcome remains unknown",
  );
  await expect(button(page, "Send firm invitation")).toBeDisabled();
  expect(fixture.count("accountInvitationDispatch")).toHaveLength(1);
  await button(page, "Back to sharing").click();
  await button(page, "Cancel newsletter request").click();
  await expect(page.getByRole("dialog")).toContainText("No pending requests");
  expect(fixture.count("invitationCancel")[0]!.input.params.invitationId).toBe(
    invitationId,
  );
});

test("new comment email choices remain explicit draft input and empty selection is posted once", async ({
  page,
}, info) => {
  const fixture = await collaborationPage(page, "commenter");
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "In-app notifications").click();
  await capturePresentation(
    page,
    info,
    "preferences-desktop",
    page.getByRole("dialog"),
  );
  await button(page, "Cancel").click();
  await button(page, "Add comment").click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Intentional no email");
  await button(page, "Choose email notifications").click();
  const chooser = page.getByRole("dialog", {
    name: "Thread email notifications",
  });
  await chooser.getByRole("switch").first().uncheck();
  await button(page, "Use these choices").click();
  await expect(button(page, "Choose email notifications")).toBeFocused();
  await button(page, "Choose email notifications").click();
  await expect(chooser.getByRole("switch").first()).not.toBeChecked();
  await button(page, "Use these choices").click();
  expect(fixture.count("threadUpdate")).toHaveLength(0);
  expect(fixture.count("commentCreate")).toHaveLength(0);
  await button(page, "Post comment").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.count("commentCreate")[0]!.input.body).toEqual({
    message: "Intentional no email",
    notifyUserIds: [],
  });
});
