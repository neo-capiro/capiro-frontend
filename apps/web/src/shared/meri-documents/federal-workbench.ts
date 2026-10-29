import {
  receiveFederalRequest,
  receiveFederalSource,
  type AdmittedFederalReview,
  type FederalCompilerSource,
  type FederalSelection,
  type FederalPublication,
} from "@capiro/meri-contracts/federal-workbench";
import type { ActionSessionReceipt } from "../meri-actions/session-receipt";
import type { DocumentAttemptJournal } from "./attempt-journal";
import type { DocumentLibraryAccess } from "./library-access";
import type { federalTransport } from "./workflow-transport";

export type FederalSourceView = Readonly<{
  versionId: string;
  sha256: string;
  source: Readonly<FederalCompilerSource>;
}>;
type Output = FederalPublication["output"];
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
export async function federalTextHash(text: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
type Options = {
  library: DocumentLibraryAccess;
  transport: ReturnType<typeof federalTransport>;
  session: Pick<ActionSessionReceipt, "context" | "expiresAtMs">;
  journal: DocumentAttemptJournal;
  isCurrent?: () => boolean;
  onAccessLost: () => void;
};
export interface FederalWorkbenchPort {
  readonly library: DocumentLibraryAccess;
  source(versionId: string, signal: AbortSignal): Promise<FederalSourceView>;
  prepare(
    selection: FederalSelection,
    signal: AbortSignal,
    base?: AdmittedFederalReview,
  ): Promise<AdmittedFederalReview>;
  load(
    versionId: string,
    sha256: string,
    signal: AbortSignal,
  ): Promise<AdmittedFederalReview>;
  publish(
    review: AdmittedFederalReview,
    output: Output,
    signal: AbortSignal,
  ): Promise<FederalPublication>;
  unresolved(): boolean;
  dispose(): void;
}
/** Uses the existing document attempt journal. Only fingerprints/IDs enter that
 * journal; review/source content stays in the mounted view and immutable artifacts. */
export class FederalWorkbenchAccess implements FederalWorkbenchPort {
  readonly library: DocumentLibraryAccess;
  private readonly lifetime = new AbortController();
  private busy = false;
  private bases = new WeakMap<
    AdmittedFederalReview,
    { versionId: string; revisionSha256: string }
  >();
  constructor(private readonly options: Options) {
    this.library = options.library;
  }
  dispose() {
    this.lifetime.abort();
    this.library.dispose();
  }
  unresolved() {
    return this.options.journal.read().status !== "idle";
  }
  private current(signal: AbortSignal) {
    signal.throwIfAborted();
    this.lifetime.signal.throwIfAborted();
    if (
      Date.now() >= this.options.session.expiresAtMs ||
      this.options.isCurrent?.() === false
    ) {
      this.options.onAccessLost();
      throw new Error("The document connection is no longer current.");
    }
  }
  private version(
    value: FederalPublication["publication"]["version"],
    published = false,
  ) {
    const context = this.options.session.context;
    if (
      value.binding.tenantId !== context.tenantId ||
      value.binding.actorId !== context.actorId ||
      value.binding.conversationId !== context.conversationId ||
      (published && value.binding.runId !== context.runId) ||
      !value.scopes.every(
        (scope) =>
          scope.tenantId === context.tenantId &&
          scope.kind === "client" &&
          scope.resourceId === context.selectedClientId,
      )
    ) {
      this.options.onAccessLost();
      throw new Error("The document account changed.");
    }
  }
  async source(versionId: string, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    this.current(signal);
    const inspected = await this.library.inspect(versionId, signal);
    if (
      !inspected.ok ||
      inspected.value.kind !== "generated" ||
      !inspected.value.mimeType.startsWith("text/plain")
    )
      throw new Error("Choose a retained TXT source envelope.");
    const file = await this.library.download(versionId, signal);
    this.current(signal);
    if (!file.ok) throw new Error("The source could not be read.");
    const source = await receiveFederalSource(file.value.bytes);
    this.current(signal);
    return { versionId, sha256: inspected.value.objectSha256, source };
  }
  async prepare(
    selection: FederalSelection,
    caller: AbortSignal,
    base?: AdmittedFederalReview,
  ) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    this.current(signal);
    const request = receiveFederalRequest(
      "federal-prepare",
      encode({ selection }),
    );
    const { value } = await this.options.transport(
      "federal-prepare",
      request,
      signal,
    );
    this.current(signal);
    if ("error" in value)
      throw new Error("The exact source or amendment could not be prepared.");
    if (base?.savedDraft)
      this.bases.set(value, {
        versionId: base.savedDraft.versionId,
        revisionSha256: base.prepared.revisionSha256,
      });
    return value;
  }
  async load(versionId: string, sha256: string, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    this.current(signal);
    const request = receiveFederalRequest(
      "federal-load",
      encode({ versionId, expectedArtifactSha256: sha256 }),
    );
    const { value } = await this.options.transport(
      "federal-load",
      request,
      signal,
    );
    this.current(signal);
    if ("error" in value || !value.savedDraft)
      throw new Error("The saved review is unavailable or changed.");
    this.version(value.savedDraft);
    return value;
  }
  async publish(
    review: AdmittedFederalReview,
    output: Output,
    caller: AbortSignal,
  ) {
    if (this.busy) throw new Error("A file operation is already in progress.");
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    this.current(signal);
    const base =
      this.bases.get(review) ??
      (review.savedDraft
        ? {
            versionId: review.savedDraft.versionId,
            revisionSha256: review.prepared.revisionSha256,
          }
        : null);
    const input = {
      selection: review.selection,
      revisionSha256: review.prepared.revisionSha256,
      output,
      baseVersionId: output === "draft" ? (base?.versionId ?? null) : null,
      baseRevisionSha256:
        output === "draft" ? (base?.revisionSha256 ?? null) : null,
    };
    const fingerprint = await federalTextHash(
      JSON.stringify({ route: "federal-publish", ...input }),
    );
    this.current(signal);
    const prior = this.options.journal.read();
    if (
      prior.status === "pending" ||
      (prior.status === "unresolved" &&
        (prior.fingerprints.at(-1) !== fingerprint || !prior.attemptId))
    )
      throw new Error(
        "Recover the original file operation before starting a different one.",
      );
    if (prior.status === "idle" && prior.fingerprints.includes(fingerprint))
      throw new Error(
        "This exact export has already been submitted. Open it in the file library.",
      );
    const deliveryId =
      prior.status === "unresolved" ? prior.attemptId! : crypto.randomUUID();
    const request = receiveFederalRequest(
      "federal-publish",
      encode({ ...input, deliveryId }),
    );
    const fingerprints =
      prior.status === "unresolved"
        ? prior.fingerprints
        : [...prior.fingerprints, fingerprint];
    if (fingerprints.length > 256)
      throw new Error(
        "Open a new document connection before creating more files.",
      );
    this.busy = true;
    this.options.journal.write({
      status: "pending",
      attemptId: deliveryId,
      fingerprints,
    });
    try {
      const { status, value } = await this.options.transport(
        "federal-publish",
        request,
        signal,
        review,
      );
      this.current(signal);
      if ("error" in value) {
        const definite = value.error.outcome === "NOT_DISPATCHED";
        this.options.journal.write({
          status: definite ? "idle" : "unresolved",
          attemptId: deliveryId,
          fingerprints: definite ? prior.fingerprints : fingerprints,
          problem: definite
            ? "not-dispatched"
            : value.error.outcome === "RESULT_NOT_RELEASED"
              ? "result-withheld"
              : "unknown",
        });
        if (status === 401 || status === 403) this.options.onAccessLost();
        throw new Error(
          definite
            ? "The export was not dispatched."
            : "The original export needs recovery. Keep this revision selected.",
        );
      }
      this.version(value.publication.version, true);
      this.options.journal.write({ status: "idle", fingerprints });
      return value;
    } catch (error) {
      if (this.options.journal.read().status === "pending")
        this.options.journal.write({
          status: "unresolved",
          attemptId: deliveryId,
          fingerprints,
          problem: "unknown",
        });
      throw error;
    } finally {
      this.busy = false;
    }
  }
}
