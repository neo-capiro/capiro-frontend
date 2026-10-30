import { describe, it, expect, vi } from "vitest";
import {
  browserChoices,
  browserSaveRequest,
  sameSettingsValue,
} from "../src/features/meri/tenant-settings/browser-editor";
import { TenantSettingsController } from "../src/features/meri/tenant-settings/controller";
import {
  tenantSettingsRequest,
  type TenantDocument,
} from "../src/features/meri/tenant-settings/client";
import captured from "./meri-tenant-settings-fixture.json";
const policy = {
  enabled: true,
  allowedOrigins: ["https://records.example", "https://notices.example"],
  tools: ["browser_snapshot"],
  timeouts: { actionMs: 5000, navigationMs: 30000 },
};
const document: TenantDocument = {
  ...captured.read,
  browserPolicy: {
    browser: { tools: ["browser_snapshot"] },
    roles: { standard_user: { timeouts: { actionMs: 1000 } } },
  },
  browserPlatform: {
    maximum: policy,
    defaults: policy,
    roleCeilings: {
      standard_user: { ...policy, allowedOrigins: ["https://records.example"] },
    },
  },
};
describe("browser settings on the canonical tenant route", () => {
  it("preserves opaque restrictions and sends revision without replacing model limits", () => {
    const choices = browserChoices(document)!;
    choices[0]!.selected = ["https://records.example"];
    const body = browserSaveRequest(document, choices);
    expect(body.expectedRevision).toBe(document.revision);
    expect(body.settings.model).toBeUndefined();
    expect(body.settings.browserPolicy).toEqual({
      browser: {
        tools: ["browser_snapshot"],
        enabled: true,
        allowedOrigins: ["https://records.example"],
      },
      roles: {
        standard_user: {
          enabled: true,
          allowedOrigins: ["https://records.example"],
          timeouts: { actionMs: 1000 },
        },
      },
    });
    expect(document.browserPolicy!.browser).toEqual({
      tools: ["browser_snapshot"],
    });
    choices[1]!.selected = ["https://notices.example"];
    expect(() => browserSaveRequest(document, choices)).toThrow();
  });
  it("does not invent editable defaults for absent, malformed or member-only policy responses", () => {
    expect(browserChoices(captured.member)).toBeNull();
    expect(browserChoices(captured.read)).toBeNull();
    expect(
      browserChoices({
        ...document,
        browserPolicy: { browser: { enabled: null } },
      }),
    ).toBeNull();
    expect(browserChoices({ ...document, browserPlatform: {} })).toBeNull();
    expect(sameSettingsValue({ b: 2, a: [1] }, { a: [1], b: 2 })).toBe(true);
    expect(sameSettingsValue({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
  });
  it("shares save/conflict lifetime and confirms the exact returned policy", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(document));
    const controller = new TenantSettingsController((operation, body, signal) =>
      tenantSettingsRequest(operation, body, signal, fetcher),
    );
    const close = controller.attach();
    try {
      await vi.waitFor(() =>
        expect(controller.snapshot().status).toBe("ready"),
      );
      const choices = browserChoices(document)!;
      choices[0]!.enabled = false;
      const body = browserSaveRequest(document, choices);
      fetcher.mockResolvedValueOnce(
        Response.json({
          ...document,
          revision: document.revision + 1,
          browserPolicy: body.settings.browserPolicy,
        }),
      );
      await controller.saveBrowser(choices);
      expect(controller.snapshot().status).toBe("saved");
      expect(JSON.parse(String(fetcher.mock.calls[1]![1]!.body))).toEqual(body);
      await controller.saveBrowser(choices);
      expect(fetcher).toHaveBeenCalledTimes(2);
      fetcher.mockResolvedValueOnce(Response.json(document));
      await controller.load();
      fetcher.mockResolvedValueOnce(
        Response.json(
          { error: { code: "SETTINGS_REVISION_CONFLICT" } },
          { status: 409 },
        ),
      );
      await controller.saveBrowser(choices);
      expect(controller.snapshot().status).toBe("conflict");
      await controller.saveBrowser(choices);
      expect(fetcher).toHaveBeenCalledTimes(4);
    } finally {
      close();
    }
  });
  it("withholds confirmation when the saved browser policy or preserved model differs", async () => {
    for (const changed of [
      { browserPolicy: {} },
      { model: { ...document.model!, maxTurns: 99 } },
    ]) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(document))
        .mockResolvedValueOnce(
          Response.json({
            ...document,
            revision: document.revision + 1,
            browserPolicy: browserSaveRequest(
              document,
              browserChoices(document)!,
            ).settings.browserPolicy,
            ...changed,
          }),
        );
      const controller = new TenantSettingsController(
        (operation, body, signal) =>
          tenantSettingsRequest(operation, body, signal, fetcher),
      );
      const close = controller.attach();
      try {
        await vi.waitFor(() =>
          expect(controller.snapshot().status).toBe("ready"),
        );
        await controller.saveBrowser(browserChoices(document)!);
        expect(controller.snapshot().status).toBe("unknown");
      } finally {
        close();
      }
    }
  });
});
