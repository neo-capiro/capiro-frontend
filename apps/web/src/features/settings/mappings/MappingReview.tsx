"use client";

import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { TextArea } from "../../../shared/module-ui";
import {
  SettingFacts,
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsAction } from "../useSettingsAction";
import {
  basisLabel,
  mappingRelationships,
  requiresAwardDecision,
  type Mapping,
  type MappingRelationship,
} from "./presentation";

export function MappingReview({
  mapping,
  onClose,
  refresh,
}: {
  mapping: Mapping;
  onClose: () => void;
  refresh: () => void;
}) {
  const api = useCapiro();
  const [relationship, setRelationship] = useState<MappingRelationship | "">(
    mappingRelationships.includes(
      mapping.relationshipType as MappingRelationship,
    )
      ? (mapping.relationshipType as MappingRelationship)
      : "",
  );
  const [rollUp, setRollUp] = useState<"yes" | "no" | "">(
    mapping.rollUpAwards === true
      ? "yes"
      : mapping.rollUpAwards === false
        ? "no"
        : "",
  );
  const [reason, setReason] = useState("");
  const action = useSettingsAction();
  const award = requiresAwardDecision(mapping.source);
  function decide(confirmed: boolean) {
    return action.run(
      () =>
        api.request("settings.mappings.confirmIndividual", {
          params: { mappingId: mapping.id },
          body: {
            confirmed,
            ...(confirmed && award
              ? {
                  relationshipType: relationship as MappingRelationship,
                  rollUpAwards: rollUp === "yes",
                }
              : {}),
            ...(!confirmed && reason ? { rejectionReason: reason } : {}),
          },
        }),
      (result) =>
        result.confirmed
          ? "Mapping was confirmed."
          : "Mapping rejection was recorded.",
      () => {
        refresh();
        onClose();
      },
    );
  }
  return (
    <SettingsDialog
      open
      onClose={onClose}
      title="Review intelligence mapping"
      footer={
        <>
          <SettingsButton disabled={action.busy} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            danger
            disabled={action.busy}
            onClick={() => void decide(false)}
          >
            Reject
          </SettingsButton>
          <SettingsButton
            primary
            disabled={action.busy || (award && (!relationship || !rollUp))}
            onClick={() => void decide(true)}
          >
            Confirm mapping
          </SettingsButton>
        </>
      }
    >
      <SettingFacts
        items={[
          ["Client", mapping.clientName ?? mapping.clientId],
          ["External record", mapping.externalName],
          ["Source", mapping.source],
          ["External ID", mapping.externalId],
          ["Match basis", basisLabel(mapping.matchBasis)],
          ["Confidence", `${Math.round(mapping.confidence * 100)}%`],
        ]}
      />
      {award && (
        <>
          <SettingField label="Relationship to client">
            <select
              className={styles.input}
              value={relationship}
              onChange={(event) =>
                setRelationship(event.target.value as typeof relationship)
              }
            >
              <option value="">Choose relationship</option>
              {mappingRelationships.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Roll up federal awards into this client?">
            <select
              className={styles.input}
              value={rollUp}
              onChange={(event) =>
                setRollUp(event.target.value as typeof rollUp)
              }
            >
              <option value="">Choose explicitly</option>
              <option value="yes">Yes, attribute awards to this client</option>
              <option value="no">No, keep awards separate</option>
            </select>
          </SettingField>
        </>
      )}
      <SettingField label="Rejection reason (optional)">
        <TextArea
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </SettingField>
      {action.error && (
        <SettingsNotice title="Mapping review failed" error>
          {action.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
