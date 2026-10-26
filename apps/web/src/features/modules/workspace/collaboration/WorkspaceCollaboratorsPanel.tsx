"use client";

import { useId, useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import type { CapiroMe } from "../../../../shared/capiro/operations/settings-schemas";
import type {
  CollaboratorListRow,
  CollaboratorRole,
} from "../../../../shared/capiro/operations/workspace-collaborators";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  StatusPanel,
} from "../../../../shared/module-ui";
import { InvitationEmail } from "./InvitationEmail";
import { useCollaboration } from "./use-collaboration";
import styles from "./collaboration.module.css";

export const roleOptions = [
  { value: "editor", label: "Editor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "commenter", label: "Commenter" },
  { value: "viewer", label: "Viewer" },
];
type Collaboration = ReturnType<typeof useCollaboration>;

function Person({
  person,
  name,
  state,
  draftId,
}: {
  person: CollaboratorListRow;
  name: string;
  state: Collaboration;
  draftId: string;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const roleId = useId();
  return (
    <article className={styles.card} aria-label={name}>
      <h3>
        {name}
        {person.isOwner ? " · Owner" : ""}
      </h3>
      <p className={styles.caption}>
        {person.isOwner
          ? "Active · Owner access cannot be changed here."
          : person.status === "pending"
            ? "Invitation pending · Access begins only after acceptance and current access checks."
            : "Active"}
      </p>
      {!person.isOwner && (
        <>
          {state.canManage ? (
            <Field label="Document role" htmlFor={roleId}>
              <SelectInput
                id={roleId}
                value={person.role}
                options={roleOptions}
                disabled={state.pending}
                onValueChange={(value) => {
                  if (value !== person.role)
                    void state.changeRole(person.id, value as CollaboratorRole);
                }}
              />
            </Field>
          ) : (
            <p>
              Document role:{" "}
              {roleOptions.find((item) => item.value === person.role)?.label}
            </p>
          )}
          {state.canManage && (
            <div className={styles.actions}>
              {person.subjectId && (
                <ActionButton
                  type="button"
                  disabled={state.pending}
                  onClick={() => setEmailOpen((open) => !open)}
                  aria-expanded={emailOpen}
                >
                  Email notification
                </ActionButton>
              )}
              <ActionButton
                type="button"
                disabled={state.pending}
                onClick={() => setConfirmRemoval(true)}
              >
                {person.status === "pending"
                  ? "Remove invitation"
                  : "Remove access"}
              </ActionButton>
            </div>
          )}
          {!person.subjectId && (
            <p className={styles.caption}>
              External recipients are not supported here.
            </p>
          )}
          {state.canManage && emailOpen && person.subjectId && (
            <InvitationEmail
              key={person.id}
              draftId={draftId}
              invitationId={person.id}
              name={name}
              pendingInvitation={person.status === "pending"}
              onRefused={state.fail}
            />
          )}
          {state.canManage && confirmRemoval && (
            <div
              className={styles.card}
              role="group"
              aria-label={`Remove ${name}`}
            >
              <p>
                Remove{" "}
                {person.status === "pending"
                  ? "this invitation"
                  : "this person's access"}
                ? An email already requested cannot be recalled.
              </p>
              <div className={styles.actions}>
                <ActionButton
                  type="button"
                  disabled={state.pending}
                  onClick={() => setConfirmRemoval(false)}
                >
                  Keep access
                </ActionButton>
                <ActionButton
                  type="button"
                  primary
                  disabled={state.pending}
                  onClick={() => void state.removePerson(person.id)}
                >
                  Confirm removal
                </ActionButton>
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function People({
  draftId,
  me,
  onClose,
}: {
  draftId: string;
  me: CapiroMe;
  onClose: () => void;
}) {
  const state = useCollaboration(draftId, me);
  const [memberId, setMemberId] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const fieldId = useId();
  const available =
    state.members.data?.filter(
      (member) =>
        !state.people.some((person) => person.subjectId === member.clerkUserId),
    ) ?? [];
  const selected = available.find((member) => member.clerkUserId === memberId);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (selected && (await state.inviteMember(selected, role))) setMemberId("");
  }
  return (
    <form
      className={styles.stack}
      onSubmit={(event) => void submit(event)}
      data-design-node="3153:116308"
    >
      <StatusPanel
        loading={state.loading}
        error={state.error}
        onRetry={state.refresh}
      >
        {state.canManage && (
          <section className={styles.card}>
            <h3>Invite a teammate</h3>
            <p>
              Choose someone in your firm. The invitation is saved in Capiro;
              email is optional.
            </p>
            <StatusPanel
              loading={state.members.loading}
              error={state.members.error}
              onRetry={state.members.reload}
            >
              <Field label="Teammate" htmlFor={`${fieldId}-member`}>
                <SelectInput
                  id={`${fieldId}-member`}
                  value={selected?.clerkUserId ?? ""}
                  placeholder="Choose a teammate"
                  disabled={state.pending || Boolean(state.uncertainInvite)}
                  options={available.map((member) => ({
                    value: member.clerkUserId,
                    label: `${member.name || member.email} · ${member.email}`,
                  }))}
                  onValueChange={setMemberId}
                />
              </Field>
            </StatusPanel>
            <Field label="Document role" htmlFor={`${fieldId}-role`}>
              <SelectInput
                id={`${fieldId}-role`}
                value={role}
                options={roleOptions}
                disabled={state.pending || Boolean(state.uncertainInvite)}
                onValueChange={(value) => setRole(value as CollaboratorRole)}
              />
            </Field>
            <p className={styles.caption}>
              Editor · Reviewer · Commenter · Viewer. Current source access
              still applies.
            </p>
            <p className={styles.caption}>
              External recipients are not supported here.
            </p>
          </section>
        )}
        {state.uncertainInvite && (
          <p role="alert">
            Invitation result not confirmed. Refresh people to check for{" "}
            {state.uncertainInvite.name || "this teammate"} before inviting
            again.
          </p>
        )}
        {state.recovered && <p role="status">{state.recovered}</p>}
        {state.notice && <p role="status">{state.notice}</p>}
        {state.failure && <p role="alert">{state.failure.message}</p>}
        <section className={styles.card} aria-label="People">
          <h3>People</h3>
          {state.people.map((person) => (
            <Person
              key={person.id}
              person={person}
              draftId={draftId}
              state={state}
              name={
                person.name ||
                (person.subjectId === me.user.clerkUserId
                  ? [me.user.firstName, me.user.lastName]
                      .filter(Boolean)
                      .join(" ") || "You"
                  : state.members.data?.find(
                      (member) => member.clerkUserId === person.subjectId,
                    )?.name) ||
                person.email ||
                "Teammate"
              }
            />
          ))}
        </section>
      </StatusPanel>
      <footer className={styles.footer}>
        <ActionButton
          type="button"
          onClick={state.refresh}
          disabled={state.pending}
        >
          Refresh people
        </ActionButton>
        <ActionButton type="button" onClick={onClose}>
          Done
        </ActionButton>
        {state.canManage && !state.error && (
          <ActionButton
            primary
            type="submit"
            disabled={
              !selected ||
              state.pending ||
              state.loading ||
              Boolean(state.uncertainInvite) ||
              Boolean(state.members.error)
            }
          >
            {state.pending ? "Saving…" : "Invite teammate"}
          </ActionButton>
        )}
      </footer>
    </form>
  );
}

function PeopleDialog({ draftId }: { draftId: string }) {
  const [open, setOpen] = useState(false);
  const me = useCapiroQuery("me.read", {}, { enabled: open });
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        People with access
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="People with access"
        description="Manage access to this document."
        className={styles.dialog}
      >
        <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
          {me.data && (
            <People
              key={`${me.data.tenant.id}:${me.data.user.clerkUserId}:${draftId}`}
              draftId={draftId}
              me={me.data}
              onClose={() => setOpen(false)}
            />
          )}
        </StatusPanel>
      </Modal>
    </>
  );
}

/** Host supplies the saved draft identity only; policy remains in Workspace. */
export function WorkspaceCollaboratorsPanel({ draftId }: { draftId: string }) {
  return <PeopleDialog key={draftId} draftId={draftId} />;
}
