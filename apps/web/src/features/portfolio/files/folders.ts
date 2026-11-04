"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertFileReader, filesKey, useFileReader } from "./file-reader";

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a folder name.")
  .max(120);
export const folderListSchema = z.array(
  z.object({
    folder: folderNameSchema.nullable(),
    count: z.number().int().nonnegative(),
  }),
);
export const folderReceiptSchema = z.object({ folder: folderNameSchema });
export const folderKey = (clientId: string) =>
  [...filesKey(clientId), "folders"] as const;

export function useFileFolders(clientId: string) {
  const api = useApi(),
    cache = useQueryClient(),
    reader = useFileReader();
  return useQuery({
    queryKey: [
      ...folderKey(clientId),
      reader?.tenantId,
      reader?.userId,
      reader?.revision,
    ],
    enabled: Boolean(reader),
    retry: false,
    queryFn: async ({ signal }) => {
      assertFileReader(cache, reader);
      const result = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/files/folders`,
        folderListSchema,
        { signal },
      );
      assertFileReader(cache, reader);
      return result;
    },
  });
}
