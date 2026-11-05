"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  usePortfolioCommand,
  relationshipSchema,
  relationshipStatusSchema,
  EvidenceFields,
  evidenceFromForm,
  type OfficeRelationship,
} from "@/features/portfolio/capabilities/public";
import { useProfileMemberOptions } from "@/features/portfolio/client-profile/public";
import styles from "./office-depth.module.css";

export function RelationshipEditor({
  clientId,
  relationship,
  onClose,
}: {
  clientId: string;
  relationship: OfficeRelationship;
  onClose: () => void;
}) {
  const owners = useProfileMemberOptions();
  const knownTerm =
    relationship.officeTerm && relationship.officeTerm !== "unknown"
      ? relationship.officeTerm
      : "";
  const [officeTerm, setOfficeTerm] = useState(knownTerm);
  const termChanged =
    Boolean(officeTerm.trim()) && officeTerm.trim() !== relationship.officeTerm;
  const save = usePortfolioCommand(
    clientId,
    `office:${relationship.id}`,
    (form: FormData) => ({
      path: `targets/${relationship.id}/relationship`,
      method: "PATCH",
      schema: relationshipSchema,
      body: {
        expectedVersion: relationship.version,
        relationshipStatus: form.get("status"),
        ownerUserId: form.get("owner") || null,
        nextStep: form.get("nextStep") || null,
        stance: form.get("stance"),
        ...(termChanged
          ? {
              officeTerm: officeTerm.trim(),
              termEvidence: [evidenceFromForm(form)],
            }
          : {}),
        lastContactAt: form.get("contact")
          ? `${form.get("contact")}T00:00:00.000Z`
          : null,
      },
    }),
  );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !save.isPending) onClose();
      }}
      title="Edit office relationship"
      description="This parent relationship can exist without any capability support."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(new FormData(event.currentTarget), {
            onSuccess: onClose,
          });
        }}
      >
        <label>
          Status
          <select name="status" defaultValue={relationship.relationshipStatus}>
            {relationshipStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select name="owner" defaultValue={relationship.ownerUserId ?? ""}>
            <option value="">Unassigned</option>
            {owners.data?.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {[owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
                  owner.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recorded client stance
          <select name="stance" defaultValue={relationship.stance}>
            {[
              "unknown",
              "interested",
              "supportive",
              "champion",
              "declined",
            ].map((stance) => (
              <option key={stance}>{stance}</option>
            ))}
          </select>
        </label>
        <label>
          Verified office term
          <input
            value={officeTerm}
            readOnly={Boolean(knownTerm)}
            onChange={(event) => setOfficeTerm(event.target.value)}
            maxLength={180}
            placeholder="Term supported by official evidence"
          />
        </label>
        {termChanged && (
          <>
            <p className="muted">
              Confirm this office term with a dated official government source.
            </p>
            <EvidenceFields />
          </>
        )}
        <label>
          Last contact
          <input
            type="date"
            name="contact"
            defaultValue={relationship.lastContactAt?.slice(0, 10)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <label>
          Next step
          <textarea
            name="nextStep"
            maxLength={4000}
            rows={3}
            defaultValue={relationship.nextStep ?? ""}
          />
        </label>
        <QueryState error={save.error ?? owners.error} />
        <div className={styles.actions}>
          <button
            className="button primary"
            disabled={!save.canWrite || !owners.data}
          >
            Save relationship
          </button>
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
