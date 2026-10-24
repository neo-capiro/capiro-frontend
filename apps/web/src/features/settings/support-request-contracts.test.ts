import { describe, expect, it } from "vitest";
import { supportRequestOperations as operations } from "../../shared/capiro/operations/settings-admin/support-requests";
import { canOpenSettings } from "./access";
const id = "11111111-1111-4111-8111-111111111111";
const body = { id, summary: "Summary", detail: "Detail", runReference: null };
describe("Bounded support contracts", () => {
  it("requires an immutable id and bounded plain text without caller-supplied ownership or attachments", () => {
    expect(
      operations["settings.support.create"].request.parse({ body }),
    ).toEqual({ body });
    for (const changed of [
      { ...body, tenantId: id },
      { ...body, attachments: [] },
      { ...body, id: "" },
      { ...body, summary: " " },
      { ...body, detail: "x".repeat(5001) },
      { ...body, runReference: "x".repeat(201) },
    ])
      expect(
        operations["settings.support.create"].request.safeParse({
          body: changed,
        }).success,
      ).toBe(false);
  });
  it("rejects a staff page beyond its server limit", () => {
    const item = {
      id,
      tenantId: id,
      submittedByUserId: id,
      summary: "Summary",
      createdAt: "2026-10-24T00:00:00Z",
    };
    expect(
      operations["settings.hq.support.list"].response.safeParse({
        items: Array(51).fill(item),
        nextCursor: id,
      }).success,
    ).toBe(false);
  });
  it.each([
    "standard_user",
    "user_admin",
    "client_portal_user",
    "capiro_admin",
  ])("protects HQ navigation for %s", (role) => {
    expect(canOpenSettings("hq-support", { role } as never)).toBe(
      role === "capiro_admin",
    );
  });
});
