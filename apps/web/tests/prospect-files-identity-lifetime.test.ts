import "./prospect-upload-hook-platform";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { hooks, resetHooks } from "./prospect-upload-hook-platform";
import { ProspectFiles } from "../src/features/portfolio/files/ProspectFiles";
import {
  createApiClient,
  type ApiClient,
} from "../src/shared/portfolio/api/http";
import { actor, prospectId } from "./prospect-resources-fixtures";
type Options = {
  queryKey: readonly unknown[];
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
};
const ports = vi.hoisted(() => ({
  cache: undefined as QueryClient | undefined,
  api: undefined as ApiClient | undefined,
  queries: [] as Options[],
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ports.cache,
  useQuery: (options: Options) => {
    ports.queries.push(options);
    return {
      isSuccess: true,
      isPending: false,
      isFetching: false,
      data: [],
      error: null,
      refetch: vi.fn(),
    };
  },
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ports.api,
}));
// Recovery semantics are exercised with the real hook/journal in the companion suite.
vi.mock("../src/features/portfolio/files/useProspectUpload", () => ({
  useProspectUpload: () => ({ ready: true, busy: false, attempt: null }),
}));
let cache: QueryClient;
const identity = {
  user: { id: actor.userId, email: null },
  tenant: { id: actor.tenantId, name: "Synthetic" },
  role: "user_admin",
};
let requests: string[];
let releaseRead: (() => Promise<void>) | undefined;
type SessionElement = ReactElement<{
  actor: typeof actor & { revision: number };
  prospectId: string;
  active: boolean;
}>;
function session(node: ReactNode): SessionElement | undefined {
  if (Array.isArray(node)) return node.map(session).find(Boolean);
  if (!node || typeof node !== "object" || !("props" in node)) return;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (
    typeof element.type === "function" &&
    element.type.name === "ProspectFileSession"
  )
    return element as SessionElement;
  return session(element.props.children);
}
function parent() {
  hooks.cursor = 0;
  return session(ProspectFiles({ prospectId, available: true, active: true }));
}
function listOptions(element: SessionElement) {
  resetHooks();
  ports.queries = [];
  (element.type as (props: SessionElement["props"]) => ReactNode)(
    element.props,
  );
  return ports.queries.find((q) => q.queryKey[0] === "prospect-files")!;
}
beforeEach(() => {
  resetHooks();
  requests = [];
  releaseRead = undefined;
  ports.queries = [];
  cache = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  ports.cache = cache;
  cache.setQueryData(["identity"], identity);
  ports.api = createApiClient(async (url, init) => {
    expect(init?.method ?? "GET").toBe("GET");
    requests.push(String(url));
    await releaseRead?.();
    return Response.json([]);
  });
});
afterEach(() => {
  resetHooks();
  cache.clear();
});

it("settled same-owner identity creates a new Files session and list key even if the pending render was skipped", () => {
  const before = parent()!;
  const oldList = listOptions(before);
  resetHooks();
  cache.setQueryData(["identity"], identity);
  const after = parent()!;
  const newList = listOptions(after);
  expect(after.key).not.toBe(before.key);
  expect(newList.queryKey).not.toEqual(oldList.queryKey);
  expect(after.props.actor.revision).toBe(before.props.actor.revision + 1);
  expect(requests).toEqual([]);
});

it.each(["fetching", "invalidated", "expired", "reader"])(
  "%s identity cannot mount upload controls",
  (kind) => {
    const query = cache.getQueryCache().find({ queryKey: ["identity"] })!;
    if (kind === "fetching") query.setState({ fetchStatus: "fetching" });
    if (kind === "invalidated") query.setState({ isInvalidated: true });
    if (kind === "expired")
      query.setState({ status: "error", error: new Error("Expired") });
    if (kind === "reader")
      cache.setQueryData(["identity"], { ...identity, role: "read_only" });
    expect(parent()).toBeUndefined();
    expect(requests).toEqual([]);
  },
);

it("old list revision refuses before dispatch; the new admitted revision reads normally", async () => {
  const oldList = listOptions(parent()!);
  cache.setQueryData(["identity"], identity);
  await expect(
    oldList.queryFn({ signal: new AbortController().signal }),
  ).rejects.toMatchObject({ status: 403 });
  expect(requests).toEqual([]);
  resetHooks();
  const next = listOptions(parent()!);
  await expect(
    next.queryFn({ signal: new AbortController().signal }),
  ).resolves.toEqual([]);
  expect(requests).toHaveLength(1);
});

it("a list response from the previous identity revision cannot publish into the renewed view", async () => {
  let release!: () => void;
  releaseRead = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  const oldList = listOptions(parent()!);
  const reading = oldList.queryFn({ signal: new AbortController().signal });
  cache.setQueryData(["identity"], identity);
  release();
  await expect(reading).rejects.toMatchObject({ status: 403 });
  expect(requests).toHaveLength(1);
});
