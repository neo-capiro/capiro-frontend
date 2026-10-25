import { describe, expect, it } from "vitest";
import { workspaceHillDayOperations } from "../src/shared/capiro/operations/workspace-hillday";
import { previewReadRoute } from "../src/shared/preview/read-route.server";

const request = workspaceHillDayOperations["workspace.documents"].request;

describe("Core134 library query admission", () => {
  for (const kind of ["all", "hillday", "draft"] as const)
    for (const scope of ["all", "mine", "shared"] as const)
      it(`admits ${kind}/${scope} and preserves the server query`, () => {
        const input = {
          query: {
            kind,
            scope,
            q: "Synthetic page-three title",
            clientId: "30000000-0000-4000-8000-000000000001",
            status: "draft",
            limit: 50,
            cursor: "opaque+/continuation==",
          },
        };
        expect(request.parse(input)).toEqual(input);
      });

  it("admits existing empty/default requests and accepted text bounds", () => {
    expect(request.parse({})).toEqual({});
    expect(request.parse({ query: {} })).toEqual({ query: {} });
    const input = {
      query: {
        q: "x".repeat(200),
        status: "s".repeat(30),
        cursor: "c".repeat(500),
      },
    };
    expect(request.parse(input)).toEqual(input);
  });

  it("forwards the admitted query through the existing Workspace read route without decoding the cursor", () => {
    const query = {
      q: "Synthetic name & suffix",
      scope: "shared",
      kind: "draft",
      clientId: "30000000-0000-4000-8000-000000000001",
      status: "complete",
      cursor: "opaque+/continuation==",
      limit: 50,
    };
    const url = new URL(
      "https://frontend.invalid/api/capiro/workspace.documents",
    );
    url.searchParams.set("input", JSON.stringify({ query }));
    const route = previewReadRoute(new Request(url));
    expect(route?.service).toBe("workspace");
    const forwarded = new URL(route!.path, "https://workspace.invalid");
    expect(forwarded.pathname).toBe("/hillday/documents");
    expect(Object.fromEntries(forwarded.searchParams)).toEqual({
      ...query,
      limit: "50",
    });
  });

  it.each([
    { q: "x".repeat(201) },
    { scope: "everyone" },
    { kind: "newsletter" },
    { clientId: "Synthetic duplicate client name" },
    { status: "s".repeat(31) },
    { cursor: "c".repeat(501) },
    { ownerId: "browser-chosen-actor" },
  ])("rejects unsupported or overlong input %o", (query) => {
    expect(request.safeParse({ query }).success).toBe(false);
  });
});
