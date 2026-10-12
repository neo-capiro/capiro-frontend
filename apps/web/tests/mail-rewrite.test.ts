import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { requestMailRewrite } from "../src/features/portfolio/relationships/email/rewrite";

const input = {
  rawText: "Original draft",
  recipientName: "Taylor Test",
  recipientTitle: "Director",
};
const result = { bodyHtml: "<p>Reviewed draft</p>", verified: true };
const response = () => new Response(JSON.stringify(result));

describe("source-bound mail rewrite transport", () => {
  it("preserves the existing endpoint/body/receipt and passes local cancellation", async () => {
    const controller = new AbortController();
    const calls: string[] = [];
    const api = createApiClient(async (url, options) => {
      calls.push(String(url));
      expect(options?.method).toBe("POST");
      expect(JSON.parse(String(options?.body))).toEqual(input);
      expect(options?.signal).toBe(controller.signal);
      return response();
    });
    await expect(
      requestMailRewrite(api, input, controller.signal, () => {}),
    ).resolves.toEqual(result);
    expect(calls).toEqual(["/api/backend/core/engagement/mail/rewrite"]);
  });

  it("refuses unverified authority before dispatch", async () => {
    let calls = 0;
    const api = createApiClient(async () => {
      calls++;
      return response();
    });
    await expect(
      requestMailRewrite(api, input, new AbortController().signal, () => {
        throw new ApiError(409, "The mailbox session changed.");
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(calls).toBe(0);
  });

  it("refuses a valid late receipt after its source authority changes", async () => {
    let current = true;
    let calls = 0;
    const api = createApiClient(async () => {
      calls++;
      current = false;
      return response();
    });
    await expect(
      requestMailRewrite(api, input, new AbortController().signal, () => {
        if (!current) throw new ApiError(409, "The source draft changed.");
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(calls).toBe(1);
  });

  it("discards a receipt even when transport completes after local abort", async () => {
    const controller = new AbortController();
    let calls = 0;
    const api = createApiClient(async () => {
      calls++;
      controller.abort();
      return response();
    });
    await expect(
      requestMailRewrite(api, input, controller.signal, () => {}),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(1);
  });

  it("does not dispatch an already-aborted local attempt", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const api = createApiClient(async () => {
      calls++;
      return response();
    });
    await expect(
      requestMailRewrite(api, input, controller.signal, () => {}),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(0);
  });
});
