"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  PageHeader,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import { ResearchPortfolioDetail } from "./ResearchDetail";
import styles from "./research.module.css";
export function ResearchPortfoliosScreen() {
  const api = useCapiro();
  const params = useSearchParams();
  const [id, setId] = useState(params.get("portfolioId") || "");
  const [role, setRole] = useState("");
  const [mode, setMode] = useState("");
  const [lifecycle, setLifecycle] = useState("active");
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [newMode, setNewMode] = useState<"manual" | "rules" | "hybrid">(
    "manual",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("research.list", {
    query: { cursor, limit: 50 },
  });
  const rows = (query.data?.items || []).filter(
    (r) =>
      (!role || r.myRole === role) &&
      (!mode || r.mode === mode) &&
      (!lifecycle || r.lifecycle === lifecycle),
  );
  const view = params.get("view") || "overview";
  async function create() {
    setBusy(true);
    setError(undefined);
    try {
      const receipt = await api.request("research.create", {
        body: {
          name,
          purpose: purpose || null,
          mode: newMode,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      setCreating(false);
      setName("");
      setPurpose("");
      query.reload();
      setId(receipt.portfolioId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create portfolio");
    } finally {
      setBusy(false);
    }
  }
  if (id)
    return (
      <ResearchPortfolioDetail
        id={id}
        initialView={view}
        onBack={() => {
          setId("");
          query.reload();
        }}
      />
    );
  return (
    <>
      <PageHeader
        title="Research Portfolios"
        description={
          view !== "overview"
            ? `Choose a portfolio to open ${view}.`
            : undefined
        }
        actions={
          <ActionButton primary onClick={() => setCreating(true)}>
            + New portfolio
          </ActionButton>
        }
      />
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          aria-label="Portfolio role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Role · Any</option>
          {["owner", "editor", "viewer"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Portfolio mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="">Mode · Any</option>
          {["manual", "rules", "hybrid"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Portfolio status"
          value={lifecycle}
          onChange={(e) => setLifecycle(e.target.value)}
        >
          <option value="">Status · All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.cards}>
          {rows.map((r) => (
            <button
              key={r.id}
              className={styles.card}
              onClick={() => setId(r.id)}
            >
              <header>
                <h2>{r.name}</h2>
                <Badge tone={r.lifecycle === "active" ? "success" : "neutral"}>
                  {r.lifecycle}
                </Badge>
              </header>
              <p>{r.purpose || "Purpose not provided"}</p>
              <dl>
                {[
                  ["Members", r.memberCount],
                  ["Clients", r.clientLinkCount],
                  ["Role", r.myRole],
                  ["Mode", r.mode],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </button>
          ))}
        </div>
        {!rows.length && <p>No portfolios match the current filters.</p>}
        <footer className={styles.footer}>
          <ActionButton
            disabled={!history.length}
            onClick={() => {
              setCursor(history[history.length - 1]);
              setHistory(history.slice(0, -1));
            }}
          >
            Previous
          </ActionButton>
          <ActionButton
            disabled={!query.data?.nextCursor}
            onClick={() => {
              setHistory([...history, cursor]);
              setCursor(query.data?.nextCursor || undefined);
            }}
          >
            Next
          </ActionButton>
        </footer>
      </StatusPanel>
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="New research portfolio"
        footer={
          <ActionButton
            primary
            disabled={busy || !name.trim()}
            onClick={create}
          >
            Create portfolio
          </ActionButton>
        }
      >
        <div className={styles.form}>
          <Field label="Name" htmlFor="new-portfolio-name">
            <TextInput
              id="new-portfolio-name"
              value={name}
              maxLength={240}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Purpose" htmlFor="new-portfolio-purpose">
            <TextArea
              id="new-portfolio-purpose"
              value={purpose}
              maxLength={4000}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </Field>
          <Field label="Mode" htmlFor="new-portfolio-mode">
            <select
              id="new-portfolio-mode"
              className={styles.select}
              value={newMode}
              onChange={(e) => setNewMode(e.target.value as typeof newMode)}
            >
              {["manual", "rules", "hybrid"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          {error && <p role="alert">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
