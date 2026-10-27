import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CongressionalContacts } from "../src/features/modules/directory/CongressionalContacts";

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (operation: string) => ({
    loading: false,
    error: null,
    data:
      operation === "directory.favorites"
        ? []
        : {
            contacts: [],
            total: 100,
            totals: { all: 540, staff: 15983 },
            availableFilters: {
              chambers: [],
              states: [],
              roles: [],
              issues: [],
              committees: [],
            },
          },
  }),
}));

it("does not present the global staff census as a filtered office staff count", () => {
  const html = renderToStaticMarkup(createElement(CongressionalContacts));
  expect(html).toContain("100 offices · 15,983 staff across the directory");
  expect(html).toContain("Showing 1 to 25 of 100");
});
