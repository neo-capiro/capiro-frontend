"use client";
import { useState } from "react";
import type {
  PlannerPerson,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
import {
  assigneeName,
  dayLabel,
  minutesLabel,
  shiftDate,
  statuses,
  weekStart,
  type TaskView,
} from "./task-presentation";
type Props = {
  tasks: PlannerTask[];
  people: PlannerPerson[];
  view: TaskView;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onOpen: (task: PlannerTask) => void;
  onComplete: (task: PlannerTask) => void;
  onMove: (task: PlannerTask, status: PlannerTask["status"]) => void;
};
export function TaskViews(props: Props) {
  if (props.view === "board") return <TaskBoard {...props} />;
  if (props.view === "calendar")
    return <TaskCalendar tasks={props.tasks} onOpen={props.onOpen} />;
  if (props.view === "timeline" || props.view === "gantt")
    return (
      <TaskTimeline
        tasks={props.tasks}
        view={props.view}
        onOpen={props.onOpen}
      />
    );
  return <TaskList {...props} />;
}
function TaskBoard(props: Props) {
  return (
    <div className={styles.board}>
      {statuses.map((status) => (
        <section
          key={status.id}
          className={styles.boardColumn}
          aria-label={status.label}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const task = props.tasks.find(
              (item) => item.id === event.dataTransfer.getData("text/plain"),
            );
            if (task && ["admin", "editor"].includes(task.access))
              props.onMove(task, status.id);
          }}
        >
          <h2>
            <img
              src={`/figma/modules/planner-board-imgEllipse${status.id === "todo" ? "" : status.id === "in_progress" ? "1" : status.id === "blocked" ? "2" : "3"}.svg`}
              alt=""
              width={7}
              height={7}
            />
            {status.label} ·{" "}
            {props.tasks.filter((task) => task.status === status.id).length}
          </h2>
          {props.tasks
            .filter((task) => task.status === status.id)
            .map((task) => (
              <button
                className={styles.boardCard}
                key={task.id}
                onClick={() => props.onOpen(task)}
                draggable={["admin", "editor"].includes(task.access)}
                onDragStart={(event) =>
                  event.dataTransfer.setData("text/plain", task.id)
                }
              >
                <div className={styles.inline}>
                  <img
                    src="/figma/modules/planner-board-imgDragHandle.svg"
                    alt=""
                    width={6}
                    height={18}
                  />
                  <strong>{task.name}</strong>
                </div>
                <div className={styles.inline}>
                  <Badge tone={task.priority === "high" ? "danger" : "neutral"}>
                    {task.priority}
                  </Badge>
                  <span className={styles.muted}>{dayLabel(task.dueOn)}</span>
                </div>
                <span className={styles.muted}>
                  {assigneeName(task, props.people)} ·{" "}
                  {minutesLabel(task.estimateMinutes)}
                </span>
              </button>
            ))}
        </section>
      ))}
    </div>
  );
}
function TaskList(props: Props) {
  return (
    <DataTable
      rows={props.tasks}
      rowKey={(task) => task.id}
      caption="Planner tasks"
      columns={[
        {
          key: "name",
          label: "Task name",
          width: "35%",
          render: (task) => (
            <div className={styles.taskName}>
              <input
                type="checkbox"
                aria-label={`Select ${task.name}`}
                checked={props.selected.has(task.id)}
                onChange={() => props.onSelect(task.id)}
              />
              <button
                className={`${styles.circle} ${task.status === "done" ? styles.completed : ""}`}
                aria-label={
                  task.status === "done"
                    ? `Reopen ${task.name}`
                    : `Complete ${task.name}`
                }
                disabled={!["admin", "editor"].includes(task.access)}
                onClick={() => props.onComplete(task)}
              >
                {task.status === "done" ? "✓" : ""}
              </button>
              <button
                className={styles.name}
                onClick={() => props.onOpen(task)}
              >
                {task.name}
                {task.parentId && <span className={styles.chip}>Subtask</span>}
              </button>
            </div>
          ),
        },
        {
          key: "assignee",
          label: "Assignee",
          render: (task) => (
            <span className={styles.muted}>
              {assigneeName(task, props.people)}
            </span>
          ),
        },
        {
          key: "due",
          label: "Due date",
          render: (task) => (
            <span>
              {dayLabel(task.dueOn)}
              {task.dueTime && `, ${task.dueTime}`}
            </span>
          ),
        },
        {
          key: "priority",
          label: "Priority",
          render: (task) => (
            <Badge
              tone={
                task.priority === "high"
                  ? "danger"
                  : task.priority === "medium"
                    ? "warning"
                    : "neutral"
              }
            >
              {task.priority}
            </Badge>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (task) => (
            <Badge tone={task.status === "done" ? "success" : "neutral"}>
              {statuses.find((status) => status.id === task.status)?.label}
            </Badge>
          ),
        },
        {
          key: "estimated",
          label: "Estimated",
          render: (task) => minutesLabel(task.estimateMinutes),
        },
        {
          key: "actual",
          label: "Actual",
          render: (task) => minutesLabel(task.actualMinutes),
        },
      ]}
    />
  );
}
function TaskCalendar({ tasks, onOpen }: Pick<Props, "tasks" | "onOpen">) {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const first = `${month}-01`,
    start = weekStart(first);
  const days = Array.from({ length: 42 }, (_, index) =>
    shiftDate(start, index),
  );
  const move = (delta: number) => {
    const date = new Date(`${first}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
  };
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <ActionButton onClick={() => move(-1)}>Previous month</ActionButton>
        <strong>
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${first}T12:00:00Z`))}
        </strong>
        <ActionButton onClick={() => move(1)}>Next month</ActionButton>
      </div>
      <div className={styles.calendar}>
        {days.map((day) => (
          <div className={styles.day} key={day}>
            <strong>{dayLabel(day)}</strong>
            {tasks
              .filter((task) => task.dueOn === day)
              .map((task) => (
                <button key={task.id} onClick={() => onOpen(task)}>
                  {task.name}
                </button>
              ))}
          </div>
        ))}
      </div>
      <Panel title="Unscheduled work">
        <div className={styles.detail}>
          {tasks
            .filter((task) => !task.dueOn)
            .map((task) => (
              <button
                className={styles.name}
                key={task.id}
                onClick={() => onOpen(task)}
              >
                {task.name}
              </button>
            ))}
        </div>
      </Panel>
    </div>
  );
}
function TaskTimeline({
  tasks,
  view,
  onOpen,
}: Pick<Props, "tasks" | "onOpen" | "view">) {
  const scheduled = tasks.filter((task) => task.dueOn);
  const start = scheduled.map((task) => task.startOn ?? task.dueOn!).sort()[0];
  const end = scheduled
    .map((task) => task.dueOn!)
    .sort()
    .at(-1);
  const total =
    start && end
      ? Math.max(1, (Date.parse(end) - Date.parse(start)) / 86400000 + 1)
      : 1;
  return (
    <Panel
      title={view === "gantt" ? "Gantt" : "Timeline"}
      description={
        start && end
          ? `${dayLabel(start)} — ${dayLabel(end)} · Dates use calendar days`
          : "Add a due date to schedule work."
      }
    >
      <div className={styles.timeline}>
        {scheduled.map((task) => {
          const left =
            ((Date.parse(task.startOn ?? task.dueOn!) - Date.parse(start!)) /
              86400000 /
              total) *
            100;
          const width = Math.max(
            2,
            (((Date.parse(task.dueOn!) -
              Date.parse(task.startOn ?? task.dueOn!)) /
              86400000 +
              1) /
              total) *
              100,
          );
          return (
            <div key={task.id} className={styles.timelineRow}>
              <button className={styles.name} onClick={() => onOpen(task)}>
                {task.name}
                {view === "gantt" && task.dependencies.length > 0 && (
                  <span className={styles.note}>
                    {" "}
                    · {task.dependencies.length} dependencies
                  </span>
                )}
              </button>
              <div className={styles.track}>
                <button
                  className={styles.bar}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => onOpen(task)}
                >
                  {dayLabel(task.dueOn)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
