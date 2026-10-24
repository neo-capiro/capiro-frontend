import type { DocumentFilesState } from "./document-workflow-state";
import type { DocumentProblem } from "../../../shared/meri-documents/workflow-port";
import styles from "./files.module.css";

const messages: Record<DocumentProblem, string> = {
  "not-dispatched":
    "The request was not dispatched. Check the content and connection before choosing the action again.",
  unknown:
    "The write outcome is unknown. A version may have been created. Do not submit it again as a new delivery.",
  "result-withheld":
    "No result was released. This does not prove that the write did not happen.",
  "read-unavailable":
    "The current version could not be read. Previously displayed version actions and downloads have been removed.",
  "native-revision-unavailable":
    "This is a stored workspace file. It can be downloaded from the conversation, but it is not a generated document revision target.",
  "access-lost":
    "Current access is unavailable. Version actions and downloads have been removed. A new verified connection is required.",
  "invalid-response":
    "The response could not be verified. No result or download from that response is available.",
};

export function DocumentNotice({ state }: { state: DocumentFilesState }) {
  const blocked = state.writeBlocked || state.attempt.status !== "idle";
  return (
    <>
      <p role="status" className={styles.muted}>
        {state.busy
          ? `Document ${state.busy} request in progress.`
          : "Operations run only when you choose an action."}
      </p>
      {(state.problem || state.inputProblem) && (
        <div role="alert" className={styles.notice}>
          <p>{state.problem ? messages[state.problem] : state.inputProblem}</p>
          <p>No automatic retry runs from this view.</p>
        </div>
      )}
      {blocked && !state.busy && (
        <section
          className={styles.notice}
          aria-label="Unresolved document write"
        >
          <h2>Document writes are paused</h2>
          <p>
            An earlier write is pending or its outcome has not been resolved.
            Opening this page again or inspecting another version does not
            resolve that delivery.
          </p>
          <p>
            There is no delivery-recovery or version-discovery action in this
            view. Keep the original attempt reference for trusted support; do
            not create a replacement delivery.
          </p>
          {state.attempt.attemptId && (
            <p className={styles.identifier}>
              Attempt reference: {state.attempt.attemptId}
            </p>
          )}
        </section>
      )}
    </>
  );
}
