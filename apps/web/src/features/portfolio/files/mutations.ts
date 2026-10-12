"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { acknowledged } from "@/shared/portfolio/api/http";
import { fileChangeForIdSchema } from "./contracts";
import { filesKey } from "./queries";
export type FileChange =
  | { kind: "move"; id: string; folder: string | null }
  | { kind: "delete"; id: string }
  | {
      kind: "access";
      id: string;
      viewerMode: "all" | "restricted";
      viewerUserIds: string[];
    }
  | {
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
      if (change.kind === "delete")
        return api.request(
          "core",
          `engagement/attachments/${change.id}`,
          acknowledged,
          { method: "DELETE" },
        );
      if (change.kind === "move")
        return api.request(
          "core",
          `${base}/${change.id}/folder`,
          fileChangeForIdSchema(change.id),
          { method: "PATCH", body: { folder: change.folder } },
        );
      const body = {
        viewerMode: change.viewerMode,
        viewerUserIds: change.viewerUserIds,
      };
      return change.kind === "access"
        ? api.request(
            "core",
            `${base}/${change.id}/access`,
            fileChangeForIdSchema(change.id),
            { method: "PATCH", body },
          )
        : api.request(
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
