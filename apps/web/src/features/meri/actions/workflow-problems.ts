import type { WorkflowProblem } from "./action-workflow-port.ts";

/** Content-free adapter dispositions map to fixed UI copy; raw exceptions stay private. */
export const workflowProblems: Readonly<
  Record<
    WorkflowProblem,
    Readonly<{
      title: string;
      description: string;
    }>
  >
> = Object.freeze({
  "not-dispatched": {
    title: "Request not dispatched",
    description:
      "The service did not dispatch this request. No retry has been sent.",
  },
  unknown: {
    title: "Outcome uncertain",
    description:
      "The service outcome is not confirmed. A record or effect may exist. Reconcile the request with the service before attempting it again.",
  },
  "result-withheld": {
    title: "Result not released",
    description:
      "A result was acknowledged but is unavailable here. This does not mean the action was rolled back or can be repeated.",
  },
  "stored-withheld": {
    title: "Record stored; result not released",
    description:
      "The service reports a retained record, but cannot release it. No retry has been sent; this view cannot establish a task outcome.",
  },
  "not-stored": {
    title: "Metadata was not stored",
    description:
      "This disposition concerns the metadata insertion only. It does not establish the outcome of other work. No retry has been sent.",
  },
  "read-unavailable": {
    title: "Current result unavailable",
    description:
      "The retained record could not be read. This does not prove that no record or effect exists. No retry has been sent.",
  },
  "access-lost": {
    title: "Current access unavailable",
    description:
      "Former recommendations, drafts and proposals have been removed. Restore an authorized session before starting a new workflow.",
  },
  "invalid-response": {
    title: "Response could not be verified",
    description:
      "No result can be accepted from this response. Its record or effect may exist; check the service before repeating the request.",
  },
});
