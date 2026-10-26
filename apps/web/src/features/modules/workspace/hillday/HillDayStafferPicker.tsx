"use client";

import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./hillday-correction.module.css";

export type StafferChoice = { id: string; label: string };

export function HillDayStafferPicker({
  selected,
  onSelect,
  pending,
}: {
  selected: StafferChoice | null;
  onSelect: (choice: StafferChoice | null) => void;
  pending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const contacts = useCapiroQuery("directory.contacts", {
    query: { q: search, page, pageSize: 10 },
  });
  const changePage = (next: number) => {
    onSelect(null);
    setPage(next);
  };
  const data = contacts.data;
  return (
    <section className={styles.picker} aria-label="Directory staffer search">
      <Field label="Search the Directory" htmlFor="hillday-staffer-search">
        <TextInput
          id="hillday-staffer-search"
          value={search}
          maxLength={500}
          disabled={pending}
          placeholder="Or search the Directory by name…"
          data-design-node="1064:259001"
          onChange={(event) => {
            onSelect(null);
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </Field>
      <StatusPanel
        loading={contacts.loading}
        error={contacts.error}
        onRetry={contacts.reload}
      >
        {data && (
          <>
            <div className={styles.results}>
              {data.contacts.flatMap((contact) =>
                contact.staff.map((staff) => {
                  const label = `${staff.fullName}, ${staff.title || "Role unavailable"} · ${contact.memberName || contact.fullName}`;
                  return (
                    <ActionButton
                      key={`${contact.id}:${staff.id}`}
                      className={styles.result}
                      data-design-node="1064:259003"
                      disabled={pending}
                      aria-pressed={selected?.id === staff.id}
                      onClick={() => onSelect({ id: staff.id, label })}
                    >
                      {label}
                      {selected?.id === staff.id && (
                        <span aria-hidden="true"> ✓</span>
                      )}
                    </ActionButton>
                  );
                }),
              )}
              {!data.contacts.some((contact) => contact.staff.length) && (
                <p role="status">
                  {data.total
                    ? "No staff listed on this contact page."
                    : "No matching contacts."}
                </p>
              )}
            </div>
            <footer className={styles.pagination}>
              <span>
                Contacts {data.total ? (data.page - 1) * data.pageSize + 1 : 0}–
                {Math.min(data.page * data.pageSize, data.total)} of{" "}
                {data.total.toLocaleString()}
              </span>
              <div>
                <ActionButton
                  disabled={pending || data.page <= 1}
                  onClick={() => changePage(data.page - 1)}
                >
                  Previous
                </ActionButton>
                <ActionButton
                  disabled={pending || data.page * data.pageSize >= data.total}
                  onClick={() => changePage(data.page + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </footer>
          </>
        )}
      </StatusPanel>
    </section>
  );
}
