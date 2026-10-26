import {
  parseNewsletterAssetFolder,
  parseNewsletterAssetFolders,
  parseNewsletterAssetFolderDeletion,
  parseNewsletterAssetRevisionPage,
  parseNewsletterAssetsMoved,
  parseNewsletterAssetsDeleted,
  parseNewsletterAssetItem,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation } from "../contracts";
import { assetUuid, receiveAssetResponse } from "./rich-newsletter-assets";

const source =
  "capiro-backend@909c3a155eada6a33dba79704775f9d90c0fd288 packages/shared/src/newsletter-asset-management-receiving.ts; apps/workspace/src/newsletters/newsletter.controller.ts; apps/workspace/src/newsletters/newsletter.service.ts";
const params = z.object({ id: assetUuid }).strict();
const folderName = z
  .object({ name: z.string().trim().min(1).max(100) })
  .strict();
const ids = z.array(assetUuid).min(1).max(100);

export const richNewsletterAssetManagementOperations = {
  "workspace.richNewsletter.assetFolders.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/asset-folders",
    request: z.object({}).strict(),
    response: receiveAssetResponse(parseNewsletterAssetFolders),
    source,
  }),
  "workspace.richNewsletter.assetFolders.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/asset-folders",
    // This consumer creates an empty folder; create-and-move is not an exposed action.
    request: z.object({ body: folderName }).strict(),
    response: receiveAssetResponse(parseNewsletterAssetFolder),
    source,
  }),
  "workspace.richNewsletter.assetFolders.rename": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/asset-folders/:id",
    request: z.object({ params, body: folderName }).strict(),
    // The feature binds the reply to the captured folder ID, not its own echo.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.assetFolders.delete": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/newsletters/asset-folders/:id",
    request: z.object({ params }).strict(),
    response: receiveAssetResponse(parseNewsletterAssetFolderDeletion),
    source,
  }),
  "workspace.richNewsletter.assets.move": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/assets/move",
    request: z
      .object({
        body: z.object({ ids, folderId: assetUuid.nullable() }).strict(),
      })
      .strict(),
    response: receiveAssetResponse(parseNewsletterAssetsMoved),
    source,
  }),
  "workspace.richNewsletter.assets.rename": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/assets/:id",
    request: z
      .object({
        params,
        body: z.object({ name: z.string().trim().min(1).max(200) }).strict(),
      })
      .strict(),
    // The feature must admit the actual requested asset ID after the response.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.assets.delete": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/assets/delete",
    request: z.object({ body: z.object({ ids }).strict() }).strict(),
    response: receiveAssetResponse(parseNewsletterAssetsDeleted),
    source,
  }),
  "workspace.richNewsletter.assets.import": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/assets/import",
    request: z
      .object({
        body: z
          .object({
            url: z.string().trim().min(1).max(2048),
            folderId: assetUuid.optional(),
          })
          .strict(),
      })
      .strict(),
    response: receiveAssetResponse(parseNewsletterAssetItem),
    source,
  }),
  "workspace.richNewsletter.assets.revisions": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/assets/:id/revisions",
    request: z
      .object({
        params,
        query: z
          .object({
            page: z.number().int().min(1).max(100_000),
            pageSize: z.union([
              z.literal(10),
              z.literal(25),
              z.literal(50),
              z.literal(100),
            ]),
          })
          .strict(),
      })
      .strict(),
    // There is no requested/root ID echo. Query disposal retains the read's scope.
    response: receiveAssetResponse(parseNewsletterAssetRevisionPage),
    source,
  }),
} as const;
