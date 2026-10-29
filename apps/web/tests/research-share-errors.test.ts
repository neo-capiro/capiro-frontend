import { describe, expect, it } from "vitest";
import { serviceErrorResponse } from "../src/shared/capiro/gateway-errors";
import { createCapiroApi, CapiroApiError } from "../src/shared/capiro/http";
import { researchShareOperations as operations } from "../src/shared/capiro/operations/research-share";

const preview = operations["research.sharePreview"];
const publish = operations["research.shareLinks.publish"];
const signal = new AbortController().signal;
const generic = "The record changed. Reload it before trying again.";
const restricted =
  "Widget funding_table-1 cannot be published: a frozen source is restricted or no longer accessible";
const conflict = (message = restricted) => ({
  message,
  error: "Conflict",
  statusCode: 409,
});

describe("Research sharing widget refusal boundary", () => {
  it.each(["research.sharePreview", "research.shareLinks.publish"] as const)(
    "names the refused widget through the gateway and actual %s client",
    async (key) => {
      const response = await serviceErrorResponse(
        Response.json(conflict(), { status: 409 }),
        operations[key],
        signal,
        false,
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(await response.clone().json()).toEqual({ message: restricted });
      const api = createCapiroApi(operations, {
        fetcher: async () => response,
      });
      const body = {
        snapshotId: "a1000000-0000-4000-8000-000000000001",
        designId: "a1000000-0000-4000-8000-000000000002",
        clientId: "a1000000-0000-4000-8000-000000000003",
        branding: true,
        ...(key === "research.shareLinks.publish"
          ? {
              operationKey: "synthetic-publication",
              previewHash: "a".repeat(64),
              expectedDesignVersion: 1,
            }
          : {}),
      };
      const request = api.request(key, {
        params: { id: "a1000000-0000-4000-8000-000000000004" },
        body,
      });
      await expect(request).rejects.toBeInstanceOf(CapiroApiError);
      await expect(request).rejects.toMatchObject({
        message: restricted,
        status: 409,
      });
    },
  );

  it.each([
    "an external image is not a frozen asset; use the firm logo",
    "the firm logo could not be frozen safely",
    "the full frozen dashboard exceeds the supported size; reduce the design before publishing",
    "a frozen source has no verifiable evidence reference",
    "a frozen source revision cannot be verified",
    "a figure has no verifiable frozen source",
    "totals have no contributing frozen evidence",
    "a frozen source is restricted or cannot be verified",
    "the comparison must use an earlier snapshot of this portfolio",
  ])("preserves the canonical fixed refusal: %s", async (reason) => {
    const message = `Widget header_1 cannot be published: ${reason}`;
    const response = await serviceErrorResponse(
      Response.json(conflict(message), { status: 409 }),
      preview,
      signal,
      false,
    );
    expect(await response.json()).toEqual({ message });
  });

  it.each([
    ["unknown reason", conflict("Widget totals cannot be published: secret")],
    ["appended detail", conflict(`${restricted}; storage-key=private`)],
    ["newline", conflict(`${restricted}\n`)],
    [
      "invalid widget ID",
      conflict(restricted.replace("funding_table-1", "<script>")),
    ],
    [
      "overlong widget ID",
      conflict(restricted.replace("funding_table-1", "a".repeat(65))),
    ],
    ["message array", { ...conflict(), message: [restricted] }],
    ["wrong native status", { ...conflict(), statusCode: 500 }],
    ["wrong native error", { ...conflict(), error: "Internal Server Error" }],
    ["extra private field", { ...conflict(), stack: "private" }],
    ["missing native shape", { message: restricted }],
    [
      "publish version conflict",
      conflict(
        "The reviewed dashboard changed. Preview it again before publishing",
      ),
    ],
  ])("redacts %s", async (_name, payload) => {
    const response = await serviceErrorResponse(
      Response.json(payload, { status: 409 }),
      publish,
      signal,
      false,
    );
    expect(await response.json()).toEqual({ message: generic });
  });

  it("keeps operation, service, method and public-capability fences", async () => {
    for (const [operation, publicCapability] of [
      [operations["research.designs.create"], false],
      [{ ...preview, service: "workspace" }, false],
      [{ ...preview, method: "GET" }, false],
      [preview, true],
    ] as const) {
      const response = await serviceErrorResponse(
        Response.json(conflict(), { status: 409 }),
        operation,
        signal,
        publicCapability,
      );
      expect(await response.json()).toEqual({ message: generic });
    }
  });

  it.each([
    [401, "Your session expired. Sign in again."],
    [403, "You do not have access to this operation."],
    [500, "The service is unavailable. Please retry."],
  ])("retains redaction for HTTP%s", async (status, message) => {
    const response = await serviceErrorResponse(
      Response.json(conflict(), { status }),
      preview,
      signal,
      false,
    );
    expect(await response.json()).toEqual({ message });
  });

  it("bounds malformed and oversized upstream bodies", async () => {
    for (const body of [
      "not JSON",
      " ".repeat(4096) + JSON.stringify(conflict()),
    ]) {
      const response = await serviceErrorResponse(
        new Response(body, { status: 409 }),
        preview,
        signal,
        false,
      );
      expect(await response.json()).toEqual({ message: generic });
    }
  });

  it("cancels an aborted body without producing a widget refusal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      serviceErrorResponse(
        Response.json(conflict(), { status: 409 }),
        preview,
        controller.signal,
        false,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
