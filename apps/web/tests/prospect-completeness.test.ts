import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ProspectCompleteness } from "../src/features/portfolio/prospects/ProspectCompleteness";
import { prospect } from "./browser/fixtures";
const state = vi.hoisted(() => ({
  data: null as null | { contacts: unknown[] },
}));
vi.mock("../src/features/portfolio/prospects/contacts/queries", () => ({
  useContacts: () => ({ isSuccess: true, error: null, data: state.data }),
}));
it("does not mistake unavailable contacts for missing saved data", () => {
  state.data = null;
  const html = renderToStaticMarkup(
    createElement(ProspectCompleteness, {
      record: prospect,
      onDetails: () => {},
      onNext: () => {},
    }),
  );
  expect(html).toBe("");
});
it("offers contextual edits for confirmed missing values", () => {
  state.data = { contacts: [] };
  const html = renderToStaticMarkup(
    createElement(ProspectCompleteness, {
      record: { ...prospect, description: null, nextAction: null },
      onDetails: () => {},
      onNext: () => {},
    }),
  );
  expect(html).toContain("Add company description");
  expect(html).toContain("Add next step");
  expect(html).toContain("Add a prospect contact");
});
