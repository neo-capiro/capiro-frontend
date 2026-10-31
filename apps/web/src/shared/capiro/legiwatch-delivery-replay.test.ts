import { expect, it, vi } from "vitest";
import { handleCapiroRequest } from "./gateway";
import { createCapiroApi } from "./http";
import { legiwatchDeliveryOperations } from "./operations/legiwatch-delivery";
import { legiwatchRolloutOperations } from "./operations/legiwatch-rollout";

const operations = {
  ...legiwatchDeliveryOperations,
  ...legiwatchRolloutOperations,
};
const input = {
  params: { id: "synthetic-run" },
  body: {
    subject: "Reviewed briefing",
    introduction: "Approved introduction",
    selection: [
      {
        kind: "manual" as const,
        email: "reader@example.test",
        role: "bcc" as const,
      },
    ],
    approvalHash: "synthetic-exact-approval",
  },
};

function transport(payload: unknown, scopeSignal?: AbortSignal) {
  const upstream = vi.fn<typeof fetch>(async () => Response.json(payload));
  const browser = vi.fn<typeof fetch>(async (url, init) =>
    handleCapiroRequest(
      new Request(`https://frontend.example.test${url}`, {
        ...init,
        headers: { ...init?.headers, origin: "https://frontend.example.test" },
      }),
      String(url).split("/").at(-1)!,
      operations,
      {
        services: { intelligence: "https://intel.example.test" },
        authConfigured: true,
        issues: [],
      },
      async () => "synthetic-token",
      upstream,
    ),
  );
  return {
    upstream,
    browser,
    api: createCapiroApi(operations, {
      fetcher: browser,
      ...(scopeSignal ? { scopeSignal: () => scopeSignal } : {}),
    }),
  };
}

for (const key of [
  "legiwatch.delivery.send",
  "legiwatch.report.send",
] as const) {
  for (const state of ["queued", "already_queued"] as const) {
    it(`${key} preserves the canonical ${state} receipt through gateway and browser without another POST`, async () => {
      const receipt = { id: "synthetic-durable-delivery", state };
      const { api, browser, upstream } = transport(receipt);
      expect(await api.request(key, input)).toEqual(receipt);
      expect(browser).toHaveBeenCalledTimes(1);
      expect(upstream).toHaveBeenCalledTimes(1);
      expect(String(upstream.mock.calls[0]?.[0])).toBe(
        "https://intel.example.test/legiwatch/deliveries/runs/synthetic-run/send",
      );
      expect(upstream.mock.calls[0]?.[1]?.method).toBe("POST");
      expect(JSON.parse(String(upstream.mock.calls[0]?.[1]?.body))).toEqual(
        input.body,
      );
    });
  }
}

it.each([
  { state: "already_queued" },
  { id: null, state: "already_queued" },
  { id: "", state: "queued" },
  { id: "   ", state: "already_queued" },
  { id: "delivery", state: "sent" },
  { deliveryId: "delivery", state: "already_queued" },
  { id: "delivery", deliveryId: "different-delivery", state: "already_queued" },
  { id: "delivery", runId: "different-run", state: "already_queued" },
])(
  "refuses malformed or conflicting receipt fields without replay: %j",
  async (payload) => {
    const { api, browser, upstream } = transport(payload);
    await expect(
      api.request("legiwatch.delivery.send", input),
    ).rejects.toMatchObject({ status: 502 });
    expect(browser).toHaveBeenCalledTimes(1);
    expect(upstream).toHaveBeenCalledTimes(1);
  },
);

it("refuses conflicting request identity fields before any upstream request", async () => {
  const { api, browser, upstream } = transport({
    id: "delivery",
    state: "queued",
  });
  await expect(
    api.request("legiwatch.delivery.send", {
      ...input,
      params: { ...input.params, runId: "different-run" },
    } as typeof input),
  ).rejects.toMatchObject({ status: 400 });
  expect(browser).not.toHaveBeenCalled();
  expect(upstream).not.toHaveBeenCalled();
});

it("does not admit a replay receipt after the caller's scope is replaced", async () => {
  const controller = new AbortController();
  const { api, browser, upstream } = transport(
    { id: "delivery", state: "already_queued" },
    controller.signal,
  );
  upstream.mockImplementationOnce(async () => {
    controller.abort();
    return Response.json({ id: "delivery", state: "already_queued" });
  });
  await expect(
    api.request("legiwatch.delivery.send", input),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(browser).toHaveBeenCalledTimes(1);
  expect(upstream).toHaveBeenCalledTimes(1);
});
