"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  engagementMeeting,
  type EngagementMeeting,
} from "../../../shared/capiro/operations/engagement";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { MeetingDetail } from "../../../shared/meetings/MeetingDetail";
import { meetingMaterials } from "../../../shared/meetings/library-materials";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Panel,
  StatusPanel,
  Tabs,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";
import { MeetingSplitView } from "./MeetingSplitView";
export function MeetingLibrary(props: {
  clientId: string;
  mode: "library" | "meetings";
}) {
  const params = useSearchParams();
  if (params.has("meeting"))
    return <CurrentMeetingLink key={params.toString()} {...props} />;
  return <MeetingLibraryContents {...props} />;
}

function CurrentMeetingLink({
  clientId,
  mode,
}: {
  clientId: string;
  mode: "library" | "meetings";
}) {
  const params = useSearchParams();
  const router = useRouter();
  const scope = useSelectedClient();
  const id = params.get("meeting") ?? "";
  const requestedClient = params.get("clientId") ?? "";
  const valid =
    mode === "meetings" &&
    params.getAll("meeting").length === 1 &&
    params.getAll("clientId").length === 1 &&
    params.getAll("view").length === 1 &&
    params.get("view") === "meetings" &&
    engagementMeeting.shape.id.safeParse(id).success &&
    engagementMeeting.shape.id.safeParse(requestedClient).success;
  const authorized =
    scope.state === "authorized-client" &&
    scope.client.id === requestedClient &&
    clientId === requestedClient;
  const query = useCapiroQuery(
    "engagement.meeting",
    { params: { id } },
    { enabled: valid && authorized },
  );
  const mismatch =
    query.data &&
    (query.data.id !== id || query.data.client?.id !== requestedClient);
  const error = !valid
    ? "This meeting link is invalid."
    : !authorized && scope.state !== "loading"
      ? "This meeting is unavailable in the selected client scope."
      : (query.error ??
        (mismatch
          ? "This meeting is unavailable in the selected client scope."
          : undefined));
  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("meeting");
    router.replace(`/modules/engagement${next.size ? `?${next}` : ""}`);
  };
  return (
    <div className={styles.stack}>
      <ActionButton onClick={close}>Back to Meetings</ActionButton>
      <StatusPanel
        loading={(valid && scope.state === "loading") || query.loading}
        error={error}
        onRetry={valid && authorized ? query.reload : undefined}
      >
        {!error && !query.loading && query.data && (
          <MeetingDetail
            key={id}
            meeting={query.data}
            presentation="inline"
            onClose={close}
            onSaved={query.reload}
          />
        )}
      </StatusPanel>
    </div>
  );
}

