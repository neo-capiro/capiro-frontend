"use client";
import { initials, memberName, type Member } from "./contracts";
import { unassignedOwner, type PortfolioIndexState } from "./filter";
import styles from "./portfolio.module.css";
export function IndexOwnerFilter({
  state,
  owners,
  options,
  ownerPending,
  currentUser,
  disabled = false,
  set,
}: {
  state: PortfolioIndexState;
  owners?: Record<
    string,
    { accountOwnerUserId: string | null; accountOwner: Member | null }
  >;
  options?: Member[];
  ownerPending: boolean;
  currentUser?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  disabled?: boolean;
  set: (key: string, value: string) => void;
}) {
  const choices = [
    ...new Map([
      ...Object.values(owners ?? {}).flatMap((a) =>
        a.accountOwner && a.accountOwnerUserId
          ? [[a.accountOwnerUserId, a.accountOwner] as const]
          : [],
      ),
      ...(options ?? []).map((member) => [member.id, member] as const),
    ]).entries(),
  ].sort((a, b) => memberName(a[1]).localeCompare(memberName(b[1])));
  const selectedOwner = choices.find(([id]) => id === state.owner)?.[1];
  const ownerAvatar = selectedOwner
    ? initials(memberName(selectedOwner))
    : state.owner === currentUser?.id
      ? initials(
          [currentUser.firstName, currentUser.lastName]
            .filter(Boolean)
            .join(" ") ||
            currentUser.email ||
            "Me",
        )
      : null;
  return (
    <div className={styles.ownerFilter}>
      {ownerAvatar && (
        <span className={styles.ownerFilterAvatar} aria-hidden="true">
          {ownerAvatar}
        </span>
      )}
      <select
        aria-label="Account owner"
        disabled={
          disabled ||
          ownerPending ||
          (state.type === "PROSPECT" ? !options : !owners)
        }
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
            {id === currentUser?.id
              ? "Owner: Me"
              : `Owner: ${memberName(owner)}`}
          </option>
        ))}
      </select>
    </div>
  );
}
