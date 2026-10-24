import { describe, expect, it } from "vitest";
import {
  clientDrafts,
  type WorkspaceDraft,
} from "../src/features/portfolio/work/contracts";

const current = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Synthetic client",
};
const draft: WorkspaceDraft = {
  id: "94000000-0000-4000-8000-000000000001",
  docTitle: "Synthetic current document",
  client: current.name,
  clientId: current.id,
  product: null,
  ownerId: "synthetic-owner",
  status: "draft",
  updatedAt: "2026-10-11T10:00:00Z",
};

describe("Workspace canonical client association", () => {
  it("holds name-only legacy content even when the name is unique", () => {
    expect(
      clientDrafts([{ ...draft, clientId: undefined }], current, [current]),
    ).toEqual([]);
  });
  it("does not transfer a same-name document with a different UUID", () => {
    expect(
      clientDrafts(
        [{ ...draft, clientId: "10000000-0000-4000-8000-000000000002" }],
        current,
        [current],
      ),
    ).toEqual([]);
  });
  it("retains UUID-bound documents through rename and duplicate names", () => {
    const renamed = { ...draft, client: "Former name" };
    expect(
      clientDrafts([renamed], current, [current, { ...current, id: "other" }]),
    ).toEqual([renamed]);
  });
  it("keeps prospect content out even if client UUID is supplied", () => {
    expect(
      clientDrafts([{ ...draft, prospectId: "prospect" }], current, [current]),
    ).toEqual([]);
  });
});
