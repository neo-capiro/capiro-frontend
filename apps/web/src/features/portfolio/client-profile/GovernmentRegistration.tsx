import type { Client } from "@/features/portfolio/index/public";
import {
  clientToIntake,
  organizationTypes,
  sectors,
  tracks,
} from "@/features/portfolio/client-intake/public";
import { ProfileFacts } from "./ProfileFacts";
import styles from "./government-profile.module.css";

const labels = (
  values: string[],
  options: readonly (readonly [string, string])[],
) =>
  values.map((value) => options.find(([key]) => key === value)?.[1] ?? value);

/** Saved profile presentation only; no registration lookup or verification. */
export function GovernmentRegistration({ client }: { client: Client }) {
  const values = clientToIntake(client);
  return (
    <div className={styles.body}>
      <section aria-label="Registration" className={styles.card}>
        <h3>Registration and identity</h3>
        <div className={styles.columns}>
          <ProfileFacts
            rows={[
              ["SAM.gov status", values.samStatus],
              ["SAM.gov expiration", values.samExpirationDate],
              ["CAGE code", values.cageCode],
              ["UEI", values.uei],
            ]}
          />
          <ProfileFacts
            rows={[
              ["LDA registrant", values.ldaRegistrantName],
              ["EIN", values.ein],
              ["NAICS", values.naicsCodes],
              ["PSC", values.pscCodes],
            ]}
          />
        </div>
        <ProfileFacts
          rows={[
            [
              "Organization types",
              labels(values.applicantTypes, organizationTypes),
            ],
            ["Federal set-aside certifications", values.setAsideCertifications],
          ]}
        />
      </section>
      <section
        aria-label="Sector and tracks"
        className={`${styles.card} ${styles.lobbying}`}
      >
        <h3>Sector, tracks and lobbying</h3>
        <ProfileFacts
          rows={[
            [
              "Sector",
              labels(values.sectors, sectors).map((value, index) =>
                index === 0 ? `${value} · primary` : value,
              ),
            ],
            ["Active tracks", labels(values.submissionTracks, tracks)],
            ["LDA issue codes", values.issueCodes],
          ]}
        />
      </section>
      <section aria-label="Sources and review" className={styles.card}>
        <h3>Sources and review</h3>
        <p className={styles.sourceNote}>
          Saved client profile · External registration status is not verified
          here.
        </p>
      </section>
    </div>
  );
}
