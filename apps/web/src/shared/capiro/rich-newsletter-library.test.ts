import {
  createNewsletterLayout,
  type NewsletterSectionLibraryItem,
} from "@capiro/shared/newsletter";
import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "./http";
import { richNewsletterLibraryOperations as operations } from "./operations/rich-newsletter-library";

const id = "b2222222-2222-7222-8222-222222222222";
const item = (): NewsletterSectionLibraryItem => ({
  id,
  name: "Saved introduction",
  folder: "Updates",
  updatedAt: "2026-10-26T00:00:00.000Z",
  section: createNewsletterLayout(1).sections[0]!,
});
const list = operations["workspace.richNewsletter.sections.list"];
const save = operations["workspace.richNewsletter.sections.save"];
describe("fixed rich section operations", () => {
  it("uses only the existing section GET and document library POST", () => {
    expect([list.service, list.method, list.path]).toEqual([
      "workspace",
      "GET",
      "/newsletters/library/section",
    ]);
    expect([save.service, save.method, save.path]).toEqual([
      "workspace",
      "POST",
      "/newsletters/documents/:id/library",
    ]);
    expect(
      list.request.safeParse({ query: { search: "invented" } }).success,
    ).toBe(false);
    const request = {
      params: { id },
      body: {
        name: "n".repeat(200),
        folder: "f".repeat(100),
        sectionId: "section",
      },
    };
    expect(save.request.safeParse(request).success).toBe(true);
    for (const body of [
      { name: "Template without section" },
      { ...request.body, revision: 4 },
      { ...request.body, requestId: id },
      { ...request.body, name: "n".repeat(201) },
      { ...request.body, folder: "f".repeat(101) },
    ])
      expect(save.request.safeParse({ params: { id }, body }).success).toBe(
        false,
      );
  });
  it("uses the actual public receiver to reject templates, partial rows and oversized lists", () => {
    const row = item();
    expect(save.response.parse(row)).toEqual(row);
    expect(list.response.parse({ items: [row] })).toEqual({ items: [row] });
    const metadata = {
      id: row.id,
      name: row.name,
      folder: row.folder,
      updatedAt: row.updatedAt,
    };
    expect(
      save.response.safeParse({
        ...metadata,
        design: createNewsletterLayout(1),
      }).success,
    ).toBe(false);
    expect(
      list.response.safeParse({
        items: [{ ...row, section: { id: "missing content" } }],
      }).success,
    ).toBe(false);
    expect(
      list.response.safeParse({
        items: Array.from({ length: 501 }, (_, i) => ({
          ...row,
          id: String(i),
        })),
      }).success,
    ).toBe(false);
  });
  it("rejects malformed HTTP success and does not redispatch the library POST", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id, name: "incomplete" }));
    const api = createCapiroApi(operations, { fetcher });
    await expect(
      api.request("workspace.richNewsletter.sections.save", {
        params: { id },
        body: { name: "Saved", sectionId: "section" },
      }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("drops a response completed after current scope cancellation", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return Response.json({ items: [item()] });
    });
    const api = createCapiroApi(operations, { fetcher });
    await expect(
      api.request(
        "workspace.richNewsletter.sections.list",
        {},
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
