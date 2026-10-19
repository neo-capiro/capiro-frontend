"use client";
import { z } from "zod";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileReadKey } from "./profile-keys";
import { programResponseSchema } from "../opportunities/public";

export const PROGRAM_CONTEXT_MIN_SCORE = 0.5;
export const PROGRAM_CONTEXT_PAGE_SIZE = 20;
export const PROGRAM_CONTEXT_CANDIDATE_CAP = 400;
const nativeProgram = programResponseSchema.shape.data.element;
const relevanceScore = nativeProgram.shape.score.finite();
const programPathSchema = nativeProgram.shape.paths.element.extend({
  path: z.enum([
    "capability_pe_direct",
    "capability_keyword",
    "prior_award",
    "facility_district",
    "ecosystem",
  ]),
  score: relevanceScore,
});
const programAssociationSchema = nativeProgram.extend({
  peCode: nativeProgram.shape.peCode.min(1),
  score: relevanceScore,
  paths: z.array(programPathSchema).min(1).max(5),
});
export const clientProgramPageSchema = programResponseSchema.extend({
  data: z.array(programAssociationSchema).max(PROGRAM_CONTEXT_PAGE_SIZE),
  total: programResponseSchema.shape.total.max(PROGRAM_CONTEXT_CANDIDATE_CAP),
  limit: programResponseSchema.shape.limit.max(100),
});
export type ClientProgramPage = z.infer<typeof clientProgramPageSchema>;
export type ProgramAssociation = ClientProgramPage["data"][number];

export const programPathLabels = {
  capability_pe_direct: "Capability lists this PE",
  capability_keyword: "Capability keyword match",
  prior_award: "Prior award match",
  facility_district: "Facility district overlap",
  ecosystem: "Ecosystem association",
} satisfies Record<ProgramAssociation["paths"][number]["path"], string>;

export function programReasonText(value: string) {
  return value.length > 300 ? `${value.slice(0, 300)}… (truncated)` : value;
}

export function assertClientProgramPage(
  value: ClientProgramPage,
  page: number,
) {
  const expected = Math.min(
    PROGRAM_CONTEXT_PAGE_SIZE,
    Math.max(0, value.total - (page - 1) * PROGRAM_CONTEXT_PAGE_SIZE),
  );
  if (
    value.page !== page ||
    value.limit !== PROGRAM_CONTEXT_PAGE_SIZE ||
    value.data.length !== expected ||
    new Set(value.data.map((row) => row.peCode)).size !== value.data.length ||
    value.data.some((row) => row.score < PROGRAM_CONTEXT_MIN_SCORE)
  )
    throw new ApiError(502, "The program context page could not be verified.");
  return value;
}

export async function readClientProgramPage(
  api: ApiClient,
  cache: QueryClient,
  actor: ProfileActor,
  clientId: string,
  page: number,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  assertProfileActor(cache, actor);
  const value = await api.request(
    "core",
    `intelligence/clients/${encodeURIComponent(clientId)}/pe-relevance?minScore=${PROGRAM_CONTEXT_MIN_SCORE}&page=${page}&limit=${PROGRAM_CONTEXT_PAGE_SIZE}`,
    clientProgramPageSchema,
    { signal },
  );
  signal.throwIfAborted();
  assertProfileActor(cache, actor);
  return assertClientProgramPage(value, page);
}

export function useClientProgramContext(
  clientId: string,
  enabled: boolean,
  page: number,
  actor?: ProfileActor,
) {
  const api = useApi();
  const cache = useQueryClient();
  const current = enabled && Boolean(actor) && Boolean(clientId);
  const query = useQuery({
    queryKey: [
      ...profileReadKey(clientId, "program-context", actor),
      PROGRAM_CONTEXT_MIN_SCORE,
      PROGRAM_CONTEXT_PAGE_SIZE,
      page,
    ],
    enabled: current,
    retry: false,
    queryFn: ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      return readClientProgramPage(api, cache, actor, clientId, page, signal);
    },
  });
  return {
    ...query,
    enabled: current,
    data: current && query.isSuccess && !query.error ? query.data : undefined,
  };
}
