"use client";
import { useDeferredValue, useState } from "react";
import type { CalendarHearing } from "../../../../../shared/capiro/operations/legiwatch-calendar-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import {
  LegiWatchTabs,
  PageControls,
  SelectField,
  downloadText,
  hearingDate,
} from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { ArchiveScreen } from "./ArchiveScreen";
import {
  displayTime,
  officialToday,
  shiftDate,
  weekStart,
} from "./calendar-dates";
import { HearingCalendar } from "./HearingCalendar";
import { RecordingsScreen } from "./RecordingsScreen";

export function HearingsScreen() {
  const route = useLegiWatchRoute(),
    [list, setList] = useState("schedule");
  const [q, setQ] = useState(""),
    search = useDeferredValue(q),
    [jurisdiction, setJurisdiction] = useState<"ALL" | "US" | "FL">("ALL");
  const [committee, setCommittee] = useState(""),
    [from, setFrom] = useState(() => weekStart(officialToday()));
  const [layout, setLayout] = useState("week"),
    [page, setPage] = useState(1),
    [filtersOpen, setFiltersOpen] = useState(false),
    [dateOpen, setDateOpen] = useState(false);
  const [status, setStatus] = useState<
      "scheduled" | "completed" | "in_progress" | undefined
    >(),
    [following, setFollowing] = useState(false),
    [exportError, setExportError] = useState("");
  const query = {
    from,
    to: layout === "day" ? from : shiftDate(from, 6),
    jurisdiction,
    q: search || undefined,
    committee: committee || undefined,
    eventStatus: status,
    following: following || undefined,
    page,
    pageSize: 200,
  };
  const calendar = useCapiroQuery(
    "legiwatch.calendar",
    { query },
    { enabled: list === "schedule" },
  );
  const committees = useCapiroQuery(
    "legiwatch.committees",
    {},
    { enabled: list === "schedule" },
  );
  const exportCalendar = useCapiroMutation("legiwatch.calendarExportBulk");
  const open = (id: string) =>
    route.navigate({ hearingId: id, lw: "hearings" });
  const changeWeek = (days: number) => {
    setFrom(shiftDate(from, days));
    setPage(1);
  };
  const download = async () => {
    setExportError("");
    try {
      const result = await exportCalendar.run({ body: query });
      downloadText(result.ics, result.filename, "text/calendar;charset=utf-8");
      if (result.skipped.length)
        setExportError(
          `${result.skipped.length} hearings could not be exported because their official dates were unresolved.`,
        );
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Calendar export failed.",
      );
    }
  };
  return (
    <div className={styles.screen}>
      <LegiWatchTabs
        value={list}
        onChange={setList}
        label="Hearing records"
        items={[
          { id: "schedule", label: "Schedule" },
          { id: "recordings", label: "Recordings" },
          { id: "past", label: "Past hearings" },
        ]}
      />
      {list === "recordings" ? (
        <RecordingsScreen />
      ) : list === "past" ? (
        <ArchiveScreen />
      ) : (
        <>
          <div className={styles.filters}>
            <Field label="Search hearings" htmlFor="hearing-search">
              <TextInput
                id="hearing-search"
                placeholder="Search title, committee or speaker…"
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
            <SelectField
              id="hearing-jurisdiction"
              label="Jurisdiction"
              value={jurisdiction}
              onChange={(value) => {
                setJurisdiction(value as "ALL" | "US" | "FL");
                setPage(1);
              }}
            >
              <option value="ALL">All · Federal + Florida</option>
              <option value="US">Federal</option>
              <option value="FL">Florida</option>
            </SelectField>
            <SelectField
              id="hearing-committee"
              label="Committee"
              value={committee}
              onChange={(value) => {
                setCommittee(value);
                setPage(1);
              }}
            >
              <option value="">All committees</option>
              {committees.data?.rows.map((row) => (
                <option value={row.systemCode} key={row.systemCode}>
                  {row.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className={styles.toolbar}>
            <ActionButton
              onClick={() => {
                setFrom(weekStart(officialToday()));
                setPage(1);
              }}
            >
              Today
            </ActionButton>
            <ActionButton onClick={() => setDateOpen(true)}>
              {hearingDate(from)}–{hearingDate(query.to)}
            </ActionButton>
            <ActionButton
              primary={layout === "week"}
              onClick={() => setLayout("week")}
            >
              Week calendar
            </ActionButton>
            <ActionButton
              primary={layout === "day"}
              onClick={() => setLayout("day")}
            >
              Day
            </ActionButton>
            <ActionButton
              primary={layout === "agenda"}
              onClick={() => setLayout("agenda")}
            >
              Agenda
            </ActionButton>
            <ActionButton onClick={() => setFiltersOpen(true)}>
              Filters
            </ActionButton>
            <ActionButton disabled={exportCalendar.pending} onClick={download}>
              {exportCalendar.pending ? "Exporting…" : "Export calendar"}
            </ActionButton>
            <ActionButton onClick={() => changeWeek(-7)}>
              Previous week
            </ActionButton>
            <ActionButton onClick={() => changeWeek(7)}>Next week</ActionButton>
          </div>
          <div className={styles.legend}>
            <span className={styles.federal}>Federal</span>
            <span className={styles.florida}>Florida</span>
            <span>All times Eastern (ET)</span>
          </div>
          {exportError && (
            <p role="alert" className={styles.error}>
              {exportError}
            </p>
          )}
          <StatusPanel
            loading={calendar.loading}
            error={calendar.error}
            onRetry={calendar.reload}
            empty={
              !calendar.loading &&
              !calendar.error &&
              !calendar.data?.rows.length
                ? "No hearings match these filters"
                : undefined
            }
          >
            {calendar.data && (
              <>
                {layout === "week" && (
                  <HearingCalendar
                    from={from}
                    rows={calendar.data.rows}
                    onOpen={open}
                  />
                )}
                <HearingAgenda rows={calendar.data.rows} onOpen={open} />
                <PageControls
                  page={page}
                  total={calendar.data.total}
                  pageSize={200}
                  onChange={setPage}
                />
              </>
            )}
          </StatusPanel>
        </>
      )}
      <Modal
        open={dateOpen}
        onOpenChange={setDateOpen}
        title="Choose date range"
        footer={
          <ActionButton
            primary
            onClick={() => {
              setDateOpen(false);
              setPage(1);
            }}
          >
            Apply date
          </ActionButton>
        }
      >
        <Field label="Starting date" htmlFor="calendar-from">
          <TextInput
            id="calendar-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
      </Modal>
      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Hearing filters"
        footer={
          <ActionButton
            primary
            onClick={() => {
              setPage(1);
              setFiltersOpen(false);
            }}
          >
            Apply filters
          </ActionButton>
        }
      >
        <div className={styles.form}>
          <SelectField
            id="calendar-status"
            label="Proceeding status"
            value={status ?? ""}
            onChange={(value) =>
              setStatus(
                value
                  ? (value as "scheduled" | "completed" | "in_progress")
                  : undefined,
              )
            }
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </SelectField>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={following}
              onChange={(event) => setFollowing(event.target.checked)}
            />
            Hearings I follow
          </label>
        </div>
      </Modal>
    </div>
  );
}
function HearingAgenda({
  rows,
  onOpen,
}: {
  rows: CalendarHearing[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <article className={styles.listItem} key={row.id}>
          <div className={styles.row}>
            <div>
              <strong>{row.title}</strong>
              <p className={styles.description}>{row.committeeName}</p>
            </div>
            <Badge>{row.eventStatus.replaceAll("_", " ")}</Badge>
          </div>
          <div className={styles.meta}>
            <span>{hearingDate(row.date, row.startsAt)}</span>
            <span>{displayTime(row.startsAt, row.time)} ET</span>
            <span>
              {row.geographicJurisdiction === "FL" ? "Florida" : "Federal"} ·{" "}
              {row.chamber}
            </span>
            {row.location && <span>{row.location}</span>}
          </div>
          <div className={styles.actions}>
            <ActionButton onClick={() => onOpen(row.id)}>
              Open hearing
            </ActionButton>
            {row.subscription?.scheduledByUser && (
              <Badge tone="success">Attendance scheduled</Badge>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
