import { z } from "zod";
import { defineOperation } from "../contracts";
import { intelligenceDefenseOperations } from "./intelligence-defense";
import { intelligenceExplorerOperations } from "./intelligence-explorer";
import { intelligenceFundingOperations } from "./intelligence-funding";

/**
 * Canonical Bill 360 identifiers, as the backend stores and validates them
 * (`packages/shared/src/index.ts`: the `billId` federal pattern and `stateBillKey`).
 * A report link carries an identifier only, so it may name a federal bill
 * (`119-hr-1234`) or a state key (`tx-2025-hb1234`) — never a portfolio client.
 */
const FEDERAL_BILL_ID =
  /^[0-9]{2,3}-(?:hr|s|hjres|sjres|hconres|sconres|hres|sres)-[0-9]{1,5}$/;
const STATE_BILL_KEY = /^[a-z]{2}-[0-9]{4}(?:x[0-9]+)?-[a-z]+[0-9]+[a-z]?$/;

/**
 * Trim and case-normalize to the canonical textual form the backend compares with,
 * then require one of the two established shapes. Returns null for anything else —
 * other separators, encodings, query text, empty or over-long values — so no
 * unvalidated identifier can reach the transport.
 */
export function normalizeBillId(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (FEDERAL_BILL_ID.test(normalized) || STATE_BILL_KEY.test(normalized))
    return normalized;
  return null;
}

const billIdParam = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => normalizeBillId(value) === value, {
    message: "Expected a canonical federal bill id or state bill key.",
  });

/**
 * Minimal projection of the global factual dossier. Unknown keys are stripped, so the
 * view can only render official fields; no tracked state, notes, alerts or client
 * context is requested or accepted here.
 */
const billDossierResponse = z.object({
  bill: z.object({
    id: z.string().min(1),
    num: z.string().min(1),
    title: z.string().min(1),
    statusLabel: z.string().min(1),
    statusAt: z.string().nullish(),
    jurisdiction: z.string().nullish(),
    isState: z.boolean(),
    url: z.string().nullish(),
  }),
  latest: z.object({
    text: z.string().nullish(),
    date: z.string().nullish(),
  }),
  provenance: z.object({
    lastSyncedAt: z.string().nullish(),
    sourceCheckedAt: z.string().nullish(),
  }),
});

export const intelligenceOperations = {
  ...intelligenceExplorerOperations,
  ...intelligenceFundingOperations,
  ...intelligenceDefenseOperations,
  // The existing authenticated global dossier. The backend controller applies
  // TenantGuard and the bill_360 feature guard (404 when off), and the global route
  // returns public/official facts only.
  "intelligence.bills.dossier": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/bills/:billId/dossier",
    request: z.object({ params: z.object({ billId: billIdParam }).strict() }).strict(),
    response: billDossierResponse,
    source: "intel-api bill-dossier.controller.ts GET /intel-api/bills/:billId/dossier",
  }),
} as const;
