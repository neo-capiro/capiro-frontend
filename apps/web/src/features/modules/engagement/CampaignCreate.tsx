"use client";

import { useState } from "react";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import { CapiroApiError } from "../../../shared/capiro/http";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";

const uncertainMessage =
  "Creation may have succeeded. Check the campaign list before starting another.";

function useCampaignCreation(onCreated: (id: string) => void) {
  const create = useCapiroMutation("engagement.session.create");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (create.pending || uncertain) return;
    const value = title.trim();
    if (!value) {
      setError("Enter a campaign title.");
      return;
    }
    setError(undefined);
    try {
      const created = await create.run({ body: { title: value } });
      setOpen(false);
      onCreated(created.session.id);
    } catch (cause) {
      if (
        cause instanceof CapiroApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status)
      )
        setError(
          cause.status === 404
            ? "Campaign creation is unavailable in this environment."
            : cause.message,
        );
      else {
        setUncertain(true);
        setError(uncertainMessage);
      }
    }
  };
  return {
    create,
    open,
    setOpen,
    title,
    setTitle,
    error,
    setError,
    uncertain,
    submit,
  };
}

/** Create a versioned campaign; uncertain writes stay held for this view. */
export function CampaignCreate({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const model = useCampaignCreation(onCreated);
  return (
    <>
      <ActionButton
        className={styles.end}
        disabled={model.uncertain}
        onClick={() => {
          model.setTitle("");
          model.setError(undefined);
          model.setOpen(true);
        }}
      >
        + New campaign
      </ActionButton>
      {model.uncertain && (
        <p role="alert" className={styles.error}>
          {uncertainMessage}
        </p>
      )}
      <Modal
        open={model.open}
        onOpenChange={(next) => {
          if (!model.create.pending) model.setOpen(next);
        }}
        title="New campaign"
        description="Create a versioned campaign draft. This does not send mail."
      >
        <form
          className={styles.stack}
          onSubmit={(event) => void model.submit(event)}
        >
          <Field label="Campaign title" htmlFor="new-campaign-title">
            <TextInput
              id="new-campaign-title"
              required
              maxLength={240}
              disabled={model.create.pending || model.uncertain}
              value={model.title}
              onChange={(event) => model.setTitle(event.target.value)}
            />
          </Field>
          {model.error && (
            <p role="alert" className={styles.error}>
              {model.error}
            </p>
          )}
          <div className={styles.footer}>
            <ActionButton
              type="button"
              disabled={model.create.pending}
              onClick={() => model.setOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              type="submit"
              disabled={model.create.pending || model.uncertain}
            >
              {model.create.pending ? "Creating campaign…" : "Create campaign"}
            </ActionButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
