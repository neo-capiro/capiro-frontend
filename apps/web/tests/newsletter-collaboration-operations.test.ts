import { expect, it } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { richNewsletterCollaborationOperations as operations } from "../src/shared/capiro/operations/rich-newsletter-collaboration";
import { reviewId, otherReviewId } from "./newsletter-review-fixtures";

function transport() {
  const calls: { url: string; method: string; input: unknown }[] = [];
  const api = createCapiroApi(operations, {
    fetcher: async (url, init) => {
      calls.push({
        url: String(url),
        method: init!.method!,
        input: init!.body ? JSON.parse(String(init!.body)) : undefined,
      });
      return new Response(JSON.stringify({ untrusted: true }), { status: 200 });
    },
  });
  return { api, calls };
}

it("retains the selected Clerk member identity without adding browser authority", async () => {
  const { api, calls } = transport();
  const input = {
    params: { id: reviewId },
    body: { userId: "user_selected_member", role: "commenter" as const },
  };
  expect(
    await api.request("workspace.richNewsletter.reviewerGrant", input),
  ).toEqual({ untrusted: true });
  expect(calls[0]).toEqual({
    url: "/api/capiro/workspace.richNewsletter.reviewerGrant",
    method: "POST",
    input,
  });
});

it("uses the existing comment endpoint for root/reply and preserves explicit no-watchers and reopen", async () => {
  const { api, calls } = transport();
  await api.request("workspace.richNewsletter.commentCreate", {
    params: { id: reviewId },
    body: {
      message: " @Synthetic colleague ",
      parentId: otherReviewId,
      notifyUserIds: [],
    },
  });
  await api.request("workspace.richNewsletter.commentResolve", {
    params: { id: reviewId, commentId: otherReviewId },
    body: { resolved: false },
  });
  expect(calls.map((call) => call.input)).toEqual([
    {
      params: { id: reviewId },
      body: {
        message: "@Synthetic colleague",
        parentId: otherReviewId,
        notifyUserIds: [],
      },
    },
    {
      params: { id: reviewId, commentId: otherReviewId },
      body: { resolved: false },
    },
  ]);
  expect(operations["workspace.richNewsletter.commentCreate"].path).toBe(
    "/newsletters/documents/:id/comments",
  );
});

it("rejects invented write fields and unbound invitation requests before dispatch", async () => {
  const { api, calls } = transport();
  await expect(
    api.request("workspace.richNewsletter.invitationCreate", {
      params: { id: reviewId },
      body: { email: "synthetic@example.test", role: "viewer" },
    } as never),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    api.request("workspace.richNewsletter.commentCreate", {
      params: { id: reviewId },
      body: { message: "Hello", approved: true },
    } as never),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    api.request("workspace.richNewsletter.commentResolve", {
      params: { id: reviewId, commentId: otherReviewId },
      body: { resolved: "false" },
    } as never),
  ).rejects.toMatchObject({ status: 400 });
  expect(calls).toEqual([]);
});

it("firm dispatch accepts only a saved invitation identity and an exact empty body", async () => {
  const { api, calls } = transport();
  const params = { invitationId: otherReviewId };
  await expect(
    api.request("workspace.richNewsletter.accountInvitationDispatch", {
      params,
      body: { email: "synthetic@example.test", accountRole: "admin" },
    } as never),
  ).rejects.toMatchObject({ status: 400 });
  expect(calls).toEqual([]);
  await api.request("workspace.richNewsletter.accountInvitationDispatch", {
    params,
    body: {},
  });
  expect(calls[0]!.input).toEqual({ params, body: {} });
  expect(
    operations["workspace.richNewsletter.accountInvitationDispatch"].service,
  ).toBe("core");
});
