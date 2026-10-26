import {
  defaultNewsletterBrandKit,
  defaultNewsletterSurveyDefinition,
  createNewsletterSurveyQuestion,
  type NewsletterSavedSurvey,
} from "@capiro/shared/newsletter";
import type { Page, Route } from "@playwright/test";
import { assetFixture } from "./newsletter-assets-fixture";
export const surveyId = "c3333333-3333-4333-8333-333333333333";
export const font = {
  assetId: "d4444444-4444-4444-8444-444444444444",
  name: "Synthetic font",
  family: "CapiroFont-d4444444-4444-4444-8444-444444444444",
  url: `https://assets.example.test/workspace-api/newsletters/assets/file/${"f".repeat(64)}`,
  format: "woff2",
};
export async function authoringFixture(page: Page) {
  const assets = await assetFixture(page);
  const question = createNewsletterSurveyQuestion("radio");
  question.prompt = "Which issue matters most?";
  question.options = ["One\nchoice", "Another"];
  const saved: NewsletterSavedSurvey = {
    id: surveyId,
    name: "Member priorities",
    revision: 4,
    status: "draft",
    updatedAt: "2026-10-26T00:00:00.000Z",
    sourceClientIds: [],
    definition: {
      ...defaultNewsletterSurveyDefinition(),
      questions: [question],
    },
  };
  const state = {
    kit: {
      ...defaultNewsletterBrandKit(),
      updatedAt: "2026-10-26T00:00:00.000Z",
    },
    surveys: [saved],
    requests: [] as { operation: string; input: Record<string, unknown> }[],
  };
  const queue = new Map<string, ((route: Route) => Promise<void>)[]>();
  await page.route(
    /\/api\/capiro\/workspace\.richNewsletter\.(brand\.(read|save|font)|surveys\.(list|save))(?:\?|$)/,
    async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        operation = url.pathname.split(".").slice(-2).join(".");
      const input =
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : operation === "brand.font"
            ? {
                multipart: request
                  .headers()
                  ["content-type"]?.startsWith("multipart/form-data;"),
              }
            : request.postDataJSON();
      state.requests.push({ operation, input });
      const override = queue.get(operation)?.shift();
      if (override) return override(route);
      if (operation === "brand.read") return route.fulfill({ json: state.kit });
      if (operation === "brand.save") {
        state.kit = {
          ...input.body,
          revision: input.body.revision + 1,
          updatedAt: "2026-10-26T01:00:00.000Z",
        };
        return route.fulfill({ json: state.kit });
      }
      if (operation === "brand.font") return route.fulfill({ json: font });
      if (operation === "surveys.list")
        return route.fulfill({ json: { items: state.surveys } });
      return route.fulfill({
        json: {
          ...saved,
          ...input.body,
          id: input.body.id ?? "e5555555-5555-4555-8555-555555555555",
          revision: input.body.revision ? input.body.revision + 1 : 1,
        },
      });
    },
  );
  return {
    ...assets,
    state,
    saved,
    calls: (operation: string) =>
      state.requests.filter((x) => x.operation === operation),
    queueAuthoring: (
      operation: string,
      reply: (route: Route) => Promise<void>,
    ) => queue.set(operation, [...(queue.get(operation) ?? []), reply]),
  };
}
