import type { Page } from "@playwright/test";
import { blueprintFixture } from "./document-blueprint-fixture";
import { blueprint, versions } from "../../tests/document-blueprint-fixtures";
import {
  studioDefinition,
  studioTheme,
  studioUpload,
  studioAsset,
  studioTenant,
} from "../../tests/document-studio-fixtures";
import type {
  WorkspaceBlueprintContentVersion,
  WorkspaceBlueprintDetail,
  WorkspaceBrandAsset,
  WorkspaceBrandUpload,
} from "@capiro/shared/workspace-template-studio";

export async function studioFixture(page: Page) {
  const base = await blueprintFixture(page);
  const control = {
    parent: structuredClone(blueprint),
    versions: versions.map(
      (row): WorkspaceBlueprintContentVersion => ({
        ...row,
        definition: { ...structuredClone(studioDefinition) },
      }),
    ),
    themes: [structuredClone(studioTheme)],
    assets: [] as WorkspaceBrandAsset[],
    uploads: [structuredClone(studioUpload)] as WorkspaceBrandUpload[],
    writes: [] as { key: string; input: Record<string, unknown> }[],
    lose: "",
    wrong: "",
    refuse: "",
    referencedAsset: false,
    concurrentWrite: false,
    savedRace: false,
    sampleWrong: false,
    denied: false,
  };
  let serial = 10;
  const id = () =>
    `74000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`;
  const hash = () => (++serial).toString(16).padStart(64, "0");
  await page.route(
    /\/api\/capiro\/workspace\.(blueprints|themes|brandAssets)\./,
    async (route) => {
      const url = new URL(route.request().url());
      const key = decodeURIComponent(url.pathname.split("/").at(-1)!);
      const input =
        route.request().method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : route.request().postDataJSON();
      const params = input.params ?? {},
        body = input.body ?? {};
      const isWrite = route.request().method() !== "GET";
      if (isWrite) control.writes.push({ key, input: structuredClone(input) });
      if (control.denied || control.refuse === key)
        return route.fulfill({
          status: 403,
          json: { message: "Current access refused" },
        });
      let value: unknown;
      if (key === "workspace.blueprints.list")
        value = [
          {
            ...control.parent,
            versions: control.versions.slice(-1),
            pinnedDocCount: 4,
          },
        ];
      if (key === "workspace.blueprints.detail")
        value = { ...control.parent, versions: control.versions };
      const version = control.versions.find(
        (row) => row.id === params.versionId,
      );
      if (
        key === "workspace.blueprints.save" &&
        version &&
        control.concurrentWrite
      ) {
        version.definitionHash = hash();
        control.concurrentWrite = false;
      }
      const expectedSource =
        key === "workspace.blueprints.cloneVersion"
          ? control.versions.find((row) => row.id === body.fromVersionId)
          : version;
      if (
        isWrite &&
        expectedSource &&
        [
          "workspace.blueprints.save",
          "workspace.blueprints.publish",
          "workspace.blueprints.retire",
          "workspace.blueprints.cloneVersion",
        ].includes(key) &&
        body.expectedDefinitionHash !== expectedSource.definitionHash
      )
        return route.fulfill({
          status: 409,
          json: {
            message:
              "This blueprint changed before the write. Refresh and review it.",
          },
        });
      if (key === "workspace.blueprints.version") {
        if (control.savedRace && version) {
          version.status = "published";
          control.savedRace = false;
        }
        value = version;
      }
      if (key === "workspace.blueprints.create") {
        control.parent = {
          ...control.parent,
          ...body,
          id: id(),
          tenantId: studioTenant,
          scope: "firm",
          versions: [],
        } as WorkspaceBlueprintDetail;
        control.versions = [];
        value = control.parent;
      }
      if (
        key === "workspace.blueprints.createVersion" ||
        key === "workspace.blueprints.cloneVersion"
      ) {
        const source = key.endsWith("cloneVersion")
          ? control.versions.find((row) => row.id === body.fromVersionId)
          : control.versions.at(-1);
        const next = {
          ...versions[2]!,
          id: id(),
          blueprintId: control.parent.id,
          tenantId: control.parent.tenantId,
          version: (control.versions.at(-1)?.version ?? 0) + 1,
          status: "draft" as const,
          definition: structuredClone(source?.definition ?? {}),
          definitionHash: source?.definitionHash ?? hash(),
        };
        control.versions.push(next);
        value = next;
      }
      if (key === "workspace.blueprints.save" && version) {
        version.definition = structuredClone(body.definition);
        version.definitionHash = hash();
        value = version;
      }
      if (key === "workspace.blueprints.publish" && version) {
        version.status = "published";
        version.publishedAt = "2026-10-26T12:00:00.000Z";
        value = version;
      }
      if (key === "workspace.blueprints.retire" && version) {
        version.status = "retired";
        version.retiredAt = "2026-10-26T12:00:00.000Z";
        value = version;
      }
      if (key === "workspace.blueprints.test" && version)
        value = {
          blueprintId: version.blueprintId,
          versionId: version.id,
          definitionHash: control.sampleWrong
            ? "f".repeat(64)
            : version.definitionHash,
          passed: true,
          intake: body.answers,
          outline: studioDefinition.sections.map(
            ({ id, title, targetWords }) => ({ id, title, targetWords }),
          ),
          errors: [],
        };
      const theme = control.themes.find((row) => row.id === params.themeId),
        themeVersion = theme?.versions.find(
          (row) => row.id === params.versionId,
        );
      if (key === "workspace.themes.list")
        value = control.themes.map((row) => ({
          ...row,
          versions: row.versions.slice(-1),
        }));
      if (key === "workspace.themes.detail") value = theme;
      if (key === "workspace.themes.version") value = themeVersion;
      if (key === "workspace.themes.create") {
        const themeId = id();
        const next = {
          ...structuredClone(studioTheme),
          ...body,
          id: themeId,
          versions: [
            {
              ...structuredClone(studioTheme.versions[0]!),
              id: id(),
              themeId,
              settings: {},
              version: 1,
            },
          ],
        };
        control.themes.push(next);
        value = next;
      }
      if (key === "workspace.themes.createVersion" && theme) {
        const next = {
          ...structuredClone(theme.versions.at(-1)!),
          id: id(),
          version: theme.versions.length + 1,
          status: "draft" as const,
          publishedAt: null,
          retiredAt: null,
        };
        theme.versions.push(next);
        value = next;
      }
      if (key === "workspace.themes.save" && themeVersion) {
        themeVersion.settings = structuredClone(body.settings);
        themeVersion.settingsHash = hash();
        value = themeVersion;
      }
      if (key === "workspace.themes.publish" && themeVersion) {
        themeVersion.status = "published";
        themeVersion.publishedAt = "2026-10-26T12:00:00.000Z";
        value = themeVersion;
      }
      if (key === "workspace.themes.retire" && themeVersion) {
        themeVersion.status = "retired";
        themeVersion.retiredAt = "2026-10-26T12:00:00.000Z";
        value = themeVersion;
      }
      if (key === "workspace.brandAssets.list") value = control.assets;
      if (key === "workspace.brandAssets.uploads") value = control.uploads;
      if (key === "workspace.brandAssets.register") {
        control.assets = [structuredClone(studioAsset)];
        value = { ...studioAsset, attachmentId: body.attachmentId };
      }
      if (key === "workspace.brandAssets.remove") {
        if (control.referencedAsset)
          return route.fulfill({
            status: 409,
            json: {
              message:
                "This asset is referenced by a saved theme, blueprint or document.",
            },
          });
        control.assets = control.assets.filter(
          (row) => row.id !== params.assetId,
        );
        value = { assetId: params.assetId, deleted: true };
      }
      if (control.lose === key && isWrite) return route.abort("failed");
      if (
        control.wrong === key &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      )
        value = {
          ...value,
          id: id(),
          blueprintId: id(),
          themeId: id(),
          attachmentId: id(),
          assetId: id(),
        };
      if (value === undefined)
        return route.fulfill({
          status: 404,
          json: { message: "Synthetic record missing" },
        });
      return route.fulfill({ json: value });
    },
  );
  return { ...base, studio: control };
}
