"use client";
import { memberName, type Member } from "./contracts";
import { unassignedOwner, type PortfolioIndexState } from "./filter";
import styles from "./portfolio.module.css";
export function IndexOwnerFilter({
  state,
  owners,
  ownerPending,
  set,
}: {
  state: PortfolioIndexState;
  owners?: Record<
    string,
    { accountOwnerUserId: string | null; accountOwner: Member | null }
  >;
  ownerPending: boolean;
  set: (key: string, value: string) => void;
}) {
  const choices = [
    ...new Map(
      Object.values(owners ?? {}).flatMap((a) =>
        a.accountOwner && a.accountOwnerUserId
          ? [[a.accountOwnerUserId, a.accountOwner] as const]
          : [],
      ),
    ).entries(),
  ].sort((a, b) => memberName(a[1]).localeCompare(memberName(b[1])));
  return (
    <div className={styles.ownerFilter}>
      <select
        aria-label="Account owner"
        disabled={!owners || ownerPending}
        value={state.owner}
        onChange={(e) => set("owner", e.target.value)}
      >
        <option value="">All owners</option>
        <option value={unassignedOwner}>Unassigned</option>
        {state.owner &&
          state.owner !== unassignedOwner &&
          !choices.some(([id]) => id === state.owner) && (
            <option value={state.owner}>Selected owner (not available)</option>
          )}
        {choices.map(([id, owner]) => (
          <option key={id} value={id}>
            {memberName(owner)}
          </option>
        ))}
      </select>
    </div>
  );
}
