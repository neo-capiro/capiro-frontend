"use client";
import { useState } from "react";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
export type MergeOption = {
  programId: string;
  canonicalName: string | null;
  status: string | null;
  aliasId: string;
};
export function MergePrograms({
  options,
  onClose,
  refresh,
}: {
  options: MergeOption[];
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("analyst-merge");
  const unique = options.filter(
    (option, index) =>
      options.findIndex((item) => item.programId === option.programId) ===
      index,
  );
  const [keepProgramId, setKeepProgramId] = useState(
    unique[0]?.programId ?? "",
  );
  const [mergeProgramId, setMergeProgramId] = useState(
    unique[1]?.programId ?? "",
  );
  return (
    <SettingsDialog
      busy={action.busy}
      open
      onClose={onClose}
      title="Merge programs"
      description="Keep one canonical program and move the duplicate’s linked records and aliases to it."
      footer={
        <>
          <SettingsButton disabled={locked} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            danger
            disabled={
              locked ||
              !keepProgramId ||
              !mergeProgramId ||
              keepProgramId === mergeProgramId
            }
            onClick={() =>
              void action.run(
                (signal) =>
                  api.request(
                    "settings.analyst.programs.merge",
                    {
                      body: { keepProgramId, mergeProgramId },
                    },
                    { signal },
                  ),
                (result) =>
                  `Programs merged. ${result.aliasesCopied} aliases copied.`,
                () => {
                  refresh();
                  onClose();
                },
              )
            }
          >
            Merge programs
          </SettingsButton>
        </>
      }
    >
      {[
        {
          label: "Keep program",
          value: keepProgramId,
          update: setKeepProgramId,
        },
        {
          label: "Merge into kept program",
          value: mergeProgramId,
          update: setMergeProgramId,
        },
      ].map((field) => (
        <SettingField label={field.label} key={field.label}>
          <select
            disabled={locked}
            className={styles.input}
            value={field.value}
            onChange={(event) => field.update(event.target.value)}
          >
            {unique.map((option) => (
              <option key={option.programId} value={option.programId}>
                {option.canonicalName ?? option.programId}
              </option>
            ))}
          </select>
        </SettingField>
      ))}
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Programs could not be merged" error>
          {action.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
