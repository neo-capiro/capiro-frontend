"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./template-history.module.css";

const pageSize = 50;

/** The canonical session owner filters before selecting each page. */
export function CampaignPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState("");
  const campaigns = useCapiroQuery("engagement.sessions", {
    query: {
      limit: pageSize,
      offset,
      includeArchived: false,
      search: filter.trim() || undefined,
    },
  });
  const rows = campaigns.data ?? [];
  const visible = rows;
  const page = (next: number) => {
    onChange("");
    setOffset(next);
  };
  return (
    <section className={styles.stack} aria-label="Source campaign picker">
      <Field
        label="Search campaigns"
        htmlFor="template-campaign-filter"
        description="Searches names, topics and goals across your campaigns."
      >
        <TextInput
          id="template-campaign-filter"
          value={filter}
          maxLength={160}
          disabled={disabled}
          onChange={(event) => {
            onChange("");
            setOffset(0);
            setFilter(event.target.value);
          }}
        />
      </Field>
      <StatusPanel
        loading={campaigns.loading}
        error={campaigns.error}
        onRetry={campaigns.reload}
      >
        <Field label="Source campaign" htmlFor="template-session-id">
          <SelectInput
            id="template-session-id"
            disabled={disabled || campaigns.loading || Boolean(campaigns.error)}
            value={visible.some((row) => row.id === value) ? value : ""}
            onValueChange={onChange}
            options={[
              { value: "", label: "Choose an Outreach campaign" },
              ...visible.map((row) => ({
                value: row.id,
                label: row.title || row.topic || "Untitled campaign",
              })),
            ]}
          />
        </Field>
        {!campaigns.loading && !campaigns.error && !visible.length && (
          <p>No campaigns match this search.</p>
        )}
      </StatusPanel>
      <nav className={styles.actions} aria-label="Campaign pages">
        <ActionButton
          disabled={disabled || campaigns.loading || offset === 0}
          onClick={() => page(Math.max(0, offset - pageSize))}
        >
          Previous page
        </ActionButton>
        <span>Page {Math.floor(offset / pageSize) + 1}</span>
        <ActionButton
          disabled={
            disabled ||
            campaigns.loading ||
            Boolean(campaigns.error) ||
            rows.length < pageSize
          }
          onClick={() => page(offset + pageSize)}
        >
          Next page
        </ActionButton>
      </nav>
    </section>
  );
}
