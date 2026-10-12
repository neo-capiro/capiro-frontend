import { expect, it } from "vitest";
import { publicCapiroConfig, readCapiroConfig } from "./config";
it("accepts designated public/secret key pairs and never serializes secret/service configuration publicly", () => {
  const read = readCapiroConfig({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
    CLERK_SECRET_KEY: "sk_test_private",
    CORE_API_BASE_URL: "https://core.example.test/api/",
  });
  expect(read.services.core).toBe("https://core.example.test/api");
  expect(read.authConfigured).toBe(true);
  expect(publicCapiroConfig(read)).toEqual({
    publishableKey: "pk_test_YQ==",
    configured: true,
  });
  expect(JSON.stringify(publicCapiroConfig(read))).not.toContain("private");
});
it.each([
  "http://remote.example.test/api",
  "https://name:password@core.example.test/api",
  "https://core.example.test/api?tenant=x",
  "https://core.example.test/api#x",
])("rejects unsafe service origin %s", (url) => {
  const read = readCapiroConfig({ CORE_API_BASE_URL: url });
  expect(read.services.core).toBeUndefined();
  expect(read.issues.length).toBeGreaterThan(0);
});
it("allows loopback HTTP only and rejects mismatched Clerk environments", () => {
  expect(
    readCapiroConfig({ CORE_API_BASE_URL: "http://127.0.0.1:4000/api" })
      .services.core,
  ).toBe("http://127.0.0.1:4000/api");
  expect(
    readCapiroConfig({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_YQ==",
      CLERK_SECRET_KEY: "sk_test_private",
    }).authConfigured,
  ).toBe(false);
});
