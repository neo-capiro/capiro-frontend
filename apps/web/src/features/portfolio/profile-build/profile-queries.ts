"use client";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useProfileBuildAccess } from "./queries";
import { profileBuildKey, type ProfileSubject } from "./subject";
import { readProfile } from "./profile-api";

export function useProfileSnapshot(subject: ProfileSubject) {
  const api = useApi();
  const { canRead, identity } = useProfileBuildAccess();
  const query = useQuery({
    queryKey: [
      ...profileBuildKey(subject),
      "profile",
      identity.data?.tenant?.id,
      identity.data?.user.id,
    ],
    enabled: canRead,
    queryFn: ({ signal }) => readProfile(api, subject, signal),
  });
  return {
    ...query,
    data: canRead && query.isSuccess && !query.error ? query.data : undefined,
  };
}
