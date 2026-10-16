"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  engagementPlanWaveCreateBody,
  engagementPlanWavePatchBody,
  type EngagementPlan,
  type EngagementPlanWave,
} from "../../../../shared/capiro/operations/engagement-plans";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  TextInput,
} from "../../../../shared/module-ui";
import type { PlanCommands } from "./usePlanCommands";
import styles from "./plan.module.css";

export function PlanWaves({
  plan,
  commands,
}: {
  plan: EngagementPlan;
  commands: PlanCommands;
}) {
  const api = useCapiro();
  const [editing, setEditing] = useState<EngagementPlanWave | "new" | null>(
    null,
  );
  const waves = [...plan.waves].sort((a, b) => a.position - b.position);
  const active = waves.filter((wave) => !wave.archivedAt);
  const disabled = commands.blocked || plan.lifecycle === "archived";
  function archive(wave: EngagementPlanWave) {
    const action = wave.archivedAt ? "restore" : "archive";
    return commands.run({
      label: `Wave ${action}`,
      request: () =>
        api.request("engagement.plans.wave.update", {
          params: { planId: plan.id, waveId: wave.id },
          body: { expectedPlanVersion: plan.version, action },
        }),
      expected: {
        clientId: plan.clientId,
        planId: plan.id,
        version: plan.version + 1,
        waveId: wave.id,
        waveArchived: action === "archive",
      },
    });
  }
  function move(wave: EngagementPlanWave, offset: number) {
    const index = active.findIndex((item) => item.id === wave.id);
    const ordered = [...active];
    [ordered[index], ordered[index + offset]] = [
      ordered[index + offset]!,
      ordered[index]!,
    ];
    const waveIds = ordered.map((item) => item.id);
    return commands.run({
      label: "Wave order",
      request: () =>
        api.request("engagement.plans.wave.reorder", {
          params: { planId: plan.id },
          body: { expectedPlanVersion: plan.version, waveIds },
        }),
      expected: {
        clientId: plan.clientId,
        planId: plan.id,
        version: plan.version + 1,
        waveOrder: waveIds,
      },
    });
  }
  return (
    <section className={styles.stack} aria-label="Plan waves">
      <div className={styles.tools}>
        <h3>Waves</h3>
        <ActionButton disabled={disabled} onClick={() => setEditing("new")}>
          + Add wave
        </ActionButton>
      </div>
      {waves.length === 0 && (
        <p className={styles.muted}>
          This plan has no waves. Add a manual wave without scheduling or
          sending anything.
        </p>
      )}
      {waves.map((wave) => (
        <article className={styles.wave} key={wave.id} aria-label={wave.title}>
          <div className={styles.tools}>
            <h4>{wave.title}</h4>
            {wave.archivedAt && <Badge>Archived</Badge>}
          </div>
          <p className={styles.muted}>{wave.formatLabel ?? "Format not set"}</p>
          <p>
            {wave.window
              ? `${wave.window.startDate} to ${wave.window.endDateExclusive} (exclusive) · ${wave.window.timeZone}`
              : "Window not set"}
          </p>
          {wave.unavailableOfficeTargetIds.length > 0 && (
            <p role="status">
              Some recorded office references are currently unavailable.
            </p>
          )}
          <div className={styles.tools}>
            <ActionButton
              disabled={disabled || Boolean(wave.archivedAt)}
              onClick={() => setEditing(wave)}
            >
              Edit wave
            </ActionButton>
            <ActionButton
              disabled={disabled}
              onClick={() => void archive(wave)}
            >
              {wave.archivedAt ? "Restore wave" : "Archive wave"}
            </ActionButton>
            {!wave.archivedAt && (
              <>
                <ActionButton
                  aria-label={`Move ${wave.title} up`}
                  disabled={disabled || active[0]?.id === wave.id}
                  onClick={() => void move(wave, -1)}
                >
                  Move up
                </ActionButton>
                <ActionButton
                  aria-label={`Move ${wave.title} down`}
                  disabled={disabled || active.at(-1)?.id === wave.id}
                  onClick={() => void move(wave, 1)}
                >
                  Move down
                </ActionButton>
              </>
            )}
          </div>
        </article>
      ))}
      {editing && (
        <WaveEditor
          key={typeof editing === "object" ? editing.id : "new"}
          plan={plan}
          wave={typeof editing === "object" ? editing : undefined}
          commands={commands}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function WaveEditor({
  plan,
  wave,
  commands,
  onClose,
}: {
  plan: EngagementPlan;
  wave?: EngagementPlanWave;
  commands: PlanCommands;
  onClose: () => void;
}) {
  const api = useCapiro();
  const [title, setTitle] = useState(wave?.title ?? "");
  const [format, setFormat] = useState(wave?.formatLabel ?? "");
  const [window, setWindow] = useState({
    startDate: wave?.window?.startDate ?? "",
    endDateExclusive: wave?.window?.endDateExclusive ?? "",
    timeZone: wave?.window?.timeZone ?? "",
  });
  const [error, setError] = useState<string>();
  const requestId = useRef(crypto.randomUUID());
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const fields = {
        title,
        formatLabel: format.trim() || null,
        window: Object.values(window).some(Boolean) ? window : null,
        expectedPlanVersion: plan.version,
      };
      const expected = {
        clientId: plan.clientId,
        planId: plan.id,
        version: plan.version + 1,
      };
      let result: boolean;
      if (wave) {
        const body = engagementPlanWavePatchBody.parse(fields);
        const unchanged =
          body.title === wave.title &&
          body.formatLabel === wave.formatLabel &&
          JSON.stringify(body.window) === JSON.stringify(wave.window);
        result = await commands.run({
          label: "Wave edit",
          request: () =>
            api.request("engagement.plans.wave.update", {
              params: { planId: plan.id, waveId: wave.id },
              body,
            }),
          expected: {
            ...expected,
            version: plan.version + (unchanged ? 0 : 1),
            waveId: wave.id,
            wavePatch: {
              title: body.title,
              formatLabel: body.formatLabel,
              window: body.window,
              officeTargetIds: body.officeTargetIds,
            },
          },
        });
      } else result = await create(fields, expected);
      if (result) onClose();
    } catch {
      setError(
        "Provide a title, and either no window or real start/exclusive-end dates with an explicit IANA timezone.",
      );
    }
  }
  function create(
    fields: unknown,
    expected: { clientId: string; planId: string; version: number },
  ) {
    const body = engagementPlanWaveCreateBody.parse({
      ...(fields as object),
      requestId: requestId.current,
    });
    return commands.run({
      label: "Wave creation",
      request: () =>
        api.request("engagement.plans.wave.create", {
          params: { planId: plan.id },
          body,
        }),
      expected: {
        ...expected,
        creation: {
          operation: "create_wave",
          requestId: body.requestId,
          planVersion: plan.version + 1,
        },
      },
    });
  }
  return (
    <Modal
      open
      title={wave ? "Edit wave" : "Add wave"}
      description="Manual planning context; this does not schedule or execute work."
      onOpenChange={(open) => {
        if (!open && !commands.busy && !commands.canReconcile) onClose();
      }}
    >
      <form className={styles.stack} onSubmit={(event) => void submit(event)}>
        <Field label="Wave title" htmlFor="wave-title">
          <TextInput
            id="wave-title"
            required
            maxLength={200}
            value={title}
            disabled={commands.blocked}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Format (optional)" htmlFor="wave-format">
          <TextInput
            id="wave-format"
            maxLength={120}
            value={format}
            disabled={commands.blocked}
            onChange={(event) => setFormat(event.target.value)}
          />
        </Field>
        {(
          [
            ["startDate", "Start date", "date"],
            ["endDateExclusive", "End date (exclusive)", "date"],
            ["timeZone", "IANA timezone", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <Field label={label} htmlFor={`wave-${key}`} key={key}>
            <TextInput
              id={`wave-${key}`}
              type={type}
              value={window[key]}
              disabled={commands.blocked}
              onChange={(event) =>
                setWindow((value) => ({ ...value, [key]: event.target.value }))
              }
            />
          </Field>
        ))}
        <p className={styles.muted}>
          A supplied window includes the start date and excludes the end date.
          No timezone or date is inferred. Existing office references are
          preserved; office selection is unavailable.
        </p>
        {(error || commands.error) && (
          <p role="alert">{error ?? commands.error}</p>
        )}
        {commands.uncertain && !commands.canReconcile && (
          <p role="status">
            The outcome is unconfirmed. Close this editor and reload the current
            plan before another edit. Closing does not replay or clear the
            uncertain write.
          </p>
        )}
        <div className={styles.tools}>
          <ActionButton
            type="button"
            onClick={onClose}
            disabled={commands.busy || commands.canReconcile}
          >
            {commands.uncertain ? "Close editor for read-back" : "Cancel"}
          </ActionButton>
          <ActionButton primary type="submit" disabled={commands.blocked}>
            {wave ? "Save wave" : "Create wave"}
          </ActionButton>
          {commands.canReconcile && (
            <ActionButton
              type="button"
              disabled={commands.busy}
              onClick={() =>
                void commands.reconcile().then((saved) => {
                  if (saved) onClose();
                })
              }
            >
              Reconcile original creation
            </ActionButton>
          )}
        </div>
      </form>
    </Modal>
  );
}
