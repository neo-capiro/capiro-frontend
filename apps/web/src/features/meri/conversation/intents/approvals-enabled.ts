"use client";
import { createContext, useContext } from "react";

/**
 * Whether conversation approvals are enabled for this deployment, decided on the server from
 * MERI_INTENT_APPROVALS_WORKFLOW_ENABLED (readIntentsConfig). Off unless a page provides true, so
 * the approvals panel, its list request and its notice copy stay dark by default.
 */
export const IntentApprovalsEnabled = createContext(false);

export const useIntentApprovalsEnabled = () =>
  useContext(IntentApprovalsEnabled);
