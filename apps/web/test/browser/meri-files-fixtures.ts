import { expect, type Page, type Request, type Route } from "@playwright/test";
import {
  receiveDocumentRequest,
  type DocumentCreatedResponse,
  type DocumentRoute,
} from "@capiro/meri-contracts/document-application";
import {
  created,
  inspected,
  binary,
  ids,
  documentBytes,
} from "../../tests/meri-document-public-fixtures";
import {
  actionHostFixture,
  actionClient,
  actionContext,
  actionClock,
  expectActionIsolation,
} from "./meri-action-host-fixtures";

export { actionClient, actionClock, ids, documentBytes };
export type Format = "docx" | "xlsx";
export const filesUrl = (clientId = actionClient.id, format: Format = "docx") =>
  `/meri/files?clientId=${clientId}${format === "xlsx" ? "&document-operation=create_excel" : ""}`;
export function documentReceipt(
  format: Format = "docx",
  revised = false,
): DocumentCreatedResponse {
  const receipt = created(format);
  Object.assign(receipt.version.binding, {
    tenantId: actionContext.tenantId,
    actorId: actionContext.actorId,
    conversationId: actionContext.conversationId,
    runId: actionContext.runId,
  });
  for (const scope of [
    ...receipt.version.scopes,
    ...receipt.version.object.scopes,
  ]) {
    scope.tenantId = actionContext.tenantId;
    scope.resourceId = actionClient.id;
  }
  if (revised) {
    receipt.version.parentVersionId = ids.version;
    receipt.version.versionId = ids.revision;
  }
  return receipt;
}
type Reply = Parameters<Route["fulfill"]>[0];
type Observed = {
  operation: DocumentRoute;
  body: unknown;
  headers: Record<string, string>;
  method: string;
};
type Handler = (route: Route) => Promise<void>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function completion(page: Page, request: Request) {
  const done = deferred<"finished" | "aborted">();
  const clean = () => {
    page.off("requestfinished", finish);
    page.off("requestfailed", fail);
  };
  const finish = (value: Request) => {
    if (value === request) {
      clean();
      done.resolve("finished");
    }
  };
  const fail = (value: Request) => {
    if (value === request) {
      clean();
      expect(value.failure()?.errorText).toContain("ERR_ABORTED");
      done.resolve("aborted");
    }
  };
  page.on("requestfinished", finish);
  page.on("requestfailed", fail);
  return done.promise;
}
async function downloadReply(receipt: DocumentCreatedResponse): Promise<Reply> {
  const response = binary(receipt);
  return {
    status: 200,
    headers: Object.fromEntries(response.headers),
    body: Buffer.from(await response.arrayBuffer()),
  };
}

/** Only HTTP is synthetic. Actual host, canonical public receiving, journals and URL ownership run. */
export async function filesFixture(page: Page, format: Format = "docx") {
  const host = await actionHostFixture(page);
  const requests: Observed[] = [];
  const queued = new Map<DocumentRoute, Handler[]>();
  const first = documentReceipt(format),
    revision = documentReceipt(format, true);
  const versions = new Map([
    [ids.version, first],
    [ids.revision, revision],
  ]);
  const queue = (operation: DocumentRoute, handler: Handler) =>
    queued.set(operation, [...(queued.get(operation) ?? []), handler]);
  await page.addInitScript(() => {
    const observation = { created: [] as string[], revoked: [] as string[] };
    Object.defineProperty(window, "__documentUrls", { value: observation });
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (value) => {
      const url = create(value);
      observation.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      observation.revoked.push(url);
      revoke(url);
    };
  });
  await page.route("**/api/documents/*", async (route) => {
    const request = route.request();
    const operation = new URL(request.url()).pathname
      .split("/")
      .pop() as DocumentRoute;
    expect(["create", "revise", "inspect", "download"]).toContain(operation);
    expect(request.method()).toBe("POST");
    const body = receiveDocumentRequest(
      operation,
      new TextEncoder().encode(request.postData() ?? ""),
    );
    requests.push({
      operation,
      body,
      method: request.method(),
      headers: await request.allHeaders(),
    });
    const override = queued.get(operation)?.shift();
    if (override) return override(route);
    if (operation === "create") return route.fulfill({ json: first });
    if (operation === "revise") return route.fulfill({ json: revision });
    const value = versions.get((body as { versionId: string }).versionId);
    expect(value).toBeDefined();
    return route.fulfill(
      operation === "inspect"
        ? { json: inspected(value!) }
        : await downloadReply(value!),
    );
  });
  return {
    host,
    requests,
    first,
    revision,
    format,
    calls: (operation: DocumentRoute) =>
      requests.filter((entry) => entry.operation === operation),
    writes: () =>
      requests.filter(
        (entry) => entry.operation === "create" || entry.operation === "revise",
      ),
    reply(operation: DocumentRoute, reply: Reply) {
      queue(operation, (route) => route.fulfill(reply));
    },
    hold(operation: DocumentRoute, reply: Reply) {
      const entered = deferred<void>(),
        released = deferred<void>(),
        settled = deferred<"finished" | "aborted">();
      queue(operation, async (route) => {
        const completed = completion(page, route.request());
        entered.resolve();
        await released.promise;
        try {
          await route.fulfill(reply);
        } catch (error) {
          if (!route.request().failure()) throw error;
        }
        settled.resolve(await completed);
      });
      return {
        entered: entered.promise,
        async release() {
          released.resolve();
          return settled.promise;
        },
      };
    },
  };
}
export async function connectFiles(
  page: Page,
  format: Format = "docx",
  writeBlocked = false,
) {
  await page
    .getByRole("button", { name: "Connect document service", exact: true })
    .click();
  const title = page.getByLabel(
    format === "docx" ? "Document title" : "Workbook title",
    { exact: true },
  );
  await expect(title).toBeVisible();
  if (writeBlocked) await expect(title).toBeDisabled();
  else await expect(title).toBeEditable();
}
export async function fillDocument(page: Page, format: Format = "docx") {
  await page
    .getByLabel(format === "docx" ? "Document title" : "Workbook title", {
      exact: true,
    })
    .fill("Synthetic");
  await page
    .getByRole("textbox", {
      name: format === "docx" ? "Document text" : "Complete sheets (JSON)",
      exact: true,
    })
    .fill(
      format === "docx"
        ? "Synthetic document"
        : '[{"name":"Data","rows":[[{"value":"Synthetic"},{"formula":"=1+1"}]]}]',
    );
}
export async function createDocument(page: Page, format: Format = "docx") {
  await fillDocument(page, format);
  await page
    .getByRole("button", {
      name: format === "docx" ? "Create document" : "Create workbook",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: `Synthetic.${format}`, exact: true }),
  ).toBeVisible();
}
export const versionPanel = (page: Page) =>
  page.getByRole("region", { name: "Immutable version", exact: true });
export function expectFilesIsolation(
  fixture: Awaited<ReturnType<typeof filesFixture>>,
) {
  expectActionIsolation(fixture.host);
  expect(
    fixture.host.actions().filter((entry) => entry.route !== "session"),
  ).toEqual([]);
  for (const request of fixture.requests) {
    expect(request.headers["x-meri-action-session"]).toBe(
      `action_session_${"a".repeat(43)}`,
    );
    expect(request.headers.authorization).toBeUndefined();
  }
}
export async function urls(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __documentUrls: { created: string[]; revoked: string[] };
        }
      ).__documentUrls,
  );
}
