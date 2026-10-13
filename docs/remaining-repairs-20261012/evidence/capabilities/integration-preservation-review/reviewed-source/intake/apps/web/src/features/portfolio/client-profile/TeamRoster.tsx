import { initials, memberName } from "@/features/portfolio/index/public";
import type { z } from "zod";
import type { teamMemberSchema } from "./contracts";
type TeamMember = z.infer<typeof teamMemberSchema>;
import { ownerLabels } from "./ordered-owners";
import styles from "./team.module.css";

export function TeamRoster({
  members,
  canEdit,
  canChange,
  onRemove,
}: {
  members: TeamMember[];
  canEdit: boolean;
  canChange: boolean;
  onRemove: (userId: string) => void;
}) {
  return (
    <ul className={styles.roster} aria-label="Account team members">
      {members.map((member) => {
        const name = memberName({ ...member, id: member.userId });
        const owner = member.isOwner || member.ownerRank;
        return (
          <li className={styles.member} key={member.userId}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(name)}
            </span>
            <div className={styles.person}>
              <strong>{name}</strong>
              <small>
                {member.isOwner
                  ? "Account owner"
                  : member.ownerRank
                    ? `${ownerLabels[member.ownerRank - 1]} account owner`
                    : "Team member"}
                {member.role && ` · ${member.role}`}
                {member.email && ` · ${member.email}`}
                {member.ownerAvailable === false && " · Unavailable member"}
              </small>
            </div>
            {owner ? (
              <span className={styles.owner}>Owner</span>
            ) : (
              canEdit && (
                <button
                  className={`button ghost ${styles.remove}`}
                  disabled={!canChange}
                  onClick={() => onRemove(member.userId)}
                >
                  Remove
                </button>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
