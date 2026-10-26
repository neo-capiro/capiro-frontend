import { expect, type Page, type Route } from "@playwright/test";
import {
  createNewsletterBlock,
  newsletterVideoSource,
} from "@capiro/shared/newsletter";
import {
  assetFixture,
  asset,
  assetDetails,
  assetId,
  secondId,
} from "./newsletter-assets-fixture";
import { adoptDocument, enterEditor } from "./newsletter-document-fixtures";
import type { OperationInput } from "../../src/shared/capiro/contracts";

export const photo = {
  id: 123,
  title: "Synthetic Capitol photo",
  photographer: "Synthetic Photographer",
  photographerUrl: "https://www.pexels.com/@synthetic",
  sourceUrl: "https://www.pexels.com/photo/synthetic-123/",
  thumbnailUrl: "https://images.pexels.com/photos/123/synthetic.jpeg",
  imageUrl: "https://images.pexels.com/photos/123/synthetic-large.jpeg",
  width: 1600,
  height: 1200,
};
export const videoUrl = "https://youtu.be/AbCdef_12-3";
export const proposedText =
  "Synthetic <script>window.providerCode=true</script> draft";
const imageUrls = [photo.thumbnailUrl, asset().url, asset(secondId).url];
const available = { available: true, reason: null };
const unavailable = {
  available: false,
  reason: "Synthetic unavailable capability",
};
export const capabilities = {
  ai: available,
  imageAi: available,
  altTextAi: available,
  htmlCheck: available,
  inboxPreview: unavailable,
  send: unavailable,
};
export const htmlReport = (revision = 4) => ({
  provider: "Mailtrap",
  issues: ["Synthetic CSS support finding"],
  report: { status: "success", errors: ["Synthetic finding"] },
  revision,
  checkedAt: "2026-10-26T12:00:00.000Z",
});
export const variantIds = [
  assetId,
  secondId,
  "30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "40000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
];
type Operation =
  | "stock.status"
  | "stock.search"
  | "stock.import"
  | "capabilities"
  | "write"
  | "altText"
  | "refineImage"
  | "htmlCheck"
  | "videoThumbnail"
  | "linkPreview";
const operations: Operation[] = [
  "stock.status",
  "stock.search",
  "stock.import",
  "capabilities",
  "write",
  "altText",
  "refineImage",
  "htmlCheck",
  "videoThumbnail",
  "linkPreview",
];

/** Every effect and provider image is fulfilled synthetically; no external request is allowed through. */
export async function providerFixture(page: Page) {
  const assets = await assetFixture(page);
  assets.document.control.current.design.sections[0]!.blocks[0]!.imageUrl =
    asset().url;
  assets.document.control.current.design.sections[0]!.blocks.push(
    createNewsletterBlock("video", { id: "synthetic-video", url: videoUrl }),
    createNewsletterBlock("apps", { id: "synthetic-link-preview" }),
  );
  const requests: {
    operation: Operation;
    input: OperationInput;
    method: string;
    files: number;
  }[] = [];
  const queued = new Map<Operation, ((route: Route) => Promise<void>)[]>();
  for (const imageUrl of imageUrls)
    await page.route(imageUrl, (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="628" height="353"><rect width="628" height="353" fill="#e6eeef"/><text x="40" y="176" font-size="28">Synthetic provider image</text></svg>',
      }),
    );
  await page.route(
    "**/api/capiro/workspace.richNewsletter.*",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const operation = decodeURIComponent(
        url.pathname.split("workspace.richNewsletter.")[1] ?? "",
      ) as Operation;
      if (!operations.includes(operation)) return route.fallback();
      let input: OperationInput,
        files = 0;
      if (request.method() === "GET")
        input = JSON.parse(url.searchParams.get("input") ?? "{}");
      else if (
        request.headers()["content-type"]?.startsWith("multipart/form-data;")
      ) {
        const form = await new Request(request.url(), {
          method: "POST",
          headers: request.headers(),
          body: new Uint8Array(request.postDataBuffer() ?? []),
        }).formData();
        input = JSON.parse(String(form.get("input")));
        files = form.getAll("file").length;
      } else input = request.postDataJSON();
      requests.push({ operation, input, method: request.method(), files });
      const override = queued.get(operation)?.shift();
      if (override) return override(route);
      if (operation === "capabilities")
        return route.fulfill({ json: capabilities });
      if (operation === "stock.status")
        return route.fulfill({
          json: { provider: "pexels", available: true, reason: null },
        });
      if (operation === "stock.search")
        return route.fulfill({
          json: {
            provider: "pexels",
            items: [
              {
                ...photo,
                title:
                  input.query?.page === 2
                    ? "Synthetic next photo"
                    : photo.title,
              },
            ],
            page: input.query?.page,
            pageSize: 10,
            total: 20,
          },
        });
      if (operation === "stock.import")
        return route.fulfill({
          json: { ...asset(), altText: "Synthetic suggested alt" },
        });
      if (operation === "write")
        return route.fulfill({ json: { text: proposedText } });
      if (operation === "altText")
        return route.fulfill({
          json: { text: "Synthetic accessible image description" },
        });
      if (operation === "refineImage") {
        const count = (input.body as { count: 1 | 4 }).count;
        return route.fulfill({
          json: {
            items: variantIds
              .slice(0, count)
              .map((id, index) => asset(id, `Synthetic variant ${index + 1}`)),
          },
        });
      }
      if (operation === "htmlCheck")
        return route.fulfill({
          json: htmlReport((input.body as { revision: number }).revision),
        });
      if (operation === "videoThumbnail") {
        const source = newsletterVideoSource(
          (input.body as { url: string }).url,
        )!;
        return route.fulfill({
          json: {
            sourceUrl: source.url,
            provider: source.provider,
            title: "Synthetic video",
            imageUrl: asset().url,
          },
        });
      }
      return route.fulfill({
        json: {
          sourceUrl: "https://redirected.example.test/final",
          title: "Synthetic linked title",
          description: "Synthetic description",
          imageUrl: "",
          warnings: [
            "The page image could not be imported. The text preview is available.",
          ],
        },
      });
    },
  );
  return {
    assets,
    requests,
    calls: (operation: Operation) =>
      requests.filter((entry) => entry.operation === operation),
    queue: (operation: Operation, response: (route: Route) => Promise<void>) =>
      queued.set(operation, [...(queued.get(operation) ?? []), response]),
  };
}
export async function selectProviderBlock(
  page: Page,
  kind = "Logo",
  enter = true,
) {
  if (enter) {
    await enterEditor(page);
    await adoptDocument(page);
  }
  await page
    .getByRole("navigation", { name: "Newsletter structure" })
    .getByRole("button", { name: new RegExp(`^${kind}( ·|$)`) })
    .first()
    .click();
}
export async function expectNoProviderSideEffects(
  fixture: Awaited<ReturnType<typeof providerFixture>>,
) {
  expect(fixture.assets.document.calls("save")).toEqual([]);
  expect(fixture.assets.document.calls("stage")).toEqual([]);
  expect(fixture.assets.document.control.errors).toEqual([]);
  expect(fixture.assets.document.control.dialogs).toEqual([]);
  expect(
    fixture.assets.document.control.remote.filter(
      (url) => !imageUrls.includes(url),
    ),
  ).toEqual([]);
}
export { asset, assetDetails, assetId, secondId };
