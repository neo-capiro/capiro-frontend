import type {
  RoutinesErrorResponse,
  RoutinesExpectationMap,
  RoutinesRequestMap,
  RoutinesResponse,
} from "@capiro/meri-contracts/routines-application";

/**
 * SOURCE-STAGE view of the unpublished Routines 0.2 additions (MR-04 consent observation and renewal).
 *
 * The installed `@capiro/meri-contracts@0.1.26` is immutable until the new cohort: it has no observation opt-in, no
 * facet and neither renewal route. The frontend therefore carries the exact published shapes here and proves them
 * against the source-stage receiver in qualification. Nothing here grants authority: a browser cannot mint an approval,
 * a limit, a decided instant or an expiry, and every field below is either a request member or a displayed answer.
 */

/** The ONE bounded opt-in field. Absent, the list answer is the exact legacy shape. */
export const consentObservation = "consent" as const;

/** The two renewal routes this stage adds to the published routines family. */
export const routineConsentPaths = Object.freeze({
  consentReview: "/api/routines/consent/review",
  consentApprove: "/api/routines/consent/approve",
} as const);
export type RoutinesConsentRoute = keyof typeof routineConsentPaths;

export type RoutinesConsentState =
  | "active"
  | "expired"
  | "revoked"
  | "absent"
  | "unknown";

/** Core's own observation of one row's stored read consent, exactly as published. */
export type RoutinesConsentObservation = Readonly<{
  state: RoutinesConsentState;
  pinsMatched: boolean;
  stale: boolean;
  observedAtMs: number | null;
  generation: number;
  consentGeneration: number | null;
  issuedAtMs: number | null;
  expiresAtMs: number | null;
  scopeCount: number | null;
  cause: "revocation" | "membership" | "client-scope" | null;
  rightsSha256: string | null;
}>;

/** The published list request plus the one source-stage opt-in. It is optional exactly as the canonical request is:
 *  absent, the answer is the legacy shape; present, every row carries its observation. */
export type RoutinesConsentListRequest = RoutinesRequestMap["list"] &
  Readonly<{ observation?: typeof consentObservation }>;

export type RoutinesConsentReviewRequest = Readonly<{ scheduleId: string }>;
export type RoutinesRenewalLimits = Readonly<{
  maxCostMicrousd: number;
  maxRuntimeSeconds: number;
  retryLimit: number;
}>;
/** Only the members the renewal review displays; the answer itself is admitted by the canonical receiver. The stored
 *  intent carries the instruction's DIGEST, never its text: the review shows the owner exactly what is recorded. */
export type RoutinesRenewalIntent = Readonly<{
  intentId: string;
  operation: string;
  generation: number;
  taskInstructionSha256: string;
  projection: Readonly<{
    scheduleId: string;
    state: string;
    destinationId: string;
    timezone: string;
    createdAt: string;
    maxCostMicrousd: number;
    maxRuntimeSeconds: number;
    retryLimit: number;
    scopes: readonly unknown[];
  }>;
}>;
export type RoutinesConsentReviewResponse = Readonly<{
  status: "review_required";
  scheduleId: string;
  generation: number;
  intentSha256: string;
  projectionSha256: string;
  scopesSha256: string;
  limits: RoutinesRenewalLimits;
  intent: RoutinesRenewalIntent;
  consent: RoutinesConsentObservation | null;
  reviewSha256: string;
}>;
export type RoutinesConsentApproveRequest = Readonly<{
  scheduleId: string;
  reviewSha256: string;
  /** Stable, clock-free decision identity: the same id is re-presented for every attempt of this exact review. */
  requestId: string;
  decision: "approved";
}>;
export type RoutinesConsentApproveResponse = Readonly<{
  status: "renewed";
  state: "active" | "expired";
  generation: number;
  policyRevision: string;
  issuedAtMs: number;
  expiresAtMs: number;
  observedAtMs: number;
  idempotent: boolean;
}>;

export interface RoutinesConsentRequestMap {
  consentReview: RoutinesConsentReviewRequest;
  consentApprove: RoutinesConsentApproveRequest;
}
export interface RoutinesConsentExpectationMap {
  consentReview: { request: RoutinesConsentReviewRequest };
  /** A decision is admitted only against the exact review it was shown. */
  consentApprove: {
    request: RoutinesConsentApproveRequest;
    review: RoutinesConsentReviewResponse;
  };
}
export interface RoutinesConsentResponseMap {
  consentReview: RoutinesConsentReviewResponse;
  consentApprove: RoutinesConsentApproveResponse;
}
export type RoutinesConsentResponse<R extends RoutinesConsentRoute> =
  | RoutinesConsentResponseMap[R]
  | RoutinesErrorResponse;

/** The exchange generics of the published family, widened by exactly the two source-stage routes. */
export type RoutineRouteName =
  | keyof RoutinesRequestMap
  | RoutinesConsentRoute;
export type RoutineRequestOf<R extends RoutineRouteName> = R extends "list"
  ? RoutinesConsentListRequest
  : R extends keyof RoutinesRequestMap
    ? RoutinesRequestMap[R]
    : R extends RoutinesConsentRoute
      ? RoutinesConsentRequestMap[R]
      : never;
export type RoutineExpectationOf<R extends RoutineRouteName> =
  R extends keyof RoutinesExpectationMap
    ? RoutinesExpectationMap[R]
    : R extends RoutinesConsentRoute
      ? RoutinesConsentExpectationMap[R]
      : never;
export type RoutineResponseOf<R extends RoutineRouteName> =
  R extends keyof RoutinesRequestMap
    ? RoutinesResponse<R>
    : R extends RoutinesConsentRoute
      ? RoutinesConsentResponse<R>
      : never;
