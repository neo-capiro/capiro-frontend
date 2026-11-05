"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { safeWebsite } from "@/features/portfolio/index/public";
import {
  useProfileSnapshot,
  FactSource,
  type ProfileSnapshot,
} from "@/features/portfolio/profile-build/public";
import styles from "./prospects.module.css";
const sections = [
  ["company", "Company basics"],
  ["registration", "Federal registration"],
  ["leadership", "Leadership"],
  ["lobbying", "Lobbying history"],
  ["federal_footprint", "Federal footprint"],
  ["news", "News"],
] as const;
type Section = (typeof sections)[number][0];
const fieldLabels: Record<string, string> = {
  name: "Company",
  website: "Website",
  description: "Description",
  productDescription: "Products and services",
  headquarters: "Headquarters",
  companySize: "Company size",
  employeeCount: "Employees",
  uei: "UEI",
  cageCode: "CAGE code",
  samStatus: "SAM.gov status",
  samExpirationDate: "SAM.gov expiration",
  naicsCodes: "NAICS codes",
  pscCodes: "PSC codes",
  title: "Title",
  email: "Email",
  phone: "Phone",
  externalName: "Registered name",
  externalId: "LDA identifier",
  issueCodes: "Issue codes",
  filingYear: "Filing year",
  filingPeriod: "Filing period",
  amount: "Reported amount",
  agency: "Agency",
  agencyName: "Agency",
  summary: "Summary",
  publishedAt: "Published",
  publicationDate: "Published",
  date: "Date",
  source: "Source",
  sourceName: "Source",
  awardId: "Award identifier",
  awardAmount: "Award amount",
  recipientName: "Recipient",
  contractType: "Contract type",
  url: "Source",
  sourceUrl: "Source",
  location: "Location",
  filings: "Filings",
  headline: "Headline",
  publisher: "Publisher",
  publishedDate: "Published",
  source_url: "Source",
  totalAwards: "Reported awards",
  totalObligations: "Reported obligations",
  totalAmount: "Reported total",
  fiscalYear: "Fiscal year",
  awardType: "Award type",
  awardingAgency: "Awarding agency",
  grantProgram: "Grant program",
  contractNumber: "Contract number",
  awards: "Awards",
  contracts: "Contracts",
  grants: "Grants",
  registrantName: "Registrant",
  clientName: "Client",
  year: "Year",
  period: "Period",
  income: "Reported income",
  expenses: "Reported expenses",
  issues: "Issues",
  lobbyists: "Lobbyists",
  addressLine: "Street address",
  city: "City",
  state: "State or region",
  country: "Country",
};
const companyFields = new Set([
  "name",
  "website",
  "description",
  "productDescription",
  "headquarters",
  "companySize",
  "employeeCount",
]);
const registrationFields = new Set([
  "uei",
  "cageCode",
  "samStatus",
  "samExpirationDate",
  "naicsCodes",
  "pscCodes",
]);
const matchesFact = (key: string, section: Section) =>
  section === "company"
    ? companyFields.has(key)
    : section === "registration"
      ? registrationFields.has(key)
      : section === "lobbying"
        ? key.startsWith("lda") ||
          key.startsWith("lobbying.") ||
          key === "issueCodes"
        : key.startsWith(section + ".");
