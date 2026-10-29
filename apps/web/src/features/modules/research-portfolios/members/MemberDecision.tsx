"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  ResearchDetail,
  ResearchMember,
  researchReceipt,
} from "../../../../shared/capiro/operations/research-schemas";
import type { researchPortfolioOperations } from "../../../../shared/capiro/operations/research-portfolios";
import { CapiroApiError } from "../../../../shared/capiro/http";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextArea,
} from "../../../../shared/module-ui";
import { unresolvedMember } from "./member-discovery";

type DecisionRequest = z.infer<
  (typeof researchPortfolioOperations)["research.members.decide"]["request"]
>;
export function MemberDecision({
  portfolio,
  members,
  disposition,
  onClose,
  onSaved,
  onReload,
}: {
  portfolio: ResearchDetail;
  members: ResearchMember[];
  disposition: "included" | "excluded";
  onClose: () => void;
  onSaved: (receipt: z.infer<typeof researchReceipt>) => void;
  onReload: () => void;
}) {
  const [reason, setReason] = useState("");
  const [retained, setRetained] = useState<DecisionRequest>();
  const [unknown, setUnknown] = useState(false);
  const action = useCapiroMutation("research.members.decide");
  const locked = action.pending || unknown;
  const allowed =
    portfolio.myRole !== "viewer" &&
    portfolio.lifecycle === "active" &&
    members.length > 0 &&
    members.length <= 100 &&
    (disposition === "excluded" || !members.some(unresolvedMember));
  async function submit() {
    if (!allowed || !reason.trim()) return;
    const request = retained ?? {
      params: { id: portfolio.id },
      body: {
        expectedRevision: portfolio.revision,
        idempotencyKey: crypto.randomUUID(),
        decisions: members.map((member) => ({
          memberId: member.id,
          disposition,
          reason: reason.trim(),
        })),
      },
    };
    setRetained(request);
    try {
      const receipt = await action.run(request);
      setRetained(undefined);
      setUnknown(false);
      onSaved(receipt);
    } catch (error) {
      const refused =
        error instanceof CapiroApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408;
      setUnknown(!refused);
      if (refused) setRetained(undefined);
    }
  }
  return (
    <Modal
      open
      closeDisabled={locked}
      onOpenChange={(open) => {
        if (!open && !locked) onClose();
      }}
      title={`${disposition === "included" ? "Include" : "Exclude"} ${members.length} ${members.length === 1 ? "member" : "members"}`}
      footer={
        <ActionButton
          primary
          disabled={!allowed || action.pending || !reason.trim()}
          onClick={submit}
        >
          {unknown ? "Retry same decisions" : "Confirm decisions"}
        </ActionButton>
      }
    >
      <p>
        Apply this reason to every selected member. The batch is applied
        together; a refused request does not produce successful row receipts.
      </p>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            {member.label || member.targetId} ·{" "}
            {member.targetKind.replaceAll("_", " ")}
          </li>
        ))}
      </ul>
      <Field
        label="Reason for every selected member"
        htmlFor="member-decision-reason"
      >
        <TextArea
          id="member-decision-reason"
          value={reason}
          disabled={locked}
          onChange={(event) => {
            setReason(event.target.value);
            setRetained(undefined);
          }}
          maxLength={4000}
        />
      </Field>
      <StatusPanel error={action.error} />
      {unknown && (
        <p role="status">
          The outcome is uncertain. Retry sends the same captured decisions,
          revision and key.
        </p>
      )}
      {action.error && (
        <p>
          <ActionButton disabled={action.pending} onClick={onReload}>
            Reload portfolio
          </ActionButton>{" "}
          Inspect current membership before leaving this page or correcting a
          refusal.
        </p>
      )}
    </Modal>
  );
}
