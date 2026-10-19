import { useOnboardAttempt } from "./use-onboard-attempt";
import { useLocalOnboardRecord } from "./use-local-record";
import {
  sendReviewedInvitations,
  type InviteIntent,
  type InviteOutcome,
} from "./invite-sequence";
import type { CapiroApi } from "./capiro-api";

export function useTeamInvites(api: CapiroApi) {
  const attempt = useOnboardAttempt(api, "team-invitations");
  const [outcomes, save] = useLocalOnboardRecord<InviteOutcome[]>(
    "team-invitation-receipts",
  );
  const run = (rows: InviteIntent[]) =>
    attempt.run(`Invite ${rows.length} reviewed team members`, (guard) =>
      sendReviewedInvitations(rows, api.inviteTeamMember, guard, save),
    );
  return { ...attempt, outcomes, run };
}
