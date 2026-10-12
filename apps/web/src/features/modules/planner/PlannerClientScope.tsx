"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton, SelectInput } from "../../../shared/module-ui";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import type { useCapiroQuery } from "../../../shared/capiro/queries";
import styles from "./planner.module.css";

type Clients = ReturnType<typeof useCapiroQuery<"clients.list">>;
export function PlannerClientScope({
  clients,
  section,
}: {
  clients: Clients;
  section: string;
}) {
  const router = useRouter(),
    params = useSearchParams(),
    scope = useSelectedClient();
  const selected =
    scope.state === "authorized-client" ? scope.client : undefined;
  const options = clients.data ?? [];
  const displayed =
    selected && !options.some((client) => client.id === selected.id)
      ? [...options, selected]
      : options;
  return (
    <div className={styles.tools}>
      <SelectInput
        aria-label="Planner client scope"
        value={selected?.id ?? ""}
        disabled={clients.loading || Boolean(clients.error)}
        options={[
          { value: "", label: "Scope · All clients" },
          ...displayed.map((client) => ({
            value: client.id,
            label: client.name,
          })),
        ]}
        onValueChange={(value) => {
          if (
            clients.loading ||
            clients.error ||
            (value && !options.some((client) => client.id === value))
          )
            return;
          const next = new URLSearchParams(params.toString());
          next.set("view", section);
          if (value) next.set("clientId", value);
          else next.delete("clientId");
          next.delete("task");
          next.delete("create");
          router.push(`/modules/planner?${next}`);
        }}
      />
      {clients.error && (
        <span role="alert">
          Client scopes unavailable.{" "}
          <ActionButton onClick={clients.reload}>
            Retry client scopes
          </ActionButton>
        </span>
      )}
    </div>
  );
}
