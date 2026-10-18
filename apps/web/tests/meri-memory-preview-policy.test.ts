import { describe, expect, it } from "vitest";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import {
  previewMemoryCoreBackendSource,
  previewMemoryOwnerRoute,
  previewMemoryOwnerTarget,
} from "../src/shared/preview/memory-owner-route.server";
import { config as proxyConfig } from "../src/proxy";

const origin = "https://portfolio-preview.app.capiro.ai";
const id = "11111111-1111-4111-8111-111111111111";
const request = (method: string, path: string) =>
  new Request(`${origin}${path}`, { method });

describe("held personal memory preview routes", () => {
  it("allocates Clerk proxy coverage for the memory owner family", () => {
    expect(proxyConfig.matcher).toContain("/api/memory/owner/:path*");
  });

  it("admits only the six browser routes and exact method/query shapes", () => {
    for (const [method, path] of [
      ["GET", "/api/memory/owner/candidates"],
      ["GET", "/api/memory/owner/candidates?limit=50&cursor=opaque%2Bcursor"],
      ["GET", `/api/memory/owner/candidates/${id}/status`],
      ["GET", "/api/memory/owner/items?limit=25"],
      ["GET", "/api/memory/owner/items?limit=25&cursor=opaque_token"],
      ["POST", `/api/memory/owner/candidates/${id}/decision`],
      ["POST", `/api/memory/owner/candidates/${id}/version-decision`],
      ["POST", `/api/memory/owner/items/${id}/corrections`],
    ]) {
      expect(previewMemoryOwnerRoute(request(method!, path!))).toBe(true);
    }
    for (const [method, path] of [
      ["POST", "/api/memory/owner/candidates"],
      ["GET", `/api/memory/owner/candidates/${id}/decision`],
      ["POST", `/api/memory/owner/candidates/${id}/status`],
      ["GET", "/api/memory/owner/items?limit=26"],
      ["GET", "/api/memory/owner/items?limit=25&clientId=spoofed"],
      ["GET", "/api/memory/owner/candidates?limit=50&ownerId=spoofed"],
      ["GET", "/api/memory/owner/candidates?limit=50&limit=99"],
      ["POST", `/api/memory/owner/items/${id}/corrections?dryRun=true`],
      ["POST", "/api/memory/owner/items/not-a-uuid/corrections"],
      ["POST", "/api/memory/owner/items"],
    ]) {
      expect(previewMemoryOwnerRoute(request(method!, path!))).toBe(false);
    }
  });

  it("holds even a configured target and reviewed memory-only Core pin", () => {
    expect(previewMemoryCoreBackendSource).toBeNull();
    const env = {
      CAPIRO_PREVIEW_READ_ONLY: "true",
      MERI_MEMORY_OWNER_REVIEW_ENABLED: "true",
      CAPIRO_PREVIEW_MEMORY_OWNER_ROUTES_ENABLED: "true",
      CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE:
        "96065aea7076fde961071ebce402b6b2a31ee60c",
      CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL:
        "https://first-chat-preview.app-dev.capiro.ai/api",
      CAPIRO_REQUEST_ORIGIN: origin,
      CAPIRO_EXISTING_APP_URL: origin,
    };
    for (const candidate of [
      request("GET", "/api/memory/owner/candidates?limit=50"),
      request("POST", `/api/memory/owner/candidates/${id}/decision`),
      request("POST", `/api/memory/owner/items/${id}/corrections`),
    ]) {
      expect(previewMemoryOwnerTarget(env, candidate)).toBeNull();
      expect(previewBackendRejection(env, candidate)?.status).toBe(503);
    }
  });
});
