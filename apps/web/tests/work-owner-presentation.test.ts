import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { WorkspaceDocumentTable } from "../src/features/portfolio/work/WorkspaceDocumentTable";
import { workOwnerLabel } from "../src/features/portfolio/work/owners";

const members = [
  {
    id: "11000000-0000-4000-8000-000000000001",
    clerkUserId: "user_synthetic_owner",
    name: "Synthetic Jordan Clayton",
    email: "jordan@example.test",
  },
];

it("renders the supplied document owner's label beside the product", () => {
  const html = renderToStaticMarkup(
    createElement(WorkspaceDocumentTable, {
      rows: [
        {
          id: "94000000-0000-4000-8000-000000000001",
          docTitle: "Synthetic current briefing draft",
          client: "Synthetic client",
          product: "Briefing",
          ownerId: members[0]!.clerkUserId,
          status: "draft",
          updatedAt: "2026-10-12T12:00:00Z",
        },
      ],
      members,
    }),
  );
  expect(html).toContain("Synthetic Jordan Clayton");
  expect(html).toContain("Briefing");
  expect(html).not.toContain("user_synthetic_owner");
});

it("distinguishes unassigned nodes from unresolved supplied owners", () => {
  expect(workOwnerLabel(null, members)).toBe("Unassigned");
  expect(workOwnerLabel("", members)).toBe("Owner unavailable");
  expect(workOwnerLabel("user_missing", members)).toBe("Owner unavailable");
  expect(workOwnerLabel(members[0]!.id, members)).toBe("Owner unavailable");
  expect(workOwnerLabel(members[0]!.email, members)).toBe("Owner unavailable");
});

it("never guesses from internal user IDs or another member's name", () => {
  const collision = { ...members[0]!, id: "user_missing" };
  expect(workOwnerLabel("user_missing", [collision])).toBe("Owner unavailable");
  expect(
    workOwnerLabel(members[0]!.clerkUserId, [
      members[0]!,
      { ...members[0]!, name: "Conflicting synthetic member" },
    ]),
  ).toBe("Owner unavailable");
});

it("uses only current supplied member names or their supplied email fallback", () => {
  const id = members[0]!.clerkUserId;
  expect(workOwnerLabel(id, members)).toBe("Synthetic Jordan Clayton");
  expect(workOwnerLabel(id, [{ ...members[0]!, name: " " }])).toBe(
    "jordan@example.test",
  );
  expect(workOwnerLabel(id, [{ ...members[0]!, name: "", email: "" }])).toBe(
    "Owner unavailable",
  );
  expect(workOwnerLabel(id, undefined)).toBe("Owner unavailable");
  expect(workOwnerLabel(id, [])).toBe("Owner unavailable");
});
