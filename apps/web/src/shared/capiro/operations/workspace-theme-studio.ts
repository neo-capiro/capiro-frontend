import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";
import { studioVersionHash } from "./workspace-blueprint-authoring";

const source =
  "Core ThemeStudioController and BrandAssetController; public workspace-template-studio receivers";
const params = z.object({ themeId: workspaceId }).strict();
const version = params.extend({ versionId: workspaceId }).strict();
const settings = z.record(z.string(), z.unknown());
const expected = z.object({ expectedSettingsHash: studioVersionHash }).strict();
export const workspaceThemeStudioOperations = {
  "workspace.themes.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/themes",
    request: z.object({}).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.detail": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/themes/:themeId",
    request: z.object({ params }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.version": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/themes/:themeId/versions/:versionId",
    request: z.object({ params: version }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/themes",
    request: z
      .object({
        body: z
          .object({
            name: z.string().trim().min(1).max(200),
            slug: z.string().trim().min(1).max(120),
            description: z.string().max(500).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.createVersion": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/themes/:themeId/versions",
    request: z.object({ params, body: z.object({}).strict() }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.save": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/template-studio/themes/:themeId/versions/:versionId",
    request: z
      .object({ params: version, body: expected.extend({ settings }).strict() })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.publish": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/themes/:themeId/versions/:versionId/publish",
    request: z.object({ params: version, body: expected }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.themes.retire": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/themes/:themeId/versions/:versionId/retire",
    request: z.object({ params: version, body: expected }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.brandAssets.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/assets",
    request: z.object({}).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.brandAssets.uploads": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/assets/uploads",
    request: z.object({}).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.brandAssets.register": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/assets",
    request: z
      .object({ body: z.object({ attachmentId: workspaceId }).strict() })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.brandAssets.remove": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/template-studio/assets/:assetId",
    request: z
      .object({ params: z.object({ assetId: workspaceId }).strict() })
      .strict(),
    response: z.unknown(),
    source,
  }),
} as const;
