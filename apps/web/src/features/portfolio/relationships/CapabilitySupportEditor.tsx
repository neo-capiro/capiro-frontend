"use client";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  usePortfolioCommand,
  supportSchema,
  EvidenceFields,
  evidenceFromForm,
  type CapabilitySupport,
} from "@/features/portfolio/capabilities/public";
import styles from "./office-depth.module.css";

export function CapabilitySupportEditor({
  clientId,
  targetId,
  capabilities,
  support,
  onClose,
}: {
  clientId: string;
  targetId: string;
  capabilities: { id: string; name: string }[];
  support?: CapabilitySupport;
  onClose: () => void;
}) {
  const save = usePortfolioCommand(
    clientId,
    `support:${targetId}`,
    (form: FormData) => ({
      path: `targets/${targetId}/supports`,
      schema: supportSchema,
      body: {
        capabilityId: form.get("capabilityId"),
        stance: form.get("stance"),
        evidence: [evidenceFromForm(form)],
        expectedVersion: support?.version,
      },
    }),
  );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !save.isPending) onClose();
      }}
      title={support ? "Edit capability stance" : "Add capability support"}
      description="Support belongs to this saved office relationship. Record dated evidence for the stance."
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
          Capability
          <select
            name="capabilityId"
            defaultValue={support?.capabilityId ?? ""}
            required
          >
            {!support && <option value="">Select a capability</option>}
            {capabilities
              .filter(
                (capability) =>
                  !support || capability.id === support.capabilityId,
              )
              .map((capability) => (
                <option key={capability.id} value={capability.id}>
                  {capability.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Office stance
          <select name="stance" defaultValue={support?.stance ?? "unknown"}>
            <option value="unknown">No support stance recorded</option>
            <option value="interested">Interested</option>
            <option value="supportive">Supportive</option>
            <option value="champion">Sponsor or champion</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <EvidenceFields />
        <QueryState error={save.error} />
        <div className={styles.actions}>
          <button className="button primary" disabled={!save.canWrite}>
            Save support
          </button>
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
