"use client";
import { useState } from "react";
import type { Client } from "@/features/portfolio/index/public";
import {
  clientToIntake,
  businessFlags,
} from "@/features/portfolio/client-intake/public";
import { GovernmentInfo } from "./GovernmentInfo";
import { ProfileFacts } from "./ProfileFacts";
import styles from "./profile-details.module.css";

/** Saved read data only; edits keep their existing intake and authority owner. */
export function ClientDetails({ client }: { client: Client }) {
  const [government, setGovernment] = useState(false);
  const values = clientToIntake(client);
  return (
    <section
      className={`card stack ${styles.details}`}
      aria-label="Client details"
    >
      <header className="row between">
        <h2>Client details</h2>
        <button className="button" onClick={() => setGovernment(true)}>
          Government info
        </button>
      </header>
      <ProfileFacts
        rows={[
          ["Primary POC at client", values.primaryContactName],
          ["Main company email", values.primaryContactEmail],
          ["Main company phone", values.primaryContactPhone],
          ["Engagement start date", values.engagementStartDate],
          [
            "Small Business Classification",
            businessFlags
              .filter(([key]) => values.sbClassification[key])
              .map(([, label]) => label),
          ],
          ["Funding priorities", values.fundingPriorities],
          ["Internal notes", values.internalNotes],
        ]}
      />
      <GovernmentInfo
        client={client}
        open={government}
        onOpenChange={setGovernment}
      />
    </section>
  );
}
