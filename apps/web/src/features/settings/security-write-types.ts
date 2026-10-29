type Row = Record<string, unknown>;
export type SettingsWrite = {
  operation: string;
  attemptId: string;
  input: { params?: Row; body?: Row };
  state: "pending" | "unknown";
  expectedInvitation?: { email: string; role: string };
  expectedInvitationHash?: string;
  expectedAccount?: { userId: string; tenantId: string };
  requestHash?: string;
  resultHash?: string;
  inputFields?: string[];
  receiptId?: string;
  acceptedResult?: boolean;
  startedAt: string;
};
