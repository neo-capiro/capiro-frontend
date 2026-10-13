"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsAction } from "../useSettingsAction";
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
  const api = useCapiro();
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
  const action = useSettingsAction();
  return (
    <SettingsDialog
      open
      onClose={onClose}
      title="Merge programs"
      description="Keep one canonical program and move the duplicate’s linked records and aliases to it."
      footer={
        <>
          <SettingsButton disabled={action.busy} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            danger
            disabled={
              action.busy ||
              !keepProgramId ||
              !mergeProgramId ||
              keepProgramId === mergeProgramId
            }
            onClick={() =>
              void action.run(
                () =>
                  api.request("settings.analyst.programs.merge", {
                    body: { keepProgramId, mergeProgramId },
                  }),
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
      {action.error && (
        <SettingsNotice title="Programs could not be merged" error>
          {action.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
