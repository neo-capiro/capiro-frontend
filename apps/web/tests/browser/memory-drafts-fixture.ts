import { type Page } from "@playwright/test";
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
export async function serve(page: Page) {
  const files = new Map(
    ["firm-soul", "firm-compass", "playbook"].map((type) => [
      type,
      { ...draftFile(), type },
    ]),
  );
  const receipts = new Map<string, unknown>();
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
    unavailable: "",
    fileResponse: null as
      | null
      | ((file: ReturnType<typeof draftFile>) => unknown),
    waitForFile: null as null | (() => Promise<void>),
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
      const file = files.get(params.type ?? "firm-soul")!;
      if (operation === "settings.memory.drafts.file") {
        await control.waitForFile?.();
        if (control.unavailable === params.type)
          return reply({ message: "File unavailable" }, 503);
        if (control.fileResponse) return reply(control.fileResponse(file));
        return reply({
          ...file,
          baseVersion: control.stale ? "b".repeat(64) : file.baseVersion,
          drafts:
            draft?.state === "draft" && draft.type === params.type
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
      }
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
    files,
    counts: () => ({ saves, submissions }),
    draft: () => draft,
  };
}
export async function edit(page: Page) {
  await page
    .getByRole("button", { name: "Create private draft", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Mission & mandate", exact: true })
    .fill("Private draft text");
}
