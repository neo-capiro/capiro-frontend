import type { QueryClient } from "@tanstack/react-query";
import type {
  UserPreferencesOwner,
  UserPreferencesSaveRequest,
} from "@capiro/meri-client/user-preferences";

export type PreferencesAttempt = Readonly<{
  status:
    | "idle"
    | "pending"
    | "saved"
    | "unknown"
    | "result-withheld"
    | "access-lost";
  request?: UserPreferencesSaveRequest;
  accessLost?: boolean;
}>;
export interface PreferencesJournal {
  current(): boolean;
  read(): PreferencesAttempt;
  write(value: PreferencesAttempt): void;
}
const idle: PreferencesAttempt = Object.freeze({ status: "idle" });

/** Session/client cache owns private attempts in memory, never browser persistence. */
export function userPreferencesJournal(
  client: QueryClient,
  owner: UserPreferencesOwner,
): PreferencesJournal {
  const key = [
    "meri",
    "user-preferences-attempt",
    owner.tenantId,
    owner.actorId,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity, structuralSharing: false });
  client.setQueryData<PreferencesAttempt>(key, (previous) => previous ?? idle);
  const cache = client.getQueryCache();
  const owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    current,
    read: () =>
      current()
        ? (client.getQueryData<PreferencesAttempt>(key) ?? idle)
        : { status: "access-lost" },
    write: (value) => {
      if (current()) client.setQueryData(key, Object.freeze(value));
    },
  };
}
