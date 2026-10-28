import { z } from "zod";
import { signedUrl } from "./contracts";

const uuid = z.uuid();
const historyLink = z.string().refine((value) => Boolean(signedUrl(value)));
const version = z.object({
  attachmentId: uuid,
  versionIndex: z.number().int().positive(),
  isOriginal: z.boolean(),
  isCurrent: z.boolean(),
  fileName: z.string(),
  contentType: z.string(),
  byteSize: z.number().int().nonnegative().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  folder: z.string().nullable(),
  uploadedByUserId: z.string().nullable(),
  uploadedByName: z.string().nullable(),
  source: z.string(),
  sourceEntityType: z.string().nullable(),
  sourceEntityId: z.string().nullable(),
  contentHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  lifecycleStatus: z.string(),
  scanStatus: z.string().nullable(),
  usable: z.boolean(),
  // Older metadata-only Core responses deliberately expose no navigation.
  downloadUrl: historyLink.nullable().optional().default(null),
  previewUrl: historyLink.nullable().optional().default(null),
  blockedReason: z.string().optional(),
  scanDisclosure: z.string().optional(),
  supersededByAttachmentId: uuid.nullable(),
});
const page = z.object({
  attachmentId: uuid,
  originalId: uuid,
  headId: uuid,
  versionCount: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextCursor: z.string().min(1).max(2048).nullable(),
  versions: z.array(version).min(1).max(50),
});
export type FileHistoryPage = z.infer<typeof page>;
export type FileHistoryRequest = {
  attachmentId: string;
  cursor: string | null;
  offset: number;
  previous?: Pick<FileHistoryPage, "originalId" | "headId" | "versionCount">;
};
export const historyPageSize = 20;

/** Core attachment row identities remain distinct from generated artifact or S3 versions. */
export function fileHistorySchema(request: FileHistoryRequest) {
  return page.refine((value) => {
    const end = value.offset + value.versions.length;
    return (
      value.attachmentId === request.attachmentId &&
      value.offset === request.offset &&
      value.pageSize === historyPageSize &&
      end <= value.versionCount &&
      value.versions.length ===
        Math.min(historyPageSize, value.versionCount - value.offset) &&
      value.hasMore === end < value.versionCount &&
      (value.nextCursor !== null) === value.hasMore &&
      (value.nextCursor === null || value.nextCursor !== request.cursor) &&
      (!request.previous ||
        (value.headId === request.previous.headId &&
          value.originalId === request.previous.originalId &&
          value.versionCount === request.previous.versionCount)) &&
      new Set(value.versions.map((item) => item.attachmentId)).size ===
        value.versions.length &&
      value.versions.every((item, index) => {
        const ordinal = value.offset + index + 1;
        return (
          item.versionIndex === ordinal &&
          item.isOriginal === (ordinal === 1) &&
          item.isCurrent === (ordinal === value.versionCount) &&
          (item.attachmentId === value.originalId) === item.isOriginal &&
          (item.attachmentId === value.headId) === item.isCurrent &&
          (item.supersededByAttachmentId === null) === item.isCurrent &&
          (index + 1 === value.versions.length ||
            item.supersededByAttachmentId ===
              value.versions[index + 1]?.attachmentId)
        );
      })
    );
  }, "The file history no longer matches the requested version chain.");
}
