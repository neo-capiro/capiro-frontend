import { test, expect } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import { installEnrichment } from "./client-enrichment-fixtures";
const attachmentId = "10000000-0000-4000-8000-000000000040";
const canonicalEntityId = "10000000-0000-4000-8000-000000000041";
const actor = {
  tenantId: "90000000-0000-4000-8000-000000000001",
  userId: "90000000-0000-4000-8000-000000000002",
};
for (const share of [false, true]) {
  test(`document-only entry preserves the original private upload and ${share ? "researches only after explicit sharing" : "does not start document research"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      share ? { width: 1440, height: 1000 } : { width: 390, height: 844 },
    );
    await page.emulateMedia({ colorScheme: share ? "light" : "dark" });
    const { state, unexpected } = await installEnrichment(page);
    state.run = null;
    const creates: Record<string, unknown>[] = [];
    const links: Record<string, unknown>[] = [];
    const previews: Record<string, unknown>[] = [];
    let uploadTickets = 0,
      uploadConfirmations = 0,
      storageWrites = 0,
      identityConfirmations = 0;
    const document = {
      id: attachmentId,
      tenantId: actor.tenantId,
      clientId: null as string | null,
      prospectId: null,
      meetingId: null,
      mailMessageId: null,
      s3Key: "synthetic/private-identity.txt",
      fileName: "identity.txt",
      contentType: "text/plain",
      byteSize: 42,
      source: "profile_identity",
      folder: null,
      viewerMode: "restricted",
      viewerUserIds: [actor.userId],
      uploadedByUserId: actor.userId,
      createdAt: "2026-01-01",
      lifecycleStatus: "ready",
      scanStatus: "clean",
      extractionStatus: "pending",
      indexedAt: null,
      usable: true,
    };
    const candidate = {
      source: "document",
      externalId: attachmentId,
      name: "Company Named In Document",
    };
    const documentClaim = {
      kind: "former_name",
      name: "Former Document Company",
      attachmentId,
      quote: "Company Named In Document was formerly Former Document Company.",
    };
    await page.route("https://example.test/synthetic-storage", (route) => {
      storageWrites++;
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("**/engagement/attachments/upload-url", (route) => {
      uploadTickets++;
      const body = route.request().postDataJSON();
      expect(body).not.toHaveProperty("clientId");
      return json(route, {
        url: "https://example.test/synthetic-storage",
        fields: { key: document.s3Key },
        s3Key: document.s3Key,
      });
    });
    await page.route("**/engagement/attachments/confirm", (route) => {
      uploadConfirmations++;
      expect(route.request().postDataJSON()).toMatchObject({
        source: "profile_identity",
        s3Key: document.s3Key,
      });
      return json(route, document);
    });
    await page.route("**/engagement/attachments?**", (route) =>
      json(route, [document]),
    );
    await page.route("**/clients/profile-build/identity-preview", (route) => {
      previews.push(route.request().postDataJSON());
      return json(route, {
        status: "ambiguous",
        entity: null,
        duplicate: null,
        sourceGaps: [],
        candidates: [
          {
            entity: { id: null, canonicalName: candidate.name },
            sourceCandidate: candidate,
            claims: [documentClaim],
            evidence: [
              {
                label: "Uploaded identity.txt",
                attachmentId,
                excerpt: "Company Named In Document builds synthetic systems.",
                observedAt: "2026-01-01T00:00:00Z",
                source: "profile_identity",
              },
            ],
            reasons: ["The uploaded text names this company."],
          },
          {
            entity: { id: null, canonicalName: "Another Company In Document" },
            sourceCandidate: {
              ...candidate,
              name: "Another Company In Document",
            },
            claims: [],
            evidence: [],
          },
        ],
      });
    });
    await page.route("**/clients/profile-build/identity-confirm", (route) => {
      identityConfirmations++;
      const body = route.request().postDataJSON();
      expect(body.sourceCandidate).toEqual(candidate);
      expect(body.claims).toEqual([documentClaim]);
      return json(route, {
        requestId: body.requestId,
        canonicalEntityId,
        sourceCandidate: candidate,
      });
    });
    await page.route("**/api/backend/core/clients", (route) => {
      if (route.request().method() !== "POST") return json(route, [client]);
      const body = route.request().postDataJSON();
      creates.push(body);
      expect(identityConfirmations).toBe(1);
      return json(route, { ...client, ...body });
    });
    await page.route(
      `**/engagement/attachments/${attachmentId}/profile-link`,
      (route) => {
        links.push(route.request().postDataJSON());
        document.clientId = clientId;
        if (share) {
          document.viewerMode = "all";
          document.viewerUserIds = [];
          document.extractionStatus = "extracted";
        }
        if (links.length === 1)
          return json(route, { message: "Synthetic lost link response" }, 503);
        return json(route, document);
      },
    );
    await page.goto("/portfolio");
    await page
      .getByRole("button", { name: "Add profile", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Add profile",
      exact: true,
    });
    await dialog.getByLabel(/Supporting document/).setInputFiles({
      name: "identity.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Company Named In Document builds synthetic systems.",
      ),
    });
    const sharing = dialog.getByRole("checkbox", {
      name: "Share this document with people who can access the profile for research",
      exact: true,
    });
    await expect(sharing).not.toBeChecked();
    await sharing.check();
    await dialog.getByLabel(/Supporting document/).setInputFiles({
      name: "identity.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Company Named In Document builds synthetic systems.",
      ),
    });
    await expect(sharing).not.toBeChecked();
    if (share) await sharing.check();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog
      .getByRole("radio", { name: /Company Named In Document/ })
      .check();
    await expect(
      dialog.getByRole("radio", { name: /Another Company In Document/ }),
    ).not.toBeChecked();
    await dialog
      .getByText("Company identity sources · 1", { exact: true })
      .click();
    await expect(dialog).toContainText(
      "Company Named In Document builds synthetic systems.",
    );
    const alias = dialog.getByRole("checkbox", {
      name: "Confirm former name: Former Document Company",
      exact: true,
    });
    await expect(alias).not.toBeChecked();
    await expect(
      dialog.getByRole("radio", { name: /Company Named In Document/ }),
    ).toBeChecked();
    if (share) await expect(sharing).toBeChecked();
    else await expect(sharing).not.toBeChecked();
    await page.evaluate(() => globalThis.document.fonts.ready);
    expect(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const companyChoice = dialog
      .getByRole("radio", { name: /Company Named In Document/ })
      .locator("..");
    const companyName = await companyChoice
      .getByText("Company Named In Document", { exact: true })
      .boundingBox();
    const matchStatus = await companyChoice
      .getByText("Confirm this company", { exact: true })
      .boundingBox();
    const sourceLabel = await companyChoice
      .getByText("Uploaded document", { exact: true })
      .boundingBox();
    expect(companyName && matchStatus && sourceLabel).toBeTruthy();
    expect(matchStatus!.y).toBeGreaterThanOrEqual(
      companyName!.y + companyName!.height,
    );
    expect(sourceLabel!.y).toBeGreaterThanOrEqual(
      matchStatus!.y + matchStatus!.height,
    );
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    if (!share)
      expect(
        await dialog.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      ).toBe("rgb(27, 27, 27)");
    await sharing.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/profile-document-identity-review-${share ? "shared-desktop" : "private-phone-dark"}.png`,
      fullPage: true,
    });
    await alias.check();
    expect(previews).toEqual([{ attachmentId }]);
    expect(creates).toEqual([]);
    expect(state.posts).toEqual([]);
    await dialog
      .getByRole("button", { name: "Build profile", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", {
        name: "Retry linking document",
        exact: true,
      }),
    ).toBeEnabled();
    expect(creates).toHaveLength(1);
    expect(creates[0]).toMatchObject({
      name: candidate.name,
      canonicalEntityId,
    });
    expect(state.posts).toEqual([]);
    await dialog
      .getByRole("button", { name: "Retry linking document", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", {
        name: "Retry linking document",
        exact: true,
      }),
    ).not.toBeVisible();
    expect(links).toHaveLength(2);
    expect(links[1]).toEqual(links[0]);
    expect(links[0]).toEqual({
      clientId,
      ...(share ? { shareWithProfile: true } : {}),
    });
    expect(creates).toHaveLength(1);
    expect(uploadTickets).toBe(1);
    expect(storageWrites).toBe(1);
    expect(uploadConfirmations).toBe(1);
    if (share) {
      await expect
        .poll(() => state.posts.filter((row) => row.path === "runs").length)
        .toBe(1);
      expect(
        state.posts.find((row) => row.path === "runs")?.body,
      ).toMatchObject({ sources: [], attachmentIds: [attachmentId] });
    } else {
      await expect(dialog).toContainText(
        "The identity document remains private to you.",
      );
      await expect(dialog).toContainText(
        "used only to confirm company identity",
      );
      expect(state.posts).toEqual([]);
    }
    expect(unexpected).toEqual([]);
  });
}
