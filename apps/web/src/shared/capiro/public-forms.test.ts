import { expect, it, vi } from "vitest";
import { handleCapiroRequest, handlePublicPlannerFormRequest } from "./gateway";
import { capiroOperations } from "./registry";
const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64);
const config = {
  services: { strategy: "https://strategy.example.test/strategy-api" },
  authConfigured: false,
  issues: [],
};
const form = {
  name: "Synthetic intake",
  description: "Request",
  fields: [],
  projectId: "private",
  ownerId: "private",
  tenantId: "private",
};
function read(capability = token) {
  return new Request(
    `https://app.example.test/api/capiro/public-form.read?input=${encodeURIComponent(JSON.stringify({ params: { token: capability } }))}`,
    {
      headers: {
        Cookie: "secret",
        Authorization: "Bearer browser-supplied",
        "x-tenant-id": "forged",
      },
    },
  );
}
it("public forms use only a revocable capability and project no internal identities", async () => {
  const fetcher = vi.fn(async () => Response.json(form));
  const response = await handlePublicPlannerFormRequest(
    read(),
    "public-form.read",
    config,
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    name: form.name,
    description: form.description,
    fields: [],
  });
  const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.href).toBe(
    `https://strategy.example.test/strategy-api/planner/public/forms/${token}`,
  );
  const headers = new Headers(options.headers);
  for (const name of ["cookie", "authorization", "x-tenant-id"])
    expect(headers.has(name)).toBe(false);
  expect(options.redirect).toBe("error");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("malformed capabilities, private operations and cross-origin form writes never dispatch", async () => {
  const fetcher = vi.fn(async () => Response.json(form));
  expect(
    (
      await handlePublicPlannerFormRequest(
        read("../private"),
        "public-form.read",
        config,
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await handlePublicPlannerFormRequest(
        read(),
        "planner.tasks",
        config,
        fetcher,
      )
    ).status,
  ).toBe(404);
  const request = new Request(
    "https://app.example.test/api/capiro/public-form.submit",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://other.example.test",
      },
      body: JSON.stringify({ params: { token }, body: {} }),
    },
  );
  expect(
    (
      await handlePublicPlannerFormRequest(
        request,
        "public-form.submit",
        config,
        fetcher,
      )
    ).status,
  ).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      await handleCapiroRequest(
        read(),
        "planner.tasks",
        capiroOperations,
        config,
        async () => null,
        fetcher,
      )
    ).status,
  ).toBe(503);
});
it("public submissions expose a receipt only and preserve revoked-link failures", async () => {
  const request = new Request(
    "https://app.example.test/api/capiro/public-form.submit",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://app.example.test",
      },
      body: JSON.stringify({ params: { token }, body: {} }),
    },
  );
  const receipt = await handlePublicPlannerFormRequest(
    request,
    "public-form.submit",
    config,
    async () => Response.json({ received: true, taskId: "private" }),
  );
  expect(await receipt.json()).toEqual({ received: true });
  const unavailable = await handlePublicPlannerFormRequest(
    read(),
    "public-form.read",
    config,
    async () => Response.json({ message: "private details" }, { status: 404 }),
  );
  expect(unavailable.status).toBe(404);
  expect(await unavailable.text()).not.toContain("private details");
});
