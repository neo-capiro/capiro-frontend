import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import styles from "./tooling.module.css";

export type WorkflowTileView = {
  id: string;
  title: string;
  description: string;
  /** Needs-source tiles still open setup; disabled tiles cannot start. */
  state: "default" | "needs-source" | "disabled";
  setupHref?: string | undefined;
};

/** Meri/Workflow tile: a named workflow starter that opens its typed setup. */
export function WorkflowTile({
  tile,
  unavailable,
}: {
  tile: WorkflowTileView;
  unavailable: string;
}) {
  const disabled = tile.state === "disabled";
  return (
    <article
      className={styles.tile}
      aria-label={tile.title}
      data-state={tile.state}
    >
      <div className={styles.tileCopy}>
        <h2>{tile.title}</h2>
        <p>{tile.description}</p>
      </div>
      {disabled ? (
        <button
          type="button"
          className={`${ui.ghost} ${styles.blocked}`}
          disabled
          title="This workflow is not available in your current scope."
        >
          Unavailable<span className="sr-only"> {tile.title}</span>
        </button>
      ) : (
        <LinkAction
          variant="outline"
          href={tile.setupHref}
          unavailable={unavailable}
        >
          Set up<span className="sr-only"> {tile.title}</span>
        </LinkAction>
      )}
    </article>
  );
}
