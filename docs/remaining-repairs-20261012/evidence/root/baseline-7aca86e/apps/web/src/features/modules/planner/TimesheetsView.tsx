"use client";
import type {
  PlannerPerson,
  PlannerProject,
} from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  Panel,
  SelectInput,
  StatusPanel,
  Tabs,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
import { minutesLabel, shiftDate, weekStart } from "./task-presentation";
import { AddTimeDialog, PersonalTimeSettings } from "./TimeDialogs";
import { TimeExportDialog } from "./TimeExportDialog";
import { TimeSettings } from "./TimeSettings";
import {
  TimeMetrics,
  WeeklyTotals,
  WeeklyWork,
  type Timesheet,
} from "./TimesheetTables";
import { TimesheetWorkDialog } from "./TimesheetWorkDialog";
import { useTimesheets } from "./use-timesheets";
type Props = {
  people: PlannerPerson[];
  projects: PlannerProject[];
  me: PlannerPerson;
  timeAdmin: boolean;
};
type Model = ReturnType<typeof useTimesheets>;
export function TimesheetsView(props: Props) {
  const m = useTimesheets(props);
  return (
    <div className={styles.stack}>
      <TimeToolbar props={props} model={m} />
      {m.error && (
        <p role="alert" className={styles.error}>
          {m.error}
        </p>
      )}
      {m.tab === "review" ? (
        <TimeReview props={props} model={m} />
      ) : (
        <StatusPanel
          loading={m.query.loading}
          error={m.query.error}
          onRetry={m.query.reload}
        >
          {m.sheet && (
            <TimesheetBody people={props.people} sheet={m.sheet} model={m} />
          )}
        </StatusPanel>
      )}
      <TimesheetDialogs props={props} model={m} />
    </div>
  );
}
function TimeToolbar({ props, model: m }: { props: Props; model: Model }) {
  return (
    <>
      <div className={styles.tools}>
        <ActionButton onClick={() => m.setDialog("export")}>
          Export time entries
        </ActionButton>
        <Tabs
          value={m.tab}
          items={[
            { id: "timesheet", label: "Timesheet" },
            { id: "review", label: "Time review" },
          ]}
          onChange={m.setTab}
          label="Time views"
        />
        <ActionButton
          className={styles.toolbarEnd}
          onClick={() => m.setDialog("settings")}
        >
          Time settings
        </ActionButton>
      </div>
      <div className={styles.tools}>
        <ActionButton onClick={() => m.setWeek(shiftDate(m.week, -7))}>
          Previous week
        </ActionButton>
        <Field label="Week containing" htmlFor="timesheet-week">
          <TextInput
            type="date"
            id="timesheet-week"
            value={m.week}
            onChange={(event) => {
              if (event.target.value) m.setWeek(weekStart(event.target.value));
            }}
          />
        </Field>
        <ActionButton onClick={() => m.setWeek(shiftDate(m.week, 7))}>
          Next week
        </ActionButton>
        <ActionButton
          onClick={() =>
            m.setWeek(weekStart(new Date().toLocaleDateString("en-CA")))
          }
        >
          This week
        </ActionButton>
        <SelectInput
          aria-label="Timesheet person"
          value={m.userId}
          onValueChange={(id) => {
            m.setUserId(id);
            m.setTab("timesheet");
          }}
          options={props.people.map((person) => ({
            value: person.id,
            label: person.name,
          }))}
        />
      </div>
    </>
  );
}
function TimeReview({ props, model: m }: { props: Props; model: Model }) {
  return (
    <StatusPanel
      loading={m.review.loading}
      error={m.review.error}
      onRetry={m.review.reload}
    >
      <DataTable
        rows={m.review.data?.items ?? []}
        rowKey={(row) => row.userId}
        caption="Timesheet review"
        columns={[
          {
            key: "person",
            label: "Person",
            render: (row) => (
              <button
                className={styles.name}
                onClick={() => {
                  m.setUserId(row.userId);
                  m.setTab("timesheet");
                }}
              >
                {props.people.find((person) => person.id === row.userId)
                  ?.name ?? "Former member"}
              </button>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <Badge>{row.status}</Badge>,
          },
          {
            key: "total",
            label: "Total",
            render: (row) => minutesLabel(row.totalMinutes),
          },
          {
            key: "billable",
            label: "Billable",
            render: (row) => minutesLabel(row.billableMinutes),
          },
        ]}
      />
      {m.review.data?.nextCursor && (
        <p className={styles.note}>
          More review rows exist; select a person to review their complete
          timesheet.
        </p>
      )}
    </StatusPanel>
  );
}
function TimesheetBody({
  people,
  sheet,
  model: m,
}: {
  people: PlannerPerson[];
  sheet: Timesheet;
  model: Model;
}) {
  return (
    <>
      <div>
        <strong>
          {people.find((person) => person.id === sheet.userId)?.name ??
            "Former member"}{" "}
          · {sheet.weekOn} to {sheet.throughOn}
        </strong>
        <p className={styles.muted}>
          {sheet.status} · Reviewer:{" "}
          {people.find((person) => person.id === sheet.reviewerId)?.name ??
            "Not assigned"}
        </p>
      </div>
      <TimeMetrics sheet={sheet} />
      <WeeklyTotals sheet={sheet} />
      <WeeklyWork
        sheet={sheet}
        busy={m.busy}
        onRemove={(work) => void m.removeWork(work)}
        onAdd={() => m.setDialog("work")}
        onPreferences={() => m.setDialog("preferences")}
      />
      <div className={styles.tools}>
        <ActionButton
          disabled={!sheet.canLogTime}
          onClick={() => m.setDialog("time")}
        >
          Add time
        </ActionButton>
        {sheet.actions.map((action) => (
          <ActionButton
            key={action}
            primary={action === "submit" || action === "approve"}
            disabled={m.busy}
            onClick={() =>
              action === "reject"
                ? m.setDialog("reject")
                : void m.changeStatus(action)
            }
          >
            {action.replaceAll("_", " ")}
          </ActionButton>
        ))}
      </div>
      {sheet.timeNotice && (
        <p className={styles.note}>{String(sheet.timeNotice)}</p>
      )}
      {sheet.nextCursor && (
        <p className={styles.note}>
          This view includes the first page of entries. Service totals cover the
          full week.
        </p>
      )}
      <Panel title="Status history">
        <div className={styles.detail}>
          {sheet.history.map((event) => (
            <div key={event.id}>
              <p>{event.text}</p>
              <time className={styles.note}>
                {new Date(event.createdAt).toLocaleString()}
              </time>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
function TimesheetDialogs({ props, model: m }: { props: Props; model: Model }) {
  return (
    <>
      <TimeExportDialog
        open={m.dialog === "export"}
        onClose={() => m.setDialog(null)}
        week={m.week}
        userId={m.userId}
        timeAdmin={props.timeAdmin}
        projects={props.projects}
      />
      {m.sheet && (
        <TimesheetWorkDialog
          open={m.dialog === "work"}
          sheet={m.sheet}
          projects={props.projects}
          onClose={() => m.setDialog(null)}
          onSaved={m.query.reload}
        />
      )}
      <AddTimeDialog
        open={m.dialog === "time"}
        onClose={() => m.setDialog(null)}
        projectId={null}
        projects={props.projects}
        onSaved={m.query.reload}
      />
      <PersonalTimeSettings
        open={m.dialog === "preferences"}
        onClose={() => m.setDialog(null)}
      />
      <TimeSettings
        open={m.dialog === "settings"}
        onClose={() => m.setDialog(null)}
        people={props.people}
        timeAdmin={props.timeAdmin}
      />
      <Modal
        open={m.dialog === "reject"}
        onOpenChange={(open) => {
          if (!open) m.setDialog(null);
        }}
        title="Reject timesheet"
        description="Explain the correction needed before resubmission."
      >
        <div className={styles.stack}>
          <Field label="Reason" htmlFor="reject-reason">
            <TextArea
              id="reject-reason"
              value={m.notes}
              onChange={(event) => m.setNotes(event.target.value)}
              maxLength={20000}
            />
          </Field>
          <ActionButton
            primary
            disabled={m.busy}
            onClick={() => void m.changeStatus("reject")}
          >
            Reject timesheet
          </ActionButton>
        </div>
      </Modal>
    </>
  );
}
