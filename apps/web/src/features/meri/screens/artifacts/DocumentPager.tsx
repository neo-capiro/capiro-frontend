import { ChevronDown } from "lucide-react";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import styles from "./document.module.css";

const zooms = [75, 100, 125, 150] as const;

/** Document navigation: previous/next page, position and local zoom. */
export function DocumentPager({
  index,
  count,
  onPage,
  zoom,
  onZoom,
}: {
  index: number;
  count: number;
  onPage: (index: number) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
}) {
  return (
    <nav className={styles.pager} aria-label="Document pages">
      <button
        type="button"
        className={ui.ghost}
        disabled={index === 0}
        onClick={() => onPage(index - 1)}
      >
        Previous
      </button>
      <StatusPill>{`${index + 1} / ${count}`}</StatusPill>
      <button
        type="button"
        className={ui.outline}
        disabled={index === count - 1}
        onClick={() => onPage(index + 1)}
      >
        Next page
      </button>
      <label className={ui.row}>
        <ChevronDown aria-hidden width={16} height={16} />
        <span className="sr-only">Zoom</span>
        <select
          className={styles.zoom}
          value={zoom}
          onChange={(event) => onZoom(Number(event.target.value))}
        >
          {zooms.map((value) => (
            <option key={value} value={value}>
              {value}%
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
