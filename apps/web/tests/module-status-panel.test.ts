import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CapiroApiError } from "../src/shared/capiro/http";
import { StatusPanel } from "../src/shared/module-ui";

/**
 * A discarded request that cannot succeed on retry must not be presented as a
 * retryable failure. Before this, StatusPanel offered "Try again" for every
 * error, including an expired session or a held backend, so the user was invited
 * to repeat an action that could never work.
 */
const render = (error: Error) =>
  renderToStaticMarkup(
    createElement(StatusPanel, { error, onRetry: () => undefined }),
  );

it("offers retry for a failure that carries no classification", () => {
  const html = render(new Error("Synthetic read refusal"));
  expect(html).toContain("Unable to load this view");
  expect(html).toContain("Synthetic read refusal");
  expect(html).toContain("Try again");
});

it("still offers retry for a transient service failure", () => {
  const html = render(
    new CapiroApiError(503, "The service is unavailable. Please retry."),
  );
  expect(html).toContain("Try again");
});

it("refuses to offer a futile retry when access is denied", () => {
  const html = render(new CapiroApiError(403, "Refused."));
  expect(html).toContain("This view is unavailable");
  expect(html).toContain("does not have access");
  expect(html).not.toContain("Try again");
});

it("refuses to offer a futile retry for an expired session", () => {
  const html = render(new CapiroApiError(401, "Session expired."));
  expect(html).toContain("This view is unavailable");
  expect(html).toContain("Sign in again");
  expect(html).not.toContain("Try again");
});

it("refuses to offer a futile retry for a record that is gone", () => {
  const html = render(new CapiroApiError(404, "Not found."));
  expect(html).toContain("This view is unavailable");
  expect(html).not.toContain("Try again");
});

it("refuses to offer a futile retry when the backend is held", () => {
  const html = render(
    new CapiroApiError(
      503,
      "Backend access is held for read-only preview review.",
      undefined,
      undefined,
      undefined,
      "PREVIEW_BACKEND_HELD",
    ),
  );
  expect(html).toContain("This view is unavailable");
  expect(html).toContain("held or not configured");
  expect(html).not.toContain("Try again");
});
