import type { Page, Route } from "@playwright/test";
import { documentFixture } from "./newsletter-document-fixtures";
import {
  reviewFixture,
  reviewId,
} from "../../tests/newsletter-review-fixtures";

export const reviewUrl = (id = reviewId) =>
  `/modules/workspace?view=rich-newsletter&newsletterId=${id}`;
export async function reviewPage(page: Page, role = "viewer") {
  const document = await documentFixture(page);
  const current = reviewFixture(role);
  const calls: { operation: string; input: unknown }[] = [];
  const queued = new Map<string, ((route: Route) => Promise<void>)[]>();
  for (const operation of ["review", "comments"]) {
    await page.route(
      `**/api/capiro/workspace.richNewsletter.${operation}*`,
      async (route) => {
        calls.push({
          operation,
          input: JSON.parse(
            new URL(route.request().url()).searchParams.get("input") ?? "{}",
          ),
        });
        const override = queued.get(operation)?.shift();
        if (override) return override(route);
        return route.fulfill({
          json: operation === "review" ? current : { items: current.comments },
        });
      },
    );
  }
  return {
    ...document,
    review: current,
    reads: calls,
    queueRead(
      operation: "review" | "comments",
      handler: (route: Route) => Promise<void>,
    ) {
      queued.set(operation, [...(queued.get(operation) ?? []), handler]);
    },
  };
}
