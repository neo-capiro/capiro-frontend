import { Btn, Icon, Spinner, TextInput } from "../../ui/primitives";
import { ErrorText } from "../funnel/shared";
import { type SetupState } from "../../lib/setup";
import { TaskCard } from "./ExtShell";
import type { SetupActions } from "./useSetupActions";
type Props = Pick<
  SetupActions,
  | "inviteWrite"
  | "latestSentInvite"
  | "newIt"
  | "setNewIt"
  | "addingAnother"
  | "setAddingAnother"
  | "sendingInvite"
  | "resending"
  | "itError"
  | "sendItInvite"
  | "resendItInvite"
> & { status: SetupState["tasks"]["it_email"] };
export function EmailSetupTask({
  status,
  inviteWrite,
  latestSentInvite,
  newIt,
  setNewIt,
  addingAnother,
  setAddingAnother,
  sendingInvite,
  resending,
  itError,
  sendItInvite,
  resendItInvite,
}: Props) {
  const itInviteInput = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <TextInput
          disabled={inviteWrite.locked}
          placeholder="it-admin@yourfirm.com"
          value={newIt}
          onChange={(e) => setNewIt(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Btn
          variant="primary"
          size="sm"
          disabled={!newIt.includes("@") || sendingInvite || inviteWrite.locked}
          onClick={() => void sendItInvite()}
          style={{ alignSelf: "center" }}
        >
          {sendingInvite ? "Sending…" : "Send Invite"}
        </Btn>
      </div>
      <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
        IT Admin will receive an email with instructions. You can add multiple
        contacts.
      </span>
      {itError && <ErrorText style={{ marginTop: 0 }}>{itError}</ErrorText>}
    </div>
  );
  return (
    <TaskCard
      num="1"
      title="Connect email provider"
      status={status}
      desc="Your IT administrator must authenticate to grant org-wide access."
      action={
        status === "done" ? null : status === "waiting" ||
          status === "skipped" ? (
          <Btn
            size="sm"
            disabled={resending || inviteWrite.locked}
            onClick={() => void resendItInvite()}
            icon="RefreshCw"
          >
            Resend
          </Btn>
        ) : null
      }
    >
      {status === "done" ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12.5,
            color: "var(--success)",
            fontWeight: 600,
          }}
        >
          <Icon name="CircleCheck" size={15} />
          Email access granted — all users can now connect individually.
        </div>
      ) : status === "skipped" ? (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-2)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Icon name="Clock" size={15} style={{ color: "var(--notable)" }} />
            Google Workspace verification deferred — not blocking the rest of
            setup.
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            Individual Gmail connects may not work for your team until this
            finishes. Resend the invite anytime to complete it.
          </span>
        </div>
      ) : status === "verifying" ? (
        <div
          style={{
            display: "flex",
            gap: 9,
            alignItems: "center",
            fontSize: 12.5,
            color: "var(--ink-2)",
          }}
        >
          <Spinner />
          Verifying connection…
        </div>
      ) : status === "waiting" && !addingAnother ? (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-2)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span>
            Invite sent to <b>{latestSentInvite?.email}</b> ·{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                void resendItInvite();
              }}
              style={{ color: "var(--accent)" }}
            >
              Resend
            </a>{" "}
            ·{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAddingAnother(true);
              }}
              style={{ color: "var(--accent)" }}
            >
              Add another contact
            </a>
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            IT Admin will receive an email with instructions.
          </span>
          {itError && <ErrorText style={{ marginTop: 0 }}>{itError}</ErrorText>}
        </div>
      ) : (
        itInviteInput
      )}
    </TaskCard>
  );
}
