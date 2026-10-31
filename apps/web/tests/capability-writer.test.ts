import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CapabilityForm } from "../src/features/portfolio/capabilities/CapabilityForm";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { capabilityInputSchema } from "../src/features/portfolio/capabilities/contracts";
import {
  saveCapability,
  removeCapability,
  refreshCapabilityFit,
  type CapabilityExecution,
} from "../src/features/portfolio/capabilities/writer";
import { capability, capabilityId, clientId } from "./browser/fixtures";
import { fit } from "./browser/capability-boundary-fixtures";

const body = capabilityInputSchema.parse(capability);
const execution = (): CapabilityExecution => {
  const signal = new AbortController().signal;
  return { signal, guard: () => signal.throwIfAborted() };
};

describe("capability transport and receipt boundaries", () => {
  it("creates through the existing client path and accepts the existing receipt without a client echo", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(capability));
    const scope = execution();
    await expect(
      saveCapability(
        createApiClient(fetcher),
        clientId,
        undefined,
        { ...body, name: "  Test sensor  " },
        scope,
      ),
    ).resolves.toEqual(capability);
    const [path, options] = fetcher.mock.calls[0]!;
    expect(path).toBe(`/api/backend/core/clients/${clientId}/capabilities`);
    expect(options).toMatchObject({
      method: "POST",
      signal: scope.signal,
      credentials: "same-origin",
    });
    expect(JSON.parse(String(options?.body))).toEqual({
      ...body,
      peNumber: null,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("edits only the requested capability and preserves the current PATCH body", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(capability));
    await expect(
      saveCapability(
        createApiClient(fetcher),
        clientId,
        capabilityId,
        body,
        execution(),
      ),
    ).resolves.toEqual(capability);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `/api/backend/core/clients/${clientId}/capabilities/${capabilityId}`,
    );
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      ...body,
      peNumber: null,
    });
  });

  for (const id of [
    "40000000-0000-4000-8000-000000000002",
    undefined,
    "malformed",
  ])
    it(`rejects an edit receipt with the wrong identity (${String(id)})`, async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ ...capability, id }));
      await expect(
        saveCapability(
          createApiClient(fetcher),
          clientId,
          capabilityId,
          body,
          execution(),
        ),
      ).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

  it("rejects invalid form input before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      saveCapability(
        createApiClient(fetcher),
        clientId,
        undefined,
        { ...body, name: " " },
        execution(),
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  for (const response of [
    () => new Response(null, { status: 204 }),
    () => Response.json({ deleted: true }),
  ])
    it("preserves the existing acknowledged delete contract", async () => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
      const scope = execution();
      await removeCapability(
        createApiClient(fetcher),
        clientId,
        capabilityId,
        scope,
      );
      expect(fetcher.mock.calls[0]?.[0]).toBe(
        `/api/backend/core/clients/${clientId}/capabilities/${capabilityId}`,
      );
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
        method: "DELETE",
        signal: scope.signal,
      });
    });

  it("refreshes fit through the existing POST without inventing profile or client receipt fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(fit));
    const scope = execution();
    await expect(
      refreshCapabilityFit(createApiClient(fetcher), clientId, scope),
    ).resolves.toEqual(fit);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `/api/backend/core/clients/${clientId}/capability-fit/refresh`,
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      signal: scope.signal,
    });
    expect(fetcher.mock.calls[0]?.[1]?.body).toBeUndefined();
  });
});

describe("authoritative PE editor array replaces the legacy scalar", () => {
  const legacy = { ...capability, peNumber: "0601234A", peNumbers: [] };
  it("loads a legacy-only PE into the actual editor before an unrelated edit", () => {
    const html = renderToStaticMarkup(
      createElement(CapabilityForm, {
        capability: legacy,
        disabled: false,
        saving: false,
        pending: false,
        onSave: vi.fn(),
        onRemove: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(html).toContain("Remove 0601234A");
  });
  it.each([
    ["remove legacy", []],
    ["replace legacy", ["0605678A"]],
    ["unchanged legacy on unrelated edit", ["0601234A"]],
  ])(
    "serializes %s without leaving a hidden legacy match",
    async (_label, peNumbers) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(async (_url, options) => {
          const patch = JSON.parse(String(options?.body));
          return Response.json({ ...legacy, ...patch });
        });
      const result = await saveCapability(
        createApiClient(fetcher),
        clientId,
        capabilityId,
        { ...body, notes: "Unrelated note edit", peNumbers },
        execution(),
      );
      expect(result.peNumber).toBeNull();
      expect(result.peNumbers).toEqual(peNumbers);
      expect(
        JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)),
      ).toMatchObject({ peNumber: null, peNumbers });
    },
  );
  it.each([undefined, null])(
    "rejects omitted/partial PE input (%s) without clearing anything",
    async (peNumbers) => {
      const partial = { ...body, peNumbers };
      if (peNumbers === undefined) delete partial.peNumbers;
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        saveCapability(
          createApiClient(fetcher),
          clientId,
          capabilityId,
          partial as unknown as typeof body,
          execution(),
        ),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});

const operations = [
  {
    name: "save",
    receipt: capability,
    run: (
      api: ReturnType<typeof createApiClient>,
      scope: CapabilityExecution,
    ) => saveCapability(api, clientId, capabilityId, body, scope),
  },
  {
    name: "remove",
    receipt: { deleted: true },
    run: (
      api: ReturnType<typeof createApiClient>,
      scope: CapabilityExecution,
    ) => removeCapability(api, clientId, capabilityId, scope),
  },
  {
    name: "refresh",
    receipt: fit,
    run: (
      api: ReturnType<typeof createApiClient>,
      scope: CapabilityExecution,
    ) => refreshCapabilityFit(api, clientId, scope),
  },
];

describe("captured capability execution guards", () => {
  for (const operation of operations) {
    it(`${operation.name} refuses dispatch after authority is lost`, async () => {
      const fetcher = vi.fn<typeof fetch>();
      const scope = {
        ...execution(),
        guard: () => {
          throw new ApiError(403, "Synthetic actor changed");
        },
      };
      await expect(
        operation.run(createApiClient(fetcher), scope),
      ).rejects.toMatchObject({ status: 403 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it(`${operation.name} refuses to publish a receipt after authority changes during transport`, async () => {
      let authorized = true;
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
        authorized = false;
        return Response.json(operation.receipt);
      });
      const scope = {
        ...execution(),
        guard: () => {
          if (!authorized) throw new ApiError(403, "Synthetic actor changed");
        },
      };
      await expect(
        operation.run(createApiClient(fetcher), scope),
      ).rejects.toMatchObject({ status: 403 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it(`${operation.name} refuses a late receipt after its view aborts`, async () => {
      const controller = new AbortController();
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
        controller.abort();
        return Response.json(operation.receipt);
      });
      const scope = {
        signal: controller.signal,
        guard: () => controller.signal.throwIfAborted(),
      };
      await expect(
        operation.run(createApiClient(fetcher), scope),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it(`${operation.name} does not automatically retry a failed mutation`, async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { message: "Synthetic service unavailable" },
            { status: 503 },
          ),
        );
      await expect(
        operation.run(createApiClient(fetcher), execution()),
      ).rejects.toMatchObject({ status: 503 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  }
});
