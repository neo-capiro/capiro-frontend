"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
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
import { cellStyle, DashboardGrid } from "./DashboardGrid";
import { WidgetContent } from "./DashboardWidgets";
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
}: {
  initialName: string;
  initialLayout: ResearchDashboardLayout;
  /** Live data for the preview mode; undefined while it loads. */
  preview?: ResearchShareDashboard;
  busy: boolean;
  error?: string;
  onSave: (name: string, layout: ResearchDashboardLayout) => void;
  onCancel: () => void;
}) {
  const history = useLayoutHistory(initialLayout);
  const [draft, setDraft] = useState<ResearchDashboardLayout>();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<string>();
  const [mode, setMode] = useState<"arrange" | "preview">("arrange");
  /** Read by screen readers after each keyboard or pointer change (FR-16.11). */
  const [announcement, setAnnouncement] = useState("");
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const layout = draft ?? history.present;
  const problems = layoutProblems(layout);
  const selectedWidget = layout.widgets.find((w) => w.id === selected);
  const order = normalizePhoneOrder(layout).phoneOrder;

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z")
        return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

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
    setDraft(
      current.mode === "move"
        ? moveWidget(current.base, current.id, origin.x + dx, origin.y + dy)
        : resizeWidget(current.base, current.id, origin.w + dx, origin.h + dy),
    );
  }
  function endDrag() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    setDraft((d) => {
      if (d) {
        history.commit(d);
        const moved = d.widgets.find((w) => w.id === current.id);
        if (moved)
          setAnnouncement(
            describe(moved, current.mode === "move" ? "moved" : "resized"),
          );
      }
      return undefined;
    });
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
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      history.commit(removeWidget(history.present, widget.id));
      setSelected(undefined);
      setAnnouncement(`${widgetDefinition(widget.kind).label} removed.`);
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
      setAnnouncement(
        `${widgetDefinition(widget.kind).label} cannot ${event.shiftKey ? "resize" : "move"} there.`,
      );
      return;
    }
    history.commit(next);
    setAnnouncement(describe(changed, event.shiftKey ? "resized" : "moved"));
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
        <ActionButton onClick={history.undo} disabled={!history.past.length}>
          Undo
        </ActionButton>
        <ActionButton onClick={history.redo} disabled={!history.future.length}>
          Redo
        </ActionButton>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
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
          <DashboardGrid layout={layout} dashboard={preview} />
        ) : (
          <p className={styles.hint}>Loading live data for the preview…</p>
        )
      ) : (
        <div className={styles.designer}>
          <div ref={canvas} className={`${styles.canvas} ${styles.grid}`}>
            {layout.widgets.map((widget) => (
              <section
                key={widget.id}
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
                  onPointerCancel={endDrag}
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
                  onPointerCancel={endDrag}
                />
              </section>
            ))}
          </div>
          <aside className={styles.side}>
            {selectedWidget ? (
              <WidgetSettings
                widget={selectedWidget}
                onChange={(settings) =>
                  history.commit(
                    setWidgetSettings(
                      history.present,
                      selectedWidget.id,
                      settings,
                    ),
                  )
                }
                onRemove={() => {
                  history.commit(
                    removeWidget(history.present, selectedWidget.id),
                  );
                  setSelected(undefined);
                  setAnnouncement(
                    `${widgetDefinition(selectedWidget.kind).label} removed.`,
                  );
                }}
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
                    onClick={() => {
                      const next = addWidget(history.present, definition.kind);
                      history.commit(next);
                      const added = next.widgets.at(-1);
                      if (added && next !== history.present)
                        setAnnouncement(describe(added, "added"));
                    }}
                  >
                    {definition.label}
                    <small>{definition.description}</small>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className={styles.widgetLabel}>Phone order</h3>
              <p className={styles.hint}>
                On a phone the widgets stack in this order.
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
                          setAnnouncement(
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
                          setAnnouncement(
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
  onChange,
  onRemove,
}: {
  widget: ResearchDashboardWidget;
  onChange: (settings: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const definition = widgetDefinition(widget.kind);
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
      {definition.settings.map((setting) => {
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
