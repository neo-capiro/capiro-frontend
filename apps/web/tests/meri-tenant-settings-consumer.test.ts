import { afterEach, describe, expect, it, vi } from "vitest";
import captured from "./meri-tenant-settings-fixture.json";
import {
  editableDocument,
  microToUsd,
  modelDraft,
  saveRequest,
  tenantSettingsRequest,
  usdToMicro,
  type TenantDocument,
} from "../src/features/meri/tenant-settings/client";
import { TenantSettingsController } from "../src/features/meri/tenant-settings/controller";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((close) => close());
});
const model = captured.request.settings.model;
const json = (value: unknown, status = 200) => Response.json(value, { status });
const failure = (code: string, status: number) =>
  json({ error: { code } }, status);
const signal = () => new AbortController().signal;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
async function start(fetcher: typeof fetch) {
  const send: typeof tenantSettingsRequest = (operation, body, abort) =>
    tenantSettingsRequest(operation, body, abort, fetcher);
  const controller = new TenantSettingsController(send);
  const close = controller.attach();
  cleanups.push(close);
  await vi.waitFor(() =>
    expect(controller.snapshot().status).not.toBe("loading"),
  );
  return { controller, close };
}

describe("canonical tenant settings consumer", () => {
  it("reads actual owner fixtures, preserves timezone/policy/revision and only sends native same-origin operations", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(captured.read))
      .mockResolvedValueOnce(json(captured.save));
    const { controller } = await start(fetcher);
    expect(controller.snapshot().status).toBe("ready");
    await controller.save(model);
    expect(controller.snapshot().status).toBe("saved");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]).toMatchObject([
      "/api/settings/tenant/read",
      {
        body: "{}",
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      },
    ]);
    const [path, init] = fetcher.mock.calls[1]!;
    expect(path).toBe("/api/settings/tenant/save");
    expect(JSON.parse(String(init!.body))).toEqual(captured.request);
    expect(init!.headers).toEqual({ "Content-Type": "application/json" });
    expect(saveRequest(captured.read, model).settings.capabilityPolicy).toEqual(
      captured.read.capabilityPolicy,
    );
    await controller.save(model);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("distinguishes absent monthly policy from unavailable reads without editable fallback", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(captured.initial));
    const { controller } = await start(fetcher);
    expect(controller.snapshot().document?.revision).toBe(0);
    expect(
      controller.snapshot().document?.model?.monthlyCapMicroUsd,
    ).toBeNull();
    expect(microToUsd(null)).toBe("");
    fetcher.mockResolvedValueOnce(failure("SETTINGS_STORE_UNAVAILABLE", 503));
    await controller.load();
    expect(controller.snapshot().status).toBe("unavailable");
    expect(controller.snapshot().document).toBeUndefined();
  });
  it("withholds the editor for canonical member reads, regardless of local UI role", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json(captured.member));
    const { controller } = await start(fetcher);
    expect(editableDocument(captured.member)).toBe(false);
    expect(controller.snapshot().status).toBe("denied");
    expect(controller.snapshot().document).toBeUndefined();
    await controller.save(model);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 404])(
    "clears values after current access refusal %s on save",
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(captured.read))
        .mockResolvedValueOnce(failure("MEMBERSHIP_REVOKED", status));
      const { controller } = await start(fetcher);
      await controller.save(model);
      expect(controller.snapshot().status).toBe("denied");
      expect(controller.snapshot().document).toBeUndefined();
    },
  );
  it.each([
    [409, "SETTINGS_REVISION_CONFLICT"],
    [400, "SETTINGS_DOCUMENT_INVALID"],
    [422, "CAPABILITY_TENANT_WIDENING_REFUSED"],
  ])(
    "requires explicit re-read after %s %s, never rebases or retries automatically",
    async (status, code) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(captured.read))
        .mockResolvedValueOnce(failure(code, status))
        .mockResolvedValueOnce(json(captured.readback));
      const { controller } = await start(fetcher);
      await controller.save(model);
      expect(controller.snapshot().status).toBe("conflict");
      await controller.save(model);
      expect(fetcher).toHaveBeenCalledTimes(2);
      await controller.load();
      expect(controller.snapshot().document?.revision).toBe(8);
      expect(controller.snapshot().status).toBe("ready");
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );
  it.each(["network", "503", "malformed", "mismatch"])(
    "uncertain %s save stays blocked until explicit read-only reconciliation",
    async (mode) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(captured.read));
      if (mode === "network")
        fetcher.mockRejectedValueOnce(new Error("Disconnected"));
      if (mode === "503")
        fetcher.mockResolvedValueOnce(failure("SETTINGS_COMMIT_UNKNOWN", 503));
      if (mode === "malformed")
        fetcher.mockResolvedValueOnce(json({ revision: 8 }));
      if (mode === "mismatch")
        fetcher.mockResolvedValueOnce(
          json({ ...captured.save, model: captured.read.model }),
        );
      fetcher.mockResolvedValueOnce(json(captured.readback));
      const { controller } = await start(fetcher);
      await controller.save(model);
      expect(controller.snapshot().status).toBe("unknown");
      expect(controller.snapshot().message).not.toContain("limits saved");
      await controller.save(model);
      expect(fetcher).toHaveBeenCalledTimes(2);
      await controller.load();
      expect(controller.snapshot().document?.model).toEqual(model);
      expect(controller.snapshot().message).toContain(
        "earlier save outcome was uncertain",
      );
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );
  it("serializes reads/saves and ignores late write replies after account disposal", async () => {
    const pending = deferred<Response>();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(captured.read))
      .mockReturnValueOnce(pending.promise);
    const { controller, close } = await start(fetcher);
    const save = controller.save(model);
    await controller.load();
    await controller.save(model);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const request = fetcher.mock.calls[1]![1]!;
    close();
    expect(request.signal?.aborted).toBe(true);
    pending.resolve(json(captured.save));
    await save;
    expect(controller.snapshot().status).not.toBe("saved");
    expect(controller.snapshot().document).toBeUndefined();
  });
  it("ignores a superseded read even when an adapter disregards abort", async () => {
    const pending = deferred<TenantDocument>();
    const send = vi
      .fn<typeof tenantSettingsRequest>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(captured.readback);
    const controller = new TenantSettingsController(send);
    controller.attach()();
    cleanups.push(controller.attach());
    await vi.waitFor(() =>
      expect(controller.snapshot().document?.revision).toBe(8),
    );
    pending.resolve(captured.read);
    await Promise.resolve();
    expect(controller.snapshot().document?.revision).toBe(8);
  });
  it("rejects unsafe or rounded monetary input and round-trips exact microUSD", () => {
    expect(modelDraft("1", "0.25", "5")).toEqual(model);
    for (const turns of ["0", "101", "1.5", "NaN", "1e1"])
      expect(modelDraft("1", "0.25", turns)).toBeNull();
    for (const value of [
      "",
      "0",
      "-1",
      "NaN",
      "Infinity",
      "1e6",
      "0.0000001",
      "9007199255",
    ])
      expect(usdToMicro(value), value).toBeNull();
    for (const [value, expected] of [
      ["1", 1000000],
      ["0.25", 250000],
      ["0.000001", 1],
      ["9007199254.740991", Number.MAX_SAFE_INTEGER],
    ] as const) {
      expect(usdToMicro(value)).toBe(expected);
      expect(microToUsd(expected)).toBe(value);
    }
  });
  it("bounds/parses responses and never exposes upstream prose", async () => {
    for (const response of [
      json({ ...captured.read, revision: "7" }),
      new Response("private server detail", {
        headers: { "Content-Type": "text/html" },
      }),
      json(captured.read, 200),
    ]) {
      if (
        response.headers.get("content-type")?.includes("json") &&
        (await response.clone().json()).revision === 7
      )
        response.headers.set("Content-Length", "262145");
      await expect(
        tenantSettingsRequest(
          "read",
          {},
          signal(),
          vi.fn(async () => response),
        ),
      ).rejects.toBeDefined();
    }
  });
});
