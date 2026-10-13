import { ImportOutcome } from "../../ui/ImportOutcome";
import { Btn, Modal } from "../../ui/primitives";
import {
  useImportWorkflow,
  type ImportWorkflowOptions,
} from "./useImportWorkflow";
import { ManualClientForm } from "./ManualClientForm";
import { FirmRegistrantSearch } from "./FirmRegistrantSearch";
import { ImportCandidateSelection } from "./ImportCandidateSelection";
export { formatCompactSpend } from "./ImportCandidateSelection";
export function ImportOverlay(
  props: ImportWorkflowOptions & { billingAdmin: boolean; onClose: () => void },
) {
  const { cap, imported, plan, billingAdmin, onClose } = props;
  const workflow = useImportWorkflow(props);
  const { importer, registrant, candidatesQuery, stage, refreshCurrent } =
    workflow;
  if (
    !registrant.isSuccess ||
    registrant.error ||
    (stage === "table" && (!candidatesQuery.isSuccess || candidatesQuery.error))
  )
    return (
      <Modal title="Import clients" onClose={onClose}>
        <ImportOutcome evidence={importer.evidence} />
        <p role="status">
          Current firm/import data is unavailable or loading. Retry before
          selecting clients.
        </p>
        <Btn onClick={() => void refreshCurrent()}>Retry current data</Btn>
      </Modal>
    );
  if (stage === "manual")
    return <ManualClientForm {...workflow} cap={cap} onClose={onClose} />;
  if (stage === "search")
    return <FirmRegistrantSearch {...workflow} onClose={onClose} />;
  return (
    <ImportCandidateSelection
      {...workflow}
      cap={cap}
      imported={imported}
      plan={plan}
      billingAdmin={billingAdmin}
      onClose={onClose}
    />
  );
}
