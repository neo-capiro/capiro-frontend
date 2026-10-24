import { describe, expect, it, vi } from "vitest";
import { settingsOperations } from "../../shared/capiro/operations/settings";
import {
  brandingSyncMessage,
  canRetryBrandingSync,
  retryBrandingSync,
} from "./branding-sync";

describe("Branding provider convergence", () => {
  it.each([
    "confirmed",
    "failed",
    "unknown",
    "not_requested",
    "superseded",
    "not_linked",
  ] as const)("preserves %s and gives its truthful next step", (clerkSync) => {
    const result = settingsOperations[
      "settings.branding.update"
    ].response.parse({
      id: "tenant",
      slug: "synthetic",
      name: "Saved",
      logoS3Key: null,
      logoContentType: null,
      logoUploadedAt: null,
      clerkSync,
    });
    expect(result.clerkSync).toBe(clerkSync);
    expect(brandingSyncMessage[clerkSync]).toContain("Capiro");
    expect(canRetryBrandingSync(clerkSync)).toBe(
      !["confirmed", "not_linked"].includes(clerkSync),
    );
  });
  it("does not accept browser draft fields on the explicit retry operation", () => {
    expect(
      settingsOperations["settings.branding.sync"].request.safeParse({
        body: { name: "unsaved" },
      }).success,
    ).toBe(false);
  });
  it("retries only the current server-owned value after current identity verification", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ role: "user_admin", tenant: { id: "tenant" } })
      .mockResolvedValueOnce({
        id: "tenant",
        name: "Server current",
        clerkSync: "confirmed",
      });
    const signal = new AbortController().signal;
    expect(await retryBrandingSync({ request } as never, signal)).toMatchObject(
      { name: "Server current" },
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "settings.branding.sync",
      {},
      { signal },
    );
  });
  it("rejects a wrong-tenant receipt and freshly revoked administrator", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ role: "user_admin", tenant: { id: "tenant" } })
      .mockResolvedValueOnce({
        id: "wrong",
        name: "name",
        clerkSync: "confirmed",
      });
    await expect(
      retryBrandingSync({ request } as never, new AbortController().signal),
    ).rejects.toThrow("not confirmed");
    request
      .mockReset()
      .mockResolvedValue({ role: "standard_user", tenant: { id: "tenant" } });
    await expect(
      retryBrandingSync({ request } as never, new AbortController().signal),
    ).rejects.toThrow("Administrator");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not dispatch after scope cancellation during identity read", async () => {
    const controller = new AbortController();
    const request = vi.fn(async () => {
      controller.abort();
      return { role: "user_admin", tenant: { id: "tenant" } };
    });
    await expect(
      retryBrandingSync({ request } as never, controller.signal),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
