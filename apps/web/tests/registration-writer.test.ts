import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { saveRegistrations } from "../src/features/portfolio/capabilities/registration-writer";
import { clientId } from "./browser/fixtures";
import { registrationClient } from "./browser/capability-registration-fixtures";

const body = {
  uei: registrationClient.uei,
  cageCode: registrationClient.cageCode,
  naicsCodes: registrationClient.naicsCodes,
  pscCodes: registrationClient.pscCodes,
  setAsideCertifications: registrationClient.setAsideCertifications,
};
const execution = () => {
  const signal = new AbortController().signal;
  return { signal, guard: () => signal.throwIfAborted() };
};

describe("native registration update boundary", () => {
  it("preserves the existing five-field PUT and native exact-client receipt", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(registrationClient));
    const scope = execution();
    const contaminated = {
      ...body,
      intakeData: { profileNotes: "Stale notes" },
      name: "Unrelated name",
    };
    await expect(
      saveRegistrations(
        createApiClient(fetcher),
        clientId,
        contaminated,
        scope,
      ),
    ).resolves.toEqual(registrationClient);
    const [path, options] = fetcher.mock.calls[0]!;
    expect(path).toBe(`/api/backend/core/clients/${clientId}`);
    expect(options).toMatchObject({
      method: "PUT",
      signal: scope.signal,
      credentials: "same-origin",
    });
    expect(JSON.parse(String(options?.body))).toEqual(body);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("allows the existing empty values and arrays without inventing stricter enums", async () => {
    const cleared = {
      uei: "",
      cageCode: "",
      naicsCodes: [],
      pscCodes: [],
      setAsideCertifications: [],
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ...registrationClient, ...cleared }));
    await saveRegistrations(
      createApiClient(fetcher),
      clientId,
      cleared,
      execution(),
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(
      cleared,
    );
  });

  for (const id of [
    "10000000-0000-4000-8000-000000000099",
    undefined,
    "malformed",
  ])
    it(`rejects a registration receipt with wrong identity (${String(id)})`, async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ ...registrationClient, id }));
      await expect(
        saveRegistrations(
          createApiClient(fetcher),
          clientId,
          body,
          execution(),
        ),
      ).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

  for (const input of [
    { ...body, uei: "1234567890123" },
    { ...body, cageCode: "123456" },
    { ...body, pscCodes: [42] },
  ])
    it("rejects values outside the pinned native DTO before dispatch", async () => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        saveRegistrations(
          createApiClient(fetcher),
          clientId,
          input as typeof body,
          execution(),
        ),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    });

  it("refuses dispatch without the captured writer authority", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      saveRegistrations(createApiClient(fetcher), clientId, body, {
        ...execution(),
        guard: () => {
          throw new ApiError(403, "Synthetic role loss");
        },
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rechecks authority after a valid native receipt", async () => {
    let allowed = true;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      allowed = false;
      return Response.json(registrationClient);
    });
    await expect(
      saveRegistrations(createApiClient(fetcher), clientId, body, {
        ...execution(),
        guard: () => {
          if (!allowed) throw new ApiError(403, "Synthetic role loss");
        },
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refuses a late receipt after the view lifetime ends", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return Response.json(registrationClient);
    });
    await expect(
      saveRegistrations(createApiClient(fetcher), clientId, body, {
        signal: controller.signal,
        guard: () => controller.signal.throwIfAborted(),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  for (const status of [403, 503])
    it(`preserves HTTP ${status} without an automatic write retry`, async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: "Synthetic service refusal" }, { status }),
        );
      await expect(
        saveRegistrations(
          createApiClient(fetcher),
          clientId,
          body,
          execution(),
        ),
      ).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
});
