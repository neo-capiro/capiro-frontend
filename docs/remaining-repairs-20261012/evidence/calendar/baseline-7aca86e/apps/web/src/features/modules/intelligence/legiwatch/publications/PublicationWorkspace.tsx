"use client";
import { useState } from "react";
import type {
  PublicationClaim,
  PublicationEvidence,
  PublicationVersion,
} from "../../../../../shared/capiro/operations/legiwatch-publication-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { LegiWatchTabs, SelectField, timecode } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { PublicationClaimsEditor } from "./PublicationClaimsEditor";
import { PublicationReview } from "./PublicationReview";

export function PublicationWorkspace({ sessionId }: { sessionId: string }) {
  const route = useLegiWatchRoute(),
    [kind, setKind] = useState<"live_update" | "hearing_recap">(
      "hearing_recap",
    ),
    [step, setStep] = useState("select"),
    [clientId, setClientId] = useState(route.clientId),
    [title, setTitle] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [folderIds, setFolderIds] = useState<string[]>([]),
    [claims, setClaims] = useState<PublicationClaim[]>([]),
    [version, setVersion] = useState<PublicationVersion>(),
    [supersedesId, setSupersedesId] = useState<string>(),
    [savedEvidence, setSavedEvidence] = useState<PublicationEvidence[]>([]);
  const candidates = useCapiroQuery("legiwatch.publication.candidates", {
      params: { sessionId },
      query: { kind },
    }),
    history = useCapiroQuery("legiwatch.publications", {
      params: { sessionId },
      query: { kind },
    }),
    clients = useCapiroQuery("clients.list", {}),
    folders = useCapiroQuery("legiwatch.folders", {});
  const create = useCapiroMutation("legiwatch.publication.create"),
    generate = useCapiroMutation("legiwatch.publication.generate");
  const evidence = [
    ...new Map(
      [...savedEvidence, ...(candidates.data?.evidence ?? [])].map((item) => [
        item.segmentId,
        item,
      ]),
    ).values(),
  ];
  const pending = create.pending || generate.pending;
  function compose() {
    const selectedEvidence = evidence.filter((item) =>
      selected.includes(item.segmentId),
    );
    setClaims(
      selectedEvidence.map((item) => ({
        id: crypto.randomUUID(),
        kind: "quote",
        text: item.text.slice(0, 2500),
        evidenceIds: [item.segmentId],
      })),
    );
    setStep("compose");
  }
  async function save(withModel = false) {
    try {
      const scope = {
        kind,
        clientId: clientId || undefined,
        folderIds,
        evidenceIds: selected,
        supersedesId,
      };
      const result = withModel
        ? await generate.run({ params: { sessionId }, body: scope })
        : await create.run({
            params: { sessionId },
            body: { ...scope, title, claims },
          });
      setVersion(result);
      setStep("review");
      history.reload();
    } catch {
      /* Display exact backend error below. */
    }
  }
  function edit(row: PublicationVersion) {
    setTitle(row.payload.title);
    setClientId(row.payload.clientId ?? "");
    setClaims(row.payload.claims);
    setSelected(row.payload.evidence.map((item) => item.segmentId));
    setSavedEvidence(row.payload.evidence);
    setFolderIds(row.payload.folders.map((folder) => folder.id));
    setSupersedesId(row.id);
    setStep("compose");
  }
  return (
    <>
      <div className={styles.actions}>
        <ActionButton
          disabled={pending}
          onClick={() => route.navigate({ publicationSessionId: null })}
        >
          Back to hearing
        </ActionButton>
        <Badge>Final retained evidence only</Badge>
      </div>
      <LegiWatchTabs
        value={step}
        items={[
          { id: "select", label: "Select evidence" },
          { id: "compose", label: "Compose reviewed draft" },
          { id: "review", label: "Review & delivery" },
          { id: "history", label: "Version history" },
        ]}
        onChange={(value) => {
          if (!pending && (value !== "review" || version)) setStep(value);
        }}
        label="Publication workflow"
      />
      {(step === "select" || step === "compose") && (
        <div className={styles.filters}>
          <SelectField
            id="publication-kind"
            label="Publication type"
            value={kind}
            onChange={(value) => {
              if (!pending) {
                setKind(value as "live_update" | "hearing_recap");
                setSelected([]);
                setSavedEvidence([]);
                setClaims([]);
                setVersion(undefined);
                setSupersedesId(undefined);
                setStep("select");
              }
            }}
          >
            <option value="live_update">Hearing update</option>
            <option value="hearing_recap">Hearing recap</option>
          </SelectField>
          <SelectField
            id="publication-client"
            label="Client / scope"
            value={clientId}
            onChange={(value) => {
              setClientId(value);
              setFolderIds([]);
            }}
          >
            <option value="">No client selected</option>
            {clients.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </SelectField>
          <Field label="Publication title" htmlFor="publication-title">
            <TextInput
              id="publication-title"
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Reviewed hearing update"
            />
          </Field>
        </div>
      )}
      {step === "select" && (
        <StatusPanel
          loading={candidates.loading}
          error={candidates.error}
          onRetry={candidates.reload}
          empty={
            candidates.data?.evidence.length === 0
              ? "No final evidence available. Interim testimony cannot support a reviewed publication."
              : undefined
          }
        >
          <p className={styles.description}>{candidates.data?.selection}</p>
          <div className={styles.list}>
            {evidence.map((item) => (
              <article key={item.segmentId} className={styles.card}>
                <strong>
                  {timecode(item.startMs)} ·{" "}
                  {item.speakerLabel ?? "Speaker not identified"}
                </strong>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.segmentId)}
                    onChange={(event) =>
                      setSelected((previous) =>
                        event.target.checked
                          ? [...previous, item.segmentId]
                          : previous.filter((id) => id !== item.segmentId),
                      )
                    }
                  />
                  Final transcript evidence
                </label>
                <blockquote className={styles.briefText}>
                  {item.text}
                </blockquote>
                <p className={styles.description}>
                  Segment {item.segmentId} · Exact hash {item.hash}
                </p>
              </article>
            ))}
          </div>
          <div className={styles.banner}>
            <strong>Evidence selection</strong>Selected final evidence is
            retained with its exact source revision. A preliminary model summary
            cannot establish a final quote.
          </div>
          <ActionButton primary disabled={!selected.length} onClick={compose}>
            Compose reviewed draft
          </ActionButton>
        </StatusPanel>
      )}
      {step === "compose" && (
        <>
          <PublicationClaimsEditor
            claims={claims}
            onChange={setClaims}
            evidence={evidence.filter((item) =>
              selected.includes(item.segmentId),
            )}
          />
          <section className={styles.card}>
            <h2>Folder context</h2>
            <StatusPanel
              loading={folders.loading}
              error={folders.error}
              onRetry={folders.reload}
            >
              {folders.data
                ?.filter(
                  (folder) =>
                    !folder.archived && folder.clientId === (clientId || null),
                )
                .map((folder) => (
                  <label key={folder.id} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={folderIds.includes(folder.id)}
                      onChange={(event) =>
                        setFolderIds((previous) =>
                          event.target.checked
                            ? [...previous, folder.id]
                            : previous.filter((id) => id !== folder.id),
                        )
                      }
                    />
                    {folder.name}
                  </label>
                ))}
            </StatusPanel>
          </section>
          <div className={styles.actions}>
            <ActionButton disabled={pending} onClick={() => setStep("select")}>
              Review evidence
            </ActionButton>
            <ActionButton
              disabled={pending || !selected.length}
              onClick={() => void save(true)}
            >
              {generate.pending
                ? "Drafting from final evidence…"
                : "Draft with Meri"}
            </ActionButton>
            <ActionButton
              primary
              disabled={
                pending ||
                !title.trim() ||
                !claims.length ||
                claims.some(
                  (claim) => !claim.text.trim() || !claim.evidenceIds.length,
                )
              }
              onClick={() => void save()}
            >
              {create.pending
                ? "Creating version…"
                : "Create immutable version"}
            </ActionButton>
          </div>
          {supersedesId && (
            <p className={styles.description}>
              This creates a new version superseding {supersedesId}; prior
              approval is not transferred.
            </p>
          )}
        </>
      )}
      {step === "review" && version && (
        <PublicationReview
          key={`${version.id}-${version.contentHash}`}
          sessionId={sessionId}
          version={version}
          onEdit={() => edit(version)}
          onApproved={() => {
            setVersion((previous) =>
              previous ? { ...previous, status: "approved" } : previous,
            );
            history.reload();
          }}
        />
      )}
      {step === "history" && (
        <StatusPanel
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
          empty={
            history.data?.length === 0
              ? "No reviewed versions for this publication type."
              : undefined
          }
        >
          <div className={styles.list}>
            {history.data?.map((row) => (
              <article className={styles.listItem} key={row.id}>
                <div className={styles.row}>
                  <strong>{row.payload.title}</strong>
                  <Badge>{row.status}</Badge>
                </div>
                <p className={styles.description}>
                  Version {row.version} ·{" "}
                  {new Date(row.createdAt).toLocaleString()}
                  {row.supersedesId ? " · Supersedes a prior version" : ""}
                </p>
                <div className={styles.actions}>
                  <ActionButton
                    onClick={() => {
                      setVersion(row);
                      setStep("review");
                    }}
                  >
                    Review version
                  </ActionButton>
                  <ActionButton onClick={() => edit(row)}>
                    Create corrected version
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.description}>
            Latest 50 versions for this session and publication type.
          </p>
        </StatusPanel>
      )}
      {(create.error || generate.error) && (
        <p role="alert" className={styles.error}>
          {create.error?.message ?? generate.error?.message}
        </p>
      )}
    </>
  );
}