function MeetingLibraryContents({
  clientId,
  mode,
}: {
  clientId: string;
  mode: "library" | "meetings";
}) {
  const [now] = useState(() => Date.now());
  const {
    search,
    setSearch,
    type,
    setType,
    visibility,
    setVisibility,
    from,
    setFrom,
    to,
    setTo,
    page,
    setPage,
    display,
    setDisplay,
    selected,
    setSelected,
    library,
    query,
    rows,
  } = useMeetingLibrary(clientId, mode);
  return (
    <div className={styles.stack}>
      <MeetingFilters
        mode={mode}
        showSearch={mode === "library" || display === "queue"}
        search={search}
        onSearch={setSearch}
        type={type}
        onType={setType}
        visibility={visibility}
        onVisibility={setVisibility}
        from={from}
        onFrom={setFrom}
        to={to}
        onTo={setTo}
        onPage={setPage}
      />
      {mode === "meetings" && (
        <Tabs
          items={[
            { id: "list", label: "List" },
            { id: "queue", label: "Preparation queue" },
          ]}
          value={display}
          onChange={setDisplay}
          label="Meeting view"
        />
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {display === "queue" && mode === "meetings" ? (
          <Panel title="Meeting preparation queue">
            {rows
              .filter((meeting) => Date.parse(meeting.startsAt) > now)
              .map((meeting) => (
                <div className={styles.queueItem} key={meeting.id}>
                  <time>{new Date(meeting.startsAt).toLocaleDateString()}</time>
                  <div>
                    <strong>{meeting.subject}</strong>
                    <p className={styles.muted}>
                      {meeting.client?.name ?? "Unassigned"} ·{" "}
                      {meeting.preps?.[0]?.status ?? "Needs preparation"}
                    </p>
                  </div>
                  <ActionButton onClick={() => setSelected(meeting)}>
                    Open meeting
                  </ActionButton>
                </div>
              ))}
          </Panel>
        ) : mode === "meetings" ? (
          <MeetingSplitView
            rows={rows}
            selected={selected}
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onSelect={setSelected}
            onReload={query.reload}
          />
        ) : (
          <MeetingTable rows={rows} mode={mode} onSelect={setSelected} />
        )}
      </StatusPanel>
      {mode === "library" && (
        <div className={styles.tools}>
          <p className={styles.note}>
            Page {page} · {library.data?.total ?? 0} meetings · 25 per page
          </p>
          <ActionButton
            disabled={page === 1 || library.loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </ActionButton>
          <ActionButton
            disabled={
              !library.data ||
              page * 25 >= library.data.total ||
              library.loading
            }
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </ActionButton>
        </div>
      )}
      <p className={styles.note}>
        Meetings you own, plus colleagues&apos; shared approved materials.
        Private material stays with its owner.
      </p>
      {selected && (mode === "library" || display === "queue") && (
        <MeetingDetail
          key={selected.id}
          meeting={selected}
          onClose={() => setSelected(null)}
          onSaved={query.reload}
        />
      )}
    </div>
  );
}

function MeetingFilters({
  mode,
  showSearch,
  search,
  onSearch: setSearch,
  type,
  onType: setType,
  visibility,
  onVisibility: setVisibility,
  from,
  onFrom: setFrom,
  to,
  onTo: setTo,
  onPage: setPage,
}: {
  mode: "library" | "meetings";
  showSearch: boolean;
  search: string;
  onSearch: (value: string) => void;
  type: string;
  onType: (value: string) => void;
  visibility: string;
  onVisibility: (value: string) => void;
  from: string;
  onFrom: (value: string) => void;
  to: string;
  onTo: (value: string) => void;
  onPage: (value: number) => void;
}) {
  return (
    <div className={styles.tools}>
      {showSearch && (
        <TextInput
          aria-label="Search meetings"
          type="search"
          placeholder="Search by meeting or client…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      )}
      {mode === "library" && (
        <>
          <select
            className={styles.select}
            aria-label="Material type"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All materials</option>
            {["prep", "notes", "debrief"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="Meeting visibility"
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All visibility</option>
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>
        </>
      )}
      <MeetingDates
        from={from}
        onFrom={setFrom}
        to={to}
        onTo={setTo}
        onPage={setPage}
      />
    </div>
  );
}

function MeetingTable({
  rows,
  mode,
  onSelect: setSelected,
}: {
  rows: EngagementMeeting[];
  mode: "library" | "meetings";
  onSelect: (meeting: EngagementMeeting) => void;
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      caption={mode === "library" ? "Meeting materials library" : "Meetings"}
      columns={[
        {
          key: "date",
          label: "Date",
          render: (row) => new Date(row.startsAt).toLocaleDateString(),
        },
        {
          key: "subject",
          label: "Meeting",
          render: (row) => (
            <button className={styles.name} onClick={() => setSelected(row)}>
              {row.subject}
              <p className={styles.muted}>{row.client?.name ?? "Unassigned"}</p>
            </button>
          ),
        },
        {
          key: "materials",
          label: "Materials",
          render: (row) => <span>{meetingMaterials(row)}</span>,
        },
        {
          key: "status",
          label: mode === "library" ? "Visibility" : "Status",
          render: (row) => (
            <Badge>
              {mode === "library" ? (row.visibility ?? "private") : row.status}
            </Badge>
          ),
        },
      ]}
    />
  );
}

function MeetingDates({
  from,
  onFrom: setFrom,
  to,
  onTo: setTo,
  onPage: setPage,
}: {
  from: string;
  onFrom: (value: string) => void;
  to: string;
  onTo: (value: string) => void;
  onPage: (value: number) => void;
}) {
  return (
    <>
      {" "}
      <Field label="From" htmlFor="meeting-from">
        <TextInput
          type="date"
          id="meeting-from"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
      </Field>
      <Field label="To" htmlFor="meeting-to">
        <TextInput
          type="date"
          id="meeting-to"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
      </Field>
    </>
  );
}

function useMeetingLibrary(clientId: string, mode: "library" | "meetings") {
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [visibility, setVisibility] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1),
    [display, setDisplay] = useState("list"),
    [selected, setSelected] = useState<EngagementMeeting | null>(null);
  const scope = `${clientId}:${mode}`;
  const [selectionScope, setSelectionScope] = useState(scope);
  if (selectionScope !== scope) {
    setSelectionScope(scope);
    setSelected(null);
  }
  const library = useCapiroQuery(
    "engagement.library",
    {
      query: {
        clientId: clientId || undefined,
        search: search || undefined,
        artifactType: type ? (type as "prep" | "notes" | "debrief") : undefined,
        visibility: visibility
          ? (visibility as "shared" | "private")
          : undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 25,
      },
    },
    { enabled: mode === "library" },
  );
  const meetings = useCapiroQuery(
    "engagement.meetings",
    {
      query: {
        clientId: clientId || undefined,
        from: from || undefined,
        to: to || undefined,
      },
    },
    { enabled: mode === "meetings" },
  );
  const query = mode === "library" ? library : meetings;
  const rows =
    mode === "library"
      ? (library.data?.data ?? [])
      : (meetings.data ?? []).filter((meeting) =>
          meeting.subject.toLowerCase().includes(search.toLowerCase()),
        );
  return {
    search,
    setSearch,
    type,
    setType,
    visibility,
    setVisibility,
    from,
    setFrom,
    to,
    setTo,
    page,
    setPage,
    display,
    setDisplay,
    selected,
    setSelected,
    library,
    query,
    rows,
  };
}
