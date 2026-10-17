import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PersonnelPreview } from "./PersonnelPreview";

vi.mock("../../../shared/module-ui", () => ({
  ActionButton: ({ children }: { children: ReactNode }) =>
    createElement("button", null, children),
}));

it("shows only verified list fields and an explicit profile action", () => {
  const html = renderToStaticMarkup(
    createElement(PersonnelPreview, {
      person: {
        id: "00000000-0000-4000-8000-000000000001",
        fullName: "Casey Bennett",
        title: "Program Analyst",
        role: null,
        organization: "Acquisition office",
        service: "Army",
        pePrimary: "0603001A",
        peSecondary: [],
        email: null,
        phone: null,
        publicProfileUrl: null,
        confidence: 0.92,
        status: "active",
        sourceCount: 1,
        lastSeenAt: "2026-10-17T00:00:00.000Z",
      },
      onOpen: vi.fn(),
    }),
  );
  expect(html).toContain('aria-label="Selected profile"');
  expect(html).toContain("Casey Bennett");
  expect(html).toContain("Program Analyst");
  expect(html).toContain("Acquisition office");
  expect(html).toContain("0603001A");
  expect(html).toContain("Alignment");
  expect(html).toContain("Confidence");
  expect(html).toContain("0.92");
  expect(html).toContain("1 recorded source");
  expect(html).toContain("Open profile");
  expect(html).not.toContain("High confidence");
  expect(html).not.toContain("Initiating PE context");
  expect(html).not.toContain("Public personnel directory");
});

it("leaves an empty rail without claiming a person or profile action", () => {
  const html = renderToStaticMarkup(
    createElement(PersonnelPreview, { onOpen: vi.fn() }),
  );
  expect(html).toContain('aria-label="Selected profile"');
  expect(html).toContain("Select a person");
  expect(html).not.toContain("Casey Bennett");
  expect(html).not.toContain("Open profile");
});
