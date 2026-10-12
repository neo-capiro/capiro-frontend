"use client";
import type { Client } from "@/features/portfolio/index/public";
import {
  clientToIntake,
  organizationTypes,
  sectors,
  tracks,
} from "@/features/portfolio/client-intake/public";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { ProfileFacts } from "./ProfileFacts";
import styles from "./profile-details.module.css";

const labels = (
  values: string[],
  options: readonly (readonly [string, string])[],
) =>
  values.map((value) => options.find(([key]) => key === value)?.[1] ?? value);

export function GovernmentInfo({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const values = clientToIntake(client);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Government info"
      className={styles.government}
    >
      <section aria-label="Registration" className={styles.group}>
        <h3>Registration</h3>
        <ProfileFacts
          rows={[
            ["CAGE code", values.cageCode],
            ["UEI", values.uei],
            ["SAM.gov status", values.samStatus],
            ["SAM.gov expiration", values.samExpirationDate],
            ["LDA registrant", values.ldaRegistrantName],
            ["EIN", values.ein],
            ["NAICS", values.naicsCodes],
            ["PSC", values.pscCodes],
            [
              "Organization types",
              labels(values.applicantTypes, organizationTypes),
            ],
            ["Federal set-aside certifications", values.setAsideCertifications],
          ]}
        />
      </section>
      <section aria-label="Sector and tracks" className={styles.group}>
        <h3>Sector and tracks</h3>
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
      <div className="row between">
        <small className="muted">
          Saved client profile · External registration status is not verified
          here.
        </small>
        <button className="button primary" onClick={() => onOpenChange(false)}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
