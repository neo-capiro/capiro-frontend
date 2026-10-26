"use client";
import { useRef, useState } from "react";
import type { NewsletterAssetDetails } from "@capiro/shared/newsletter";
import { useCapiro } from "../../../../../shared/capiro/CapiroBoundary";
import { ActionButton, Modal } from "../../../../../shared/module-ui";
import { AssetLibrary } from "./AssetLibrary";
import { AssetDetails } from "./AssetDetails";
import { AssetUpload } from "./AssetUpload";
import { useAssetPicker } from "./use-asset-picker";
import { useAssetUpload } from "./use-asset-upload";
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
function AssetPicker({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const picker = useAssetPicker(open);
  const upload = useAssetUpload();
  const inserted = useRef(false);
  const changeOpen = (next: boolean) => {
    picker.clear();
    inserted.current = false;
    setOpen(next);
  };
  const insert = () => {
    if (
      !open ||
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
  return (
    <>
      <ActionButton onClick={() => changeOpen(true)}>
        Replace from image library
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={changeOpen}
        className={styles.modal}
        title={picker.showDetails ? "File Details" : "Your image library"}
        description="Choose an image for this block. Inserting changes only its image URL; save the newsletter separately."
        footer={
          <>
            {picker.showDetails && (
              <ActionButton onClick={picker.back}>Back to library</ActionButton>
            )}
            <ActionButton onClick={() => changeOpen(false)}>Close</ActionButton>
            <ActionButton
              primary
              disabled={!picker.showDetails || !picker.details?.currentRevision}
              onClick={insert}
            >
              Insert
            </ActionButton>
          </>
        }
      >
        {picker.showDetails ? (
          <AssetDetails picker={picker} />
        ) : (
          <div className={styles.stack}>
            <AssetLibrary picker={picker} refresh={picker.refresh} />
            <AssetUpload upload={upload} viewDetails={picker.viewUploaded} />
          </div>
        )}
      </Modal>
    </>
  );
}
