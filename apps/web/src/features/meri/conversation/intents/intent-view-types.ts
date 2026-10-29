import type { IntentsProposal } from "@capiro/meri-client/intents";
export type IntentTone = "neutral" | "success" | "warning" | "danger";
/** What the person may do with a row: decide it, only read it (held), or nothing (closed). */
export type IntentDecision = "approvable" | "held" | "closed";
export type IntentField = Readonly<{ label: string; value: string }>;
export type IntentRow = Readonly<{
  deliveryId: string;
  createdAt: string;
  title: string;
  status: string;
  tone: IntentTone;
  detail: string;
  decision: IntentDecision;
  /** Present only for a visible command proposal; the exact content the server retained. */
  proposal: IntentsProposal | null;
  fields: readonly IntentField[];
  /** The owner's observed result, including submission and current memory review state. */
  result: readonly IntentField[];
  task?: Readonly<{ id: string; clientId: string | null }>;
  /** Saved Client Files attachments, distinct from Meri artifact or version IDs. */
  fileLinks?: readonly Readonly<{
    clientId: string;
    documentId: string;
    fileName: string;
  }>[];
  researchDraft?: Readonly<{ artifactId: string; portfolioId: string }>;
}>;
export type Viewer = Readonly<{ tenantId: string; actorId: string }>;
