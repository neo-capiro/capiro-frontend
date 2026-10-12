"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { filesKey } from "./queries";
export type FileChange = {
  kind: "folder-access";
  folder: string | null;
  viewerMode: "all" | "restricted";
  viewerUserIds: string[];
};
export function useFileChange(clientId: string, onSaved?: () => void) {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (change: FileChange) => {
      const base = `clients/${clientId}/files`;
      const body = {
        viewerMode: change.viewerMode,
        viewerUserIds: change.viewerUserIds,
      };
      return api.request(
        "core",
        `${base}/access/folder`,
        z.object({ updated: z.number() }),
        { method: "PATCH", body: { ...body, folder: change.folder } },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: filesKey(clientId) }),
        cache.invalidateQueries({ queryKey: ["file-access", clientId] }),
      ]);
      onSaved?.();
    },
  });
}
export { useExtractFile } from "./extraction";
