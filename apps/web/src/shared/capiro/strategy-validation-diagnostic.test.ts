import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { handleCapiroRequest } from "./gateway";
import { readCapiroConfig } from "./config";
import { strategiesAgentOperations } from "./operations/strategies-agents";
import {
  reportStrategyValidation,
  type StrategyValidationDiagnostic,
} from "./strategy-validation-diagnostic";
import type { OperationDefinition } from "./contracts";
const key = "strategies.proposals",
  canonical = strategiesAgentOperations[key],
  secret = "PRIVATE_TOKEN_COOKIE_ENUM_PAYLOAD";
const config = readCapiroConfig({
  STRATEGY_API_BASE_URL: "https://strategy.synthetic.invalid/strategy-api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_live_synthetic",
});
async function gateway(
  operation: OperationDefinition,
  payload: unknown,
  operationKey = key,
  status = 200,
  token: string | null = secret,
) {
  return handleCapiroRequest(
    new Request(
      `https://frontend.synthetic.invalid/api/capiro/${operationKey}?input=%7B%7D`,
    ),
    operationKey,
    { [operationKey]: operation },
    config,
    async () => token,
    async () =>
      Response.json(payload, {
        status,
        headers: { "Set-Cookie": secret, "X-Private": secret },
      }),
  );
}
afterEach(() => vi.restoreAllMocks());
for (const stage of ["upstream", "browser"] as const)
  it(`reports ${stage} failure with generic browser502 and no sensitive material`, async () => {
    const logger = vi.spyOn(console, "warn").mockImplementation(() => {});
    const operation =
      stage === "upstream"
        ? canonical
        : { ...canonical, upstreamResponse: z.unknown() };
    const response = await gateway(operation, [
      { id: secret, summary: secret, risk: secret, secretExtraKey: secret },
    ]);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: "The service returned an unexpected response.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(logger).toHaveBeenCalledTimes(1);
    const [label, serialized] = logger.mock.calls[0]!;
    expect(label).toBe("strategies.proposals validation");
    expect(typeof serialized).toBe("string");
    const diagnostic = JSON.parse(
      serialized as string,
    ) as StrategyValidationDiagnostic;
    expect(Object.keys(diagnostic).sort()).toEqual(["issues", "stage"]);
    expect((diagnostic as StrategyValidationDiagnostic).stage).toBe(stage);
    expect(
      (diagnostic as StrategyValidationDiagnostic).issues.length,
    ).toBeLessThanOrEqual(10);
    expect(JSON.stringify(logger.mock.calls)).not.toContain(secret);
    expect((diagnostic as StrategyValidationDiagnostic).issues).toContainEqual({
      path: [0, "risk"],
      code: "invalid_value",
      expectedType: "string",
      receivedType: "string",
    });
  });
it("limits total diagnostics to10 across a large invalid array", async () => {
  const logger = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(
    (
      await gateway(
        canonical,
        Array.from({ length: 30 }, () => ({ summary: secret })),
      )
    ).status,
  ).toBe(502);
  const diagnostic = JSON.parse(
    logger.mock.calls[0]![1] as string,
  ) as StrategyValidationDiagnostic;
  expect(diagnostic.issues).toHaveLength(10);
  for (const issue of diagnostic.issues)
    expect(Object.keys(issue).sort()).toEqual([
      "code",
      "expectedType",
      "path",
      "receivedType",
    ]);
  expect(JSON.stringify(diagnostic)).not.toContain(secret);
});
it("never includes unknown path segments, keys, messages or enum choices", () => {
  const error = new z.ZodError([
    { code: "custom", path: [0, secret], message: secret },
    { code: "unrecognized_keys", path: [0], keys: [secret], message: secret },
    {
      code: "invalid_value",
      path: [0, "risk"],
      values: [secret],
      message: secret,
    },
  ]);
  const emit = vi.fn();
  reportStrategyValidation(
    key,
    canonical,
    "upstream",
    error,
    [{ risk: secret, [secret]: secret }],
    emit,
  );
  expect(emit).toHaveBeenCalledWith({
    stage: "upstream",
    issues: [
      {
        path: [0],
        code: "unrecognized_keys",
        expectedType: "object",
        receivedType: "object",
      },
      {
        path: [0, "risk"],
        code: "invalid_value",
        expectedType: "string",
        receivedType: "string",
      },
    ],
  });
  expect(JSON.stringify(emit.mock.calls)).not.toContain(secret);
});
it("classifies accessor-backed values as unknown without invoking accessors", () => {
  const getter = vi.fn(() => {
    throw new Error(secret);
  });
  const value = Object.defineProperty({}, "summary", { get: getter });
  const emit = vi.fn();
  reportStrategyValidation(
    key,
    canonical,
    "upstream",
    new z.ZodError([{ code: "custom", path: [0, "summary"], message: secret }]),
    [value],
    emit,
  );
  expect(getter).not.toHaveBeenCalled();
  expect(emit).toHaveBeenCalledWith({
    stage: "upstream",
    issues: [
      {
        path: [0, "summary"],
        code: "custom",
        expectedType: "string",
        receivedType: "unknown",
      },
    ],
  });
});
it("retains generic502 when logger throws", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {
    throw new Error(secret);
  });
  const response = await gateway(canonical, { private: secret });
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    message: "The service returned an unexpected response.",
  });
});
it("does not log successful reads, upstream service errors or denied auth", async () => {
  const logger = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await gateway(canonical, [])).status).toBe(200);
  expect((await gateway(canonical, { message: secret }, key, 502)).status).toBe(
    502,
  );
  expect((await gateway(canonical, [], key, 200, null)).status).toBe(401);
  expect(logger).not.toHaveBeenCalled();
});
it("requires exact key, method, service, path and canonical schemas", () => {
  const error = new z.ZodError([{ code: "custom", path: [], message: secret }]),
    emit = vi.fn();
  reportStrategyValidation(
    "strategies.list",
    canonical,
    "upstream",
    error,
    secret,
    emit,
  );
  for (const operation of [
    { ...canonical, method: "POST" as const },
    { ...canonical, service: "core" as const },
    { ...canonical, path: "/agents/other" },
    { ...canonical, response: z.unknown() },
    { ...canonical, request: z.object({}).strict() },
  ])
    reportStrategyValidation(key, operation, "upstream", error, secret, emit);
  expect(emit).not.toHaveBeenCalled();
});
it("does not log validation failures for a different registered operation key", async () => {
  const logger = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(
    (await gateway(canonical, { secret }, "strategies.other")).status,
  ).toBe(502);
  expect(logger).not.toHaveBeenCalled();
});
