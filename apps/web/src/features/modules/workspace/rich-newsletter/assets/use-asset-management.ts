"use client";
import { useEffect, useRef, useState } from "react";
import type { NewsletterAssetItem } from "@capiro/shared/newsletter";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { CapiroApiError } from "../../../../../shared/capiro/http";
import { richNewsletterAssetManagementOperations as operations } from "../../../../../shared/capiro/operations/rich-newsletter-asset-management";
import {
  admitAssetChange,
  assetChangeInput,
  importedAsset,
  managementOperations,
  type AssetManagementAction,
} from "./asset-management";

type Outcome = "idle" | "pending" | "acknowledged" | "refused" | "unknown";
type ChangeState = {
  outcome: Outcome;
  error?: string;
  item?: NewsletterAssetItem;
};
function refusal(error: unknown, action: AssetManagementAction) {
  if (!(error instanceof CapiroApiError)) return undefined;
  if (error.status === 403)
    return "This change was not allowed. Refresh to review your current access.";
  if (error.status === 404)
    return "This image or folder is no longer available. Refresh the library.";
  if (error.status === 400)
    return "This change was refused. Check the name, selected folder or image URL.";
  if (
    action.kind === "importImage" &&
    error.status === 503 &&
    error.message === "Image URL import is unavailable."
  )
    return "Import unavailable. This service cannot import image URLs right now.";
  return undefined;
}

/** Lives above modal views. Refresh and close cannot resolve an uncertain write. */
export function useAssetManagement(
  onAcknowledged: (action: AssetManagementAction) => void,
) {
  const [action, setAction] = useState<AssetManagementAction>();
  const [visible, setVisible] = useState(false);
  const [sequence, setSequence] = useState(0);
  const [state, setState] = useState<ChangeState>({ outcome: "idle" });
  const key = managementOperations[action?.kind ?? "createFolder"];
  const mutation = useCapiroMutation(key);
  const active = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const blocked = state.outcome === "pending" || state.outcome === "unknown";
  const choose = (next: AssetManagementAction) => {
    if (active.current || blocked) return;
    setAction(next);
    setState({ outcome: "idle" });
    setSequence((value) => value + 1);
    setVisible(true);
  };
  const submit = async (value: string) => {
    if (
      !action ||
      active.current ||
      blocked ||
      state.outcome === "acknowledged"
    )
      return;
    const input = operations[key].request.safeParse(
      assetChangeInput(action, value),
    );
    if (!input.success) {
      setState({
        outcome: "idle",
        error: "Not sent. Check the required field and its length.",
      });
      return;
    }
    active.current = true;
    setState({ outcome: "pending" });
    try {
      const reply: unknown = await mutation.run(input.data);
      if (!admitAssetChange(action, reply))
        throw new Error("Unconfirmed image-library reply");
      if (mounted.current) {
        setState({
          outcome: "acknowledged",
          item: importedAsset(action, reply),
        });
        onAcknowledged(action);
      }
    } catch (error) {
      if (mounted.current) {
        const message = refusal(error, action);
        setState(
          message
            ? { outcome: "refused", error: message }
            : { outcome: "unknown" },
        );
      }
    } finally {
      active.current = false;
    }
  };
  return {
    ...state,
    action,
    visible,
    sequence,
    blocked,
    choose,
    submit,
    close: () => setVisible(false),
  };
}
export type AssetManagementState = ReturnType<typeof useAssetManagement>;
