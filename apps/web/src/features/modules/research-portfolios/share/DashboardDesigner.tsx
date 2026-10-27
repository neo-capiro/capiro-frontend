"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type DragEvent,
} from "react";
import type {
  ResearchDashboardLayout,
  ResearchDashboardWidget,
  ResearchShareDashboard,
} from "../../../../shared/capiro/operations/research-share-schemas";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import {
  addWidget,
  layoutProblems,
  movePhoneOrder,
  moveWidget,
  normalizePhoneOrder,
  removeWidget,
  resizeWidget,
  setWidgetSettings,
  WIDGET_CATALOG,
  widgetDefinition,
} from "./dashboard-layout";
import { cellStyle } from "./DashboardGrid";
import { ResearchDashboardView } from "./ResearchDashboardView";
import { WidgetContent, basisKey, basisLabel } from "./DashboardWidgets";
import { DashboardPreview } from "./DashboardPreview";
import styles from "./share.module.css";

const ROW_HEIGHT = 56;
const GAP = 12;
type History = {
  past: ResearchDashboardLayout[];
  present: ResearchDashboardLayout;
  future: ResearchDashboardLayout[];
};
type Drag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  base: ResearchDashboardLayout;
  origin: ResearchDashboardWidget;
  invalid?: boolean;
  next?: ResearchDashboardLayout;
};

/** Undo/redo over whole layouts; drags preview on a draft and commit once on release. */
function useLayoutHistory(initial: ResearchDashboardLayout) {
  const [history, setHistory] = useState<History>({
    past: [],
    present: initial,
    future: [],
  });
  const commit = useCallback((next: ResearchDashboardLayout) => {
    setHistory((h) =>
      next === h.present
        ? h
        : {
            past: [...h.past, h.present].slice(-100),
            present: next,
            future: [],
          },
    );
  }, []);
  const undo = useCallback(() => {
    setHistory((h) => {
      const previous = h.past.at(-1);
      return previous
        ? {
            past: h.past.slice(0, -1),
            present: previous,
            future: [h.present, ...h.future],
          }
        : h;
    });
  }, []);
  const redo = useCallback(() => {
    setHistory((h) => {
      const [next, ...rest] = h.future;
      return next
        ? { past: [...h.past, h.present], present: next, future: rest }
        : h;
    });
  }, []);
  return { ...history, commit, undo, redo };
}

/**
 * Drag-and-drop dashboard editor on a 12-column grid, with keyboard parity:
 * arrows move the focused widget, Shift+arrows resize it, Delete removes it.
 */
