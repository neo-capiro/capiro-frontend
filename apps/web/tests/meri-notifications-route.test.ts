import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: "synthetic-user" as string | null,
  getToken: vi.fn(async () => "synthetic-capiro-token"),
  held: null as Response | null,
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: state.userId, getToken: state.getToken }),
}));
vi.mock("../src/shared/preview/backend-policy.server", () => ({
  previewBackendRejection: () => state.held,
}));
vi.mock("../src/shared/meri-notifications/memory-proxy.server", () => ({
  proxyMemoryNotifications: async (
    _request: Request,
    _env: unknown,
    token: () => Promise<string | null>,
  ) => Response.json({ authenticated: (await token()) !== null }),
}));
import { GET } from "../src/app/api/meri/notifications/route";

afterEach(() => {
  state.userId = "synthetic-user";
  state.held = null;
  state.getToken.mockClear();
});

describe("notification owner route credential composition", () => {
  it("uses the canonical Capiro template for the actual Core read", async () => {
    const response = await GET(
      new Request("https://local.test/api/meri/notifications?limit=20"),
    );
    expect(await response.json()).toEqual({ authenticated: true });
    expect(state.getToken).toHaveBeenCalledExactlyOnceWith({
      template: "capiro",
    });
  });
  it("does not request a token for an absent current session", async () => {
    state.userId = null;
    const response = await GET(
      new Request("https://local.test/api/meri/notifications?limit=20"),
    );
    expect(await response.json()).toEqual({ authenticated: false });
    expect(state.getToken).not.toHaveBeenCalled();
  });
  it("preserves the existing preview hold before any credential request", async () => {
    state.held = new Response(null, { status: 503 });
    expect(
      (
        await GET(
          new Request("https://local.test/api/meri/notifications?limit=20"),
        )
      ).status,
    ).toBe(503);
    expect(state.getToken).not.toHaveBeenCalled();
  });
});
