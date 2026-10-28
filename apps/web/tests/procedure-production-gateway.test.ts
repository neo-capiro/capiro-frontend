import { expect, it, vi } from "vitest";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { capiroOperations } from "../src/shared/capiro/registry";
import { meriFirmSkillOperations } from "../src/shared/capiro/operations/meri-firm-skills";

const id = "11111111-1111-4111-8111-111111111111";
const write = {
  id: "custom_procedure",
  name: "Custom",
  triggers: ["custom_procedure"],
};
const persisted = {
  id,
  tenantId: "22222222-2222-4222-8222-222222222222",
  skillId: write.id,
  name: write.name,
  skillJson: write,
  version: 2,
  versions: [],
  enabled: true,
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: "2026-10-28T00:00:00.000Z",
  updatedAt: "2026-10-28T00:00:00.000Z",
};
const config = {
  services: { core: "https://core.example.test/api" },
  authConfigured: true,
  issues: [],
  requestOrigin: "https://app.example.test",
};
const cases = [
  {
    key: "meri.procedures.list",
    input: {},
    path: "/clio/firm-skills",
    result: [],
  },
  {
    key: "meri.procedures.create",
    input: { body: write },
    path: "/clio/firm-skills",
    result: persisted,
  },
  {
    key: "meri.procedures.update",
    input: { params: { id }, body: { ...write, expectedVersion: 1 } },
    path: `/clio/firm-skills/${id}`,
    result: persisted,
  },
  {
    key: "meri.procedures.setEnabled",
    input: { params: { id }, body: { enabled: false, expectedVersion: 1 } },
    path: `/clio/firm-skills/${id}/enabled`,
    result: { ...persisted, enabled: false },
  },
  {
    key: "meri.procedures.remove",
    input: { params: { id }, query: { expectedVersion: 1 } },
    path: `/clio/firm-skills/${id}?expectedVersion=1`,
    result: { deleted: true },
  },
  {
    key: "meri.procedures.restore",
    input: { params: { id }, body: { version: 1, expectedVersion: 2 } },
    path: `/clio/firm-skills/${id}/restore`,
    result: persisted,
  },
  {
    key: "meri.procedures.test",
    input: { params: { id } },
    path: `/clio/firm-skills/${id}/test`,
    result: {
      skillId: write.id,
      canonicalId: write.id,
      version: 2,
      procedureDigest: null,
      procedureScopes: [],
      triggers: write.triggers,
      note: "Stored guidance only; no tools executed.",
    },
  },
] as const;

function incoming(key: keyof typeof meriFirmSkillOperations, input: unknown) {
  const method = meriFirmSkillOperations[key].method;
  const url = new URL(`https://app.example.test/api/capiro/${key}`);
  if (method === "GET") url.searchParams.set("input", JSON.stringify(input));
  return new Request(url, {
    method,
    headers: {
      Origin: config.requestOrigin,
      "Content-Type": "application/json",
      Authorization: "Bearer browser-value",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(input) }),
  });
}

for (const example of cases) {
  it(`dispatches ${example.key} through the actual registered gateway and ordinary identity owner`, async () => {
    const token = vi.fn(async () => "synthetic-capiro-template-token");
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(example.result),
    );
    const response = await handleCapiroRequest(
      incoming(example.key, example.input),
      example.key,
      capiroOperations,
      config,
      token,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(example.result);
    expect(capiroOperations[example.key]).toBe(
      meriFirmSkillOperations[example.key],
    );
    // Undefined selects the ordinary capiro template in the existing API route;
    // only explicitly reviewed exceptions request a Clerk session token.
    expect(token).toHaveBeenCalledWith(undefined);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(`${config.services.core}${example.path}`);
    expect(options?.method).toBe(meriFirmSkillOperations[example.key].method);
    expect(new Headers(options?.headers).get("authorization")).toBe(
      "Bearer synthetic-capiro-template-token",
    );
    expect(options?.body).toBe(
      "body" in example.input ? JSON.stringify(example.input.body) : undefined,
    );
  });
}

it("keeps current-session, same-origin and viewed-version refusals before the Core mutation", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const key = "meri.procedures.update";
  const input = { params: { id }, body: { ...write, expectedVersion: 1 } };
  expect(
    (
      await handleCapiroRequest(
        incoming(key, input),
        key,
        capiroOperations,
        config,
        async () => null,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await handleCapiroRequest(
        incoming(key, { params: { id }, body: write }),
        key,
        capiroOperations,
        config,
        async () => "token",
        fetcher,
      )
    ).status,
  ).toBe(400);
  const foreign = incoming(key, input);
  foreign.headers.set("Origin", "https://other.example.test");
  expect(
    (
      await handleCapiroRequest(
        foreign,
        key,
        capiroOperations,
        config,
        async () => "token",
        fetcher,
      )
    ).status,
  ).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
});
