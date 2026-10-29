import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { MemoryFiles } from "../src/features/settings/memory/MemoryFiles";
import { draftFile, draftAccount } from "./memory-draft-fixture";
const query = vi.hoisted(() => vi.fn());
vi.mock("../src/shared/capiro/queries", () => ({ useCapiroQuery: query }));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    action: { busy: false },
    pending: undefined,
    locked: false,
    reconcile: vi.fn(),
  }),
}));
function setup(failed = false) {
  const file = draftFile();
  query.mockImplementation(
    (key: string, _input: unknown, options?: { enabled?: boolean }) => {
      if (options?.enabled === false)
        return { loading: false, reload: vi.fn() };
      return {
        loading: false,
        reload: vi.fn(),
        error:
          failed && key === "settings.memory.drafts.file"
            ? Error("Access denied")
            : undefined,
        data: key.endsWith("catalog")
          ? [
              {
                type: file.type,
                scope: file.scope,
                label: "Firm Soul",
                blurb: "Identity",
                sections: file.sections,
              },
            ]
          : key === "me.read"
            ? draftAccount
            : failed
              ? undefined
              : file,
      };
    },
  );
}
it("reads canonical mission and positioning and offers private drafts under the approved policy", () => {
  setup();
  const html = renderToStaticMarkup(createElement(MemoryFiles));
  expect(html).toContain("Who we are");
  expect(html).toContain("Published mission");
  expect(html).toContain("Published position");
  expect(html).toContain("Create private draft");
  expect(html).toContain("Saving a draft does not change published memory");
  expect(html).not.toContain("Editing and submission unavailable");
});
it("an inaccessible file is unavailable rather than an empty saved file", () => {
  setup(true);
  const html = renderToStaticMarkup(createElement(MemoryFiles));
  expect(html).not.toContain("Published mission");
  expect(html).not.toContain("No content recorded");
  expect(html).not.toContain("This file has not been published");
  expect(html).not.toContain("Create private draft");
});
