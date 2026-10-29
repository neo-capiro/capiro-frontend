import { describe, it, expect, vi } from "vitest";
import {
  targetContextPage,
  targetContextRequest,
  targetContextOperations,
  matchesTargetContext,
} from "../src/shared/capiro/operations/target-context";
import { createCapiroApi } from "../src/shared/capiro/http";
import {
  contextPage,
  contextIds,
  contextItemId,
} from "./target-context-fixtures";

const request = {
  params: { clientId: contextIds.clientId, targetId: contextIds.targetId },
  query: { section: "steps" as const },
};
describe("target reverse context contract", () => {
  it.each(["steps", "objectives"] as const)(
    "admits valid current %s pages and empty results",
    (section) => {
      expect(targetContextPage.parse(contextPage(section))).toEqual(
        contextPage(section),
      );
      expect(targetContextPage.parse(contextPage(section, 0)).items).toEqual(
        [],
      );
      expect(targetContextPage.parse(contextPage(section, 25)).nextCursor).toBe(
        contextItemId(25),
      );
    },
  );
  it.each([
    "reordered",
    "duplicate",
    "cursor",
    "limit",
    "empty-cursor",
    "unsupported-status",
    "invalid-date",
    "extra",
  ])("refuses %s responses", (kind) => {
    const page = contextPage("steps", 25);
    if (page.section !== "steps") throw Error("Wrong fixture");
    if (kind === "reordered") page.items.reverse();
    if (kind === "duplicate") page.items[1] = page.items[0]!;
    if (kind === "cursor") page.nextCursor = contextItemId(26);
    if (kind === "limit")
      page.items.push({ ...page.items[24]!, id: contextItemId(26) });
    if (kind === "empty-cursor") page.items = [];
    if (kind === "unsupported-status")
      Object.assign(page.items[0]!, { status: "finished" });
    if (kind === "invalid-date") page.items[0]!.startsOn = "FY27 Q1";
    if (kind === "extra") Object.assign(page, { email: "no@example.invalid" });
    expect(targetContextPage.safeParse(page).success).toBe(false);
  });
  it("binds client, saved target, section and forward-only cursor to the current request", () => {
    expect(matchesTargetContext(contextPage("steps"), request)).toBe(true);
    expect(matchesTargetContext(contextPage("objectives"), request)).toBe(
      false,
    );
    expect(
      matchesTargetContext(
        { ...contextPage("steps"), clientId: contextIds.targetId },
        request,
      ),
    ).toBe(false);
    expect(
      matchesTargetContext(
        { ...contextPage("steps"), targetId: contextIds.otherTargetId },
        request,
      ),
    ).toBe(false);
    expect(
      matchesTargetContext(contextPage("steps"), {
        ...request,
        query: { section: "steps", after: contextItemId(1) },
      }),
    ).toBe(false);
  });
  it("allows only the bounded read selection and sends GET through the canonical transport", async () => {
    expect(
      targetContextRequest.safeParse({
        ...request,
        query: { ...request.query, limit: 1000 },
      }).success,
    ).toBe(false);
    expect(
      targetContextRequest.safeParse({ ...request, body: {} }).success,
    ).toBe(false);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(contextPage("steps")), {
          headers: { "content-type": "application/json" },
        }),
      );
    const api = createCapiroApi(targetContextOperations, { fetcher });
    await api.request("directory.targetContext", request);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]![1]).toMatchObject({
      method: "GET",
      cache: "no-store",
    });
    expect(fetcher.mock.calls[0]![1]?.body).toBeUndefined();
  });
});
