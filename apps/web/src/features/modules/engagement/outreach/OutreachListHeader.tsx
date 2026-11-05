import { ActionButton, PageHeader } from "../../../../shared/module-ui";

/** Outreach heading; creation remains owned by the existing route selection. */
export function OutreachListHeader({
  onCreate,
  filtering = false,
}: {
  onCreate: () => void;
  filtering?: boolean;
}) {
  return (
    <PageHeader
      eyebrow="Modules / Outreach"
      title={filtering ? "Filter outreach" : "Outreach"}
      description={
        filtering
          ? "Find a campaign by client, audience, or date."
          : "Create campaigns, pick up drafts, and track delivery."
      }
      actions={
        <ActionButton primary onClick={onCreate}>
          New outreach
        </ActionButton>
      }
    />
  );
}
