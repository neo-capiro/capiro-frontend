import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { HearingSourceReadResponse } from "@capiro/meri-contracts/conversation-sources";
import { HearingSourceDetail } from "../src/features/meri/conversation/evidence/HearingSourceDetail";
import { SourceReadState } from "../src/features/meri/conversation/evidence/SourceReadState";
import records from "./meri-hearing-source-fixtures.json";

/** Synthetic packets admitted by the actual275+276 source schemas; installed receiving has its own tests. */
const fixtures = records as Record<
  keyof typeof records,
  HearingSourceReadResponse
>;
const render = (name: keyof typeof fixtures) =>
  renderToStaticMarkup(
    createElement(HearingSourceDetail, { value: fixtures[name] }),
  );

it("shows a saved published record without executing or linking source-controlled text", () => {
  const html = render("published");
  expect(html).toContain("Access checked");
  expect(html).toContain("Complete saved record");
  expect(html).toContain("Not established by this record");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("href=");
  expect(html).not.toContain("Owner claims");
  expect(html).toContain(
    "Media playback is not available for this saved record.",
  );
});

it("shows only whole-record owner claims and reviews with their own provenance labels", () => {
  const brief = render("brief");
  expect(brief).toContain('aria-label="Owner claims"');
  expect(brief).toContain("Owner passage");
  expect(brief).toContain("not a mapping to statements in Meri");
  expect(brief).not.toContain('aria-label="Owner assessments and reviews"');
  const reconciliation = render("reconciliation");
  expect(reconciliation).toContain(
    'aria-label="Owner assessments and reviews"',
  );
  expect(reconciliation).toContain("Owner outcome");
  expect(reconciliation).toContain("needs review");
  expect(reconciliation).toContain("Owner review");
  expect(reconciliation).toContain("Review required");
  expect(reconciliation).not.toContain("href=");
});

it("keeps a fragment containing claim JSON as exact inert text, never a full claims collection", () => {
  const partial = render("briefFragment");
  expect(partial).toContain("Saved record fragment");
  expect(partial).toContain("Partial saved record");
  expect(partial).toContain("&quot;claims&quot;");
  expect(partial).not.toContain('aria-label="Owner claims"');
  expect(partial).not.toContain("View saved record data");
  const unicode = fixtures.fragment.event.data.page;
  expect(render("fragment")).toContain(
    `Characters ${unicode.characterStart + 1}–${unicode.characterEnd} of ${unicode.totalCharacters}`,
  );
});

it("shared loading, denial and stale states never retain source content or offer another revision", () => {
  for (const error of [undefined, "ACCESS_DENIED", "SOURCE_REFERENCE_STALE"]) {
    const html = renderToStaticMarkup(
      createElement(SourceReadState, {
        loading: !error,
        error,
        reload() {},
        title: "Hearing record",
        page: "hearing record",
      }),
    );
    expect(html).not.toContain("Owner passage");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("Try again");
  }
  const unavailable = renderToStaticMarkup(
    createElement(SourceReadState, {
      loading: false,
      error: "SOURCE_REFERENCE_UNAVAILABLE",
      reload() {},
      title: "Hearing record",
      page: "hearing record",
    }),
  );
  expect(unavailable).toContain("does not mean that the source is absent");
  expect(unavailable).toContain("Try again");
});
