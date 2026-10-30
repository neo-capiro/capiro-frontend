"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import type {
  OutreachCampaignState,
  OutreachContextItem,
} from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  StatusPanel,
  Tabs,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import { campaignUnits } from "./campaign-model";
import styles from "./outreach-workflow.module.css";
type Source = {
  id: string;
  kind: OutreachContextItem["kind"];
  title: string;
  description?: string;
  unavailable?: boolean;
};
const tabs = [
  { id: "library", label: "Documents & meetings" },
  { id: "bills", label: "Federal bills" },
  { id: "stateBills", label: "State bills" },
  { id: "programs", label: "Program elements" },
  { id: "emails", label: "Past emails" },
  { id: "notes", label: "Custom notes" },
];
export function CampaignContext({
  state,
  update,
  disabled,
}: {
  state: OutreachCampaignState;
  update: (patch: Partial<OutreachCampaignState>) => void;
  disabled: boolean;
}) {
  const [sourceTitles, setSourceTitles] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("library"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const [scope, setScope] = useState("all"),
    [note, setNote] = useState(""),
    [noteUse, setNoteUse] = useState<"fact" | "instruction">("fact");
  const [mailCursor, setMailCursor] = useState<string>(),
    [mailAsOf, setMailAsOf] = useState<string>();
  const library = useCapiroQuery(
    "engagement.campaign.library",
    {},
    { enabled: tab === "library" },
  );
  const bills = useCapiroQuery(
    "intelligence.explorer.bills",
    { query: { q: search, page, pageSize: 25 } },
    { enabled: tab === "bills" },
  );
  const stateBills = useCapiroQuery(
    "intelligence.explorer.state-bills",
    { query: { q: search, page, pageSize: 25 } },
    { enabled: tab === "stateBills" },
  );
  const programs = useCapiroQuery(
    "intelligence.defense.list",
    { query: { q: search, page, limit: 25 } },
    { enabled: tab === "programs" },
  );
  const emails = useCapiroQuery(
    "engagement.campaign.emails",
    {
      query: {
        limit: 50,
        query: search,
        ...(state.clientId ? { clientId: state.clientId } : {}),
        ...(mailCursor ? { cursor: mailCursor } : {}),
        ...(mailAsOf ? { asOf: mailAsOf } : {}),
      },
    },
    { enabled: tab === "emails" },
  );
  const units = campaignUnits(state);
  const scopes = [
    { value: "all", label: "Everyone" },
    ...units.map((unit) => ({ value: unit.key, label: unit.name })),
  ];
  const sources: Source[] =
    tab === "library"
      ? [
          ...(library.data?.documents ?? []).map((row) => ({
            ...row,
            kind: "document" as const,
            description: row.clientName,
            unavailable: ["Restricted", "Unavailable"].includes(row.tag ?? ""),
          })),
          ...(library.data?.debriefs ?? []).map((row) => ({
            ...row,
            kind: "debrief" as const,
            description: row.clientName,
            unavailable: ["Restricted", "Unavailable"].includes(row.tag ?? ""),
          })),
          ...(library.data?.preps ?? []).map((row) => ({
            ...row,
            kind: "prep" as const,
            description: row.clientName,
          })),
          ...(state.clientId
            ? [
                {
                  id: `client-overview-${state.clientId}`,
                  title: "Current client profile",
                  kind: "clientOverview" as const,
                  description: "Current permitted client overview",
                },
              ]
            : []),
        ]
      : tab === "bills"
        ? (bills.data?.rows ?? []).map((row) => ({
            id: `bill-${row.id}`,
            title: row.title ?? row.identifier ?? row.id,
            kind: "bill",
            description: row.summary ?? undefined,
          }))
        : tab === "stateBills"
          ? (stateBills.data?.rows ?? []).map((row) => ({
              id: `state-bill-${row.id}`,
              title: row.title ?? row.identifier ?? row.id,
              kind: "stateBill",
              description: row.summary ?? undefined,
            }))
          : tab === "programs"
            ? (programs.data?.data ?? []).map((row) => ({
                id: `pe-${row.peCode}`,
                title: row.title,
                kind: "programElement",
                description: row.peCode,
              }))
            : (emails.data?.items ?? []).map((row) => ({
                id: `mail-${row.id}`,
                title: row.subject,
                kind: "email",
                description: row.snippet ?? undefined,
              }));
  const selected = (source: Source) =>
    state.contextItems.some(
      (item) =>
        item.id === source.id &&
        item.kind === source.kind &&
        item.scope === scope,
    );
  const add = (source: Source) => {
    setSourceTitles((current) => ({
      ...current,
      [`${source.kind}:${source.id}`]: source.title,
    }));
    update({
      contextItems: [
        ...state.contextItems,
        { id: source.id, kind: source.kind, scope },
      ],
    });
  };
  const query =
    tab === "library"
      ? library
      : tab === "bills"
        ? bills
        : tab === "stateBills"
          ? stateBills
          : tab === "programs"
            ? programs
            : emails;
  const total =
    tab === "bills"
      ? bills.data?.total
      : tab === "stateBills"
        ? stateBills.data?.total
        : tab === "programs"
          ? programs.data?.total
          : undefined;
  return (
    <div className={styles.grid}>
      <Panel
        title="Selected context"
        description="Facts and writing instructions stay distinct. Choose who each item applies to."
      >
        <div className={styles.fields}>
          {!state.contextItems.length && !state.contextSelections?.length && (
            <p className={styles.hint}>
              No sources selected. Add supporting information or a personal
              note.
            </p>
          )}
          {!!state.contextSelections?.length && (
            <p className={styles.hint}>
              {state.contextSelections.length} sources imported with this
              campaign are retained and checked again before generation.
            </p>
          )}
          {state.contextItems.map((item, index) => (
            <div
              key={`${item.kind}:${item.id}:${index}`}
              className={styles.selected}
            >
              <strong>
                {item.kind === "note"
                  ? item.noteUse === "instruction"
                    ? "Writing instruction"
                    : "Custom fact"
                  : (sourceTitles[`${item.kind}:${item.id}`] ??
                    sources.find((row) => row.id === item.id)?.title ??
                    item.kind.replace(/([A-Z])/g, " $1"))}
              </strong>
              {item.customNoteText && (
                <p className={styles.previewText}>{item.customNoteText}</p>
              )}
              <Field label="Applies to" htmlFor={`context-scope-${index}`}>
                <SelectInput
                  id={`context-scope-${index}`}
                  value={item.scope}
                  disabled={disabled}
                  options={
                    scopes.some((row) => row.value === item.scope)
                      ? scopes
                      : [
                          ...scopes,
                          {
                            value: item.scope,
                            label: "Previously selected recipient",
                          },
                        ]
                  }
                  onValueChange={(value) =>
                    update({
                      contextItems: state.contextItems.map((row, i) =>
                        i === index ? { ...row, scope: value } : row,
                      ),
                    })
                  }
                />
              </Field>
              <Field
                label="How to use this source"
                htmlFor={`context-guidance-${index}`}
              >
                <TextArea
                  id={`context-guidance-${index}`}
                  rows={2}
                  maxLength={2000}
                  disabled={disabled}
                  value={item.userInstruction ?? ""}
                  onChange={(event) =>
                    update({
                      contextItems: state.contextItems.map((row, i) =>
                        i === index
                          ? { ...row, userInstruction: event.target.value }
                          : row,
                      ),
                    })
                  }
                />
              </Field>
              <ActionButton
                disabled={disabled}
                onClick={() =>
                  update({
                    contextItems: state.contextItems.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                Remove source
              </ActionButton>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="Context library"
        description="Select saved sources and add personal or shared notes."
      >
        <div className={styles.fields}>
          <Tabs
            label="Context sources"
            items={tabs}
            value={tab}
            onChange={(value) => {
              setTab(value);
              setPage(1);
              setSearch("");
              setMailCursor(undefined);
              setMailAsOf(undefined);
            }}
          />
          <Field label="Add context for" htmlFor="add-context-scope">
            <SelectInput
              id="add-context-scope"
              value={scope}
              options={scopes}
              onValueChange={setScope}
            />
          </Field>
          {tab === "notes" ? (
            <>
              <Field label="Use this note as" htmlFor="custom-note-use">
                <SelectInput
                  id="custom-note-use"
                  value={noteUse}
                  options={[
                    { value: "fact", label: "A fact or source" },
                    { value: "instruction", label: "A writing instruction" },
                  ]}
                  onValueChange={(value) => setNoteUse(value as typeof noteUse)}
                />
              </Field>
              <Field label="Note" htmlFor="custom-context-note">
                <TextArea
                  id="custom-context-note"
                  rows={6}
                  maxLength={8000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </Field>
              <ActionButton
                disabled={disabled || !note.trim()}
                onClick={() => {
                  update({
                    contextItems: [
                      ...state.contextItems,
                      {
                        id: `note-${crypto.randomUUID()}`,
                        kind: "note",
                        scope,
                        noteUse,
                        customNoteText: note,
                      },
                    ],
                  });
                  setNote("");
                }}
              >
                Add note
              </ActionButton>
            </>
          ) : (
            <>
              <TextInput
                aria-label="Search context sources"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setMailCursor(undefined);
                  setMailAsOf(undefined);
                }}
              />
              <StatusPanel
                loading={query.loading}
                error={query.error}
                onRetry={query.reload}
              />
              {sources
                .filter(
                  (row) =>
                    tab !== "library" ||
                    `${row.title} ${row.description}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((row) => (
                  <div key={row.id} className={styles.choice}>
                    <div>
                      <strong>{row.title}</strong>
                      {row.description && <p>{row.description}</p>}
                      {row.unavailable && <p>Source unavailable</p>}
                    </div>
                    <ActionButton
                      disabled={disabled || row.unavailable || selected(row)}
                      onClick={() => add(row)}
                    >
                      {selected(row) ? "Selected" : "Add"}
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
              {tab === "emails" && (
                <>
                  <p className={styles.hint}>{emails.data?.notice}</p>
                  {emails.data?.hasMore && (
                    <ActionButton
                      disabled={query.loading}
                      onClick={() => {
                        setMailCursor(emails.data!.nextCursor!);
                        setMailAsOf(emails.data!.asOf);
                      }}
                    >
                      Next email page
                    </ActionButton>
                  )}
                </>
              )}
              {tab === "library" && (
                <p className={styles.hint}>
                  The library shows up to 300 recent entries per source family.
                  Permission and source availability are checked again when
                  generating.
                </p>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
