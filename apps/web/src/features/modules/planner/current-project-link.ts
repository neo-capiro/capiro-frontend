import type { SelectedClient } from "../../../shared/session/SelectedClient";

/** The linked project must remain inside an active selected client at read time. */
export function canReadCurrentProjectLink(
  scope: SelectedClient,
  clientId: string,
): boolean {
  return (
    scope.state === "authorized-client" &&
    scope.client.id === clientId &&
    scope.client.status === "active"
  );
}
