import { expect, it, vi } from "vitest";
import {
  defaultNewsletterBrandKit,
  defaultNewsletterSurveyDefinition,
  parseNewsletterSurveyDraft,
} from "@capiro/shared/newsletter";
import {
  richNewsletterBrandOperations as brand,
  newsletterFontUploadPolicy,
} from "./operations/rich-newsletter-brand";
import { richNewsletterSurveyOperations as survey } from "./operations/rich-newsletter-surveys";
import { createCapiroApi } from "./http";
import { validateUploadFiles } from "./multipart";
const id = "a1111111-1111-4111-8111-111111111111";

it("uses canonical brand GET/PATCH and actual public response validation without a new CAS receipt", () => {
  expect([
    brand["workspace.richNewsletter.brand.read"].method,
    brand["workspace.richNewsletter.brand.save"].method,
  ]).toEqual(["GET", "PATCH"]);
  const kit = defaultNewsletterBrandKit();
  kit.updatedAt = "2026-10-26T00:00:00.000Z";
  expect(
    brand["workspace.richNewsletter.brand.read"].response.parse(kit),
  ).toEqual(kit);
  expect(
    brand["workspace.richNewsletter.brand.read"].response.safeParse({
      ...kit,
      revision: 0,
    }).success,
  ).toBe(false);
  expect(
    brand["workspace.richNewsletter.brand.save"].request.parse({ body: kit }),
  ).toEqual({ body: kit });
});
it("font multipart is a single bounded file; server bytes rather than browser MIME determine font format", () => {
  expect(() =>
    validateUploadFiles(
      [
        {
          field: "file",
          file: new File([new Uint8Array(1)], "font.woff2", {
            type: "application/octet-stream",
          }),
        },
      ],
      newsletterFontUploadPolicy,
    ),
  ).not.toThrow();
  expect(() =>
    validateUploadFiles(
      [
        {
          field: "file",
          file: new File([new Uint8Array(2 * 1024 * 1024 + 1)], "font.woff2"),
        },
      ],
      newsletterFontUploadPolicy,
    ),
  ).toThrow();
  expect(() => validateUploadFiles([], newsletterFontUploadPolicy)).toThrow();
  expect(
    brand["workspace.richNewsletter.brand.font"].response.safeParse({
      ok: true,
    }).success,
  ).toBe(false);
});
it("pairs survey edit id/revision and preserves exact choice arrays while the public parser rejects newer readback as the requested result", () => {
  const operation = survey["workspace.richNewsletter.surveys.save"],
    definition = defaultNewsletterSurveyDefinition();
  expect(operation.path).toBe("/newsletters/documents/:id/surveys");
  expect(
    operation.request.safeParse({
      params: { id },
      body: { name: "New", definition },
    }).success,
  ).toBe(true);
  expect(
    operation.request.safeParse({
      params: { id },
      body: { name: "Edit", definition, id },
    }).success,
  ).toBe(false);
  expect(
    operation.request.safeParse({
      params: { id },
      body: { name: "New", definition, revision: 1 },
    }).success,
  ).toBe(false);
  const newer = {
    id,
    revision: 6,
    name: "Current",
    definition,
    status: "draft",
    sourceClientIds: [],
    updatedAt: "2026-10-26T00:00:00.000Z",
  };
  expect(parseNewsletterSurveyDraft(newer, { id, revision: 5 }).ok).toBe(false);
  expect(parseNewsletterSurveyDraft({ ...newer, status: "open" }).ok).toBe(
    false,
  );
});
it("a failed authoring POST is dispatched once and cannot trigger an automatic retry", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new TypeError("Synthetic lost response"));
  const api = createCapiroApi(survey, { fetcher });
  await expect(
    api.request("workspace.richNewsletter.surveys.save", {
      params: { id },
      body: { name: "New", definition: defaultNewsletterSurveyDefinition() },
    }),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
