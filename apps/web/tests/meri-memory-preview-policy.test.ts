import { describe, expect, it } from "vitest";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import {
  previewMemoryCoreBackendSource,
  previewMemoryOwnerRoute,
  previewMemoryOwnerTarget,
} from "../src/shared/preview/memory-owner-route.server";
import { config as proxyConfig } from "../src/proxy";

const origin = "https://app.capiro.ai";
const id = "11111111-1111-4111-8111-111111111111";
const request = (method: string, path: string) =>
  new Request(`${origin}${path}`, { method });

describe("held personal memory preview routes", () => {
  it("admits bounded history/evidence reads without widening the owner-list contract", () => {
    for (const leaf of ["versions", "evidence"]) {
      for (const query of ["", "?limit=1", "?limit=25", "?limit=100"]) {
        expect(
          previewMemoryOwnerRoute(
            request("GET", `/api/memory/owner/items/${id}/${leaf}${query}`),
          ),
        ).toBe(true);
      }
      for (const query of [
        "?limit=0",
        "?limit=101",
        "?limit=01",
        "?limit=1e1",
        "?limit=25&limit=25",
        "?tenant=foreign",
        "?cursor=",
        "?cursor=a&cursor=b",
        "#fragment",
      ]) {
        expect(
          previewMemoryOwnerRoute(
            request("GET", `/api/memory/owner/items/${id}/${leaf}${query}`),
          ),
        ).toBe(false);
      }
      for (const method of ["HEAD", "POST", "PUT", "DELETE"]) {
        expect(
          previewMemoryOwnerRoute(
            request(method, `/api/memory/owner/items/${id}/${leaf}`),
          ),
        ).toBe(false);
      }
      for (const path of [
        `${id}/${leaf}/extra`,
        `${id}/${leaf}/`,
        `clio:${id}/${leaf}`,
        `not-a-uuid/${leaf}`,
        `${id.replace(/^1/, "A")}/${leaf}`,
        `${id}%2fextra/${leaf}`,
      ]) {
        expect(
          previewMemoryOwnerRoute(
            request("GET", `/api/memory/owner/items/${path}`),
          ),
        ).toBe(false);
      }
    }
    expect(
      previewMemoryOwnerRoute(
        request(
          "GET",
          `/api/memory/owner/items/${id}/versions?cursor=${"a".repeat(512)}`,
        ),
      ),
    ).toBe(true);
    for (const cursor of ["a".repeat(513), "a%2Bb", "%00"]) {
      expect(
        previewMemoryOwnerRoute(
          request(
            "GET",
            `/api/memory/owner/items/${id}/versions?cursor=${cursor}`,
          ),
        ),
      ).toBe(false);
    }
    expect(
      previewMemoryOwnerRoute(
        request(
          "GET",
          `/api/memory/owner/items/${id}/evidence?cursor=valid_base64url`,
        ),
      ),
    ).toBe(false);
    expect(
      previewMemoryOwnerRoute(
        request("GET", "/api/memory/owner/items?limit=100"),
      ),
    ).toBe(false);
  });
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
      ["POST", `/api/memory/owner/items/${id.replace(/^1/, "A")}/corrections`],
      ["GET", `/api/memory/owner/candidates/${id.replace(/^1/, "A")}/status`],
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
      request("GET", `/api/memory/owner/items/${id}/versions?limit=25`),
      request("GET", `/api/memory/owner/items/${id}/evidence?limit=25`),
      request("POST", `/api/memory/owner/candidates/${id}/decision`),
      request("POST", `/api/memory/owner/items/${id}/corrections`),
    ]) {
      expect(previewMemoryOwnerTarget(env, candidate)).toBeNull();
      expect(previewBackendRejection(env, candidate)?.status).toBe(503);
    }
  });
});
