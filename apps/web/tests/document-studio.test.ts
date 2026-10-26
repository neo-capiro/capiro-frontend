import { describe, expect, it } from "vitest";
import { workspaceBlueprintAuthoringOperations as blueprints } from "../src/shared/capiro/operations/workspace-blueprint-authoring";
import { workspaceThemeStudioOperations as themes } from "../src/shared/capiro/operations/workspace-theme-studio";
import { sameStudioValue } from "../src/features/modules/workspace/document-templates/studio-write";
import {
  studioDefinition,
  studioTheme,
  studioUpload,
} from "./document-studio-fixtures";
import { blueprintId, versions } from "./document-blueprint-fixtures";

describe("document studio write inputs", () => {
  it("saves the complete canonical definition without dropping optional condition or opaque theme settings", () => {
    const input = {
      params: { blueprintId, versionId: versions[2]!.id },
      body: {
        definition: studioDefinition,
        expectedDefinitionHash: versions[2]!.definitionHash,
      },
    };
    expect(
      blueprints["workspace.blueprints.save"].request.parse(input),
    ).toEqual(input);
    expect(
      blueprints["workspace.blueprints.save"].request.safeParse({
        ...input,
        body: { ...input.body, definition: { sections: [] } },
      }).success,
    ).toBe(false);
    expect(
      blueprints["workspace.blueprints.save"].request.safeParse({
        ...input,
        body: { ...input.body, tenantId: studioTheme.tenantId },
      }).success,
    ).toBe(false);
  });
  it("does not offer a global-create or inferred-latest clone input", () => {
    expect(
      blueprints["workspace.blueprints.create"].request.safeParse({
        body: { name: "New", slug: "new", product: "Brief", scope: "capiro" },
      }).success,
    ).toBe(false);
    expect(
      blueprints["workspace.blueprints.cloneVersion"].request.safeParse({
        params: { blueprintId },
        body: {},
      }).success,
    ).toBe(false);
    expect(
      blueprints["workspace.blueprints.publish"].request.safeParse({
        params: { blueprintId, versionId: versions[2]!.id },
        body: { answers: {} },
      }).success,
    ).toBe(false);
  });
  it("registers an existing confirmed attachment, never caller-supplied upload URLs or tenant metadata", () => {
    expect(
      themes["workspace.brandAssets.register"].request.parse({
        body: { attachmentId: studioUpload.id },
      }),
    ).toEqual({ body: { attachmentId: studioUpload.id } });
    expect(
      themes["workspace.brandAssets.register"].request.safeParse({
        body: { attachmentId: studioUpload.id, url: studioUpload.downloadUrl },
      }).success,
    ).toBe(false);
    expect(
      themes["workspace.brandAssets.remove"].request.safeParse({
        params: { assetId: studioUpload.id },
        query: { force: true },
      }).success,
    ).toBe(false);
  });
  it("preserves nested theme settings and refuses arrays", () => {
    const params = {
      themeId: studioTheme.id,
      versionId: studioTheme.versions[0]!.id,
    };
    expect(
      themes["workspace.themes.save"].request.parse({
        params,
        body: {
          settings: studioTheme.versions[0]!.settings,
          expectedSettingsHash: studioTheme.versions[0]!.settingsHash,
        },
      }).body.settings,
    ).toEqual(studioTheme.versions[0]!.settings);
    expect(
      themes["workspace.themes.save"].request.safeParse({
        params,
        body: {
          settings: [],
          expectedSettingsHash: studioTheme.versions[0]!.settingsHash,
        },
      }).success,
    ).toBe(false);
  });
  it("compares saved content independent of object key order, retaining arrays and optional values", () => {
    expect(
      sameStudioValue(
        { b: [1, 2], a: { x: true } },
        { a: { x: true }, b: [1, 2] },
      ),
    ).toBe(true);
    expect(sameStudioValue({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(sameStudioValue({ a: null }, {})).toBe(false);
    expect(sameStudioValue([], {})).toBe(false);
    expect(
      sameStudioValue(studioDefinition, {
        ...studioDefinition,
        defaultTheme: { ...studioDefinition.defaultTheme, settings: {} },
      }),
    ).toBe(false);
  });
});
