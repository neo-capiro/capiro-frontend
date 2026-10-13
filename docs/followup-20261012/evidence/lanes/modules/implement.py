from pathlib import Path
root=Path('/workspace/capiro-next-modules/apps/web/src/features/modules')
p=root/'calendar/useCalendar.ts'
s=p.read_text().replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useRouter, useSearchParams } from "next/navigation";\nimport { useSelectedClient } from "../../../shared/session/SelectedClient";')
s=s.replace('  const [clientId, setClientId] = useState("");', '''  const router = useRouter();
  const params = useSearchParams();
  const scope = useSelectedClient();
  const clientId = scope.state === "authorized-client" ? scope.client.id : "";''')
s=s.replace('  const clientName =\n    clients.data?.find((client) => client.id === clientId)?.name ??\n    "Master view";', '''  const clientName = scope.state === "authorized-client" ? scope.client.name : "Master view";
  const clientOptions = clients.data ?? [];
  // A verified selection remains visible even when the optional picker list fails.
  const scopeOptions = scope.state === "authorized-client" && !clientOptions.some((client) => client.id === clientId)
    ? [...clientOptions, scope.client]
    : clientOptions;''')
s=s.replace('    setClientId(value);\n    setSelected(undefined);', '''    const next = new URLSearchParams(params.toString());
    if (value) next.set("clientId", value);
    else next.delete("clientId");
    router.push(`/modules/calendar${next.size ? `?${next}` : ""}`);''')
s=s.replace('    clients,\n    identity,','    clients,\n    scopeOptions,\n    identity,')
p.write_text(s)
p=root/'calendar/CalendarScreen.tsx';s=p.read_text().replace('clients={clients.data ?? []}', 'clients={model.scopeOptions}');p.write_text(s)
p=root/'calendar/agenda.ts';s=p.read_text();a=s.index('export function plannerItems(');b=s.index('\nexport function ',a+1)
s=s[:a]+'''export function plannerItems(tasks: PlannerTask[]): AgendaItem[] {
  return tasks.flatMap((task) => {
    if (task.archived) return [];
    const sameOccurrence = task.startOn === task.dueOn &&
      (task.startTime ?? null) === (task.dueTime ?? null);
    return (["start", "due"] as const).flatMap((kind): AgendaItem[] => {
      const date = kind === "start" ? task.startOn : task.dueOn;
      if (!date || (kind === "start" && sameOccurrence)) return [];
      const time = kind === "start" ? task.startTime : task.dueTime;
      const label = sameOccurrence ? "Start and due date" : kind === "start" ? "Start date" : "Due date";
      return [{
        key: `task:${task.id}:${kind}`,
        source: "Planner",
        title: task.name,
        date,
        time: time ?? "Date only",
        sortTime: time ?? undefined,
        context: `${label}${time && task.timeZone ? ` · ${task.timeZone}` : ""}`,
        href: `/modules/planner?task=${encodeURIComponent(task.id)}`,
      }];
    });
  });
}
''' + s[b:];p.write_text(s)
p=root/'calendar/CalendarCard.tsx';s=p.read_text();a=s.index('      <StatusPanel\n');b=s.index('      {extras.loading',a)
s=s[:a]+'''      {view === "agenda" ? (
        <>
          <StatusPanel loading={meetings.loading} error={meetings.error ? `Meetings unavailable: ${meetings.error.message}` : undefined} onRetry={meetings.reload} />
          <AgendaTable items={filtered} onMeeting={setSelected} />
          {!filtered.length && !meetings.loading && !extras.loading && (
            meetings.error || extras.warnings.length ? (
              <p role="status">No matching events in the available sources. Some source coverage is unavailable or incomplete.</p>
            ) : <StatusPanel empty="No events match this view" />
          )}
        </>
      ) : (
        <StatusPanel loading={meetings.loading} error={meetings.error} onRetry={meetings.reload}>
          <CalendarGrid
            meetings={sources.has("Meetings") ? loaded : []}
            date={date}
            view={view}
            onMeeting={setSelected}
          />
        </StatusPanel>
      )}
''' + s[b:]
s=s.replace('warnings={extras.warnings}', 'warnings={meetings.error ? [`Meetings unavailable: ${meetings.error.message}`, ...extras.warnings] : extras.warnings}')
p.write_text(s)
p=root/'planner/PlannerScreen.tsx';s=p.read_text().replace('import { plannerId } from "../../../shared/capiro/operations/planner-schemas";', 'import { useSelectedClient } from "../../../shared/session/SelectedClient";\nimport { LinkedTaskDetail } from "./LinkedTaskDetail";')
s=s.replace('    requestedClient = params.get("clientId");','    requestedTask = params.get("task");\n  const scope = useSelectedClient();')
s=s.replace('  const clientId = plannerId.safeParse(requestedClient).success\n      ? requestedClient!\n      : undefined,', '  const clientId = scope.state === "authorized-client" ? scope.client.id : undefined,')
s=s.replace('          <PlannerContent\n','          <>\n          {requestedTask !== null && (\n            <LinkedTaskDetail key={requestedTask} requestedId={requestedTask} clientId={clientId} people={bootstrap.data.people} projects={bootstrap.data.projects} onSaved={bootstrap.reload} />\n          )}\n          <PlannerContent\n').replace('            initialTaskTitle={initialTaskTitle}\n          />','            initialTaskTitle={initialTaskTitle}\n          />\n          </>')
p.write_text(s)
