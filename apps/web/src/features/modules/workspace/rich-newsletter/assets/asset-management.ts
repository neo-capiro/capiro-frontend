import {
  parseNewsletterAssetFolderRename,
  parseNewsletterAssetRename,
  parseNewsletterAssetItem,
  parseNewsletterAssetsMoved,
  parseNewsletterAssetsDeleted,
  type NewsletterAssetFolder,
  type NewsletterAssetItem,
} from "@capiro/shared/newsletter";
import type { OperationRequest } from "../../../../../shared/capiro/contracts";
import { richNewsletterAssetManagementOperations as operations } from "../../../../../shared/capiro/operations/rich-newsletter-asset-management";

export type AssetManagementAction =
  | { kind: "createFolder" }
  | { kind: "renameFolder" | "deleteFolder"; folder: NewsletterAssetFolder }
  | {
      kind: "renameImage" | "deleteImage" | "moveImage";
      image: NewsletterAssetItem;
    }
  | { kind: "importImage"; folder?: NewsletterAssetFolder };
export const managementOperations = {
  createFolder: "workspace.richNewsletter.assetFolders.create",
  renameFolder: "workspace.richNewsletter.assetFolders.rename",
  deleteFolder: "workspace.richNewsletter.assetFolders.delete",
  renameImage: "workspace.richNewsletter.assets.rename",
  deleteImage: "workspace.richNewsletter.assets.delete",
  moveImage: "workspace.richNewsletter.assets.move",
  importImage: "workspace.richNewsletter.assets.import",
} as const;
export const managementLabels = {
  createFolder: {
    title: "Add Folder",
    submit: "Add Folder",
    done: "Folder created.",
  },
  renameFolder: {
    title: "Rename Folder",
    submit: "Save",
    done: "Folder renamed.",
  },
  deleteFolder: {
    title: "Delete Folder",
    submit: "Delete Folder",
    done: "Folder deleted. Its images are now Unfiled.",
  },
  renameImage: {
    title: "Rename image",
    submit: "Save",
    done: "Image renamed.",
  },
  deleteImage: {
    title: "Delete image",
    submit: "Delete",
    done: "Image removed from your library, including saved versions. Existing image links are not revoked.",
  },
  moveImage: {
    title: "Move to folder",
    submit: "Move image",
    done: "Image move acknowledged. Refresh the library to view current items.",
  },
  importImage: {
    title: "Import URL",
    submit: "Import",
    done: "Image added to your library. View its details before inserting.",
  },
} as const;
type ChangeKey =
  (typeof managementOperations)[keyof typeof managementOperations];
type ChangeInput = OperationRequest<(typeof operations)[ChangeKey]>;

/** Request construction only; Core remains the policy and effect owner. */
export function assetChangeInput(
  action: AssetManagementAction,
  value: string,
): ChangeInput {
  switch (action.kind) {
    case "createFolder":
      return { body: { name: value } };
    case "renameFolder":
      return { params: { id: action.folder.id }, body: { name: value } };
    case "deleteFolder":
      return { params: { id: action.folder.id } };
    case "renameImage":
      return { params: { id: action.image.id }, body: { name: value } };
    case "deleteImage":
      return { body: { ids: [action.image.id] } };
    case "moveImage":
      return { body: { ids: [action.image.id], folderId: value || null } };
    case "importImage":
      return {
        body: {
          url: value,
          ...(action.folder ? { folderId: action.folder.id } : {}),
        },
      };
  }
}

/** Context-dependent admission follows the transport's public shape validation. */
export function admitAssetChange(
  action: AssetManagementAction,
  value: unknown,
) {
  switch (action.kind) {
    case "renameFolder":
      return parseNewsletterAssetFolderRename(value, {
        folderId: action.folder.id,
      }).ok;
    case "renameImage":
      return parseNewsletterAssetRename(value, { assetId: action.image.id }).ok;
    case "moveImage": {
      const reply = parseNewsletterAssetsMoved(value);
      return reply.ok && reply.value.moved === 1;
    }
    case "deleteImage": {
      const reply = parseNewsletterAssetsDeleted(value);
      return reply.ok && reply.value.deleted === 1;
    }
    default:
      return true; // The transport admits these shapes; there is no identity echo to bind.
  }
}
export function importedAsset(action: AssetManagementAction, value: unknown) {
  if (action.kind !== "importImage") return undefined;
  const item = parseNewsletterAssetItem(value);
  return item.ok ? item.value : undefined;
}
