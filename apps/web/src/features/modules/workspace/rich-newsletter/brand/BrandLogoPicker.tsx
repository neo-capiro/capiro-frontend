import { ActionButton, Modal } from "@/shared/module-ui";
import type { NewsletterAssetDetails } from "@capiro/shared/newsletter";
import { AssetLibrary } from "../assets/AssetLibrary";
import { AssetDetails } from "../assets/AssetDetails";
import { AssetUpload } from "../assets/AssetUpload";
import { useAssetPicker } from "../assets/use-asset-picker";
import { useAssetUpload } from "../assets/use-asset-upload";
import styles from "../library/sections.module.css";
/** This stays mounted beside the page so closing a picker never resets its upload uncertainty. */
export function BrandLogoPicker({
  open,
  close,
  choose,
}: {
  open: boolean;
  close: () => void;
  choose: (asset: NewsletterAssetDetails) => void;
}) {
  const picker = useAssetPicker(open),
    upload = useAssetUpload();
  const asset = picker.details;
  const usable =
    asset?.currentRevision &&
    asset.id.toLowerCase() === picker.selectedId?.toLowerCase() &&
    ["image/png", "image/jpeg"].includes(asset.mimeType);
  const leave = () => {
    picker.clear();
    close();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) leave();
      }}
      title="Choose a Brand Kit logo"
      description="Choose a current PNG or JPEG from your image library. Adding it changes only the local Brand Kit until Save."
      className={styles.dialog}
      footer={
        <div className={styles.actions}>
          {picker.showDetails && (
            <ActionButton className={styles.button} onClick={picker.back}>
              Back to library
            </ActionButton>
          )}
          <ActionButton className={styles.button} onClick={leave}>
            Cancel
          </ActionButton>
          <ActionButton
            className={styles.button}
            primary
            disabled={!usable}
            onClick={() => {
              if (usable && asset) {
                choose(asset);
                leave();
              }
            }}
          >
            Add logo to kit
          </ActionButton>
        </div>
      }
    >
      {picker.showDetails ? (
        <>
          <AssetDetails picker={picker} />
          {asset && !usable && (
            <p>Brand Kit logos require a current PNG or JPEG image.</p>
          )}
        </>
      ) : (
        <>
          <AssetLibrary picker={picker} refresh={picker.refresh} />
          <AssetUpload upload={upload} viewDetails={picker.viewUploaded} />
        </>
      )}
    </Modal>
  );
}
