import { expect, it, vi } from "vitest";
import { createRunsClient } from "../src/shared/meri-runs/client";
import {
  listRequest,
  listResponse,
  detailResponse,
  run,
} from "./meri-runs-fixtures";
import { recordedUsage } from "./meri-current-read-fixtures";

const signal = () => new AbortController().signal;

it("lists and reads exact run/usage references without session/bootstrap/model requests", async () => {
  const replies = [listResponse, detailResponse, recordedUsage()];
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(replies.shift()),
  );
  const client = createRunsClient(() => true, vi.fn(), fetcher);
  expect(await client.list(listRequest, signal())).toEqual(listResponse);
  expect(await client.detail(run.conversationId, run.runId, signal())).toEqual(
    detailResponse,
  );
  expect(
    (await client.usage(run.conversationId, run.runId, signal())).recording,
  ).toBe("recorded");
  expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
    "/api/conversations/runs/list",
    "/api/conversations/runs/detail",
    "/api/conversations/usage",
  ]);
  for (const [, init] of fetcher.mock.calls) {
    expect(init).toMatchObject({
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  }
});

it("correlates run, scope and status through the installed receiver and rejects private extensions", async () => {
  for (const reply of [
    { ...listResponse, scope: { kind: "all" } },
    { ...listResponse, status: "active" },
    { ...listResponse, privateDiagnostic: "never render" },
    {
      ...listResponse,
      runs: [{ ...run, usage: { ...run.usage, recording: "not-recorded" } }],
    },
  ]) {
    const client = createRunsClient(
      () => true,
      vi.fn(),
      async () => Response.json(reply),
    );
    await expect(client.list(listRequest, signal())).rejects.toThrow();
  }
  const client = createRunsClient(
    () => true,
    vi.fn(),
    async () => Response.json(detailResponse),
  );
  await expect(
    client.detail(
      run.conversationId,
      "40000000-0000-4000-8000-000000000099",
      signal(),
    ),
  ).rejects.toThrow();
});

it("retires the current view for access denial even when the denial body is invalid", async () => {
  for (const status of [401, 403]) {
    const denied = vi.fn();
    const client = createRunsClient(
      () => true,
      denied,
      async () => Response.json({ private: "ignored" }, { status }),
    );
    await expect(client.list(listRequest, signal())).rejects.toMatchObject({
      status,
      code: "ACCESS_DENIED",
    });
    expect(denied).toHaveBeenCalledOnce();
  }
});

it("rejects a late scoped page after owner lifetime changes even when transport ignores abort", async () => {
  let deliver!: (value: Response) => void;
  let current = true;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  const client = createRunsClient(() => current, vi.fn(), fetcher);
  const pending = client.list(listRequest, signal());
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  current = false;
  deliver(Response.json(listResponse));
  await expect(pending).rejects.toThrow("lifetime ended");
});

it("keeps unavailable distinct from an empty page and does not auto-retry", async () => {
  const denied = vi.fn();
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "RUN_INDEX_UNAVAILABLE" } },
      { status: 503 },
    ),
  );
  const client = createRunsClient(() => true, denied, fetcher);
  await expect(client.list(listRequest, signal())).rejects.toMatchObject({
    code: "RUN_INDEX_UNAVAILABLE",
    status: 503,
  });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(denied).not.toHaveBeenCalled();
});
