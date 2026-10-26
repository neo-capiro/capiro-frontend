"use client";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import {
  ActionButton,
  Field,
  StatusPanel,
  Tabs,
  TextInput,
} from "../../../../shared/module-ui";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { personSchema } from "../../../portfolio/relationships/public";
import {
  newsletterDestinationInput,
  type NewsletterDestinationInput,
} from "../../../../shared/capiro/operations/newsletter-delivery";
import { sameUuid } from "./delivery-api";
import styles from "./newsletter-delivery.module.css";

type Choice = {
  key: string;
  name: string;
  email: string | null;
  destination: NewsletterDestinationInput | null;
};
type Mode = "congress" | "state" | "client" | "manual";
const titles = {
  congress: "Congressional Directory",
  state: "State Legislators",
  client: "Client Contacts",
  manual: "Manual Add",
};
function choice(
  key: string,
  name: string,
  email: string | null | undefined,
  extra = {},
): Choice {
  const result = newsletterDestinationInput.safeParse({
    email,
    name,
    ...extra,
  });
  return {
    key,
    name,
    email: email ?? null,
    destination: result.success ? result.data : null,
  };
}
export function DestinationPicker({
  clientId,
  selected,
  onAdd,
  disabled,
  children,
}: {
  clientId?: string;
  selected: NewsletterDestinationInput[];
  onAdd: (value: NewsletterDestinationInput) => void;
  disabled: boolean;
  children?: ReactNode;
}) {
  const api = useCapiro();
  const [mode, setMode] = useState<Mode>("congress");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const key = JSON.stringify([mode, query, page, clientId, reload]);
  const [read, setRead] = useState<{
    api: typeof api;
    key: string;
    choices?: Choice[];
    total?: number;
    error?: string;
  }>();
  useEffect(() => {
    if (mode === "manual" || (mode === "client" && !clientId)) return;
    const abort = new AbortController();
    void (async () => {
      try {
        let choices: Choice[];
        let total: number;
        if (mode === "congress") {
          const result = await api.request(
            "directory.contacts",
            { query: { q: query, page, pageSize: 20 } },
            { signal: abort.signal },
          );
          choices = result.contacts.flatMap((row) => [
            choice(row.id, row.fullName, row.email, {
              directoryContactId: row.id,
            }),
            ...row.staff
              .filter((staff) => staff.isCurrent !== false)
              .map((staff) =>
                choice(
                  `${row.id}:${staff.id}`,
                  `${staff.fullName} · ${row.fullName}`,
                  staff.email,
                  { directoryContactId: staff.id },
                ),
              ),
          ]);
          total = result.total;
        } else if (mode === "state") {
          const result = await api.request(
            "directory.state-legislators",
            { query: { q: query, page, pageSize: 20 } },
            { signal: abort.signal },
          );
          choices = result.rows.map((row) =>
            choice(row.id, row.name, row.email, { directoryContactId: row.id }),
          );
          total = result.total;
        } else {
          const result = z
            .array(personSchema)
            .parse(
              await api.request(
                "engagement.newsletter.clientPeople",
                { params: { clientId: clientId! } },
                { signal: abort.signal },
              ),
            );
          if (
            result.some((row) => !sameUuid(row.clientId, clientId!)) ||
            new Set(result.map((row) => row.id.toLowerCase())).size !==
              result.length
          )
            throw new Error("Contact association mismatch");
          choices = result
            .filter((row) =>
              `${row.name} ${row.email ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((row) => choice(row.id, row.name, row.email, { clientId }));
          total = choices.length;
        }
        if (!abort.signal.aborted) setRead({ api, key, choices, total });
      } catch {
        if (!abort.signal.aborted)
          setRead({
            api,
            key,
            error:
              "These destinations are unavailable. Refresh to check current access.",
          });
      }
    })();
    return () => abort.abort();
  }, [api, key, mode, query, page, clientId]);
  const current = read?.api === api && read.key === key ? read : undefined;
  return (
    <div className={styles.stack}>
      <Tabs
        label="Destination sources"
        items={Object.entries(titles).map(([id, label]) => ({
          id,
          label,
          disabled,
        }))}
        value={mode}
        onChange={(value) => {
          setMode(value as Mode);
          setQuery("");
          setPage(1);
        }}
      />
      {children}
      {mode === "manual" ? (
        <ManualDestination onAdd={onAdd} disabled={disabled} />
      ) : (
        <section className={styles.card} aria-label={titles[mode]}>
          <h2>{titles[mode]}</h2>
          {mode === "client" && !clientId ? (
            <p>Select a client context to browse its contacts.</p>
          ) : (
            <>
              <Field
                label="Search destinations"
                htmlFor="newsletter-destination-search"
              >
                <TextInput
                  id="newsletter-destination-search"
                  value={query}
                  maxLength={500}
                  disabled={disabled}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>
              <StatusPanel
                loading={!current}
                error={current?.error}
                onRetry={() => setReload((n) => n + 1)}
              />
              {current?.choices?.length === 0 && (
                <p>No destinations match this search.</p>
              )}
              {current?.choices?.map((row) => (
                <div className={styles.destination} key={row.key}>
                  <div>
                    <strong>{row.name}</strong>
                    <p>{row.email || "No email address"}</p>
                  </div>
                  <ActionButton
                    disabled={
                      disabled ||
                      !row.destination ||
                      selected.some(
                        (item) =>
                          item.email.toLowerCase() === row.email?.toLowerCase(),
                      )
                    }
                    onClick={() => row.destination && onAdd(row.destination)}
                  >
                    {selected.some(
                      (item) =>
                        item.email.toLowerCase() === row.email?.toLowerCase(),
                    )
                      ? "Selected"
                      : "Add"}
                  </ActionButton>
                </div>
              ))}
              {mode !== "client" && (
                <div className={styles.actions}>
                  <ActionButton
                    disabled={disabled || page === 1 || !current?.choices}
                    onClick={() => setPage((n) => n - 1)}
                  >
                    Previous
                  </ActionButton>
                  <span>Page {page}</span>
                  <ActionButton
                    disabled={
                      disabled ||
                      !current?.choices ||
                      page * 20 >= (current.total ?? 0)
                    }
                    onClick={() => setPage((n) => n + 1)}
                  >
                    Next
                  </ActionButton>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
function ManualDestination({
  onAdd,
  disabled,
}: {
  onAdd: (value: NewsletterDestinationInput) => void;
  disabled: boolean;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className={styles.card}
      onSubmit={(event) => {
        event.preventDefault();
        const result = newsletterDestinationInput.safeParse({
          name: `${first.trim()} ${last.trim()}`.trim(),
          email: email.trim().toLowerCase(),
        });
        if (!first.trim() || !last.trim() || !result.success) {
          setError("Add a first name, last name, and valid email address.");
          return;
        }
        onAdd(result.data);
        setFirst("");
        setLast("");
        setEmail("");
        setError("");
      }}
    >
      <h2>Manual Add</h2>
      <p>
        Each recipient receives an individual copy. This does not create a
        contact.
      </p>
      <Field label="First name" htmlFor="newsletter-first">
        <TextInput
          id="newsletter-first"
          value={first}
          maxLength={100}
          disabled={disabled}
          onChange={(event) => setFirst(event.target.value)}
        />
      </Field>
      <Field label="Last name" htmlFor="newsletter-last">
        <TextInput
          id="newsletter-last"
          value={last}
          maxLength={99}
          disabled={disabled}
          onChange={(event) => setLast(event.target.value)}
        />
      </Field>
      <Field label="Email address" htmlFor="newsletter-email">
        <TextInput
          id="newsletter-email"
          type="email"
          value={email}
          maxLength={320}
          disabled={disabled}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      <div>
        <ActionButton type="submit" disabled={disabled}>
          Add recipient
        </ActionButton>
      </div>
    </form>
  );
}
