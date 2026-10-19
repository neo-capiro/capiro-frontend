import { expect, it, vi } from "vitest";
import type { CapiroConfig } from "./config";
import { handleCapiroRequest } from "./gateway";
import { draftDocument } from "./operations/workspace-documents";
import { capiroOperations } from "./registry";
import { cases, legacyDocument } from "./workspace-brief-copy.fixtures";

const config: CapiroConfig = {
  services: { workspace: "https://workspace.example.test/workspace-api" },
  authConfigured: true,
  issues: [],
};
it.each(cases)(
  "dispatches the exact published $key and preserves its response",
  async (fixture) => {
    const query =
      fixture.method === "GET"
        ? `?input=${encodeURIComponent(JSON.stringify(fixture.input))}`
        : "";
    const request = new Request(
      `https://frontend.example.test/api/capiro/${fixture.key}${query}`,
      {
        method: fixture.method,
        headers: {
          Origin: "https://frontend.example.test",
          "Content-Type": "application/json",
        },
        ...(fixture.method === "POST"
          ? { body: JSON.stringify(fixture.input) }
          : {}),
      },
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(fixture.response));
    const auth = vi.fn(async () => "synthetic-clerk-token");
    const response = await handleCapiroRequest(
      request,
      fixture.key,
      capiroOperations,
      config,
      auth,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(fixture.response);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(
      `https://workspace.example.test/workspace-api${fixture.path}`,
    );
    expect(init).toMatchObject({
      method: fixture.method,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer synthetic-clerk-token",
    );
    expect(init?.body).toBe(
      "body" in fixture.input ? JSON.stringify(fixture.input.body) : undefined,
    );
    expect(auth).toHaveBeenCalledTimes(1);
  },
);

it("preserves the immutable source association through the existing document reader", () => {
  expect(draftDocument.parse(legacyDocument)).toHaveProperty(
    "sourceBriefVersion",
    legacyDocument.sourceBriefVersion,
  );
});

it("preserves complete ordered rich JSON through the existing document reader", () => {
  expect(draftDocument.parse(legacyDocument).body).toEqual(legacyDocument.body);
});
