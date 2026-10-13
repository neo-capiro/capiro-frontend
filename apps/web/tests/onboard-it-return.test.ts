import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ItDonePage,
  ItConnectionVerifiedCard,
  ItConnectionSkippedCard,
} from "../src/features/onboard/pages/it/ItDonePage";
describe("public IT callback return has no current capability receipt", () => {
  it("renders neutral return guidance without claiming verified connection or completion", () => {
    const html = renderToStaticMarkup(createElement(ItDonePage));
    expect(html).toContain("Provider setup return");
    expect(html).toContain("cannot confirm");
    expect(html).toContain("original IT invitation link");
    expect(html).not.toContain("Connection verified");
    expect(html).not.toContain("no further action needed");
  });
  it("preserves verified and deferred presentations for current capability-backed states", () => {
    expect(
      renderToStaticMarkup(createElement(ItConnectionVerifiedCard)),
    ).toContain("Connection verified");
    expect(
      renderToStaticMarkup(createElement(ItConnectionSkippedCard)),
    ).toContain("Verification deferred");
  });
});
