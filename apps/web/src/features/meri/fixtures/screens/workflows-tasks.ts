import type {
  TaskDraftView,
  TaskReviewView,
} from "../../screens/workflows/CommitmentTaskScreens";
import type {
  TaskReceiptView,
  TaskRecordView,
} from "../../screens/workflows/TaskReceiptScreens";
import { fixtureHref } from "./href";

const title = "Confirm funding language";
const client = "Anduril · CLIENT-104";
const evidence = "THREAD-028 · v2 · 8 Oct 2026 · Authorized mailbox";
const requestKey = "TASKREQ-DEMO-028-v2";
const created = "10 Oct 2026, 11:04 AM EDT";

export const taskDraft: TaskDraftView = {
  title,
  client,
  owner: "Unknown",
  due: "Not stated",
  evidence,
  reviewHref: fixtureHref("task-review-source-action"),
  cancelHref: fixtureHref("commitments-deliverables"),
};

export const taskReview: TaskReviewView = {
  payload: [
    { label: "Proposal", value: "TP-DEMO-2048" },
    { label: "Client / scope", value: client },
    { label: "Title", value: title },
    { label: "Owner · optional", value: "Unknown" },
    { label: "Due date · optional", value: "Not stated" },
    { label: "Source revision", value: evidence },
    { label: "Request key", value: requestKey },
  ],
  editHref: fixtureHref("task-draft-commitment"),
  cancelHref: fixtureHref("commitments-deliverables"),
};

export const taskReceipt: TaskReceiptView = {
  proposal: { label: "Proposal", value: "TP-DEMO-2048" },
  receipt: [
    { label: "Canonical task ID", value: "TASK-DEMO-2081" },
    { label: "Source issued at", value: created },
    { label: "Request key", value: requestKey },
  ],
  task: [
    { label: "Title", value: title },
    { label: "Client", value: client },
    { label: "Owner", value: "Unknown" },
    { label: "Due date", value: "Not stated" },
    { label: "Evidence", value: evidence },
  ],
  canonicalHref: fixtureHref("task-canonical-record"),
  doneHref: fixtureHref("commitments-deliverables"),
};

export const taskRecord: TaskRecordView = {
  record: [
    { label: "Canonical ID", value: "TASK-DEMO-2081" },
    { label: "Title", value: title },
    { label: "Client", value: client },
    { label: "Owner", value: "Unknown" },
    { label: "Due date", value: "Not stated" },
    { label: "Evidence", value: evidence },
    { label: "Created", value: created },
  ],
  status: "Status · Open",
  doneHref: fixtureHref("commitments-deliverables"),
};
