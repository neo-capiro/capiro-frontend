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
  product: null,
  ownerId: "synthetic-owner",
  status: "draft",
  updatedAt: "2026-10-11T10:00:00Z",
};

describe("Workspace legacy client association", () => {
  it("does not substitute a unique same-name catalog entry for the absent current client", () => {
    expect(
      clientDrafts([draft], current, [
        { ...current, id: "10000000-0000-4000-8000-000000000002" },
      ]),
    ).toEqual([]);
  });

  it("retains the exact current client's unique-name documents and native order", () => {
    const completed = {
      ...draft,
      id: "94000000-0000-4000-8000-000000000002",
      status: "complete" as const,
    };
    expect(clientDrafts([completed, draft], current, [current])).toEqual([
      completed,
      draft,
    ]);
  });

  it("refuses duplicate names, including duplicate catalog rows", () => {
    expect(clientDrafts([draft], current, [current, current])).toEqual([]);
    expect(
      clientDrafts([draft], current, [
        current,
        { ...current, id: "10000000-0000-4000-8000-000000000002" },
      ]),
    ).toEqual([]);
  });

  it("does not infer renamed, missing or differently cased associations", () => {
    expect(
      clientDrafts(
        [
          { ...draft, client: null },
          { ...draft, client: current.name.toUpperCase() },
          { ...draft, client: "Former client name" },
        ],
        current,
        [current],
      ),
    ).toEqual([]);
    expect(
      clientDrafts([draft], current, [{ ...current, name: "Renamed client" }]),
    ).toEqual([]);
  });
});
