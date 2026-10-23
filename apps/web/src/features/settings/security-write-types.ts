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

/** Scoped persistence and cache ownership, independent of dispatch and receipt rules. */
export type SettingsWriteJournal = {
  scopeKey: string;
  current(): SettingsWrite | undefined;
  record(write: SettingsWrite): void;
  persist(write: SettingsWrite, input: unknown): Promise<void>;
  clear(write: SettingsWrite): void;
  markUnknown(write: SettingsWrite): void;
};
