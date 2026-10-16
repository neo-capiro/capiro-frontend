import { afterEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  assertClientProgramPage,
  clientProgramPageSchema,
  readClientProgramPage,
  type ClientProgramPage,
  type ProgramAssociation,
} from "../src/features/portfolio/client-profile/client-program-context";
import { currentProfileActor } from "../src/features/portfolio/client-profile/profile-access";
import { profileReadKey } from "../src/features/portfolio/client-profile/profile-keys";
import { profileIdentity } from "./profile-current-state-fixtures";

const caches: QueryClient[] = [];
afterEach(() => caches.splice(0).forEach((cache) => cache.clear()));
function currentProfile() {
  const cache = new QueryClient();
  caches.push(cache);
  cache.setQueryData(["identity"], profileIdentity);
  return { cache, actor: currentProfileActor(cache)! };
}
function nativeAssociation(page = 1, index = 0): ProgramAssociation {
  return {
    peCode: `PE-SYNTHETIC-${page}-${index}`,
    title: null,
    score: 0.8,
    paths: [
      {
        path: "prior_award",
        score: 0.8,
        evidence: ["1 prior award on this PE (~$900K)"],
      },
    ],
  };
}
function nativePage(total = 1, page = 1): ClientProgramPage {
  const count = Math.min(20, Math.max(0, total - (page - 1) * 20));
  return {
    total,
    page,
    limit: 20,
    data: Array.from({ length: count }, (_, index) =>
      nativeAssociation(page, index),
    ),
  };
}
function service(value: unknown, status = 200) {
  const calls: Array<{ url: string; signal: AbortSignal | null | undefined }> =
    [];
  const api = createApiClient(async (url, init) => {
    calls.push({ url: String(url), signal: init?.signal });
    return new Response(JSON.stringify(value), { status });
  });
  return { api, calls };
}

describe("bounded native client program context", () => {
  it("receives native fields and raw reason strings without inventing client/FY fields", () => {
    const value = clientProgramPageSchema.parse(nativePage());
    expect(value.data[0]?.title).toBeNull();
    expect(value.data[0]?.paths[0]?.evidence[0]).toContain("$900K");
    expect(value).not.toHaveProperty("clientId");
    expect(value).not.toHaveProperty("fiscalYear");
  });
  it.each([
    { ...nativePage(), total: 401 },
    { ...nativePage(), page: 0 },
    { ...nativePage(), data: [{ ...nativeAssociation(), score: Infinity }] },
    { ...nativePage(), data: [{ ...nativeAssociation(), score: NaN }] },
    { ...nativePage(), data: [{ ...nativeAssociation(), paths: [] }] },
  ])("refuses malformed native pages", (value) => {
    expect(clientProgramPageSchema.safeParse(value).success).toBe(false);
  });
  it.each([
    { ...nativePage(), page: 2 },
    { ...nativePage(), limit: 100 },
    { ...nativePage(), total: 2 },
    { ...nativePage(), data: [{ ...nativeAssociation(), score: 0.49 }] },
    { ...nativePage(2), data: [nativeAssociation(), nativeAssociation()] },
  ])("refuses wrong request/page population metadata", (value) => {
    expect(() => assertClientProgramPage(value, 1)).toThrow(ApiError);
  });
  it("preserves an empty out-of-range returned page without treating it as total zero", () => {
    const value = nativePage(1, 2);
    expect(assertClientProgramPage(value, 2)).toBe(value);
    expect(value.total).toBe(1);
    expect(value.data).toHaveLength(0);
  });
  it("requests only the selected page with fixed floor/limit through the existing Core proxy", async () => {
    const { cache, actor } = currentProfile();
    const { api, calls } = service(nativePage(41, 2));
    const signal = new AbortController().signal;
    const value = await readClientProgramPage(
      api,
      cache,
      actor,
      "client-a",
      2,
      signal,
    );
    expect(calls).toHaveLength(1);
    expect(calls).toEqual([
      {
        url: "/api/backend/core/intelligence/clients/client-a/pe-relevance?minScore=0.5&page=2&limit=20",
        signal,
      },
    ]);
    expect(value.page).toBe(2);
    expect(value.total).toBe(41);
    expect(value.data).toHaveLength(20);
  });
  it("separates actor and client cache keys", () => {
    const { actor } = currentProfile();
    expect(profileReadKey("client-a", "program-context", actor)).not.toEqual(
      profileReadKey("client-b", "program-context", actor),
    );
    expect(profileReadKey("client-a", "program-context", actor)).not.toEqual(
      profileReadKey("client-a", "program-context", {
        ...actor,
        userId: "other",
      }),
    );
  });
  it("refuses an invalidated actor before dispatch", async () => {
    const { cache, actor } = currentProfile();
    await cache.invalidateQueries({ queryKey: ["identity"] });
    const { api, calls } = service(nativePage());
    await expect(
      readClientProgramPage(
        api,
        cache,
        actor,
        "client-a",
        1,
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(0);
  });
  it("rejects a late page after the current actor changes", async () => {
    const { cache, actor } = currentProfile();
    let deliver!: (response: Response) => void;
    const api = createApiClient(
      () => new Promise<Response>((resolve) => (deliver = resolve)),
    );
    const pending = readClientProgramPage(
      api,
      cache,
      actor,
      "client-a",
      1,
      new AbortController().signal,
    );
    cache.setQueryData(["identity"], {
      ...profileIdentity,
      user: { ...profileIdentity.user, id: "other-actor" },
    });
    deliver(new Response(JSON.stringify(nativePage())));
    await expect(pending).rejects.toBeInstanceOf(ApiError);
  });
  it("rejects a retired request even when its transport later returns JSON", async () => {
    const { cache, actor } = currentProfile();
    const controller = new AbortController();
    let deliver!: (response: Response) => void;
    const api = createApiClient(
      () => new Promise<Response>((resolve) => (deliver = resolve)),
    );
    const pending = readClientProgramPage(
      api,
      cache,
      actor,
      "client-a",
      1,
      controller.signal,
    );
    controller.abort();
    deliver(new Response(JSON.stringify(nativePage())));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
  it.each([403, 404, 500])(
    "retains native failure %s rather than returning an empty success",
    async (status) => {
      const { cache, actor } = currentProfile();
      const { api } = service(
        { message: "Synthetic read unavailable" },
        status,
      );
      await expect(
        readClientProgramPage(
          api,
          cache,
          actor,
          "client-a",
          1,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ status });
    },
  );
});
