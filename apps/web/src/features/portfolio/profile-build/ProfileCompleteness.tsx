"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useProfileSnapshot } from "./profile-queries";
import type { ProfileSubject } from "./subject";
import styles from "./profile-build.module.css";
const labels: Record<string, string> = {
  company: "Company basics",
  basics: "Company basics",
  lobbying: "Lobbying history",
  federal_footprint: "Federal footprint",
  news: "News",
  registration: "Federal registration",
  locations: "Sites",
  leadership: "Leadership",
  capabilities: "Capabilities",
  advocacy: "Advocacy profile",
  notes: "Notes",
  documents: "Documents",
};
export function ProfileCompleteness({
  subject,
  onEdit,
}: {
  subject: ProfileSubject;
  onEdit?: () => void;
}) {
  const query = useProfileSnapshot(subject);
  return (
    <aside className={styles.completeness} aria-label="Profile completeness">
      <header className="row between">
        <h2>Profile completeness</h2>
        {onEdit && (
          <button className="button ghost" onClick={onEdit}>
            Edit details
          </button>
        )}
      </header>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <>
          <p>
            {query.data.completeness.completed} of{" "}
            {query.data.completeness.total} details complete
          </p>
          <progress
            value={query.data.completeness.completed}
            max={Math.max(1, query.data.completeness.total)}
            aria-label="Completed profile details"
          />
          <ul className={styles.completenessRows}>
            {query.data.completeness.sections.map((section) => (
              <li key={section.key}>
                <span>{labels[section.key] ?? section.key}</span>
                <span className="chip">
                  {section.reviewCount
                    ? `${section.reviewCount} to review`
                    : !section.researched && section.status === "missing"
                      ? "Not researched"
                      : section.status === "complete"
                        ? "Complete"
                        : section.status === "partial"
                          ? "Partial"
                          : "Not provided"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