export function DashboardDesigner({
  initialName,
  initialLayout,
  preview,
  busy,
  error,
  onSave,
  onCancel,
  onDraft,
  snapshots = [],
}: {
  initialName: string;
  initialLayout: ResearchDashboardLayout;
  /** Live data for the preview mode; undefined while it loads. */
  preview?: ResearchShareDashboard;
  busy: boolean;
  error?: string;
  onSave: (name: string, layout: ResearchDashboardLayout) => void;
  onCancel: () => void;
  onDraft?: (name: string, layout: ResearchDashboardLayout) => void;
  snapshots?: readonly { id: string; name: string }[];
}) {
  const history = useLayoutHistory(initialLayout);
  const [draft, setDraft] = useState<ResearchDashboardLayout>();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<string>();
  const [mode, setMode] = useState<"arrange" | "preview">("arrange");
  const [refusal, setRefusal] = useState("");
  /** Read by screen readers after each keyboard or pointer change (FR-16.11). */
  const [announcement, setAnnouncement] = useState({
    message: "",
    revision: 0,
  });
  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => ({
      message,
      revision: previous.revision + 1,
    }));
  }, []);
  const changeHistory = useCallback(
    (direction: "undo" | "redo") => {
      if (!(direction === "undo" ? history.past : history.future).length)
        return;
      history[direction]();
      announce(
        direction === "undo"
          ? "Previous change undone. Layout restored."
          : "Change redone. Layout restored.",
      );
    },
    [history, announce],
  );
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const layout = draft ?? history.present;
  const problems = layoutProblems(layout);
  const selectedWidget = layout.widgets.find((w) => w.id === selected);
  const order = normalizePhoneOrder(layout).phoneOrder;
  useEffect(() => {
    onDraft?.(name, history.present);
  }, [name, history.present, onDraft]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (busy) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z")
        return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      event.preventDefault();
      changeHistory(event.shiftKey ? "redo" : "undo");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeHistory, busy]);

  function metrics() {
    const width = canvas.current?.clientWidth ?? 1200;
    return { cell: (width - 24 + GAP) / 12, row: ROW_HEIGHT + GAP };
  }
  function startDrag(
    event: PointerEvent<HTMLElement>,
    widget: ResearchDashboardWidget,
    dragMode: Drag["mode"],
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: widget.id,
      mode: dragMode,
      startX: event.clientX,
      startY: event.clientY,
      base: history.present,
      origin: widget,
    };
    setSelected(widget.id);
  }
  function onDrag(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current) return;
    const { cell, row } = metrics();
    const dx = Math.round((event.clientX - current.startX) / cell);
    const dy = Math.round((event.clientY - current.startY) / row);
    const { origin } = current;
    const next =
      current.mode === "move"
        ? moveWidget(current.base, current.id, origin.x + dx, origin.y + dy)
        : resizeWidget(current.base, current.id, origin.w + dx, origin.h + dy);
    current.invalid = (dx !== 0 || dy !== 0) && next === current.base;
    current.next = next;
    setRefusal(
      current.invalid
        ? "That position overlaps a widget or leaves the grid, or the size is too small. Original position kept."
        : "",
    );
    setDraft(next);
  }
  function endDrag() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    setDraft(undefined);
    if (current.invalid) {
      announce("Invalid drop refused. Original position kept.");
    } else if (current.next && current.next !== current.base) {
      history.commit(current.next);
      const moved = current.next.widgets.find((w) => w.id === current.id);
      if (moved)
        announce(
          describe(moved, current.mode === "move" ? "moved" : "resized"),
        );
    }
  }
  function cancelDrag() {
    drag.current = null;
    setDraft(undefined);
    setRefusal("");
    announce("Drag cancelled. Original position kept.");
  }
  function dropWidget(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/x-research-widget");
    const definition = WIDGET_CATALOG.find((entry) => entry.kind === kind);
    if (!definition || !canvas.current) return;
    const rect = canvas.current.getBoundingClientRect();
    const { cell, row } = metrics();
    const next = addWidget(history.present, definition.kind, undefined, {
      x: Math.floor((event.clientX - rect.left - 12) / cell),
      y: Math.floor((event.clientY - rect.top - 12) / row),
    });
    if (next === history.present) {
      setRefusal(
        "This widget does not fit here. Choose an empty area inside the grid.",
      );
      announce("Widget not added: invalid drop.");
      return;
    }
    setRefusal("");
    history.commit(next);
    const added = next.widgets.at(-1)!;
    setSelected(added.id);
    announce(describe(added, "added"));
  }
  function describe(
    widget: ResearchDashboardWidget,
    verb: "moved" | "resized" | "added",
  ) {
    return `${widgetDefinition(widget.kind).label} ${verb}: column ${widget.x + 1}, row ${widget.y + 1}, ${widget.w} wide, ${widget.h} tall.`;
  }
  function onCellKey(
    event: KeyboardEvent<HTMLElement>,
    widget: ResearchDashboardWidget,
  ) {
    if (
      event.target !== event.currentTarget ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeAndFocus(widget);
      return;
    }
    const delta = step[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = event.shiftKey
      ? resizeWidget(
          history.present,
          widget.id,
          widget.w + delta[0],
          widget.h + delta[1],
        )
      : moveWidget(
          history.present,
          widget.id,
          widget.x + delta[0],
          widget.y + delta[1],
        );
    const changed = next.widgets.find((w) => w.id === widget.id);
    if (next === history.present || !changed) {
      setRefusal(
        "That change overlaps a widget or leaves the grid, or the size is too small. Original position kept.",
      );
      announce(
        `${widgetDefinition(widget.kind).label} cannot ${event.shiftKey ? "resize" : "move"} there.`,
      );
      return;
    }
    history.commit(next);
    setRefusal("");
    announce(describe(changed, event.shiftKey ? "resized" : "moved"));
  }

  function removeAndFocus(widget: ResearchDashboardWidget) {
    const index = history.present.widgets.findIndex((w) => w.id === widget.id);
    const next = removeWidget(history.present, widget.id);
    const neighbour = next.widgets[Math.min(index, next.widgets.length - 1)];
    history.commit(next);
    setSelected(neighbour?.id);
    announce(`${widgetDefinition(widget.kind).label} removed.`);
    requestAnimationFrame(() => {
      const target = neighbour
        ? canvas.current?.querySelector<HTMLElement>(
            `[data-widget-id="${CSS.escape(neighbour.id)}"]`,
          )
        : canvas.current;
      target?.focus();
    });
  }

  return (
    <Panel
      title={
        initialName ? `Edit design: ${initialName}` : "New dashboard design"
      }
      description="Drag widgets by their title bar, resize from the corner, or use the keyboard: arrows move, Shift+arrows resize, Delete removes. Ctrl+Z undoes."
      actions={
        <div className={styles.inline}>
          <ActionButton
            onClick={() => setMode(mode === "arrange" ? "preview" : "arrange")}
          >
            {mode === "arrange" ? "Preview" : "Arrange"}
          </ActionButton>
          <ActionButton onClick={onCancel} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={busy || !name.trim() || problems.length > 0}
            onClick={() =>
              onSave(name.trim(), normalizePhoneOrder(history.present))
            }
          >
            Save design
          </ActionButton>
        </div>
      }
    >
      <div className={styles.toolbar}>
        <Field label="Design name" htmlFor="design-name">
          <TextInput
            id="design-name"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <ActionButton
          onClick={() => changeHistory("undo")}
          disabled={!history.past.length}
        >
          Undo
        </ActionButton>
        <ActionButton
          onClick={() => changeHistory("redo")}
          disabled={!history.future.length}
        >
          Redo
        </ActionButton>
      </div>
      {error && <p role="alert">{error}</p>}
      {refusal && <p role="alert">{refusal}</p>}
      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={announcement.revision}>{announcement.message}</span>
      </p>
      {problems.length > 0 && (
        <ul className={styles.problems}>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {mode === "preview" ? (
        preview ? (
          <DashboardPreview>
            <ResearchDashboardView
              dashboard={{ ...preview, layout }}
              logoUrl={null}
              preview
            />
          </DashboardPreview>
        ) : (
          <p className={styles.hint}>Loading live data for the preview…</p>
        )
      ) : (
        <div className={styles.designer}>
          <div
            ref={canvas}
            tabIndex={-1}
            aria-label="Dashboard canvas"
            className={`${styles.canvas} ${styles.grid}`}
            onDragOver={(event) => {
              if (
                event.dataTransfer.types.includes(
                  "application/x-research-widget",
                )
              )
                event.preventDefault();
            }}
            onDrop={dropWidget}
          >
            {layout.widgets.map((widget) => (
              <section
                key={widget.id}
                data-widget-id={widget.id}
                tabIndex={0}
                role="group"
                aria-label={`${widgetDefinition(widget.kind).label} widget, column ${widget.x + 1}, row ${widget.y + 1}, ${widget.w} wide, ${widget.h} tall`}
                className={`${styles.cell} ${selected === widget.id ? styles.selected : ""}`}
                style={cellStyle(widget, order.indexOf(widget.id))}
                onFocus={() => setSelected(widget.id)}
                onKeyDown={(e) => onCellKey(e, widget)}
              >
                <div
                  className={styles.handle}
                  onPointerDown={(e) => startDrag(e, widget, "move")}
                  onPointerMove={onDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={cancelDrag}
                >
                  <span>{widgetDefinition(widget.kind).label}</span>
                  <span className={styles.muted}>
                    {widget.w}×{widget.h}
                  </span>
                </div>
                <div className={styles.body}>
                  {preview ? (
                    <WidgetContent widget={widget} dashboard={preview} />
                  ) : (
                    <p className={styles.hint}>
                      {widgetDefinition(widget.kind).description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.resize}
                  aria-label={`Resize ${widgetDefinition(widget.kind).label}`}
                  onPointerDown={(e) => startDrag(e, widget, "resize")}
                  onPointerMove={onDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={cancelDrag}
                />
              </section>
            ))}
          </div>
          <aside className={styles.side}>
            {selectedWidget ? (
              <WidgetSettings
                widget={selectedWidget}
                dashboard={preview}
                snapshots={snapshots}
                onChange={(settings) =>
                  history.commit(
                    setWidgetSettings(
                      history.present,
                      selectedWidget.id,
                      settings,
                    ),
                  )
                }
                onRemove={() => removeAndFocus(selectedWidget)}
              />
            ) : (
              <p className={styles.hint}>
                Select a widget to edit its settings.
              </p>
            )}
            <div>
              <h3 className={styles.widgetLabel}>Add a widget</h3>
              <div className={styles.palette}>
                {WIDGET_CATALOG.map((definition) => (
                  <button
                    key={definition.kind}
                    type="button"
                    disabled={layout.widgets.length >= 40}
                    draggable={layout.widgets.length < 40}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/x-research-widget",
                        definition.kind,
                      );
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => {
                      const next = addWidget(history.present, definition.kind);
                      history.commit(next);
                      const added = next.widgets.at(-1);
                      if (added && next !== history.present) {
                        setRefusal("");
                        announce(describe(added, "added"));
                      } else
                        setRefusal("This widget does not fit in the grid.");
                    }}
                  >
                    {definition.label}
                    <small>{definition.description}</small>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className={styles.widgetLabel}>Tablet and phone order</h3>
              <p className={styles.hint}>
                On a tablet or phone the widgets stack in this saved order.
              </p>
              <ol className={styles.orderList}>
                {order.map((id, index) => {
                  const widget = layout.widgets.find((w) => w.id === id);
                  if (!widget) return null;
                  return (
                    <li key={id}>
                      <span>
                        {index + 1}. {widgetDefinition(widget.kind).label}
                      </span>
                      <ActionButton
                        aria-label={`Move ${widgetDefinition(widget.kind).label} earlier`}
                        disabled={index === 0}
                        onClick={() => {
                          history.commit(
                            movePhoneOrder(history.present, id, -1),
                          );
                          announce(
                            `${widgetDefinition(widget.kind).label} moved to phone position ${index}.`,
                          );
                        }}
                      >
                        ↑
                      </ActionButton>
                      <ActionButton
                        aria-label={`Move ${widgetDefinition(widget.kind).label} later`}
                        disabled={index === order.length - 1}
                        onClick={() => {
                          history.commit(
                            movePhoneOrder(history.present, id, 1),
                          );
                          announce(
                            `${widgetDefinition(widget.kind).label} moved to phone position ${index + 2}.`,
                          );
                        }}
                      >
                        ↓
                      </ActionButton>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        </div>
      )}
    </Panel>
  );
}

function WidgetSettings({
  widget,
  dashboard,
  snapshots,
  onChange,
  onRemove,
}: {
  widget: ResearchDashboardWidget;
  dashboard?: ResearchShareDashboard;
  snapshots: readonly { id: string; name: string }[];
  onChange: (settings: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const definition = widgetDefinition(widget.kind);
  const financial = [
    "key_totals",
    "funding_table",
    "sources",
    "snapshot_comparison",
  ].includes(widget.kind);
  const subjects = ["funding_table", "subjects", "sources"].includes(
    widget.kind,
  );
  const update = (key: string, value: unknown) => {
    const settings = { ...widget.settings };
    if (value === undefined) delete settings[key];
    else settings[key] = value;
    onChange(settings);
  };
  const totals = dashboard?.data.totals ?? [];
  const bases = [
    ...new Map(
      totals.map((total) => [basisKey(total.basis), total.basis]),
    ).entries(),
  ];
  const set = (key: string, value: string) =>
    onChange({
      ...widget.settings,
      [key]:
        definition.settings.find((s) => s.key === key)?.input === "number"
          ? Number(value) || undefined
          : value,
    });
  return (
    <div className={styles.form}>
      <h3 className={styles.widgetLabel}>{definition.label}</h3>
      <p className={styles.hint}>{definition.description}</p>
      {financial && (
        <>
          <Field label="Fiscal year" htmlFor={`fy-${widget.id}`}>
            <SelectInput
              id={`fy-${widget.id}`}
              value={String(widget.settings.fundingFiscalYear ?? "all")}
              onValueChange={(value) =>
                update(
                  "fundingFiscalYear",
                  value === "all" ? undefined : Number(value),
                )
              }
              options={[
                { value: "all", label: "All available years" },
                ...[
                  ...new Set(
                    totals.map((total) => total.basis.fundingFiscalYear),
                  ),
                ].map((year) => ({ value: String(year), label: `FY${year}` })),
              ]}
            />
          </Field>
          <Field label="Financial basis" htmlFor={`basis-${widget.id}`}>
            <SelectInput
              id={`basis-${widget.id}`}
              value={
                typeof widget.settings.basisKey === "string"
                  ? widget.settings.basisKey
                  : "all"
              }
              onValueChange={(value) =>
                update("basisKey", value === "all" ? undefined : value)
              }
              options={[
                { value: "all", label: "All compatible bases, separately" },
                ...bases.map(([value, basis]) => ({
                  value,
                  label: basisLabel(basis),
                })),
              ]}
            />
          </Field>
        </>
      )}
      {subjects && (
        <fieldset>
          <legend>Included subjects</legend>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={!Array.isArray(widget.settings.subjectIds)}
              onChange={(event) =>
                update("subjectIds", event.target.checked ? undefined : [])
              }
            />
            All included subjects
          </label>
          {dashboard?.data.subjects
            .filter((subject) => subject.disposition === "included")
            .map((subject) => {
              const selected = Array.isArray(widget.settings.subjectIds)
                ? widget.settings.subjectIds
                : undefined;
              return (
                <label key={subject.id} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={!selected || selected.includes(subject.id)}
                    onChange={(event) => {
                      const ids =
                        selected ??
                        dashboard.data.subjects
                          .filter((item) => item.disposition === "included")
                          .map((item) => item.id);
                      update(
                        "subjectIds",
                        event.target.checked
                          ? [...new Set([...ids, subject.id])]
                          : ids.filter((id) => id !== subject.id),
                      );
                    }}
                  />
                  {subject.label ?? subject.targetId}
                </label>
              );
            })}
          {Array.isArray(widget.settings.subjectIds) &&
            widget.settings.subjectIds.length === 0 && (
              <p>No subjects selected. This widget will show an empty state.</p>
            )}
        </fieldset>
      )}
      {widget.kind === "funding_table" && (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={widget.settings.showSources !== false}
            onChange={(event) => update("showSources", event.target.checked)}
          />
          Show source column
        </label>
      )}
      {widget.kind === "snapshot_comparison" && (
        <Field label="Earlier snapshot" htmlFor={`comparison-${widget.id}`}>
          <SelectInput
            id={`comparison-${widget.id}`}
            value={
              typeof widget.settings.snapshotId === "string"
                ? widget.settings.snapshotId
                : "previous"
            }
            onValueChange={(value) =>
              update("snapshotId", value === "previous" ? undefined : value)
            }
            options={[
              { value: "previous", label: "Previous eligible snapshot" },
              ...snapshots.map((snapshot) => ({
                value: snapshot.id,
                label: snapshot.name,
              })),
            ]}
          />
          <p className={styles.hint}>
            Must be earlier than the snapshot chosen when publishing.
          </p>
        </Field>
      )}
      {(definition.settings.some((setting) => setting.key === "title")
        ? definition.settings
        : [
            { key: "title", label: "Title", input: "text" as const },
            ...definition.settings,
          ]
      ).map((setting) => {
        const id = `widget-${widget.id}-${setting.key}`;
        const value = widget.settings[setting.key];
        const current = value == null ? "" : String(value);
        return (
          <Field key={setting.key} label={setting.label} htmlFor={id}>
            {setting.input === "textarea" ? (
              <TextArea
                id={id}
                value={current}
                maxLength={4000}
                onChange={(e) => set(setting.key, e.target.value)}
              />
            ) : (
              <TextInput
                id={id}
                type={setting.input === "number" ? "number" : "text"}
                value={current}
                maxLength={240}
                onChange={(e) => set(setting.key, e.target.value)}
              />
            )}
          </Field>
        );
      })}
      <ActionButton onClick={onRemove}>Remove widget</ActionButton>
    </div>
  );
}
