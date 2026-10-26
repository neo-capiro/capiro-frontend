"use client";
import { useState } from "react";
import {
  parseNewsletterInvitationResult,
  parseNewsletterReviewerTeam,
  type NewsletterReviewer,
  type NewsletterReviewerTeam,
  type NewsletterPendingInvitation,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import type { ReviewActions } from "./use-review-actions";
import { ReviewActionNotice } from "./ReviewActionNotice";
import styles from "./newsletter-collaboration.module.css";

type AccessRole = NewsletterPendingInvitation["role"];
const roles = [
  { value: "editor", label: "Author — can edit, preview and comment" },
  { value: "commenter", label: "Can preview and comment" },
  { value: "viewer", label: "Can preview" },
] as const;
function isRole(value: string): value is AccessRole {
  return value === "editor" || value === "commenter" || value === "viewer";
}
export type AccountTarget = Pick<
  NewsletterPendingInvitation,
  "id" | "email" | "accountRole"
>;

function ReviewerRow({
  person,
  blocked,
  onGrant,
  onRemove,
}: {
  person: NewsletterReviewer;
  blocked: boolean;
  onGrant: (userId: string, role: AccessRole) => void;
  onRemove: (userId: string) => void;
}) {
  const [role, setRole] = useState(person.role);
  return (
    <div className={styles.row}>
      <div>
        <strong>{person.name || person.email}</strong>
        <p>{person.email}</p>
      </div>
      {person.role === "owner" ? (
        <Badge>Owner</Badge>
      ) : (
        <>
          <Field
            label={`Access for ${person.name || person.email}`}
            htmlFor={`reviewer-${person.userId}`}
          >
            <SelectInput
              id={`reviewer-${person.userId}`}
              value={role}
              disabled={blocked}
              options={roles}
              onValueChange={(value) => {
                if (isRole(value)) setRole(value);
              }}
            />
          </Field>
          <ActionButton
            disabled={blocked || role === person.role}
            onClick={() => {
              if (isRole(role)) onGrant(person.userId, role);
            }}
          >
            Save access
          </ActionButton>
          <ActionButton
            disabled={blocked}
            onClick={() => onRemove(person.userId)}
          >
            Remove access
          </ActionButton>
        </>
      )}
    </div>
  );
}

export function NewsletterSharing({
  documentId,
  team,
  actions,
  onTeam,
  onAccount,
  onClose,
}: {
  documentId: string;
  team: NewsletterReviewerTeam;
  actions: ReviewActions;
  onTeam: (team: NewsletterReviewerTeam) => void;
  onAccount: (target: AccountTarget) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccessRole>("commenter");
  const [message, setMessage] = useState("");
  const [accountRole, setAccountRole] = useState<"member" | "admin">("member");
  const [memberId, setMemberId] = useState("");
  const [memberRole, setMemberRole] = useState<AccessRole>("commenter");
  const [savedInvitation, setSavedInvitation] = useState<{
    target: AccountTarget;
    status: string;
  }>();
  const owner = team.role === "owner";
  const receive = (value: unknown) =>
    parseNewsletterReviewerTeam(value, { currentUserId: team.currentUserId });
  const grant = (userId: string, nextRole: AccessRole) => {
    if (owner)
      void actions.perform(
        "Newsletter access",
        () =>
          actions.grant.run({
            params: { id: documentId },
            body: { userId, role: nextRole },
          }),
        receive,
        onTeam,
      );
  };
  const remove = (userId: string) => {
    if (owner)
      void actions.perform(
        "Access removal",
        () => actions.remove.run({ params: { id: documentId, userId } }),
        receive,
        onTeam,
      );
  };
  const cancel = (invitationId: string) => {
    if (owner)
      void actions.perform(
        "Invitation cancellation",
        () => actions.cancel.run({ params: { id: documentId, invitationId } }),
        receive,
        onTeam,
      );
  };
  const invite = () => {
    if (!owner || actions.blocked) return;
    const body = Object.freeze({
      email: email.trim().toLowerCase(),
      role,
      message: message.trim(),
      accountRole: team.canInviteAccounts ? accountRole : ("member" as const),
      requestKey: crypto.randomUUID(),
    });
    void actions.perform(
      "Newsletter invitation request",
      () => actions.invite.run({ params: { id: documentId }, body }),
      (value) =>
        parseNewsletterInvitationResult(value, {
          currentUserId: team.currentUserId,
          email: body.email,
        }),
      (result) => {
        onTeam(result);
        setSavedInvitation({
          target: {
            id: result.invitation.id,
            email: result.invitation.email,
            accountRole: body.accountRole,
          },
          status: result.invitation.status,
        });
      },
      true,
    );
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !actions.pending) onClose();
      }}
      closeDisabled={actions.pending}
      title="Invite your team"
      description="Newsletter owner · Manage access"
      className={styles.dialog}
      footer={
        <ActionButton disabled={actions.pending} onClick={onClose}>
          Close
        </ActionButton>
      }
    >
      <div className={styles.stack} data-design-node="1176:300560">
        <ReviewActionNotice actions={actions} />
        {owner && (
          <>
            <form
              className={styles.card}
              onSubmit={(event) => {
                event.preventDefault();
                invite();
              }}
            >
              <h3>Invite someone</h3>
              <p className={styles.hint}>
                Save a newsletter access request. Firm invitations are a
                separate explicit action.
              </p>
              <Field label="Email address" htmlFor="newsletter-invite-email">
                <TextInput
                  id="newsletter-invite-email"
                  type="email"
                  required
                  maxLength={320}
                  value={email}
                  disabled={actions.blocked}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="Access level" htmlFor="newsletter-invite-role">
                <SelectInput
                  id="newsletter-invite-role"
                  value={role}
                  options={roles}
                  disabled={actions.blocked}
                  onValueChange={(value) => {
                    if (isRole(value)) setRole(value);
                  }}
                />
              </Field>
              <Field
                label="A message from you (optional)"
                htmlFor="newsletter-invite-message"
                description="Up to 2,000 characters"
              >
                <TextArea
                  id="newsletter-invite-message"
                  maxLength={2000}
                  value={message}
                  disabled={actions.blocked}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </Field>
              {team.canInviteAccounts && (
                <Field
                  label="Firm account role"
                  htmlFor="newsletter-account-role"
                  description="Admin grants firm-wide user administration, separate from newsletter access."
                >
                  <SelectInput
                    id="newsletter-account-role"
                    value={accountRole}
                    disabled={actions.blocked}
                    options={[
                      { value: "member", label: "Member" },
                      { value: "admin", label: "Admin" },
                    ]}
                    onValueChange={(value) => {
                      if (value === "member" || value === "admin")
                        setAccountRole(value);
                    }}
                  />
                </Field>
              )}
              <p className={styles.hint}>
                Newsletter requests are saved for 30 days. Firm membership and
                source-client access restrictions still apply.{" "}
                {team.invitationEmailAvailable
                  ? "Invitation email is configured; delivery status is unavailable here."
                  : "Invitation email is unavailable."}
              </p>
              <ActionButton
                type="submit"
                primary
                disabled={actions.blocked || !email.trim()}
              >
                Save invitation request
              </ActionButton>
            </form>
            {savedInvitation && (
              <div className={styles.card} role="status">
                <strong>Newsletter request: {savedInvitation.status}</strong>
                <p>{savedInvitation.target.email}</p>
                <p className={styles.hint}>
                  This does not confirm a firm invitation or email delivery.
                </p>
                <ActionButton onClick={() => onAccount(savedInvitation.target)}>
                  Firm invitation status
                </ActionButton>
              </div>
            )}
            <div className={styles.card}>
              <h3>Add an existing member</h3>
              <Field label="Active member" htmlFor="newsletter-member">
                <SelectInput
                  id="newsletter-member"
                  value={memberId}
                  placeholder="Choose a member"
                  disabled={actions.blocked}
                  options={team.available.map((person) => ({
                    value: person.clerkUserId,
                    label: `${person.name || person.email} · ${person.email}`,
                  }))}
                  onValueChange={setMemberId}
                />
              </Field>
              <Field label="Member access" htmlFor="newsletter-member-role">
                <SelectInput
                  id="newsletter-member-role"
                  value={memberRole}
                  disabled={actions.blocked}
                  options={roles}
                  onValueChange={(value) => {
                    if (isRole(value)) setMemberRole(value);
                  }}
                />
              </Field>
              <ActionButton
                disabled={
                  actions.blocked ||
                  !team.available.some(
                    (person) => person.clerkUserId === memberId,
                  )
                }
                onClick={() => grant(memberId, memberRole)}
              >
                Grant newsletter access
              </ActionButton>
              <p className={styles.hint}>
                Up to 500 active members are available in this loaded view.
              </p>
            </div>
          </>
        )}
        <div className={styles.card}>
          <h3>Who has access</h3>
          {team.items.map((person) =>
            owner ? (
              <ReviewerRow
                key={`${person.userId}:${person.role}`}
                person={person}
                blocked={actions.blocked}
                onGrant={grant}
                onRemove={remove}
              />
            ) : (
              <div key={person.userId} className={styles.row}>
                <div>
                  {person.name}
                  <p>{person.email}</p>
                </div>
                <Badge>{person.role}</Badge>
              </div>
            ),
          )}
          <p className={styles.hint}>
            Removing newsletter access does not remove firm membership.
          </p>
        </div>
        {owner && (
          <div className={styles.card} data-design-node="1176:300648">
            <h3>Pending newsletter requests</h3>
            {!team.pending.length && (
              <p>No pending requests in this loaded view.</p>
            )}
            {team.pending.map((invitation) => (
              <div key={invitation.id} className={styles.card}>
                <strong>{invitation.email}</strong>
                <p>
                  {invitation.role} · Firm account: {invitation.accountRole}
                </p>
                <p>{invitation.message}</p>
                <p className={styles.hint}>
                  Expires {new Date(invitation.expiresAt).toLocaleString()}
                </p>
                <div className={styles.actions}>
                  <ActionButton onClick={() => onAccount(invitation)}>
                    Firm invitation status
                  </ActionButton>
                  <ActionButton
                    disabled={actions.blocked}
                    onClick={() => cancel(invitation.id)}
                  >
                    Cancel newsletter request
                  </ActionButton>
                </div>
              </div>
            ))}
            <p className={styles.hint}>
              Up to 50 pending requests are loaded. Cancellation retains any
              firm invitation or membership. Already activated requests require
              Remove access.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
