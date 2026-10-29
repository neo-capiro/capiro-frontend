"use client";

import { useState } from "react";
import { MemoryDraftEditor } from "@/features/settings/memory-drafts-public";
import { Btn, SelectInput } from "../../ui/forms";
import { Modal } from "../../ui/Modal";
import { ErrorText } from "../funnel/shared";
import {
  FIRM_FILES,
  type FirmFileType,
  useFirmMemorySetup,
} from "./useFirmMemorySetup";

export function AiSettingsOverlay({
  orgName,
  onClose,
  onComplete,
}: {
  orgName: string;
  onClose: () => void;
  /** All three files have current published content; pending proposals do not count. */
  onComplete: () => void;
}) {
  const [type, setType] = useState<FirmFileType>("firm-soul");
  const setup = useFirmMemorySetup();
  return (
    <Modal title="Configure firm AI settings" onClose={onClose} width={760}>
      <p>
        Firm knowledge guides Meri for everyone in {orgName}. Save a private
        draft, then submit it for review. Published knowledge changes only after
        approval.
      </p>
      <label>
        Firm memory file
        <SelectInput
          options={FIRM_FILES.map((file) => file.display)}
          value={FIRM_FILES.find((file) => file.type === type)!.display}
          onChange={(display) => {
            const file = FIRM_FILES.find((file) => file.display === display);
            if (file) setType(file.type);
          }}
        />
      </label>
      <p>Save your draft before switching files or closing this window.</p>
      <ul aria-label="Firm file publication">
        {setup.files.map((file) => (
          <li key={file.type}>
            {file.display}: {file.state}
          </li>
        ))}
      </ul>
      <div style={{ maxHeight: "48vh", overflowY: "auto" }}>
        <MemoryDraftEditor
          key={type}
          type={type}
          slug="firm"
          readOnly={false}
          reviewEnabled
          onSubmitted={setup.reload}
        />
      </div>
      {setup.completion.error && (
        <ErrorText>{setup.completion.error}</ErrorText>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 16,
        }}
      >
        <Btn onClick={onClose}>Close</Btn>
        <Btn onClick={setup.reload}>Refresh published files</Btn>
        <Btn
          variant="primary"
          disabled={!setup.allPublished || setup.completion.busy}
          onClick={() => void setup.complete(onComplete)}
        >
          {setup.completion.busy ? "Verifying…" : "Done"}
        </Btn>
      </div>
    </Modal>
  );
}
