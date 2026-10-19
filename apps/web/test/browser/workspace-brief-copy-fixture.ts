import type { Page, Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  copyBody,
  copyDetail,
  copyIds,
  copyResult,
  copySource,
  copyState,
} from "../../tests/workspace-brief-copy-fixtures";
import type {
  BriefCopyResult,
  BriefCopySaveBody,
} from "../../src/shared/capiro/operations/workspace-brief-copy";

export const copiedTabUrl = `/modules/workspace?${new URLSearchParams({ prospectId: copyIds.prospect, draftId: copyIds.draft, copyDocumentId: copyIds.document })}`;
export const createCopyUrl = `/modules/workspace?${new URLSearchParams({ prospectId: copyIds.prospect, draftId: copyIds.draft, briefSource: JSON.stringify(copySource) })}`;
export async function copyWorkflowFixture(page: Page, otherPages: Page[] = []) {
  const pages = [page, ...otherPages];
  const errors: string[] = [];
  for (const target of pages) {
    await onlyLocalRequests(target);
    await operationFixtures(target, moduleRouteFixtures);
    target.on("pageerror", (error) => errors.push(error.message));
  }
  let detail = structuredClone(copyDetail);
  let state = structuredClone(copyState);
  let readStatus = 200;
  let loseNext = false;
  let conflictNext = false;
  let failReadsAfterWrite = false;
  let hold: Promise<void> | undefined;
  let release: (() => void) | undefined;
  let entered = false;
  let completed = 0;
  const receipts = new Map<string, BriefCopyResult>();
  const writes: {
    key: string;
    input: { body: BriefCopySaveBody; params: Record<string, string> };
  }[] = [];
  const coreWrites: string[] = [];
  for (const target of pages)
    target.on("request", (request) => {
      if (
        request.method() !== "GET" &&
        request.url().includes("/api/backend/core/")
      )
        coreWrites.push(request.url());
    });
  for (const target of pages)
    await target.route("**/api/backend/**", (route) =>
      route.fulfill({
        status: 500,
        json: { message: "No Core write is part of this fixture" },
      }),
    );
  const receive = async (route: Route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (route.request().method() === "GET") {
      if (readStatus !== 200)
        return route.fulfill({
          status: readStatus,
          json: { message: "Current copy unavailable" },
        });
      return route.fulfill({ json: key.endsWith("state") ? state : detail });
    }
    const input = route.request().postDataJSON();
    writes.push({ key, input });
    entered = true;
    try {
      if (hold) await hold;
      if (conflictNext) {
        conflictNext = false;
        state = { ...state, stateHash: "7".repeat(64) };
        detail = { ...detail, stateHash: state.stateHash };
        return await route.fulfill({
          status: 409,
          json: {
            message: "State changed",
            code: "WORKSPACE_BRIEF_STATE_CONFLICT",
          },
        });
      }
      const old = receipts.get(input.body.requestId);
      let result = old
        ? { ...old, replayed: true }
        : copyResult(
            key.endsWith("create") ? "copy_core_brief" : "save_brief_copy",
          );
      result = {
        ...result,
        receipt: {
          ...result.receipt,
          requestId: input.body.requestId,
          versionId: input.body.requestId,
        },
      };
      if (!old) {
        receipts.set(input.body.requestId, result);
        state = { ...state, stateHash: result.receipt.stateHash };
        detail = {
          ...detail,
          stateHash: state.stateHash,
          document: {
            ...detail.document,
            body: input.body.body ?? detail.document.body,
            name: input.body.name ?? detail.document.name,
          },
        };
      }
      if (failReadsAfterWrite) {
        readStatus = 503;
        failReadsAfterWrite = false;
      }
      if (loseNext) {
        loseNext = false;
        return await route.abort("connectionreset");
      }
      await route.fulfill({ json: result });
    } finally {
      completed += 1;
    }
  };
  for (const target of pages)
    await target.route("**/api/capiro/workspace.brief-copy.*", receive);
  return {
    writes,
    coreWrites,
    errors,
    current: () => detail,
    loseNext: () => {
      loseNext = true;
    },
    conflictNext: () => {
      conflictNext = true;
    },
    failFreshRead: () => {
      failReadsAfterWrite = true;
    },
    reads: (status: number) => {
      readStatus = status;
    },
    replaceBody: (content: string) => {
      state = { ...state, stateHash: "8".repeat(64) };
      detail = {
        ...detail,
        stateHash: state.stateHash,
        document: {
          ...detail.document,
          body: {
            ...copyBody,
            blocks: [
              { ...copyBody.blocks[0]!, content },
              ...copyBody.blocks.slice(1),
            ],
          },
        },
      };
    },
    hold: () => {
      entered = false;
      hold = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    entered: () => entered,
    release: () => {
      release?.();
      hold = undefined;
    },
    completed: () => completed,
  };
}
