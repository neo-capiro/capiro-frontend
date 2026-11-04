import { ActionButton, PageHeader } from "../../../../shared/module-ui";

/** Outreach heading; creation remains owned by the existing route selection. */
export function OutreachListHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <PageHeader
      eyebrow="Modules / Outreach"
      title="Outreach"
      description="Create campaigns, pick up drafts, and track delivery."
      actions={
        <ActionButton primary onClick={onCreate}>
          New outreach
        </ActionButton>
      }
    />
  );
}
