"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";

export function DefaultClientField({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const clients = useCapiroQuery("clients.list", {});
  const available =
    !clients.loading && !clients.error
      ? (clients.data?.filter((client) => client.status !== "archived") ?? [])
      : [];
  const missing =
    value !== null && !available.some((client) => client.id === value);
  return (
    <div>
      <label>
        Default client
        <select
          value={value ?? ""}
          disabled={disabled || clients.loading || Boolean(clients.error)}
          onChange={(event) => onChange(event.target.value || null)}
          aria-describedby="preferences-client-help"
        >
          <option value="">Ask me to choose a scope</option>
          {missing && (
            <option value={value!} disabled>
              {clients.loading || clients.error
                ? "Stored client — waiting for current choices"
                : "Saved client unavailable — choose another or clear"}
            </option>
          )}
          {available.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <p id="preferences-client-help">
        New conversation uses this client only when no scope is selected.
        Explicit General and client selections take precedence. Current access
        is checked again.
      </p>
      {clients.loading && <p role="status">Loading permitted clients…</p>}
      {clients.error && (
        <p role="status">
          Client choices are unavailable. Your stored choice is preserved.{" "}
          <button type="button" disabled={disabled} onClick={clients.reload}>
            Reload client choices
          </button>
        </p>
      )}
    </div>
  );
}
