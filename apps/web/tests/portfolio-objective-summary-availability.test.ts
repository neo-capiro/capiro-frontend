import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ObjectiveStats } from "../src/features/portfolio/objectives/ObjectiveList";

it("names unavailable operational objective metrics rather than promising populated scorecards", () => {
  const html = renderToStaticMarkup(
    createElement(ObjectiveStats, { records: [] }),
  );
  expect(html).toContain("<dt>Objectives</dt><dd>0</dd>");
  expect(html.match(/>Not available</g)).toHaveLength(4);
  expect(html).toContain(
    "Operational summaries are not supplied by the current objective service.",
  );
  expect(html).not.toContain("<dd>—</dd>");
});
