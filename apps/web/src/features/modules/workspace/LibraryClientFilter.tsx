import { useState } from "react";
import { Popover } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./workspace.module.css";
import presentation from "./library-presentation.module.css";

/** A paged consumer of the authorized picker; document pages are not a client index. */
export function LibraryClientFilter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id?: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string>();
  const clients = useCapiroQuery("workspace.clients", {
    query: { q: search, cursor, limit: 50 },
  });
  const items = clients.data?.items ?? [];
  const options = items.map((client) => ({
    value: client.id,
    label: items.some(
      (other) => other.id !== client.id && other.name === client.name,
    )
      ? `${client.name} · ${client.id}`
      : client.name,
  }));
  // Keep a selected ID when it is absent from this page, without claiming it is
  // still authorized or retaining a name from a superseded response.
  if (value && !options.some((option) => option.value === value))
    options.unshift({ value, label: "Selected client" });
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <ActionButton
          className={presentation.clientTrigger}
          aria-label="Client filter"
        >
          <span>Client</span>
          <span>
            {value
              ? (items.find((client) => client.id === value)?.name ??
                "Selected client")
              : "All clients"}
          </span>
          <ChevronDown size={12} aria-hidden="true" />
        </ActionButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={presentation.clientPicker}
          align="start"
          sideOffset={6}
          collisionPadding={16}
          aria-label="Filter library clients"
        >
          <TextInput
            aria-label="Search library clients"
            placeholder="Search clients"
            value={search}
            maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setCursor(undefined);
            }}
          />
          <SelectInput
            aria-label="Filter documents by client"
            value={value ?? ""}
            onValueChange={(id) => onChange(id || undefined)}
            options={[{ value: "", label: "All clients" }, ...options]}
          />
          <StatusPanel
            loading={clients.loading}
            error={clients.error}
            onRetry={clients.reload}
          >
            {clients.data?.items.length === 0 && (
              <p className={styles.footnote}>
                No clients on this page. Try another search or continue if more
                are available.
              </p>
            )}
            <div className={styles.actions}>
              {clients.data?.nextCursor && (
                <ActionButton
                  onClick={() =>
                    setCursor(clients.data?.nextCursor ?? undefined)
                  }
                >
                  More clients
                </ActionButton>
              )}
              {cursor && (
                <ActionButton onClick={() => setCursor(undefined)}>
                  First clients
                </ActionButton>
              )}
            </div>
          </StatusPanel>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
