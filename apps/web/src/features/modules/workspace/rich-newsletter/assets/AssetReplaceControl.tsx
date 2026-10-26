"use client";
import { useId, useRef, useState } from "react";
import type { NewsletterAssetDetails } from "@capiro/shared/newsletter";
import { useCapiro } from "../../../../../shared/capiro/CapiroBoundary";
import { ActionButton, Modal } from "../../../../../shared/module-ui";
import { AssetLibrary } from "./AssetLibrary";
import { AssetDetails } from "./AssetDetails";
import { AssetUpload } from "./AssetUpload";
import { useAssetPicker } from "./use-asset-picker";
import { useAssetUpload } from "./use-asset-upload";
import { useAssetManagement } from "./use-asset-management";
import {
  AssetManagementForm,
  AssetManagementFooter,
  AssetManagementNotice,
} from "./AssetManagementForm";
import { AssetHistory } from "./AssetHistory";
import { StockImageControl } from "./StockImageControl";
import {
  managementLabels,
  type AssetManagementAction,
} from "./asset-management";
import styles from "./assets.module.css";

type Props = {
  blockId: string;
  onInsert: (asset: NewsletterAssetDetails) => void;
};
/** Document replacement already remounts RichBlockControls; scope/block changes do too. */
export function AssetReplaceControl(props: Props) {
  const api = useCapiro();
  const [scope, setScope] = useState({ api, version: 0 });
  if (scope.api !== api) setScope({ api, version: scope.version + 1 });
  return <AssetPicker key={`${scope.version}:${props.blockId}`} {...props} />;
}
function usePickerDialog({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const picker = useAssetPicker(open);
  const upload = useAssetUpload();
  const [history, setHistory] = useState<NewsletterAssetDetails>();
  const formId = useId();
  const focusTarget = useRef("refresh");
  const refresh = () => {
    picker.refresh();
    picker.folders.reload();
  };
  const management = useAssetManagement((action) => {
    if (action.kind === "deleteFolder")
      picker.changeQuery({ folder: "unfiled" });
    focusTarget.current = "refresh";
    refresh();
  });
  const inserted = useRef(false);
  const changeOpen = (next: boolean) => {
    picker.clear();
    management.close();
    setHistory(undefined);
    inserted.current = false;
    setOpen(next);
  };
  const insert = () => {
    if (
      !open ||
      management.visible ||
      history ||
      inserted.current ||
      !picker.details?.currentRevision ||
      picker.details.id.toLowerCase() !== picker.selectedId?.toLowerCase()
    )
      return;
    inserted.current = true;
    onInsert(picker.details);
    picker.clear();
    setOpen(false);
  };
  const back = () => {
    management.close();
    setHistory(undefined);
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>(
          `[role="dialog"] [data-asset-focus="${focusTarget.current}"]`,
        ) ??
        document.querySelector<HTMLElement>(
          '[role="dialog"] [data-asset-focus="refresh"]',
        );
      target?.focus();
    });
  };
  const manage = (action: AssetManagementAction) => {
    if (upload.pending || upload.unknown) return;
    focusTarget.current = action.kind;
    management.choose(action);
  };
  const viewDetails = (id: string) => {
    management.close();
    setHistory(undefined);
    picker.viewUploaded(id);
  };
  return {
    open,
    picker,
    upload,
    management,
    history,
    formId,
    refresh,
    changeOpen,
    insert,
    back,
    manage,
    viewDetails,
    showHistory: () => {
      if (picker.details) {
        focusTarget.current = "history";
        setHistory(picker.details);
      }
    },
    disabled: management.blocked || upload.pending || upload.unknown,
  };
}
type PickerDialog = ReturnType<typeof usePickerDialog>;
function AssetPicker(props: Props) {
  const view = usePickerDialog(props);
  const { picker, management, history } = view;
  return (
    <>
      <ActionButton onClick={() => view.changeOpen(true)}>
        Replace from image library
      </ActionButton>
      <StockImageControl onInsert={props.onInsert} />
      <Modal
        open={view.open}
        onOpenChange={view.changeOpen}
        className={styles.modal}
        title={
          management.visible
            ? managementLabels[management.action!.kind].title
            : history
              ? "Revision History"
              : picker.showDetails
                ? "File Details"
                : "Your image library"
        }
        description={
          history
            ? "Saved image versions"
            : management.visible
              ? "Manage your image library. Newsletter content is saved separately."
              : "Choose an image for this block. Inserting changes only its image URL; save the newsletter separately."
        }
        footer={<PickerFooter view={view} />}
      >
        <div className={styles.stack}>
          <AssetManagementNotice
            management={management}
            viewDetails={view.viewDetails}
          />
          <PickerContent view={view} />
        </div>
      </Modal>
    </>
  );
}
function PickerContent({ view }: { view: PickerDialog }) {
  const { picker, management, history } = view;
  if (management.visible)
    return (
      <AssetManagementForm
        key={management.sequence}
        management={management}
        picker={picker}
        id={view.formId}
        disabled={view.disabled || management.outcome === "acknowledged"}
      />
    );
  if (history) return <AssetHistory key={history.id} image={history} />;
  if (picker.showDetails)
    return (
      <AssetDetails
        picker={picker}
        manage={view.manage}
        disabled={view.disabled}
        history={view.showHistory}
      />
    );
  return (
    <>
      <AssetLibrary
        picker={picker}
        refresh={view.refresh}
        manage={view.manage}
        disabled={view.disabled}
      />
      <AssetUpload
        upload={view.upload}
        viewDetails={view.viewDetails}
        disabled={management.blocked}
      />
    </>
  );
}
function PickerFooter({ view }: { view: PickerDialog }) {
  const { management, picker, history } = view;
  if (management.visible)
    return (
      <AssetManagementFooter
        key={management.sequence}
        management={management}
        id={view.formId}
        back={view.back}
        refresh={view.refresh}
        disabled={view.disabled}
      />
    );
  return (
    <>
      {history ? (
        <ActionButton onClick={view.back}>Back to details</ActionButton>
      ) : (
        picker.showDetails && (
          <ActionButton onClick={picker.back}>Back to library</ActionButton>
        )
      )}
      <ActionButton onClick={() => view.changeOpen(false)}>Close</ActionButton>
      {!history && (
        <ActionButton
          primary
          disabled={!picker.showDetails || !picker.details?.currentRevision}
          onClick={view.insert}
        >
          Insert
        </ActionButton>
      )}
    </>
  );
}