function available(value: unknown): boolean {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    (!Array.isArray(value) || value.some(available))
  );
}
export function ProspectProfileSections({ id }: { id: string }) {
  const query = useProfileSnapshot({ kind: "prospect", id });
  const profile = query.data;
  return (
    <section className="stack" aria-label="Prospect profile sections">
      <nav
        className={`row ${styles.sectionLinks}`}
        aria-label="Company profile sections"
      >
        {sections.map(([key, label]) => (
          <a key={key} href={`#prospect-${key}`}>
            {label}
          </a>
        ))}
      </nav>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {profile && (
        <div className={styles.columns}>
          {sections.map(([key, label]) => (
            <ProspectSection
              key={key}
              section={key}
              label={label}
              profile={profile}
            />
          ))}
        </div>
      )}
    </section>
  );
}
function ProspectSection({
  section,
  label,
  profile,
}: {
  section: Section;
  label: string;
  profile: ProfileSnapshot;
}) {
  const status = profile.completeness.sections.find(
    (row) => row.key === section,
  );
  const rows = profile.sections[section].filter(available);
  const facts = profile.facts.filter(
    (fact) =>
      fact.isCurrent &&
      fact.status === "approved" &&
      matchesFact(fact.fieldKey, section),
  );
  const referenceOnly =
    rows.length > 0 &&
    rows.every(
      (row) =>
        row &&
        typeof row === "object" &&
        !Array.isArray(row) &&
        row.referenceOnly === true,
    );
  const coverage = profile.referenceCoverage?.[section];
  const hasDetails = rows.some((row) =>
    typeof row === "object" && row !== null
      ? Object.entries(row).some(
          ([key, value]) => Boolean(fieldLabels[key]) && available(value),
        )
      : available(row),
  );
  return (
    <section
      className="card stack"
      id={`prospect-${section}`}
      aria-label={label}
    >
      <header className="row between">
        <h2>{label}</h2>
        <span className="chip">
          {referenceOnly
            ? "Reference only"
            : status?.status === "complete"
              ? "Complete"
              : status?.status === "partial"
                ? "Partial"
                : "Not provided"}
        </span>
      </header>
      {coverage && <p className="muted">{coverage.statusText}</p>}
      {hasDetails ? (
        rows.map((row, index) => (
          <SourcedRecord key={index} value={row} section={section} />
        ))
      ) : (
        <p className="muted">
          {status?.researched
            ? "No approved information recorded from the researched sources."
            : "This section has not been researched yet."}
        </p>
      )}
      {Boolean(status?.reviewCount) && (
        <a href="#profile-research">
          Review {status!.reviewCount} proposed detail
          {status!.reviewCount === 1 ? "" : "s"}
        </a>
      )}
      {facts.length > 0 ? (
        <details>
          <summary>Sources and approval · {facts.length}</summary>
          {facts.map((fact) => (
            <div key={fact.id}>
              <strong>{fieldLabels[fact.fieldKey] ?? label}</strong>
              <FactSource fact={fact} />
            </div>
          ))}
        </details>
      ) : (
        hasDetails && (
          <small className="muted">
            {referenceOnly
              ? "Source references · not approved profile facts"
              : "Saved profile details · source attribution has not been recorded."}
          </small>
        )
      )}
      {section === "news" && (
        <small className="muted">
          Research covers the last 12 months. Dates and original sources remain
          attached to findings.
        </small>
      )}
    </section>
  );
}
function SourcedRecord({
  value,
  section,
  depth = 0,
}: {
  value: unknown;
  section: Section;
  depth?: number;
}) {
  if (!available(value) || depth > 4) return null;
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            <SourcedRecord value={item} section={section} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  if (typeof value !== "object" || value === null)
    return <span>{String(value)}</span>;
  const entries = Object.entries(value).filter(
    ([key, item]) =>
      fieldLabels[key] &&
      available(item) &&
      (depth > 0 || section !== "company" || companyFields.has(key)) &&
      (depth > 0 || section !== "registration" || registrationFields.has(key)),
  );
  return (
    <dl>
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt className="muted">
            {key === "name" && section === "leadership"
              ? "Name"
              : fieldLabels[key]}
          </dt>
          <dd>
            {typeof item === "string" &&
            ["website", "url", "sourceUrl", "source_url"].includes(key) &&
            safeWebsite(item) ? (
              <a href={safeWebsite(item)} target="_blank" rel="noreferrer">
                {item} ↗
              </a>
            ) : (
              <SourcedRecord value={item} section={section} depth={depth + 1} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
