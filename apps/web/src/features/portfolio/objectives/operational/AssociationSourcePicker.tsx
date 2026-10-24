"use client";
import { useCallback, useRef, useState } from "react";
import {
  Cascader,
  CascaderTrigger,
  CascaderContent,
  CascaderPanel,
  CascaderNav,
  CascaderInput,
  CascaderBreadcrumb,
  CascaderEmpty,
  CascaderList,
  CascaderItems,
  CascaderStatus,
  CascaderValue,
  type CascaderNode,
  type CascaderSingleProps,
} from "@capiro/ui/cascader";
import { useApi } from "@/shared/portfolio/api/provider";
import type { OperationalCycle } from "@/shared/capiro/operations/objective-operational";
import {
  associationKinds,
  associationLabels,
  type AssociationKind,
} from "./association-command";
import {
  loadAssociationChoices,
  type MeetingWindow,
} from "./association-sources";
import styles from "./association.module.css";

type Choice = { kind: AssociationKind; id: string; title: string };
type CycleDraft = { key: string; year: string; track: string };
const roots: CascaderNode<Choice>[] = associationKinds.map((kind) => ({
  value: kind,
  label: associationLabels[kind],
  hasChildren: true,
}));
const defaultDates = () => {
  const now = new Date();
  return {
    from: new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10),
  };
};

function SourceChoices({
  clientId,
  window,
  selected,
  onSelect,
  disabled,
}: {
  clientId: string;
  window: MeetingWindow;
  selected?: Choice;
  onSelect: (choice: Choice) => void;
  disabled: boolean;
}) {
  const api = useApi();
  const portal = useRef<HTMLDivElement>(null);
  const { from, to } = window;
  const getChildren = useCallback<
    NonNullable<CascaderSingleProps<Choice>["getChildren"]>
  >(
    async (node, { cursor, signal }) => {
      if (!node) return roots;
      const kind = associationKinds.find((value) => value === node.value);
      if (!kind) return [];
      const page = await loadAssociationChoices(
        api,
        kind,
        clientId,
        cursor ?? null,
        { from, to },
        signal,
      );
      return {
        items: page.items.map((row) => ({
          value: JSON.stringify([kind, row.id]),
          label: row.title || "Untitled work",
          data: { kind, ...row },
        })),
        nextCursor: page.nextCursor ?? undefined,
      };
    },
    [api, clientId, from, to],
  );
  return (
    <div ref={portal} className={styles.picker}>
      <Cascader<Choice>
        items={roots}
        value={selected ? JSON.stringify([selected.kind, selected.id]) : ""}
        getChildren={getChildren}
        loadKey={JSON.stringify([clientId, window])}
        disabled={disabled}
        mode="drill"
        selectable="leaf"
        searchScope="level"
        maxHeight={280}
        onValueChange={(_, details) => {
          if (details.node?.data) onSelect(details.node.data);
        }}
        labels={{
          rootLevel: "Work type",
          empty: "No available work on this page",
          error: "This list could not be loaded",
          loadMore: "Load more work",
          search: "Search loaded work",
        }}
      >
        <CascaderTrigger
          className={styles.trigger}
          aria-label="Choose existing work"
        >
          <CascaderValue placeholder="Choose existing work" />
        </CascaderTrigger>
        <CascaderContent className={styles.popup} container={portal}>
          <CascaderPanel>
            <CascaderNav>
              <CascaderInput placeholder="Search loaded work" />
            </CascaderNav>
            <CascaderBreadcrumb />
            <CascaderEmpty />
            <CascaderList>
              <CascaderItems />
            </CascaderList>
            <CascaderStatus />
          </CascaderPanel>
        </CascaderContent>
      </Cascader>
    </div>
  );
}

