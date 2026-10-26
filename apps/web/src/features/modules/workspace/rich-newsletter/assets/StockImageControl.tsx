"use client";
import { useId, useRef, useState } from "react";
import type {
  NewsletterAssetDetails,
  NewsletterStockImage,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Modal,
  Panel,
  TextInput,
} from "../../../../../shared/module-ui";
import { useStockImages, type StockImagesState } from "./use-stock-images";
import { assetName } from "./AssetLibrary";
import styles from "./assets.module.css";
import stockStyles from "./stock-images.module.css";

/** Mounted inside the existing scope/document/block-keyed image picker owner. */
export function StockImageControl({
  onInsert,
}: {
  onInsert: (asset: NewsletterAssetDetails) => void;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const view = useStockImages(open);
  const inserted = useRef(false);
  const changeOpen = (next: boolean) => {
    view.clearSearch();
    setDetails(false);
    inserted.current = false;
    setOpen(next);
  };
  const insert = () => {
    if (
      !open ||
      inserted.current ||
      view.state.phase !== "proposed" ||
      !view.details?.currentRevision ||
      view.details.id.toLowerCase() !== view.state.item?.id.toLowerCase()
    )
      return;
    inserted.current = true;
    onInsert(view.details);
    view.reviewAnother();
    setOpen(false);
  };
  const reviewing = view.state.phase === "proposed";
  return (
    <>
      <ActionButton onClick={() => changeOpen(true)}>Stock images</ActionButton>
      <Modal
        open={open}
        onOpenChange={changeOpen}
        className={styles.modal}
        title={
          reviewing
            ? "Review imported image"
            : details
              ? "Stock image details"
              : "Stock images"
        }
        description="Photos provided by Pexels. Import saves a copy to your image library; inserting changes this block separately."
        footer={
          <>
            {(details || reviewing) && !view.blocked && (
              <ActionButton
                onClick={() => {
                  view.reviewAnother();
                  setDetails(false);
                }}
              >
                Back to stock images
              </ActionButton>
            )}
            <ActionButton onClick={() => changeOpen(false)}>Close</ActionButton>
            {reviewing ? (
              <ActionButton
                primary
                disabled={!view.details?.currentRevision}
                onClick={insert}
              >
                Insert
              </ActionButton>
            ) : (
              details && (
                <ActionButton
                  primary
                  disabled={
                    view.blocked ||
                    !view.status.data?.available ||
                    !view.selected
                  }
                  onClick={() => void view.importImage()}
                >
                  Import image
                </ActionButton>
              )
            )}
          </>
        }
      >
        <div className={styles.stack}>
          <StockImportNotice view={view} />
          {reviewing ? (
            <ImportedStockImage view={view} />
          ) : details && view.selected ? (
            <StockPhotoDetails photo={view.selected} />
          ) : (
            <StockSearch view={view} viewDetails={() => setDetails(true)} />
          )}
        </div>
      </Modal>
    </>
  );
}

function StockImportNotice({ view }: { view: StockImagesState }) {
  if (view.state.phase === "pending")
    return (
      <p role="status" className={styles.notice}>
        Importing your selected photo… Closing this dialog does not cancel the
        server import.
      </p>
    );
  if (view.state.phase === "unknown")
    return (
      <p role="alert" className={styles.notice}>
        The import could not be confirmed and may have saved an image. Further
        imports are blocked in this view. Close and refresh your image library
        to inspect current images; a matching row cannot confirm this request.
      </p>
    );
  return view.error ? <p role="alert">{view.error}</p> : null;
}

function StockSearch({
  view,
  viewDetails,
}: {
  view: StockImagesState;
  viewDetails: () => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  if (view.status.loading)
    return <p role="status">Checking stock image availability…</p>;
  if (view.status.error || !view.status.data?.available)
    return (
      <div className={styles.panel}>
        <Panel title="Stock images unavailable">
          <p>
            {view.status.data?.reason ||
              "Stock image availability could not be confirmed."}
          </p>
          <ActionButton onClick={view.status.reload}>
            Check availability
          </ActionButton>
        </Panel>
      </div>
    );
  return (
    <div className={styles.panel}>
      <Panel title="Search stock images">
        <form
          className={styles.fields}
          onSubmit={(event) => {
            event.preventDefault();
            view.load({ search, page: 1 });
          }}
        >
          <Field label="Search stock images" htmlFor={id}>
            <TextInput
              id={id}
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <p className={styles.page}>
            10 images per page{view.query ? ` · Page ${view.query.page}` : ""}
          </p>
          <ActionButton type="submit">Search</ActionButton>
        </form>
        {view.search.loading && <p role="status">Searching stock images…</p>}
        {(view.search.error || view.invalidPage) && (
          <p role="alert">
            Stock results could not be verified. Search again to refresh the
            results.
          </p>
        )}
        {view.results && (
          <>
            <p className={styles.page}>
              Pexels reported {view.results.total.toLocaleString()} results for
              this search.
            </p>
            {!view.results.items.length && (
              <p>No photos were returned on this page.</p>
            )}
            <ul className={styles.items}>
              {view.results.items.map((photo) => (
                <li key={photo.id} className={styles.item}>
                  <h3>{assetName(photo.title)}</h3>
                  <StockAttribution photo={photo} />
                  <ActionButton
                    disabled={view.blocked}
                    aria-pressed={view.selected?.id === photo.id}
                    onClick={() => view.select(photo)}
                  >
                    {view.selected?.id === photo.id
                      ? "Selected"
                      : "Select photo"}
                  </ActionButton>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <ActionButton
                disabled={!view.selected || view.blocked}
                onClick={viewDetails}
              >
                View details
              </ActionButton>
              <ActionButton
                disabled={!view.selected || view.blocked}
                onClick={() => view.select()}
              >
                Deselect
              </ActionButton>
              <ActionButton
                disabled={
                  !view.query || view.query.page <= 1 || view.search.loading
                }
                onClick={() =>
                  view.query &&
                  view.load({ ...view.query, page: view.query.page - 1 })
                }
              >
                Previous page
              </ActionButton>
              <ActionButton
                disabled={
                  !view.query ||
                  view.query.page >= 10_000 ||
                  view.search.loading ||
                  view.query.page * 10 >= view.results.total
                }
                onClick={() =>
                  view.query &&
                  view.load({ ...view.query, page: view.query.page + 1 })
                }
              >
                Next page
              </ActionButton>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

function StockAttribution({ photo }: { photo: NewsletterStockImage }) {
  return (
    <p className={stockStyles.credit}>
      Photo by{" "}
      <a href={photo.photographerUrl} target="_blank" rel="noopener noreferrer">
        {photo.photographer.trim() || "Pexels contributor"}
      </a>{" "}
      on{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
        Pexels
      </a>
      .
    </p>
  );
}

function StockPhotoDetails({ photo }: { photo: NewsletterStockImage }) {
  const id = useId();
  return (
    <div className={styles.panel}>
      <Panel title="Photo details">
        <div className={styles.fields}>
          <div className={stockStyles.canvas}>
            {/* The user selected this provider photo. No server image proxy is introduced. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnailUrl}
              alt={photo.title || "Selected stock photo"}
              referrerPolicy="no-referrer"
            />
          </div>
          <Field label="Title" htmlFor={`${id}-title`}>
            <output id={`${id}-title`} className={styles.value}>
              {assetName(photo.title)}
            </output>
          </Field>
          <Field label="Dimensions" htmlFor={`${id}-size`}>
            <output id={`${id}-size`} className={styles.value}>
              {photo.width} × {photo.height} pixels
            </output>
          </Field>
          <StockAttribution photo={photo} />
          <p>
            Import saves a copy to your image library. Review that image before
            inserting it.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function ImportedStockImage({ view }: { view: StockImagesState }) {
  const id = useId();
  return (
    <div className={styles.panel}>
      <Panel title="Imported image">
        <div className={styles.fields}>
          {view.state.source && (
            <>
              <p>Selected stock source</p>
              <StockAttribution photo={view.state.source} />
            </>
          )}
          <p>
            The server returned a saved image. Its current details are checked
            separately.
          </p>
          {view.detail.loading && (
            <p role="status">Checking current image details…</p>
          )}
          {(view.detail.error || view.invalidDetail) && (
            <p role="alert">
              The imported image details could not be verified.
            </p>
          )}
          {view.details && (
            <>
              <Field label="Imported name" htmlFor={`${id}-name`}>
                <output id={`${id}-name`} className={styles.value}>
                  {assetName(view.details.name)}
                </output>
              </Field>
              <p>
                {view.details.mimeType} ·{" "}
                {view.details.sizeBytes.toLocaleString()} bytes · Revision{" "}
                {view.details.revisionNumber}
              </p>
              {!view.details.currentRevision && (
                <p role="alert">
                  This image is no longer current. Insert is unavailable.
                </p>
              )}
            </>
          )}
          <Field label="Suggested alternative text" htmlFor={`${id}-alt`}>
            <output id={`${id}-alt`} className={styles.value}>
              {view.state.item?.altText || "No description supplied"}
            </output>
          </Field>
          <p>
            Insert preserves the block’s existing alternative text, link and
            style.
          </p>
          <ActionButton onClick={view.detail.reload}>
            Refresh image details
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
}
