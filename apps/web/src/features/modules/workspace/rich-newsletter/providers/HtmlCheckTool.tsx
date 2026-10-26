"use client";
import { useId, useState } from "react";
import {
  parseNewsletterHtmlCheck,
  type NewsletterHtmlCheck,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Panel,
  TextArea,
} from "../../../../../shared/module-ui";
import { useCapiro } from "../../../../../shared/capiro/CapiroBoundary";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { useProviderProposal } from "./use-provider-proposal";
import {
  ProviderAvailability,
  ProviderDialog,
  ProviderNotice,
} from "./ProviderDialog";
import styles from "../assets/assets.module.css";
import toolStyles from "./provider-tools.module.css";

type Props = {
  documentId: string;
  revision: number;
  ready: boolean;
  unsaved: boolean;
};
export function HtmlCheckTool(props: Props) {
  const api = useCapiro();
  const [scope, setScope] = useState({ api, version: 0 });
  if (scope.api !== api) setScope({ api, version: scope.version + 1 });
  return <HtmlCheck key={`${scope.version}:${props.documentId}`} {...props} />;
}
function HtmlCheck({ documentId, revision, ready, unsaved }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const capabilities = useCapiroQuery(
    "workspace.richNewsletter.capabilities",
    {},
    { enabled: open },
  );
  const mutation = useCapiroMutation("workspace.richNewsletter.htmlCheck");
  const proposal = useProviderProposal<NewsletterHtmlCheck>(
    JSON.stringify([documentId, revision]),
  );
  const capability = capabilities.data?.htmlCheck;
  const check = () => {
    if (!ready || unsaved || !capability?.available) return;
    void proposal.run(async () => {
      const result = parseNewsletterHtmlCheck(
        await mutation.run({ params: { id: documentId }, body: { revision } }),
        { revision },
      );
      if (!result.ok)
        throw new Error("The report did not match the saved revision.");
      return result.value;
    });
  };
  const report = proposal.result;
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        HTML compatibility check
      </ActionButton>
      <ProviderDialog
        open={open}
        close={() => setOpen(false)}
        title={report ? "Mailtrap HTML report" : "HTML compatibility check"}
        description={
          report
            ? `Checked saved revision ${report.revision} · ${new Date(report.checkedAt).toLocaleString()}`
            : `Check the HTML of saved revision ${revision}.`
        }
        footer={
          <ActionButton
            primary
            disabled={
              !ready || unsaved || !capability?.available || proposal.blocked
            }
            onClick={check}
          >
            {report ? "Run check again" : "Run HTML check"}
          </ActionButton>
        }
      >
        <ProviderNotice phase={proposal.phase} reason={proposal.reason} />
        <ProviderAvailability
          loading={capabilities.loading}
          available={capability?.available}
          reason={capability?.reason}
          retry={capabilities.reload}
        />
        {unsaved && (
          <p role="status" className={styles.notice}>
            Local changes are not included in this saved revision. Save and
            review the latest newsletter before running a new check.
          </p>
        )}
        <p>
          Running this check submits the saved newsletter HTML to the connected
          Mailtrap sandbox. It does not send to your campaign recipients and
          does not provide inbox screenshots.
        </p>
        {report && (
          <>
            <div className={styles.panel}>
              <Panel title="Compatibility results">
                <p role="status">
                  Check complete · {report.issues.length} reported compatibility
                  issues.
                </p>
                <ul className={styles.items}>
                  {report.issues.map((issue, index) => (
                    <li key={index} className={styles.item}>
                      <p className={toolStyles.proposal}>{issue}</p>
                    </li>
                  ))}
                </ul>
                <p>
                  This report applies only to saved revision {report.revision}.
                  Review the delivered test email before sending to recipients.
                </p>
              </Panel>
            </div>
            <div className={styles.panel}>
              <Panel title="Full HTML report">
                <Field label="Report details" htmlFor={id}>
                  <TextArea
                    id={id}
                    readOnly
                    value={JSON.stringify(report.report, null, 2)}
                  />
                </Field>
              </Panel>
            </div>
          </>
        )}
      </ProviderDialog>
    </>
  );
}