function CycleAnnotations({
  rows,
  onChange,
  disabled,
}: {
  rows: CycleDraft[];
  onChange: (rows: CycleDraft[]) => void;
  disabled: boolean;
}) {
  const update = (key: string, patch: Partial<CycleDraft>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  return (
    <fieldset disabled={disabled} className={styles.cycles}>
      <legend>
        Cycle annotations <span className={styles.caption}>(optional)</span>
      </legend>
      <p className={styles.caption}>
        These are your annotations for the Strategy.
      </p>
      {rows.map((row, index) => (
        <div className={styles.cycleRow} key={row.key}>
          <label>
            Fiscal year
            <input
              aria-label={`Fiscal year ${index + 1}`}
              type="number"
              min={1}
              max={9999}
              required
              value={row.year}
              onChange={(event) =>
                update(row.key, { year: event.target.value })
              }
            />
          </label>
          <label>
            Authority track
            <input
              aria-label={`Authority track ${index + 1}`}
              maxLength={600}
              value={row.track}
              onChange={(event) =>
                update(row.key, { track: event.target.value })
              }
            />
          </label>
          <button
            className="button"
            type="button"
            onClick={() =>
              onChange(rows.filter((item) => item.key !== row.key))
            }
            aria-label={`Remove cycle annotation ${index + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="button"
        type="button"
        onClick={() =>
          onChange([...rows, { key: crypto.randomUUID(), year: "", track: "" }])
        }
      >
        Add cycle annotation
      </button>
    </fieldset>
  );
}

function MeetingDates({
  dates,
  onChange,
  disabled,
}: {
  dates: ReturnType<typeof defaultDates>;
  onChange: (dates: ReturnType<typeof defaultDates>) => void;
  disabled: boolean;
}) {
  return (
    <details>
      <summary>Meeting date range</summary>
      <div className={styles.dates}>
        <label>
          From
          <input
            type="date"
            disabled={disabled}
            value={dates.from}
            onChange={(event) =>
              onChange({ ...dates, from: event.target.value })
            }
          />
        </label>
        <label>
          To
          <input
            type="date"
            disabled={disabled}
            value={dates.to}
            onChange={(event) => onChange({ ...dates, to: event.target.value })}
          />
        </label>
      </div>
      <p className={styles.caption}>
        Choose up to 93 days. “To” is the start of that day.
      </p>
    </details>
  );
}

export function AssociationSourcePicker({
  clientId,
  disabled,
  onReview,
}: {
  clientId: string;
  disabled: boolean;
  onReview: (choice: {
    action: "link";
    kind: AssociationKind;
    id: string;
    cycles: OperationalCycle[];
  }) => void;
}) {
  const [selected, setSelected] = useState<Choice>();
  const [dates, setDates] = useState(defaultDates);
  const [cycles, setCycles] = useState<CycleDraft[]>([]);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected || disabled) return;
        onReview({
          action: "link",
          kind: selected.kind,
          id: selected.id,
          cycles:
            selected.kind === "strategy"
              ? cycles.map((row) => ({
                  fiscalYear: Number(row.year),
                  authorityTrack: row.track.trim() || null,
                  basis: "human_annotation",
                  context: null,
                }))
              : [],
        });
      }}
    >
      <h3>Link existing work</h3>
      <SourceChoices
        clientId={clientId}
        selected={selected}
        onSelect={setSelected}
        disabled={disabled}
        window={{
          from: `${dates.from}T00:00:00.000Z`,
          to: `${dates.to}T00:00:00.000Z`,
        }}
      />
      <p className={styles.caption}>
        Lists include work you can currently view. Client assignment is checked
        again during review.
      </p>
      <MeetingDates dates={dates} onChange={setDates} disabled={disabled} />
      {selected?.kind === "strategy" && (
        <CycleAnnotations
          rows={cycles}
          onChange={setCycles}
          disabled={disabled}
        />
      )}
      <button
        className="button primary"
        type="submit"
        disabled={disabled || !selected}
      >
        Review link
      </button>
    </form>
  );
}
