import Link from "next/link";
import type { Prospect } from "@/features/portfolio/prospects/public";
import {
  clientLocation,
  initials,
  memberName,
  organizationInitials,
  type Client,
  type Member,
} from "./contracts";
import { ProfileCard } from "./ProfileResults";
import styles from "./portfolio.module.css";

export function ProspectResults({
  coreRows = [],
  rows,
  view,
  owners,
  coreOwners,
  showAdd = false,
}: {
  coreRows?: readonly Client[];
  rows: readonly Prospect[];
  view: "list" | "cards";
  owners: Record<string, Member>;
  coreOwners?: Record<string, { accountOwner: Member | null }>;
  showAdd?: boolean;
}) {
  return view === "cards" ? (
    <div className={styles.cards}>
      {coreRows.map((client) => (
        <ProfileCard
          key={client.id}
          client={client}
          ownership={coreOwners?.[client.id]}
        />
      ))}
      {rows.map((prospect) => (
        <ProspectCard
          key={prospect.id}
          prospect={prospect}
          owner={owners[prospect.ownerUserId ?? ""]}
        />
      ))}
      {showAdd && (
        <Link
          className={`${styles.addCard} ${styles.prospectAddCard}`}
          href="/portfolio/prospects?new=1"
        >
          + Add prospect
        </Link>
      )}
    </div>
  ) : (
    <div className="tableWrap">
      <table aria-label="Portfolio prospects">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Stage</th>
            <th>Location</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {coreRows.map((client) => (
            <tr key={client.id}>
              <td>
                <Link href={`/portfolio/${client.id}`}>{client.name}</Link>
              </td>
              <td>Core prospect</td>
              <td>{clientLocation(client) || "—"}</td>
              <td>
                {coreOwners?.[client.id]
                  ? memberName(coreOwners[client.id]?.accountOwner)
                  : "—"}
              </td>
            </tr>
          ))}
          {rows.map((prospect) => (
            <tr key={prospect.id}>
              <td>
                <Link href={`/portfolio/prospects/${prospect.id}`}>
                  {prospect.displayName}
                </Link>
              </td>
              <td>{stageText(prospect.stage)}</td>
              <td>{prospect.geography || "—"}</td>
              <td>
                {owners[prospect.ownerUserId ?? ""]
                  ? memberName(owners[prospect.ownerUserId ?? ""])
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProspectCard({
  prospect,
  owner,
}: {
  prospect: Prospect;
  owner?: Member;
}) {
  const description = [prospect.serviceHypothesis, prospect.geography]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      className={`${styles.profileCard} ${styles.prospectCard}`}
      href={`/portfolio/prospects/${prospect.id}`}
      aria-label={`Open prospect ${prospect.displayName}`}
    >
      <div className={styles.cardTop}>
        <span
          className={`${styles.profileLogo} ${styles.prospectLogo}`}
          aria-hidden="true"
        >
          {organizationInitials(prospect.displayName)}
        </span>
        <div className={styles.cardIdentity}>
          <h2>{prospect.displayName}</h2>
          <small>{description || "Prospect details unavailable"}</small>
        </div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.prospectBadges}>
          <span className={styles.prospectBadge}>Prospect</span>
          <span className={styles.stageBadge}>{stageText(prospect.stage)}</span>
        </span>
        {owner && (
          <span
            className={styles.ownerAvatar}
            role="img"
            aria-label={`Prospect owner: ${memberName(owner)}`}
          >
            {initials(memberName(owner))}
          </span>
        )}
      </div>
    </Link>
  );
}

function stageText(stage: string) {
  return stage
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
