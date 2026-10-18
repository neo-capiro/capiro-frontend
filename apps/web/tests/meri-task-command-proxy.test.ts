import { describe, expect, it, vi } from "vitest";
import { readTaskCommandConfig } from "../src/shared/meri-task-commands/config";
import { readOpaqueSessionConfig } from "../src/shared/meri-actions/connection-config";
import { proxyTaskCommandRequest } from "../src/shared/meri-task-commands/proxy";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import { taskInput } from "./meri-task-command-fixtures";

const origin = "https://frontend.example.test";
const bearer = `Bearer action_session_${"a".repeat(43)}`;
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_TASK_COMMAND_WORKFLOW_ENABLED: "true",
};
const request = (
  operation = "prepare",
  body: unknown = { arguments: taskInput },
  options: RequestInit = {},
  suffix = "",
) =>
  new Request(`${origin}/api/task-commands/${operation}${suffix}`, {
    method: "POST",
    body: JSON.stringify(body),
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Authorization: bearer,
      ...Object.fromEntries(new Headers(options.headers)),
    },
  });
describe("task-command exact frontend admission", () => {
  it.each([undefined, "false", "TRUE", "1", " true "])(
    "is closed without literal opt-in %s",
    async (flag) => {
      const config = readTaskCommandConfig({
        ...env,
        MERI_TASK_COMMAND_WORKFLOW_ENABLED: flag,
      });
      const token = vi.fn(async () => "native"),
        fetcher = vi.fn(async () => Response.json({}));
      expect(config.enabled).toBe(false);
      expect(
        (
          await proxyTaskCommandRequest(
            request(),
            "prepare",
            config,
            token,
            fetcher,
          )
        ).status,
      ).toBe(503);
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("only extends opaque bootstrap availability, preserving existing action/document defaults", () => {
    expect(readOpaqueSessionConfig(env).enabled).toBe(true);
    expect(
      readTaskCommandConfig({ ...env, MERI_API_BASE_URL: undefined }).enabled,
    ).toBe(false);
  });
  it.each([
    ["API path", "https://meri.example.test/api"],
    ["other path", "https://meri.example.test/private"],
    ["credentials", "https://user:pass@meri.example.test"],
    ["query", "https://meri.example.test/?scope=forged"],
    ["fragment", "https://meri.example.test/#forged"],
  ])(
    "holds a %s Meri URL before authentication or dispatch",
    async (_, baseUrl) => {
      const invalidEnv = { ...env, MERI_API_BASE_URL: baseUrl };
      const config = readTaskCommandConfig(invalidEnv);
      const token = vi.fn(async () => "native");
      const fetcher = vi.fn(async () => Response.json({}));
      expect(config.enabled).toBe(false);
      expect(readOpaqueSessionConfig(invalidEnv).enabled).toBe(false);
      expect(
        (
          await proxyTaskCommandRequest(
            request(),
            "prepare",
            config,
            token,
            fetcher,
          )
        ).status,
      ).toBe(503);
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each(["approve", "PREPARE", "../execute", "prepare/execute"])(
    "refuses unallocated route %s",
    async (operation) => {
      const token = vi.fn(async () => "native");
      expect(
        (
          await proxyTaskCommandRequest(
            request(),
            operation,
            readTaskCommandConfig(env),
            token,
          )
        ).status,
      ).toBe(404);
      expect(token).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["method", { method: "PUT" }, "", 405],
    ["query", {}, "?clientId=browser", 400],
    ["encoding", { headers: { "Content-Encoding": "gzip" } }, "", 400],
    ["origin", { headers: { Origin: "https://foreign.test" } }, "", 400],
  ] as const)(
    "refuses %s before authentication",
    async (_, options, suffix, status) => {
      const token = vi.fn(async () => "native");
      expect(
        (
          await proxyTaskCommandRequest(
            request("prepare", { arguments: taskInput }, options, suffix),
            "prepare",
            readTaskCommandConfig(env),
            token,
          )
        ).status,
      ).toBe(status);
      expect(token).not.toHaveBeenCalled();
    },
  );
  it("requires current native authentication and an opaque bearer; no token substitution", async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    expect(
      (
        await proxyTaskCommandRequest(
          request(),
          "prepare",
          readTaskCommandConfig(env),
          async () => null,
          fetcher,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await proxyTaskCommandRequest(
          request(
            "prepare",
            {},
            { headers: { Authorization: "Bearer native-browser" } },
          ),
          "prepare",
          readTaskCommandConfig(env),
          async () => "native",
          fetcher,
        )
      ).status,
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards only the exact public request and opaque token with no-store headers", async () => {
    const fetcher = vi.fn(async () => Response.json({ synthetic: true }));
    const response = await proxyTaskCommandRequest(
      request(),
      "prepare",
      readTaskCommandConfig(env),
      async () => "native-private",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]! as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://meri.example.test/api/task-commands/prepare");
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: bearer,
    });
    expect(options.body).toBe(JSON.stringify({ arguments: taskInput }));
    expect(options.redirect).toBe("error");
    expect(options.credentials).toBe("omit");
  });
  it("rejects browser authority fields and remains held by unchanged preview policy", async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    const response = await proxyTaskCommandRequest(
      request("prepare", { arguments: taskInput, approval: "approved" }),
      "prepare",
      readTaskCommandConfig(env),
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      previewBackendRejection({ CAPIRO_PREVIEW_READ_ONLY: "true" }, request())
        ?.status,
    ).toBe(503);
  });
});
