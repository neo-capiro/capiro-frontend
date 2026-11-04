"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function CopyProjectDialog({
  resource,
  onClose,
  onCreated,
}: {
  resource: { id: string; name: string };
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const api = useCapiro();
  const [name, setName] = useState(`${resource.name} copy`),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.request("planner.project.duplicate", {
        params: { id: resource.id },
        body: { name },
      });
      onCreated(result.id);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create project.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Duplicate project"
      description="The new project starts private; the service checks source access."
    >
      <form className={styles.stack} onSubmit={(event) => void submit(event)}>
        <Field label="Project name" htmlFor="copy-project-name">
          <TextInput
            id="copy-project-name"
            required
            maxLength={500}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.footer}>
          <ActionButton type="button" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={busy}>
            Create project
          </ActionButton>
        </div>
      </form>
    </Modal>
  );
}
