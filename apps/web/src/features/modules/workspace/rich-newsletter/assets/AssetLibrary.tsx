import { useId } from "react";
import type { NewsletterAssetList } from "@capiro/shared/newsletter";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  SelectInput,
  TextInput,
} from "../../../../../shared/module-ui";
import {
  assetPageSizes,
  assetSorts,
  type AssetListQuery,
} from "../../../../../shared/capiro/operations/rich-newsletter-assets";
import type { AssetPickerState } from "./use-asset-picker";
import styles from "./assets.module.css";

export const assetName = (name: string) =>
  name.trim() ? name : "Untitled image";
const sortLabels = {
  newest: "Newest first",
  oldest: "Oldest first",
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
};
function LibraryFields({ picker }: { picker: AssetPickerState }) {
  const id = useId();
  return (
    <div className={styles.fields}>
      <Field label="Search files" htmlFor={`${id}-search`}>
        <TextInput
          id={`${id}-search`}
          value={picker.query.search}
          maxLength={200}
          onChange={(event) =>
            picker.changeQuery({ search: event.target.value })
          }
        />
      </Field>
      <Field label="Sort by" htmlFor={`${id}-sort`}>
        <SelectInput
          id={`${id}-sort`}
          value={picker.query.sort}
          options={assetSorts.map((value) => ({
            value,
            label: sortLabels[value],
          }))}
          onValueChange={(value) =>
            picker.changeQuery({ sort: value as AssetListQuery["sort"] })
          }
        />
      </Field>
      <Field label="Items per page" htmlFor={`${id}-size`}>
        <SelectInput
          id={`${id}-size`}
          value={String(picker.query.pageSize)}
          options={assetPageSizes.map((value) => ({
            value: String(value),
            label: String(value),
          }))}
          onValueChange={(value) =>
            picker.changeQuery({
              pageSize: Number(value) as AssetListQuery["pageSize"],
            })
          }
        />
      </Field>
    </div>
  );
}
export function AssetLibrary({
  picker,
  refresh,
}: {
  picker: AssetPickerState;
  refresh: () => void;
}) {
  const { data, error, loading } = picker.list;
  return (
    <div className={styles.panel}>
      <Panel title="Uploads">
        <LibraryFields picker={picker} />
        {loading && <p role="status">Loading images…</p>}
        {error && (
          <p role="alert" className={styles.notice}>
            Image library unavailable. Refresh to try this read again.
          </p>
        )}
        {data && !data.items.length && (
          <p role="status">
            {picker.query.search && data.total === 0
              ? "No images match this search."
              : data.page === 1 && data.total === 0
                ? "No images in your library."
                : "No images on this page."}
          </p>
        )}
        {data && <LibraryPage picker={picker} data={data} />}
        <div className={styles.actions}>
          <ActionButton
            disabled={!picker.selectedId}
            onClick={picker.viewDetails}
          >
            View Details
          </ActionButton>
          <ActionButton onClick={refresh}>Refresh library</ActionButton>
        </div>
      </Panel>
    </div>
  );
}

function LibraryPage({
  picker,
  data,
}: {
  picker: AssetPickerState;
  data: NewsletterAssetList;
}) {
  return (
    <>
      <p className={styles.page}>
        Page {data.page} · {data.total} matching images reported
      </p>
      <ul className={styles.items} aria-label="Library images">
        {data.items.map((item) => (
          <li key={item.id} className={styles.item}>
            {picker.selectedId === item.id && <Badge>Selected</Badge>}
            <h3>{assetName(item.name)}</h3>
            <p>{item.mimeType}</p>
            <ActionButton
              aria-pressed={picker.selectedId === item.id}
              onClick={() => picker.select(item.id)}
            >
              Select {assetName(item.name)}
            </ActionButton>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <ActionButton
          disabled={data.page <= 1}
          onClick={() => picker.changeQuery({ page: data.page - 1 })}
        >
          Previous page
        </ActionButton>
        <ActionButton
          disabled={
            data.page >= 100_000 || data.page * data.pageSize >= data.total
          }
          onClick={() => picker.changeQuery({ page: data.page + 1 })}
        >
          Next page
        </ActionButton>
      </div>
    </>
  );
}
