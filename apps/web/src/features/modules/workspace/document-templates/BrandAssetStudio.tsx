"use client";
import { useId, useState } from "react";
import {
  parseWorkspaceBrandAssetList,
  parseWorkspaceBrandUploadList,
  parseWorkspaceBrandAssetRegistered,
  parseWorkspaceBrandAssetDeleted,
  type WorkspaceBrandAsset,
} from "@capiro/shared/workspace-template-studio";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { uploadCapiroAttachment } from "../../../../shared/capiro/uploads";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import type { StudioWrite } from "./studio-write";
import styles from "./studio-authoring.module.css";

function BrandUpload({
  writer,
  onUploaded,
}: {
  writer: StudioWrite;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState("");
  return (
    <form
      className={styles.fields}
      onSubmit={(event) => {
        event.preventDefault();
        if (!file) return;
        const selected = file;
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(selected.type) ||
          selected.size < 1 ||
          selected.size > 25 * 1024 * 1024
        ) {
          setMessage("Choose a PNG, JPEG or WebP image up to 25 MiB.");
          return;
        }
        const metadata = {
          fileName: selected.name,
          contentType: selected.type,
        };
        void writer.run("Upload image", async (send, signal) => {
          // Reuse the existing registered Core attachment pipeline and credential-free
          // storage transfer. Registration is a separate explicit action after scan.
          const ticket = await send(() =>
            writer.api.request(
              "strategies.context.file.ticket",
              { body: { ...metadata, contentLength: selected.size } },
              { signal },
            ),
          );
          await send(() =>
            uploadCapiroAttachment(ticket, selected, { signal }),
          );
          const receipt = await send(() =>
            writer.api.request(
              "strategies.context.file.confirm",
              { body: { ...metadata, s3Key: ticket.s3Key } },
              { signal },
            ),
          );
          if (
            receipt.clientId !== null ||
            receipt.s3Key !== ticket.s3Key ||
            receipt.fileName !== metadata.fileName ||
            receipt.contentType !== metadata.contentType ||
            receipt.byteSize !== selected.size
          )
            throw new Error(
              "The upload confirmation did not match this image.",
            );
          if (!signal.aborted) {
            setMessage(
              "Upload confirmed. Refresh available uploads until the image is ready, then add it to this library.",
            );
            onUploaded();
          }
        });
      }}
    >
      <Field label="Upload an image" htmlFor="brand-image-file">
        <TextInput
          id="brand-image-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={writer.locked}
          onChange={(event) => {
            setFile(event.target.files?.[0]);
            setMessage("");
          }}
        />
      </Field>
      <ActionButton type="submit" disabled={writer.locked || !file}>
        Upload selected image
      </ActionButton>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

export function BrandAssetStudio({ writer }: { writer: StudioWrite }) {
  const fieldsId = useId();
  const query = useCapiroQuery("workspace.brandAssets.list", {});
  const uploadsQuery = useCapiroQuery("workspace.brandAssets.uploads", {});
  const parsed =
    query.data === undefined
      ? undefined
      : parseWorkspaceBrandAssetList(query.data);
  const uploads =
    uploadsQuery.data === undefined
      ? undefined
      : parseWorkspaceBrandUploadList(uploadsQuery.data);
  const [selectedId, select] = useState("");
  const [removing, setRemoving] = useState<WorkspaceBrandAsset>();
  const selected = uploads?.ok
    ? uploads.value.find((row) => row.id === selectedId)
    : undefined;
  return (
    <div className={styles.fields}>
      <div className={styles.actions}>
        <h2>Document brand assets</h2>
        <ActionButton onClick={query.reload}>Refresh assets</ActionButton>
      </div>
      <p>
        Register available firm images for document themes. Removing a library
        entry preserves its original attachment.
      </p>
      <StatusPanel
        loading={query.loading}
        error={
          query.error || (parsed && !parsed.ok)
            ? "Could not load document brand assets."
            : undefined
        }
        onRetry={query.reload}
      />
      {parsed?.ok && (
        <div className={styles.assetGrid}>
          {parsed.value.length === 0 && <p>No document brand assets yet.</p>}
          {parsed.value.map((asset) => (
            <article key={asset.id} className={styles.group}>
              <h3>{asset.filename}</h3>
              <p>
                {asset.mimeType} · {asset.sizeBytes.toLocaleString()} bytes
              </p>
              {asset.available && asset.url ? (
                <a href={asset.url} target="_blank" rel="noopener noreferrer">
                  Open current image
                </a>
              ) : (
                <p>
                  Image is currently unavailable. Refresh to check access and
                  readiness.
                </p>
              )}
              {asset.scanDisclosure && <p>{asset.scanDisclosure}</p>}
              <Field
                label="Asset reference for theme settings"
                htmlFor={`${fieldsId}-${asset.id}`}
              >
                <TextInput
                  id={`${fieldsId}-${asset.id}`}
                  aria-label={`Asset reference: ${asset.filename}`}
                  readOnly
                  value={asset.id}
                />
              </Field>
              <ActionButton
                disabled={writer.locked}
                onClick={() => setRemoving(asset)}
              >
                Remove {asset.filename}
              </ActionButton>
            </article>
          ))}
        </div>
      )}
      <section className={styles.group}>
        <h3>Add an image</h3>
        <BrandUpload writer={writer} onUploaded={uploadsQuery.reload} />
        <h4>Available confirmed uploads</h4>
        <p>
          Only currently available firm-wide images appear. Pending or
          restricted uploads remain with the attachment owner.
        </p>
        <ActionButton
          onClick={() => {
            select("");
            uploadsQuery.reload();
          }}
        >
          Refresh available uploads
        </ActionButton>
        <StatusPanel
          loading={uploadsQuery.loading}
          error={
            uploadsQuery.error || (uploads && !uploads.ok)
              ? "Could not load available uploads."
              : undefined
          }
          onRetry={uploadsQuery.reload}
        />
        {uploads?.ok && (
          <Field label="Confirmed image" htmlFor={`${fieldsId}-upload`}>
            <SelectInput
              id={`${fieldsId}-upload`}
              aria-label="Confirmed image"
              value={selected?.id ?? ""}
              placeholder="Choose an available image"
              disabled={writer.locked}
              options={uploads.value.map((row) => ({
                value: row.id,
                label: `${row.fileName} · ${row.contentLength.toLocaleString()} bytes`,
              }))}
              onValueChange={select}
            />
          </Field>
        )}
        {selected?.scanDisclosure && <p>{selected.scanDisclosure}</p>}
        <ActionButton
          primary
          disabled={!selected || writer.locked}
          onClick={() => {
            if (!selected) return;
            const expected = selected;
            void writer.run("Register brand image", async (send, signal) => {
              const available = parseWorkspaceBrandUploadList(
                await writer.api.request(
                  "workspace.brandAssets.uploads",
                  {},
                  { signal },
                ),
              );
              const current = available.ok
                ? available.value.find((row) => row.id === expected.id)
                : undefined;
              if (
                !current ||
                current.s3Key !== expected.s3Key ||
                current.contentLength !== expected.contentLength ||
                current.contentType !== expected.contentType
              )
                throw new Error(
                  "This image is no longer available. Refresh the uploads.",
                );
              const receipt = parseWorkspaceBrandAssetRegistered(
                await send(() =>
                  writer.api.request(
                    "workspace.brandAssets.register",
                    { body: { attachmentId: expected.id } },
                    { signal },
                  ),
                ),
                { attachmentId: expected.id },
              );
              if (
                !receipt.ok ||
                receipt.value.objectKey !== expected.s3Key ||
                receipt.value.filename !== expected.fileName ||
                receipt.value.mimeType !== expected.contentType ||
                receipt.value.sizeBytes !== expected.contentLength
              )
                throw new Error(
                  "Registered image did not match the selected upload.",
                );
              const saved = parseWorkspaceBrandAssetList(
                await writer.api.request(
                  "workspace.brandAssets.list",
                  {},
                  { signal },
                ),
              );
              const asset = saved.ok
                ? saved.value.find((row) => row.id === receipt.value.id)
                : undefined;
              if (
                !asset ||
                asset.objectKey !== expected.s3Key ||
                !asset.available
              )
                throw new Error("Registered image could not be read back.");
              if (!signal.aborted) {
                select("");
                query.reload();
              }
            });
          }}
        >
          Add selected image to library
        </ActionButton>
      </section>
      {removing && (
        <Modal
          open
          title="Remove brand asset"
          closeDisabled={writer.phase === "pending"}
          onOpenChange={(open) => {
            if (!open && writer.phase !== "pending") setRemoving(undefined);
          }}
        >
          <div className={styles.fields}>
            <p>
              Remove {removing.filename} from this library? Saved theme,
              blueprint and document references prevent removal. The original
              attachment remains.
            </p>
            <ActionButton
              disabled={writer.locked}
              onClick={() =>
                void writer.run("Remove brand asset", async (send, signal) => {
                  const params = { assetId: removing.id };
                  const receipt = parseWorkspaceBrandAssetDeleted(
                    await send(() =>
                      writer.api.request(
                        "workspace.brandAssets.remove",
                        { params },
                        { signal },
                      ),
                    ),
                    params,
                  );
                  if (!receipt.ok)
                    throw new Error("Asset removal was not confirmed.");
                  const saved = parseWorkspaceBrandAssetList(
                    await writer.api.request(
                      "workspace.brandAssets.list",
                      {},
                      { signal },
                    ),
                  );
                  if (
                    !saved.ok ||
                    saved.value.some((row) => row.id === removing.id)
                  )
                    throw new Error("Asset still appears in the library.");
                  if (!signal.aborted) {
                    setRemoving(undefined);
                    query.reload();
                  }
                })
              }
            >
              Confirm remove asset
            </ActionButton>
            {writer.message && <p role="status">{writer.message}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
