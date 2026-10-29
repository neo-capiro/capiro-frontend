import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  memoryDraftRequestBytes,
  memoryDraftSubmissionBytes,
  type MemoryDraftRead,
} from "@capiro/shared/settings-memory-drafts";
import { parseMemoryReviewDetail } from "@capiro/shared/memory-review";
import {
  draftFile,
  draftAccount,
  draftActor,
  draftCandidate,
  draftReview,
  savedDraft,
} from "../memory-draft-fixture";
async function serve(page: Page) {
  const file = draftFile(),
    receipts = new Map<string, unknown>();
  let draft: MemoryDraftRead | null = null,
    saves = 0,
    submissions = 0;
  const control = {
    loseSave: false,
    loseSubmit: false,
    refuseSubmit: false,
    stale: false,
    refuseSave: false,
    expire: false,
  };
  const review = parseMemoryReviewDetail({
    candidateId: draftCandidate,
    reviewRequestId: draftReview,
    candidateKind: "standard",
    scope: "firm",
    client: null,
    title: "Firm memory",
    status: "pending",
    revisionNumber: 1,
    rootCandidateId: draftCandidate,
    predecessorCandidateId: null,
    submittedBy: { userId: draftActor, name: "Synthetic author" },
    assignedReviewer: { userId: draftActor, name: "Synthetic reviewer" },
    decidedBy: null,
    createdAt: "2026-10-29T00:00:00.000Z",
    decidedAt: null,
    blockedReason: null,
    nextAction: "review",
    capabilities: {
      open: true,
      approve: true,
      reject: true,
      requestChanges: true,
      revise: false,
      reassign: false,
      withdraw: true,
    },
    proposal: {
      key: "settings-file:firm-soul:firm",
      value: "Private draft text",
      canonicalItem: null,
    },
    feedbackReason: null,
    eligibleReviewers: [],
    timeline: [],
    controllingMemory: null,
    activeMemoryUnchanged: true,
  });
  await page.route(
    (url) => url.pathname.startsWith("/api/capiro/"),
    async (route) => {
      const url = new URL(route.request().url()),
        operation = decodeURIComponent(url.pathname.split("/").at(-1)!);
      const input =
        route.request().method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : route.request().postDataJSON();
      const { params = {}, body = {} } = input,
        reply = (value: unknown, status = 200) =>
          route.fulfill({ status, json: value });
      if (operation === "me.read")
        return control.expire
          ? reply({ message: "Session expired" }, 401)
          : reply(draftAccount);
      if (operation === "settings.memory.drafts.file")
        return reply({
          ...file,
          baseVersion: control.stale ? "b".repeat(64) : file.baseVersion,
          drafts:
            draft?.state === "draft"
              ? [
                  {
                    id: draft.id,
                    revision: draft.revision,
                    expiresAt: draft.expiresAt,
                    updatedAt: draft.updatedAt,
                  },
                ]
              : [],
        });
      if (operation === "settings.memory.drafts.read")
        return draft && draft.id === params.id
          ? reply({ ...draft, baseChanged: control.stale })
          : reply({ message: "Draft unavailable" }, 404);
      if (
        operation.endsWith(".receipt") ||
        operation.endsWith(".submissionReceipt")
      )
        return receipts.has(params.requestId)
          ? reply(receipts.get(params.requestId))
          : reply({ message: "Receipt unavailable" }, 404);
      if (operation === "memory.review.candidate") return reply(review);
      if (operation === "settings.memory.drafts.save") {
        saves++;
        if (control.refuseSave)
          return reply(
            { message: "Draft changed. Reload before continuing." },
            409,
          );
        draft = {
          ...savedDraft(file, params.id),
          revision: body.expectedRevision + 1,
          sections: body.action === "save" ? body.sections : null,
          state: body.action === "save" ? "draft" : "discarded",
        };
        const receipt = {
          schema: "memory-settings-draft-receipt/1",
          draftId: params.id,
          requestId: body.requestId,
          requestHash: createHash("sha256")
            .update(
              memoryDraftRequestBytes(
                { ...file, clientId: null },
                params.id,
                body,
              ),
            )
            .digest("hex"),
          revision: draft.revision,
          state: draft.state,
          recordedAt: draft.updatedAt,
        };
        receipts.set(body.requestId, receipt);
        if (control.loseSave) {
          control.loseSave = false;
          return route.abort();
        }
        return reply(receipt);
      }
      if (operation === "settings.memory.drafts.submit") {
        submissions++;
        if (control.refuseSubmit)
          return reply(
            {
              message:
                "No eligible reviewer. Your private draft was not submitted.",
            },
            409,
          );
        if (!draft || draft.revision !== body.expectedRevision)
          return reply({ message: "Draft changed" }, 409);
        const receipt = {
          schema: "memory-settings-submit-receipt/1",
          requestId: body.requestId,
          draftId: params.id,
          draftRevision: body.expectedRevision,
          requestHash: createHash("sha256")
            .update(
              memoryDraftSubmissionBytes(
                { ...file, clientId: null },
                params.id,
                body,
              ),
            )
            .digest("hex"),
          candidateId: draftCandidate,
          submittedAt: draft.updatedAt,
          status: "pending_review",
          activeItemUnchanged: true,
        };
        receipts.set(body.requestId, receipt);
        draft = {
          ...draft,
          state: "submitted",
          sections: null,
          revision: draft.revision + 1,
        };
        if (control.loseSubmit) {
          control.loseSubmit = false;
          return route.abort();
        }
        return reply(receipt);
      }
      throw Error("Unexpected isolated draft operation: " + operation);
    },
  );
  return {
    control,
    counts: () => ({ saves, submissions }),
    draft: () => draft,
  };
}
async function edit(page: Page) {
  await page
    .getByRole("button", { name: "Create private draft", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Mission & mandate", exact: true })
    .fill("Private draft text");
}
test("save and submit stay separate, preserve published content and open the exact shared review", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html");
  await edit(page);
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Engine signal", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Saved revision 1", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Published memory")).toContainText(
    "Published mission",
  );
  await expect(page.getByLabel("Published memory")).not.toContainText(
    "Private draft text",
  );
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByRole("link", { name: /Open this review/ }),
  ).toHaveAttribute("href", "/meri/memory/review/" + draftReview);
  await expect(
    page.getByText("This does not publish memory.", { exact: false }),
  ).toBeVisible();
  expect(owner.counts()).toEqual({ saves: 1, submissions: 1 });
});
test("lost save acknowledgement survives reload and recovers without a second write or stored content", async ({
  page,
}) => {
  const owner = await serve(page);
  owner.control.loseSave = true;
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.stringify(Object.values(sessionStorage)),
  );
  expect(stored).not.toContain("Private draft text");
  expect(stored).not.toContain("sections");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create private draft", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("textbox", { name: "Mission & mandate", exact: true }),
  ).toHaveValue("Private draft text");
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  expect(owner.counts()).toEqual({ saves: 1, submissions: 0 });
});
test("canceling edits and discarding a saved draft leave published memory unchanged", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Close editor", exact: true }).click();
  expect(owner.counts()).toEqual({ saves: 0, submissions: 0 });
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Discard saved draft", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Discard saved draft", exact: true })
    .click();
  await expect(
    page.getByText("Private draft discarded. Active memory is unchanged.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Published memory")).toContainText(
    "Published mission",
  );
  await expect(page.getByLabel("Published memory")).not.toContainText(
    "Private draft text",
  );
  expect(owner.draft()?.state).toBe("discarded");
  expect(owner.counts()).toEqual({ saves: 2, submissions: 0 });
});
test("lost submission is recovered by its receipt and never submitted again", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  owner.control.loseSubmit = true;
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("link", { name: /Open this review/ }),
  ).toHaveAttribute("href", "/meri/memory/review/" + draftReview);
  expect(owner.counts()).toEqual({ saves: 1, submissions: 1 });
});
test("refused review keeps the saved draft and stale bases block submission", async ({
  page,
}) => {
  const owner = await serve(page);
  owner.control.refuseSubmit = true;
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByText("Draft change refused", { exact: true }),
  ).toBeVisible();
  expect(owner.draft()?.state).toBe("draft");
  owner.control.stale = true;
  await page.getByRole("button", { name: "Discard unsaved changes" }).click();
  await expect(
    page.getByText("Published memory changed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeDisabled();
});
test("preview blocks writes and an expired session removes the editor", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html?read-only");
  await expect(
    page.getByRole("button", { name: "Create private draft", exact: true }),
  ).toBeDisabled();
  await page.goto("/memory-drafts.html");
  await edit(page);
  owner.control.expire = true;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByLabel("Private draft editor")).toHaveCount(0);
  expect(owner.counts()).toEqual({ saves: 0, submissions: 0 });
});
