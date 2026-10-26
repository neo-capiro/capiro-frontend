import { describe, expect, it } from "vitest";
import {
  readWorkspaceRoute,
  workspaceHref,
} from "../src/features/modules/workspace/workspace-route";
import { draft, otherId, prospectId } from "./prospect-resources-fixtures";

const read = (query: string) => readWorkspaceRoute(new URLSearchParams(query));

describe("Workspace native document navigation", () => {
  it("reopens an ordinary document in its selected client scope", () => {
    const href = workspaceHref({
      kind: "draft",
      draftId: draft.id,
      clientId: otherId,
    });
    expect(href).toBe(
      `/modules/workspace?clientId=${otherId}&draftId=${draft.id}`,
    );
    expect(read(href.split("?")[1]!)).toEqual({
      kind: "draft",
      draftId: draft.id,
      clientId: otherId,
      prospectId: undefined,
    });
  });

  it("distinguishes a Hill Day ID from an ordinary draft ID", () => {
    const href = workspaceHref({ kind: "hillday", hilldayId: draft.id });
    expect(href).toBe(`/modules/workspace?view=hillday&hilldayId=${draft.id}`);
    expect(read(href.split("?")[1]!)).toEqual({
      kind: "hillday",
      hilldayId: draft.id,
    });
    expect(read(`draftId=${draft.id}`).kind).toBe("draft");
  });

  it("preserves prospect ownership on an existing prospect draft link", () => {
    expect(read(`prospectId=${prospectId}&draftId=${draft.id}`)).toEqual({
      kind: "draft",
      draftId: draft.id,
      prospectId,
    });
    expect(
      workspaceHref({ kind: "prospect", prospectId, clientId: otherId }),
    ).toBe(`/modules/workspace?clientId=${otherId}&prospectId=${prospectId}`);
  });

  it.each([
    "documents",
    "workflows",
    "shares",
    "templates",
    "hillday",
    "newsletter",
    "rich-newsletter",
  ] as const)("restores the %s view from the current URL", (view) => {
    expect(read(`view=${view}&clientId=${otherId}`)).toEqual({
      kind: "view",
      view,
      clientId: otherId,
    });
    expect(
      read(workspaceHref({ kind: "view", view }).split("?")[1] ?? ""),
    ).toEqual({ kind: "view", view });
  });

  it("leaves exact brief-copy parsing with its existing owner", () => {
    expect(read(`prospectId=${prospectId}&briefSource=encoded`)).toEqual({
      kind: "brief-copy",
    });
    expect(
      read(
        `prospectId=${prospectId}&draftId=${draft.id}&copyDocumentId=${otherId}`,
      ),
    ).toEqual({ kind: "brief-copy" });
  });

  it.each([
    "draftId=not-an-id",
    "draftId=",
    "clientId=not-an-id",
    "prospectId=",
    "hilldayId=invalid",
    "view=unknown",
    "view=",
    "view=documents&view=documents",
    `draftId=${draft.id}&draftId=${draft.id}`,
    `clientId=${otherId}&clientId=${otherId}`,
    `prospectId=${prospectId}&prospectId=${prospectId}`,
    `view=hillday&hilldayId=${draft.id}&hilldayId=${draft.id}`,
    `view=newsletter&draftId=${draft.id}`,
    `view=rich-newsletter&prospectId=${prospectId}`,
    `view=hillday&hilldayId=${draft.id}&draftId=${otherId}`,
    `view=hillday&hilldayId=${draft.id}&prospectId=${prospectId}`,
    `view=shares&hilldayId=${draft.id}`,
    `hilldayId=${draft.id}`,
    `view=rich-newsletter&briefSource=encoded`,
    `view=hillday&hilldayId=${draft.id}&copyDocumentId=${otherId}`,
    `prospectId=${prospectId}&briefSource=a&briefSource=b`,
  ])("refuses malformed or conflicting route %s", (query) => {
    expect(read(query)).toEqual({ kind: "invalid" });
  });
});
