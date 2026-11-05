import { profileBuildKey, type ProfileSubject } from "./subject";
import type { QueryClient } from "@tanstack/react-query";
import { clientKey, clientsKey } from "@/features/portfolio/index/public";
import { filesKey } from "@/features/portfolio/files/public";

export async function refreshAppliedSurfaces(
  cache: QueryClient,
  subject: ProfileSubject,
) {
  await Promise.all(
    [
      profileBuildKey(subject),
      ...(subject.kind === "prospect"
        ? [
            ["prospect", subject.id],
            ["prospects"],
            ["prospect-history", subject.id],
            ["prospect-files", subject.id],
          ]
        : [
            clientKey(subject.id),
            clientsKey,
            filesKey(subject.id),
            ["client-profile", subject.id],
            ["advocacy", subject.id],
            ["capabilities", subject.id],
            ["capability-fit", subject.id],
            ["client-people", subject.id],
            ["portfolio-depth", "client", subject.id],
            ["capability-discovery", "client", subject.id],
            ["capability-tracking", "client", subject.id],
            ["client-targets", subject.id],
          ]),
    ].map((queryKey) => cache.invalidateQueries({ queryKey })),
  );
}
