"use client";
import { useQuery } from "@tanstack/react-query";
import { researchFilesSchema } from "./research-contracts";
import { useApi } from "@/shared/portfolio/api/provider";
import { profileBuildKey, type ProfileSubject } from "./subject";
import { useProfileBuildAccess } from "./queries";

export function useResearchFiles(subject: ProfileSubject) {
  const api = useApi();
  const { canRead, identity } = useProfileBuildAccess();
  const query = useQuery({
    queryKey: [
      ...profileBuildKey(subject),
      "documents",
      identity.data?.tenant?.id,
      identity.data?.user.id,
    ],
    enabled: canRead,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `engagement/attachments?${new URLSearchParams({ [subject.kind === "client" ? "clientId" : "prospectId"]: subject.id })}`,
        researchFilesSchema(subject, identity.data?.tenant?.id),
        { signal },
      ),
  });
  return {
    ...query,
    data: canRead && query.isSuccess && !query.error ? query.data : undefined,
  };
}
