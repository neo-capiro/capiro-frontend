import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { officeDraftSelection } from "../src/shared/meri-office/draft-selection";

const scope = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: "chat",
  clientId: null,
  versionId: "version",
};
describe("Office recovery selectors", () => {
  it("reuses only nonsecret selectors across navigation inside the canonical cache lifetime", () => {
    const cache = new QueryClient(),
      first = officeDraftSelection(cache, scope),
      again = officeDraftSelection(cache, scope);
    expect(again.selection).toEqual(first.selection);
    expect(Object.keys(first.selection).sort()).toEqual([
      "draftId",
      "editorId",
      "versionId",
    ]);
    expect(
      officeDraftSelection(cache, { ...scope, actorId: "another" }).selection
        .draftId,
    ).not.toBe(first.selection.draftId);
    cache.clear();
  });
  it("cache retirement cannot be revived by recreating the same key and confirmed discard forgets selectors", () => {
    const cache = new QueryClient(),
      first = officeDraftSelection(cache, scope),
      lost = vi.fn();
    const stop = first.subscribe(lost);
    first.forget();
    expect(first.isCurrent()).toBe(false);
    expect(lost).toHaveBeenCalled();
    const again = officeDraftSelection(cache, scope);
    expect(again.selection.draftId).not.toBe(first.selection.draftId);
    first.forget();
    expect(again.isCurrent()).toBe(true);
    expect(first.isCurrent()).toBe(false);
    stop();
    cache.clear();
  });
});
