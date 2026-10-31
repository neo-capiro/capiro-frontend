import Link from "next/link";
import { useId } from "react";
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
import { sortProspectProfiles, type PortfolioIndexState } from "./filter";
import styles from "./portfolio.module.css";

export function ProspectResults({
  coreRows = [],
  rows,
  view,
  owners,
  coreOwners,
  showAdd = false,
  sort = "saved",
}: {
  coreRows?: readonly Client[];
  rows: readonly Prospect[];
  view: "list" | "cards";
  owners: Record<string, Member>;
  coreOwners?: Record<string, { accountOwner: Member | null }>;
  showAdd?: boolean;
  sort?: PortfolioIndexState["sort"];
}) {
  const ordered = sortProspectProfiles(coreRows, rows, sort);
  return view === "cards" ? (
    <div className={styles.cards}>
      {ordered.map((row) =>
        row.kind === "core" ? (
          <ProfileCard
            key={`core:${row.record.id}`}
            client={row.record}
            ownership={coreOwners?.[row.record.id]}
          />
        ) : (
          <ProspectCard
            key={`prospect:${row.record.id}`}
            prospect={row.record}
            owner={owners[row.record.ownerUserId ?? ""]}
          />
        ),
      )}
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
          {ordered.map((row) => {
            if (row.kind === "core") {
              const client = row.record;
              return (
                <tr key={`core:${client.id}`}>
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
              );
            }
            const prospect = row.record;
            return (
              <tr key={`prospect:${prospect.id}`}>
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
            );
          })}
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
  const descriptionId = useId();
  const description = [prospect.serviceHypothesis, prospect.geography]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={`${styles.profileCard} ${styles.prospectCard}`}>
      <div className={styles.cardTop}>
        <span
          className={`${styles.profileLogo} ${styles.prospectLogo}`}
          aria-hidden="true"
        >
          {organizationInitials(prospect.displayName)}
        </span>
        <div className={styles.cardIdentity}>
          <h2>
            <Link
              className={styles.profileLink}
              href={`/portfolio/prospects/${prospect.id}`}
              aria-label={`Open prospect ${prospect.displayName}`}
              aria-describedby={descriptionId}
            >
              {prospect.displayName}
            </Link>
          </h2>
          <small id={descriptionId}>
            {description ||
              `${stageText(prospect.stage)} · no service hypothesis saved`}
          </small>
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
    </div>
  );
}

function stageText(stage: string) {
  return stage
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
