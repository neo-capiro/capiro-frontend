"use client";
import { useState } from "react";
import { z } from "zod";
import type {
  OutreachCampaignState,
  OutreachRecipient,
} from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { personSchema } from "../../../portfolio/relationships/public";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  StatusPanel,
  Tabs,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./outreach-workflow.module.css";
type Choice = {
  id: string;
  name: string;
  email?: string | null;
  title?: string | null;
  office?: string | null;
  locator?: OutreachRecipient["locator"];
  source?: string;
  sourceRefId?: string;
};
const tabs = [
  { id: "congress", label: "Congress" },
  { id: "state", label: "State" },
  { id: "clients", label: "Clients" },
  { id: "recent", label: "Recent meetings" },
  { id: "audiences", label: "Lists & groups" },
  { id: "manual", label: "Manual" },
];
export function CampaignRecipients({
  state,
  update,
  disabled,
}: {
  state: OutreachCampaignState;
  update: (patch: Partial<OutreachCampaignState>) => void;
  disabled: boolean;
}) {
  const [tab, setTab] = useState("congress"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState<"to" | "cc" | "bcc">("to");
  const [bundle, setBundle] = useState<string[]>([]),
    [bundleName, setBundleName] = useState("");
  const congress = useCapiroQuery(
    "directory.contacts",
    { query: { q: search, page, pageSize: 25 } },
    { enabled: tab === "congress" },
  );
  const states = useCapiroQuery(
    "directory.state-legislators",
    { query: { q: search, page, pageSize: 25 } },
    { enabled: tab === "state" },
  );
  const people = useCapiroQuery(
    "engagement.newsletter.clientPeople",
    { params: { clientId: state.clientId ?? "" } },
    { enabled: tab === "clients" && !!state.clientId },
  );
  const recent = useCapiroQuery(
    "engagement.campaign.recentContacts",
    { query: { ...(state.clientId ? { clientId: state.clientId } : {}) } },
    { enabled: tab === "recent" },
  );
  const audiences = useCapiroQuery(
    "engagement.campaign.audiences",
    {},
    { enabled: tab === "audiences" },
  );
  const parsedPeople = z.array(personSchema).safeParse(people.data);
  const candidates: Choice[] =
    tab === "congress"
      ? (congress.data?.contacts ?? []).flatMap((row) => [
          {
            id: row.id,
            name: row.fullName,
            email: row.email,
            title: row.title,
            office: row.officeLocation,
            source: "congress",
            sourceRefId: row.id,
            locator: { source: "directory_member", id: row.id },
          },
          ...row.staff.map((staff) => ({
            id: staff.id,
            name: staff.fullName,
            email: staff.email,
            title: staff.title,
            office: staff.officeLocation,
            source: "congress",
            sourceRefId: staff.id,
            locator: { source: "directory_staff", id: staff.id },
          })),
        ])
      : tab === "state"
        ? (states.data?.rows ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            source: "state",
            sourceRefId: row.id,
            locator: { source: "state_legislator", id: row.id },
          }))
        : tab === "clients"
          ? (parsedPeople.success ? parsedPeople.data : []).map((row) => ({
              id: row.id,
              name: row.name,
              email: row.email,
              title: row.title,
              source: "client_contact",
              sourceRefId: row.id,
              locator: {
                source: "client_person",
                id: row.id,
                clientId: row.clientId,
              },
            }))
          : (recent.data?.contacts ?? []).map((row) => ({
              id: row.id,
              name: row.attendeeName,
              email: row.attendeeEmail,
              title: row.title,
              office: row.office,
              source: "manual",
            }));
  const append = (choice: Choice) => {
    if (disabled || !choice.email || !z.email().safeParse(choice.email).success)
      return;
    if (
      state.recipients.some(
        (row) => row.id === choice.id && row.kind === "individual",
      )
    )
      return;
    update({
      recipients: [
        ...state.recipients,
        {
          id: choice.id,
          kind: "individual",
          name: choice.name,
          email: choice.email,
          role,
          ...(choice.title ? { title: choice.title } : {}),
          ...(choice.office ? { office: choice.office } : {}),
          ...(choice.locator ? { locator: choice.locator } : {}),
          ...(choice.source ? { source: choice.source } : {}),
          ...(choice.sourceRefId ? { sourceRefId: choice.sourceRefId } : {}),
        },
      ],
    });
  };
  const makeBundle = (kind: "list" | "group") => {
    const members = state.recipients
      .filter((row) => bundle.includes(row.id) && row.kind === "individual")
      .map(({ kind, members, ...member }) => {
        void kind;
        void members;
        return member;
      });
    if (!members.length || !bundleName.trim()) return;
    update({
      recipients: [
        ...state.recipients.filter((row) => !bundle.includes(row.id)),
        {
          id: crypto.randomUUID(),
          kind,
          role: "to",
          name: bundleName.trim(),
          members,
        },
      ],
    });
    setBundle([]);
    setBundleName("");
  };
  const query =
    tab === "congress"
      ? congress
      : tab === "state"
        ? states
        : tab === "clients"
          ? people
          : tab === "recent"
            ? recent
            : audiences;
  const total =
    tab === "congress"
      ? congress.data?.total
      : tab === "state"
        ? states.data?.total
        : undefined;
  return (
    <div className={styles.grid}>
      <Panel
        title="Selected recipients"
        description="Each individual and list member gets a separate draft. A group shares one message."
      >
        <div className={styles.fields}>
          {!state.recipients.length && (
            <p className={styles.hint}>
              Add recipients from your directories or enter an email address.
            </p>
          )}
          {state.recipients.map((row) => (
            <div className={styles.selected} key={row.id}>
              <div className={styles.actions}>
                {row.kind === "individual" && (
                  <input
                    type="checkbox"
                    aria-label={`Include ${row.name} in list or group`}
                    checked={bundle.includes(row.id)}
                    disabled={disabled}
                    onChange={(event) =>
                      setBundle((values) =>
                        event.target.checked
                          ? [...values, row.id]
                          : values.filter((id) => id !== row.id),
                      )
                    }
                  />
                )}
                <strong>{row.name || row.email}</strong>
                <span className={styles.hint}>
                  {row.kind === "individual"
                    ? row.email
                    : `${row.members?.length ?? 0} members · ${row.kind}`}
                </span>
                <ActionButton
                  disabled={disabled}
                  onClick={() =>
                    update({
                      recipients: state.recipients.filter(
                        (item) => item !== row,
                      ),
                    })
                  }
                  aria-label={`Remove ${row.name}`}
                >
                  Remove
                </ActionButton>
              </div>
              {row.kind === "individual" && (
                <SelectInput
                  aria-label={`Recipient role for ${row.name}`}
                  value={row.role}
                  disabled={disabled}
                  options={["to", "cc", "bcc"].map((value) => ({
                    value,
                    label: value.toUpperCase(),
                  }))}
                  onValueChange={(value) =>
                    update({
                      recipients: state.recipients.map((item) =>
                        item === row
                          ? { ...item, role: value as typeof role }
                          : item,
                      ),
                    })
                  }
                />
              )}
              {!!row.cc?.length && <p>Cc: {row.cc.join(", ")}</p>}
              {!!row.bcc?.length && <p>Bcc: {row.bcc.join(", ")}</p>}
              {row.members?.map((member) => (
                <div className={styles.actions} key={member.id}>
                  <span>
                    {member.name} · {member.email}
                    {member.cc?.length ? ` · Cc: ${member.cc.join(", ")}` : ""}
                    {member.bcc?.length
                      ? ` · Bcc: ${member.bcc.join(", ")}`
                      : ""}
                  </span>
                  <SelectInput
                    aria-label={`Role for ${member.name} in ${row.name}`}
                    value={member.role}
                    disabled={disabled}
                    options={["to", "cc", "bcc"].map((value) => ({
                      value,
                      label: value.toUpperCase(),
                    }))}
                    onValueChange={(value) =>
                      update({
                        recipients: state.recipients.map((item) =>
                          item === row
                            ? {
                                ...item,
                                members: item.members?.map((m) =>
                                  m === member
                                    ? { ...m, role: value as typeof role }
                                    : m,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <Field label="Personal note" htmlFor={`note-${row.id}`}>
                <TextInput
                  id={`note-${row.id}`}
                  maxLength={500}
                  value={row.personalNote ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    update({
                      recipients: state.recipients.map((item) =>
                        item === row
                          ? { ...item, personalNote: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </Field>
            </div>
          ))}
          {!!bundle.length && (
            <div className={styles.fields}>
              <Field label="List or group name" htmlFor="bundle-name">
                <TextInput
                  id="bundle-name"
                  value={bundleName}
                  onChange={(event) => setBundleName(event.target.value)}
                  maxLength={240}
                />
              </Field>
              <div className={styles.actions}>
                <ActionButton
                  disabled={disabled || !bundleName.trim()}
                  onClick={() => makeBundle("list")}
                >
                  Create list
                </ActionButton>
                <ActionButton
                  disabled={disabled || !bundleName.trim()}
                  onClick={() => makeBundle("group")}
                >
                  Create group
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </Panel>
      <Panel
        title="Find recipients"
        description="Choose a current directory contact, saved audience or manual address."
      >
        <div className={styles.fields}>
          <Tabs
            label="Recipient sources"
            items={tabs}
            value={tab}
            onChange={(value) => {
              setTab(value);
              setPage(1);
              setSearch("");
            }}
          />
          <Field label="Add as" htmlFor="recipient-role">
            <SelectInput
              id="recipient-role"
              disabled={disabled}
              value={role}
              options={["to", "cc", "bcc"].map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
              onValueChange={(value) => setRole(value as typeof role)}
            />
          </Field>
          {tab === "manual" ? (
            <>
              <Field label="Name" htmlFor="recipient-name">
                <TextInput
                  id="recipient-name"
                  value={name}
                  maxLength={240}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="recipient-email">
                <TextInput
                  id="recipient-email"
                  type="email"
                  value={email}
                  maxLength={320}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <ActionButton
                disabled={
                  disabled ||
                  !name.trim() ||
                  !z.email().safeParse(email).success
                }
                onClick={() => {
                  append({
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    email,
                    source: "manual",
                  });
                  setName("");
                  setEmail("");
                }}
              >
                Add recipient
              </ActionButton>
            </>
          ) : (
            <>
              <TextInput
                aria-label="Search recipients"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              {tab === "clients" && !state.clientId ? (
                <p className={styles.hint}>
                  Choose a client in Direction to browse their people.
                </p>
              ) : (
                <StatusPanel
                  loading={query.loading}
                  error={query.error}
                  onRetry={query.reload}
                />
              )}
              {tab === "audiences"
                ? (audiences.data ?? [])
                    .filter((row) =>
                      row.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((row) => (
                      <div className={styles.choice} key={row.id}>
                        <span>
                          {row.name} · {row.kind} · {row.members.length} members
                        </span>
                        <ActionButton
                          disabled={
                            disabled ||
                            state.recipients.some((item) => item.id === row.id)
                          }
                          onClick={() =>
                            update({
                              recipients: [
                                ...state.recipients,
                                {
                                  id: row.id,
                                  name: row.name,
                                  kind: row.kind,
                                  role: "to",
                                  members: row.members.map((member) => ({
                                    id: member.id,
                                    name: member.name ?? member.email,
                                    email: member.email,
                                    role: "to",
                                    source: member.source,
                                    ...(member.sourceRefId
                                      ? { sourceRefId: member.sourceRefId }
                                      : {}),
                                  })),
                                },
                              ],
                            })
                          }
                        >
                          Add
                        </ActionButton>
                      </div>
                    ))
                : candidates
                    .filter(
                      (row) =>
                        ["congress", "state"].includes(tab) ||
                        `${row.name} ${row.email}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((row) => (
                      <div className={styles.choice} key={row.id}>
                        <div>
                          <strong>{row.name}</strong>
                          <p>
                            {row.title} {row.email || "Email unavailable"}
                          </p>
                        </div>
                        <ActionButton
                          disabled={
                            disabled ||
                            !row.email ||
                            !z.email().safeParse(row.email).success ||
                            state.recipients.some((item) => item.id === row.id)
                          }
                          onClick={() => append(row)}
                        >
                          Add
                        </ActionButton>
                      </div>
                    ))}
              {total !== undefined && (
                <div className={styles.actions}>
                  <ActionButton
                    disabled={page === 1 || query.loading}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </ActionButton>
                  <span>Page {page}</span>
                  <ActionButton
                    disabled={page * 25 >= total || query.loading}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </ActionButton>
                </div>
              )}
              {tab === "recent" && (
                <p className={styles.hint}>
                  Recent meeting attendees cover the last seven days. Add
                  related prep, debrief and notes in Context builder.
                </p>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
