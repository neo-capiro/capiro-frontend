"use client";
import { useState } from "react";
import type {
  NewsletterAssetDetails,
  NewsletterImageRefinement,
} from "@capiro/shared/newsletter";
import { ActionButton, Panel } from "../../../../../shared/module-ui";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { boundAssetDetails } from "../assets/use-asset-picker";
import { assetName } from "../assets/AssetLibrary";
import styles from "../assets/assets.module.css";

export function RefinementResult({
  result,
  insert,
}: {
  result: NewsletterImageRefinement;
  insert: (asset: NewsletterAssetDetails) => void;
}) {
  const [selectedId, select] = useState<string>();
  const detail = useCapiroQuery(
    "workspace.richNewsletter.assets.detail",
    { params: { id: selectedId ?? "" } },
    { enabled: !!selectedId },
  );
  const received =
    selectedId && detail.data !== undefined
      ? boundAssetDetails(detail.data, selectedId)
      : undefined;
  const asset = received?.ok ? received.value : undefined;
  return (
    <div className={styles.panel}>
      <Panel title="Choose an image">
        <p>
          The generated variants were saved to your library. Only a current
          variant can be inserted.
        </p>
        <ul className={styles.items}>
          {result.items.map((item, index) => (
            <li className={styles.item} key={`${item.id}:${index}`}>
              <h3>
                Variant {index + 1}: {assetName(item.name)}
              </h3>
              <p>{item.mimeType}</p>
              <ActionButton
                aria-pressed={selectedId === item.id}
                onClick={() => {
                  select(item.id);
                  detail.reload();
                }}
              >
                Review variant {index + 1}
              </ActionButton>
            </li>
          ))}
        </ul>
        {detail.loading && (
          <p role="status">Checking current variant details…</p>
        )}
        {(detail.error || (received && !received.ok)) && (
          <p role="alert">Variant details could not be verified.</p>
        )}
        {asset && (
          <p>
            {assetName(asset.name)} · Revision {asset.revisionNumber} ·{" "}
            {asset.currentRevision
              ? "Current image"
              : "Historical image; Insert is unavailable"}
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton disabled={!selectedId} onClick={detail.reload}>
            Refresh variant details
          </ActionButton>
          <ActionButton
            primary
            disabled={!asset?.currentRevision}
            onClick={() => {
              if (
                asset?.currentRevision &&
                asset.id.toLowerCase() === selectedId?.toLowerCase()
              )
                insert(asset);
            }}
          >
            Insert current variant
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
}
