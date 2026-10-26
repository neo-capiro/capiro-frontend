import { useState } from "react";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  TextInput,
} from "../../../../../shared/module-ui";
import { assetName } from "./AssetLibrary";
import {
  managementLabels,
  type AssetManagementAction,
} from "./asset-management";
import type { AssetManagementState } from "./use-asset-management";
import type { AssetPickerState } from "./use-asset-picker";
import styles from "./assets.module.css";

export function AssetManagementNotice({
  management,
  viewDetails,
}: {
  management: AssetManagementState;
  viewDetails: (id: string) => void;
}) {
  const { action, outcome, error, item } = management;
  if (!action) return null;
  return (
    <>
      {outcome === "pending" && (
        <p role="status" className={styles.notice}>
          Changing your image library… Closing this dialog does not cancel the
          request.
        </p>
      )}
      {outcome === "unknown" && (
        <p role="alert" className={styles.notice}>
          {action.kind === "importImage"
            ? "Import not confirmed."
            : "Change not confirmed."}{" "}
          It may have completed. Refresh the library to review current items.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.notice}>
          {error}
        </p>
      )}
      {outcome === "acknowledged" && (
        <div role="status" className={styles.item}>
          <p>{managementLabels[action.kind].done}</p>
          {item && (
            <>
              <p>{assetName(item.name)}</p>
              <ActionButton onClick={() => viewDetails(item.id)}>
                View imported image details
              </ActionButton>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function AssetManagementForm({
  management,
  picker,
  id,
  disabled,
}: {
  management: AssetManagementState;
  picker: AssetPickerState;
  id: string;
  disabled: boolean;
}) {
  const action = management.action!;
  const [value, setValue] = useState(
    action.kind === "renameFolder"
      ? action.folder.name
      : action.kind === "renameImage"
        ? action.image.name
        : "",
  );
  const removing =
    action.kind === "deleteFolder" || action.kind === "deleteImage";
  const importUrl = action.kind === "importImage";
  const move = action.kind === "moveImage";
  const maxLength = importUrl
    ? 2048
    : action.kind === "renameImage"
      ? 200
      : 100;
  const panelTitle = removing
    ? action.kind === "deleteFolder"
      ? "Keep your images"
      : "Selected image"
    : importUrl
      ? "Import a file from a URL:"
      : move
        ? "Choose a folder"
        : action.kind === "renameImage"
          ? "File details"
          : "Folder details";
  return (
    <form
      id={id}
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) void management.submit(value);
      }}
    >
      <div className={styles.panel}>
        <Panel title={panelTitle}>
          {removing ? (
            <DeleteExplanation action={action} />
          ) : move ? (
            <>
              <p className={styles.file}>{assetName(action.image.name)}</p>
              <Field label="Destination folder" htmlFor={`${id}-value`}>
                <SelectInput
                  id={`${id}-value`}
                  value={value}
                  disabled={disabled}
                  options={[
                    { value: "", label: "Unfiled" },
                    ...(picker.folders.data?.items.map((folder) => ({
                      value: folder.id,
                      label: folder.name,
                    })) ?? []),
                  ]}
                  onValueChange={setValue}
                />
              </Field>
              <div className={styles.actions}>
                <ActionButton
                  disabled={disabled}
                  onClick={() => management.choose({ kind: "createFolder" })}
                >
                  Add Folder
                </ActionButton>
              </div>
            </>
          ) : (
            <Field
              label={
                importUrl
                  ? "Image URL"
                  : action.kind === "renameImage"
                    ? "File name"
                    : "Folder name"
              }
              htmlFor={`${id}-value`}
              description={
                importUrl
                  ? "Use a public HTTPS image URL. PNG, JPEG, GIF or WebP, up to 10 MiB."
                  : `Up to ${maxLength} characters.`
              }
            >
              <TextInput
                id={`${id}-value`}
                autoFocus
                required
                type={importUrl ? "url" : "text"}
                maxLength={maxLength}
                value={value}
                disabled={disabled}
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
          )}
          {importUrl && (
            <p className={styles.file}>
              Destination: {action.folder?.name ?? "Unfiled"}. Importing does
              not insert or save the newsletter.
            </p>
          )}
        </Panel>
      </div>
    </form>
  );
}
function DeleteExplanation({ action }: { action: AssetManagementAction }) {
  if (action.kind === "deleteFolder")
    return (
      <>
        <p className={styles.file}>{action.folder.name}</p>
        <p>
          Delete this folder? Its images, including saved versions, will remain
          in Unfiled.
        </p>
      </>
    );
  if (action.kind === "deleteImage")
    return (
      <>
        <p className={styles.file}>{assetName(action.image.name)}</p>
        <p>
          Remove this image from your image library, including saved versions?
        </p>
        <p>Existing image links are not revoked.</p>
      </>
    );
  return null;
}

export function AssetManagementFooter({
  management,
  id,
  back,
  refresh,
  disabled,
}: {
  management: AssetManagementState;
  id: string;
  back: () => void;
  refresh: () => void;
  disabled: boolean;
}) {
  const action = management.action!;
  const removing =
    action.kind === "deleteFolder" || action.kind === "deleteImage";
  const settled = management.outcome === "acknowledged";
  return (
    <>
      <ActionButton autoFocus={removing} onClick={back}>
        {settled || management.blocked ? "Back to library" : "Cancel"}
      </ActionButton>
      {management.outcome === "unknown" ? (
        <ActionButton onClick={refresh}>Refresh library</ActionButton>
      ) : (
        !settled && (
          <ActionButton primary type="submit" form={id} disabled={disabled}>
            {managementLabels[action.kind].submit}
          </ActionButton>
        )
      )}
    </>
  );
}
