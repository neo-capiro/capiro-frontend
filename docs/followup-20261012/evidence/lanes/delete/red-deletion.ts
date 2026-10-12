import type { QueryClient } from "@tanstack/react-query";
import { acknowledged, type ApiClient } from "@/shared/portfolio/api/http";
import type { FileExecution } from "./file-scope";

export type FileDeletionContext = {
  cache: QueryClient;
  clientId: string;
  execution: FileExecution;
};

export function deleteClientFile(
  api: ApiClient,
  id: string,
  _context?: FileDeletionContext,
) {
  return api.request("core", `engagement/attachments/${id}`, acknowledged, {
    method: "DELETE",
  });
}
