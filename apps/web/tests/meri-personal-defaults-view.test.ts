import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { TimezonePreview } from "../src/features/meri/user-preferences/TimezonePreview";
import { UserPreferencesHost } from "../src/features/meri/user-preferences/UserPreferencesHost";

const identity = vi.hoisted(() => ({
  data: { tenant: { id: "old-tenant" }, user: { id: "old-user" } },
  loading: false, error: new Error("Access expired"),
}));
vi.mock("../src/shared/capiro/queries", () => ({ useCapiroQuery: () => identity }));

it("withholds owned preferences when an identity error retains stale account data", () => {
  const html = renderToStaticMarkup(createElement(UserPreferencesHost, {
    chrome: { unavailable: "Unavailable", nav: [], notice: {title: "Preferences", detail: ""}, localDrafts: false, headerOverlays: false },
  }));
  expect(html).toContain("Current account could not be verified");
  expect(html).not.toContain("Save personal preferences");
  expect(html).not.toContain("old-user");
});

it("previews a persisted timezone with an explicit panel-only effect", () => {
  const html = renderToStaticMarkup(createElement(TimezonePreview, { timezone: "America/New_York" }));
  expect(html).toContain("10:00 AM");
  expect(html).toContain("Application-wide timestamps are unchanged");
});

it("invalid timezone does not crash the preferences panel", () => {
  expect(renderToStaticMarkup(createElement(TimezonePreview, { timezone: "Invalid/Timezone" }))).toContain("Enter a valid IANA timezone");
});
