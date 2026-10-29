"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  ResearchDetail,
  ResearchMember,
  researchReceipt,
} from "../../../../shared/capiro/operations/research-schemas";
import type { researchPortfolioOperations } from "../../../../shared/capiro/operations/research-portfolios";
import { CapiroApiError } from "../../../../shared/capiro/http";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import {
  awardTargets,
  researchTargets,
  type MemberTarget,
} from "./member-discovery";
import styles from "../research.module.css";

type AddBody = z.infer<
  (typeof researchPortfolioOperations)["research.members.add"]["request"]
>["body"];
export function MemberDiscovery({
  portfolio,
  resolving,
  onClose,
  onSaved,
  onReload,
}: {
  portfolio: ResearchDetail;
  resolving?: ResearchMember;
  onClose: () => void;
  onSaved: (receipt: z.infer<typeof researchReceipt>) => void;
  onReload: () => void;
}) {
  const [kind, setKind] = useState<MemberTarget["kind"]>(
    resolving?.targetKind ?? "program_element",
  );
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MemberTarget>();
  const [retained, setRetained] = useState<AddBody>();
  const [unknown, setUnknown] = useState(false);
  const add = useCapiroMutation("research.members.add");
  const resolve = useCapiroMutation("research.members.resolve");
  const action = resolving ? resolve : add;
  const search = useCapiroQuery(
    "research.members.search",
    { query: { q: submitted, semanticEnabled: false } },
    { enabled: !!submitted && kind !== "award" },
  );
  const awards = useCapiroQuery(
    "research.members.awards",
    { query: { q: submitted, page, pageSize: 20 } },
    { enabled: !!submitted && kind === "award" },
  );
  const query = kind === "award" ? awards : search;
  const targets =
    kind === "award"
      ? awardTargets(awards.data)
      : researchTargets(search.data, kind);
  const locked = action.pending || unknown;
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const existing = (target: MemberTarget) =>
    portfolio.members.some(
      (member) =>
        member.id !== resolving?.id &&
        member.targetKind === target.kind &&
        member.targetId === target.id,
    );
  async function save() {
    if (!editable || !selected) return;
    const body = retained ?? {
      expectedRevision: portfolio.revision,
      idempotencyKey: crypto.randomUUID(),
      targetKind: selected.kind,
      targetId: selected.id,
      label: selected.label.slice(0, 500),
    };
    setRetained(body);
    try {
      const receipt = resolving
        ? await resolve.run({
            params: { id: portfolio.id, memberId: resolving.id },
            body,
          })
        : await add.run({ params: { id: portfolio.id }, body });
      setRetained(undefined);
      setUnknown(false);
      onSaved(receipt);
    } catch (error) {
      const refused =
        error instanceof CapiroApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408;
      setUnknown(!refused);
      if (refused) setRetained(undefined);
    }
  }
  return (
    <Modal
      open
      closeDisabled={locked}
      onOpenChange={(open) => {
        if (!open && !locked) onClose();
      }}
      title={resolving ? "Resolve portfolio member" : "Add portfolio member"}
      footer={
        <ActionButton
          primary
          disabled={
            !editable ||
            action.pending ||
            !selected ||
            (!unknown && existing(selected))
          }
          onClick={save}
        >
          {unknown
            ? "Retry same request"
            : resolving
              ? "Resolve member"
              : "Add selected member"}
        </ActionButton>
      }
    >
      <div className={styles.form}>
        {resolving && (
          <p>
            Resolve {resolving.label || resolving.targetId} to an existing
            canonical record. It will become included.
          </p>
        )}
        <Field label="Member type" htmlFor="member-discovery-kind">
          <select
            id="member-discovery-kind"
            className={styles.select}
            value={kind}
            disabled={locked}
            onChange={(event) => {
              setKind(event.target.value as MemberTarget["kind"]);
              setSubmitted("");
              setSelected(undefined);
              setPage(1);
              setRetained(undefined);
            }}
          >
            {(
              [
                "program_element",
                "program",
                "project",
                "budget_line",
                "award",
              ] as const
            ).map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!locked && term.trim().length >= 2) {
              setSubmitted(term.trim());
              setSelected(undefined);
              setPage(1);
              setRetained(undefined);
              query.reload();
            }
          }}
          className={styles.toolbar}
        >
          <Field
            label={
              kind === "award"
                ? "Find by contractor, PIID, agency or description"
                : "Find by name, code, alias or capability"
            }
            htmlFor="member-discovery-term"
          >
            <TextInput
              id="member-discovery-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              disabled={locked}
              minLength={2}
              maxLength={200}
            />
          </Field>
          <ActionButton
            type="submit"
            disabled={locked || term.trim().length < 2}
          >
            Find members
          </ActionButton>
        </form>
        <StatusPanel
          loading={query.loading}
          error={query.error || action.error}
          onRetry={query.reload}
          empty={
            submitted && !query.loading && !query.error && !targets.length
              ? "No matching members were returned. Try a more specific name or code."
              : undefined
          }
        />
        {unknown && (
          <p role="status">
            The outcome is uncertain. Retry sends the same captured request and
            key. Reload the portfolio to inspect its current state before
            leaving this page.{" "}
            <ActionButton onClick={onReload}>Reload portfolio</ActionButton>
          </p>
        )}
        {!unknown && action.error && (
          <p>
            The request was refused; no successful receipt was received. Reload
            the portfolio before correcting a stale revision.{" "}
            <ActionButton onClick={onReload}>Reload portfolio</ActionButton>
          </p>
        )}
        {!!targets.length && (
          <DataTable
            caption="Matching member records"
            rows={targets}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "select",
                label: "Select",
                render: (row) => (
                  <input
                    type="radio"
                    name="member-target"
                    aria-label={`Select ${row.label}`}
                    checked={
                      selected?.id === row.id && selected.kind === row.kind
                    }
                    disabled={locked || existing(row)}
                    onChange={() => {
                      setSelected(row);
                      setRetained(undefined);
                    }}
                  />
                ),
              },
              {
                key: "member",
                label: "Member",
                render: (row) => (
                  <>
                    <strong>{row.label}</strong>
                    <p>{row.id}</p>
                    {existing(row) && (
                      <p>Already a member; use its decision controls.</p>
                    )}
                  </>
                ),
              },
              { key: "detail", label: "Match", render: (row) => row.detail },
            ]}
          />
        )}
        {submitted && kind !== "award" && search.data && (
          <div>
            <p>
              Results are a bounded set of exact and accepted capability
              matches. Narrow the search for additional records.
            </p>
            {[
              search.data.exact.reason,
              search.data.capability.reason,
              ...search.data.limitations,
            ]
              .filter(Boolean)
              .map((limit, index) => (
                <p key={index}>{limit}</p>
              ))}
          </div>
        )}
        {kind === "award" && awards.data && (
          <div className={styles.toolbar}>
            <ActionButton
              disabled={locked || page === 1}
              onClick={() => {
                setPage(page - 1);
                setSelected(undefined);
              }}
            >
              Previous awards
            </ActionButton>
            <span>
              Page {page} · {awards.data.total} matching awards
            </span>
            <ActionButton
              disabled={locked || page * 20 >= awards.data.total}
              onClick={() => {
                setPage(page + 1);
                setSelected(undefined);
              }}
            >
              Next awards
            </ActionButton>
          </div>
        )}
      </div>
    </Modal>
  );
}
