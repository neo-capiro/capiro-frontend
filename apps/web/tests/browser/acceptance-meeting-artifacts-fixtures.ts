import { expect, type Page, type Request } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  acceptanceMeeting,
  acceptanceArtifact,
  acceptanceMetadata,
  deferred,
  type ArtifactKind,
} from "./acceptance-meeting-artifacts-data";
export * from "./acceptance-meeting-artifacts-data";

type ReadReceipt = {
  request: Request;
  settled: Promise<void>;
  transport: "pending" | "finished" | "failed";
  failure?: string;
};
export async function artifactFixture(
  page: Page,
  kind: ArtifactKind,
  clientId: string | null = "client-one",
) {
  const unexpected = await installFixtures(page);
  const state = {
    clientId,
    items: [acceptanceArtifact(kind, clientId)] as unknown[],
    readStatus: 200,
    readHold: undefined as Promise<void> | undefined,
    reads: [] as ReadReceipt[],
    parentReads: [] as Request[],
    parentHold: undefined as Promise<void> | undefined,
    writes: [] as { method: string; path: string; body: unknown }[],
    writeStatus: 200,
    writeReceipt: acceptanceMetadata(kind) as unknown,
    writeHold: undefined as Promise<void> | undefined,
  };
  await page.route("**/core/engagement/meetings/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      state.writes.push({
        method: request.method(),
        path,
        body: request.postData() ? request.postDataJSON() : undefined,
      });
      if (state.writeHold) await state.writeHold;
      return json(route, state.writeReceipt, state.writeStatus);
    }
    if (!path.endsWith(`/${kind}`)) {
      state.parentReads.push(request);
      const parent = acceptanceMeeting(state.clientId);
      if (state.parentHold) await state.parentHold;
      return json(route, parent);
    }
    const finished = deferred();
    const receipt: ReadReceipt = {
      request,
      settled: finished.promise,
      transport: "pending",
    };
    const complete = (observed: Request) => {
      if (observed !== request) return;
      receipt.failure = request.failure()?.errorText;
      receipt.transport = receipt.failure ? "failed" : "finished";
      page.off("requestfinished", complete);
      page.off("requestfailed", complete);
      finished.release();
    };
    page.on("requestfinished", complete);
    page.on("requestfailed", complete);
    state.reads.push(receipt);
    const status = state.readStatus;
    const body =
      status === 200
        ? structuredClone(state.items)
        : { message: "Synthetic artifact list refusal" };
    if (state.readHold) await state.readHold;
    await json(route, body, status).catch((failure: unknown) => {
      if (!request.failure()) throw failure;
    });
  });
  await page.addInitScript(() => {
    Object.assign(window, { __artifactPrintCalls: 0 });
    window.open = () => {
      const observed = window as unknown as { __artifactPrintCalls: number };
      observed.__artifactPrintCalls += 1;
      return null;
    };
  });
  return {
    state,
    unexpected,
    async open() {
      await page.goto(
        `/__test/acceptance-meeting-artifacts?kind=${kind}${clientId === null ? "&unscoped=1" : ""}`,
      );
    },
  };
}
type Controls = {
  refresh: () => void;
  listState: () => {
    status: string;
    fetchStatus: string;
    errorUpdatedAt: number;
    dataUpdatedAt: number;
  } | null;
  attempt: () => { status: string; change?: { body?: string } } | undefined;
  replaceClient: (value: string | null) => void;
  toggle: () => void;
};
export function controls(page: Page, action: "refresh" | "toggle") {
  return page.evaluate((action) => {
    (
      window as unknown as { __acceptanceMeetingArtifacts: Controls }
    ).__acceptanceMeetingArtifacts[action]();
  }, action);
}
export function listState(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as { __acceptanceMeetingArtifacts: Controls }
    ).__acceptanceMeetingArtifacts.listState(),
  );
}
export function attempt(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as { __acceptanceMeetingArtifacts: Controls }
    ).__acceptanceMeetingArtifacts.attempt(),
  );
}
export function replaceClient(page: Page, clientId: string | null) {
  return page.evaluate(
    (value) =>
      (
        window as unknown as { __acceptanceMeetingArtifacts: Controls }
      ).__acceptanceMeetingArtifacts.replaceClient(value),
    clientId,
  );
}
/** Concealed-DOM probes also permit absence; invalidateAndSubmit proves delivery. */
export function obsoleteEvent(page: Page, action: "save" | "share") {
  return page.evaluate((action) => {
    const content = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="body"]',
    );
    if (action === "save")
      content?.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    else
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
      )
        .find((button) =>
          /^Share (note|debrief)$/.test(button.textContent?.trim() ?? ""),
        )
        ?.click();
    return (
      window as unknown as { __acceptanceMeetingArtifacts: Controls }
    ).__acceptanceMeetingArtifacts.attempt();
  }, action);
}
/** Deliver to the connected form before React conceals it, after cache invalidation. */
export function invalidateAndSubmit(page: Page) {
  return page.evaluate(() => {
    const form = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="body"]',
    )?.form;
    if (!form?.isConnected)
      throw new Error("Expected an open connected editor form");
    const observed = (
      window as unknown as { __acceptanceMeetingArtifacts: Controls }
    ).__acceptanceMeetingArtifacts;
    let delivered = false;
    form.addEventListener(
      "submit",
      () => {
        delivered = true;
      },
      { once: true },
    );
    observed.refresh();
    const connectedAfterInvalidation = form.isConnected;
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return {
      delivered,
      connectedAfterInvalidation,
      handled: event.defaultPrevented,
      list: observed.listState(),
      attempt: observed.attempt(),
    };
  });
}
export async function listSettled(page: Page, status: "success" | "error") {
  await expect
    .poll(async () => {
      const state = await listState(page);
      return `${state?.status}:${state?.fetchStatus}`;
    })
    .toBe(`${status}:idle`);
}
