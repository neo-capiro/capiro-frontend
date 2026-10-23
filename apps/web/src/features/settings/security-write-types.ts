type Row = Record<string, unknown>;

/** Recovery identity shared by receipt validation and read-only reconciliation. */
export type SettingsWrite = {
  operation: string;
  attemptId: string;
  input: { params?: Row; body?: Row };
  state: "pending" | "unknown";
  expectedInvitation?: { email: string; role: string };
  receiptId?: string;
  acceptedResult?: boolean;
  startedAt: string;
  subjectId?: string;
  scopeHash?: string;
  receiptConfirmed?: boolean;
  projection?: { keys: string[]; hash: string };
};
