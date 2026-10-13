import type { AttemptGuard } from "./attempt-journal";
import type { CapiroApi, TeamInviteRole } from "./capiro-api";
export type InviteIntent = { email: string; role: TeamInviteRole };
export type InviteOutcome = InviteIntent & {
  status: "unattempted" | "unknown" | "confirmed";
  invitationId?: string;
};

/** Stop after any unconfirmed row; each acknowledgement remains independently visible. */
export async function sendReviewedInvitations(
  rows: InviteIntent[],
  invite: CapiroApi["inviteTeamMember"],
  guard: AttemptGuard,
  save: (outcomes: InviteOutcome[]) => void,
) {
  let current: InviteOutcome[] = rows.map((row) => ({
    ...row,
    status: "unattempted",
  }));
  save(current);
  for (let index = 0; index < rows.length; index += 1) {
    guard.assertCurrent();
    current = current.map((row, i) =>
      i === index ? { ...row, status: "unknown" } : row,
    );
    save(current);
    const result = await guard.wait(() => invite(rows[index]!));
    current = current.map((row, i) =>
      i === index
        ? { ...row, status: "confirmed", invitationId: result.invitation.id }
        : row,
    );
    save(current);
  }
  return current;
}
