import type { ApiClient } from "@/shared/portfolio/api/http";
import { profileBuildPath, sameSubject, type ProfileSubject } from "./subject";
import {
  profileSnapshotSchema,
  type PersonProfileInput,
} from "./fact-contracts";

export function readProfile(
  api: ApiClient,
  subject: ProfileSubject,
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `${profileBuildPath(subject)}/profile`,
    profileSnapshotSchema.refine(
      (value) => sameSubject(value.subject, subject),
      "Profile subject mismatch",
    ),
    { signal },
  );
}
export function savePersonProfile(
  api: ApiClient,
  subject: ProfileSubject,
  input: PersonProfileInput & { requestId: string; expectedVersion: string },
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `${profileBuildPath(subject)}/profile`,
    profileSnapshotSchema.refine(
      (value) => sameSubject(value.subject, subject),
      "Profile subject mismatch",
    ),
    { method: "PUT", body: input, signal },
  );
}
export function resolveFactConflict(
  api: ApiClient,
  subject: ProfileSubject,
  factId: string,
  command: {
    requestId: string;
    expectedVersion: number;
    resolution: "keep_current" | "accept_proposed";
  },
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `${profileBuildPath(subject)}/facts/${encodeURIComponent(factId)}/resolve`,
    profileSnapshotSchema.refine(
      (value) => sameSubject(value.subject, subject),
      "Profile subject mismatch",
    ),
    { method: "POST", body: command, signal },
  );
}

export function confirmProfileIdentity(
  api: ApiClient,
  subject: ProfileSubject,
  command: {
    requestId: string;
    expectedVersion: string;
    canonicalEntityId: string;
  },
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `${profileBuildPath(subject)}/identity/confirm`,
    profileSnapshotSchema.refine(
      (value) => sameSubject(value.subject, subject),
      "Profile subject mismatch",
    ),
    { method: "POST", body: command, signal },
  );
}
