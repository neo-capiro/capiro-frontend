import type {
  DocumentCreatedResponse,
  DocumentInspectionResponse,
} from "@capiro/meri-contracts/document-application";
import type { DocumentAttempt, DocumentProblem } from "./attempt-journal";
import type { FederalWorkbenchPort } from "./federal-workbench";
export type { DocumentProblem } from "./attempt-journal";
export type DocumentReply<T> =
  | { ok: true; value: T }
  | { ok: false; problem: DocumentProblem };
export type DocumentInspection =
  | DocumentCreatedResponse["inspection"]
  | Exclude<DocumentInspectionResponse, { kind: "native-file" }>["inspection"];
export type DocumentVersionView = Readonly<{
  handle: object;
  metadata: Readonly<{
    artifactId: string;
    versionId: string;
    parentVersionId: string | null;
    filename: string;
    mimeType: string;
    bytes: number;
    sha256: string;
    createdAt: string;
    format: "docx" | "txt" | "xlsx";
  }>;
  inspection: DocumentInspection;
}>;
export type DocumentDownloadView = Readonly<{
  version: DocumentVersionView;
  bytes: Uint8Array<ArrayBuffer>;
}>;

/** No credential, branded receipt or backend authority is exposed to the view. */
export interface DocumentWorkflowPort {
  readonly federal?: FederalWorkbenchPort;
  create(
    content: unknown,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>>;
  revise(
    handle: object,
    content: unknown,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>>;
  inspect(
    handle: object,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>>;
  inspectVersion(
    versionId: string,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>>;
  download(
    handle: object,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentDownloadView>>;
  snapshot(): DocumentAttempt;
  dispose(): void;
}
