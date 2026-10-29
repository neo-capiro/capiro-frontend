import type { QueryClient } from "@tanstack/react-query";
import { clientKey, clientsKey } from "@/features/portfolio/index/public";
import { filesKey } from "@/features/portfolio/files/public";

export async function refreshAppliedSurfaces(
  cache: QueryClient,
  clientId: string,
) {
  await Promise.all(
    [
      clientKey(clientId),
      clientsKey,
      filesKey(clientId),
      ["client-profile", clientId],
      ["advocacy", clientId],
      ["capabilities", clientId],
      ["capability-fit", clientId],
      ["client-people", clientId],
    ].map((queryKey) => cache.invalidateQueries({ queryKey })),
  );
}
