"use client";
import { useState } from "react";
import {
  parseWorkspaceBlueprintCreated,
  parseWorkspaceBlueprintDetail,
  parseWorkspaceBlueprintContentVersion,
} from "@capiro/shared/workspace-template-studio";
import { ActionButton, Modal } from "../../../../shared/module-ui";
import { StudioText } from "./BlueprintSectionFields";
import { readBlueprintContent } from "./BlueprintContent";
import { sameStudioValue, type StudioWrite } from "./studio-write";
import styles from "./studio-authoring.module.css";

export function BlueprintCreate({
  writer,
  onClose,
  onCreated,
}: {
  writer: StudioWrite;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  return (
    <Modal
      open
      title="New document blueprint"
      onOpenChange={(open) => {
        if (!open && writer.phase !== "pending") onClose();
      }}
      closeDisabled={writer.phase === "pending"}
      className={styles.dialog}
    >
      <form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault();
          const body = {
            name: name.trim(),
            slug: slug.trim(),
            product: product.trim(),
            description,
          };
          void writer.run("Create blueprint", async (send, signal) => {
            const created = parseWorkspaceBlueprintCreated(
              await send(() =>
                writer.api.request(
                  "workspace.blueprints.create",
                  { body },
                  { signal },
                ),
              ),
              { slug: body.slug, product: body.product },
            );
            if (
              !created.ok ||
              created.value.name !== body.name ||
              created.value.scope !== "firm"
            )
              throw new Error("New blueprint could not be confirmed.");
            const saved = parseWorkspaceBlueprintDetail(
              await writer.api.request(
                "workspace.blueprints.detail",
                { params: { blueprintId: created.value.id } },
                { signal },
              ),
              { blueprintId: created.value.id },
            );
            if (
              !saved.ok ||
              saved.value.slug !== body.slug ||
              saved.value.name !== body.name ||
              saved.value.product !== body.product
            )
              throw new Error("Saved blueprint did not match.");
            if (!signal.aborted) {
              onCreated(saved.value.id);
              onClose();
            }
          });
        }}
      >
        <p>Create a firm blueprint, then add its first draft version.</p>
        <fieldset
          disabled={writer.locked}
          className={`${styles.fields} ${styles.unframed}`}
        >
          <StudioText label="Blueprint name" value={name} onChange={setName} />
          <StudioText label="Blueprint slug" value={slug} onChange={setSlug} />
          <StudioText label="Product" value={product} onChange={setProduct} />
          <StudioText
            label="Description"
            value={description}
            onChange={setDescription}
            multiline
          />
          <ActionButton
            type="submit"
            primary
            disabled={
              writer.locked || !name.trim() || !slug.trim() || !product.trim()
            }
          >
            Create blueprint
          </ActionButton>
        </fieldset>
        {writer.message && <p role="status">{writer.message}</p>}
      </form>
    </Modal>
  );
}

export function BlueprintNewVersion({
  id,
  writer,
  onCreated,
}: {
  id: string;
  writer: StudioWrite;
  onCreated: (id: string) => void;
}) {
  return (
    <ActionButton
      disabled={writer.locked}
      onClick={() =>
        void writer.run("Create draft version", async (send, signal) => {
          const params = { blueprintId: id };
          const detail = parseWorkspaceBlueprintDetail(
            await writer.api.request(
              "workspace.blueprints.detail",
              { params },
              { signal },
            ),
            params,
          );
          if (!detail.ok)
            throw new Error(
              "Refresh the blueprint before creating a draft version.",
            );
          const latest = detail.value.versions.at(-1);
          const source = latest
            ? await readBlueprintContent(
                writer,
                { ...params, versionId: latest.id },
                signal,
              )
            : undefined;
          const received = parseWorkspaceBlueprintContentVersion(
            await send(() =>
              writer.api.request(
                "workspace.blueprints.createVersion",
                { params, body: {} },
                { signal },
              ),
            ),
            params,
          );
          if (
            !received.ok ||
            received.value.status !== "draft" ||
            detail.value.versions.some((row) => row.id === received.value.id) ||
            received.value.version !== (latest?.version ?? 0) + 1 ||
            !sameStudioValue(
              received.value.definition,
              source?.definition ?? {},
            )
          )
            throw new Error("New draft version could not be confirmed.");
          const saved = await readBlueprintContent(
            writer,
            { ...params, versionId: received.value.id },
            signal,
          );
          if (
            saved.definitionHash !== received.value.definitionHash ||
            saved.status !== "draft" ||
            !sameStudioValue(saved.definition, received.value.definition)
          )
            throw new Error("Saved draft version did not match.");
          if (!signal.aborted) onCreated(saved.id);
        })
      }
    >
      New draft version
    </ActionButton>
  );
}
