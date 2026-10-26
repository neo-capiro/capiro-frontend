"use client";
import { useState } from "react";
import type {
  NewsletterBlock,
  NewsletterDesign,
} from "@capiro/shared/newsletter";
import { ActionButton } from "../../../../../shared/module-ui";
import {
  blockDestinations,
  blockNeighbours,
  type StructureAction,
} from "./structure";
import { Choice } from "./Fields";
import ui from "../library/sections.module.css";
import styles from "./content.module.css";

export function BlockPlacement({
  block,
  design,
  change,
  update,
}: {
  block: NewsletterBlock;
  design: NewsletterDesign;
  change: (action: StructureAction) => void;
  update: (value: Partial<NewsletterBlock>) => void;
}) {
  const [destination, setDestination] = useState("");
  const targets = blockDestinations(design);
  const neighbours = blockNeighbours(design, block.id);
  return (
    <>
      {block.kind === "columns" && (
        <>
          <Choice
            label="Number of columns"
            value={String(block.columns.length)}
            values={["1", "2", "3", "4"]}
            change={(value) =>
              change({ type: "columns", id: block.id, count: Number(value) })
            }
          />
          <Choice
            label="Desktop ratio"
            value={block.ratio}
            values={
              block.columns.length === 2
                ? ["2", "1:2", "2:1", "1:3", "3:1"]
                : [
                    String(block.columns.length),
                    ...(block.ratio !== String(block.columns.length)
                      ? [block.ratio]
                      : []),
                  ]
            }
            change={(ratio) =>
              update({ ratio: ratio as NewsletterBlock["ratio"] })
            }
          />
          <Choice
            label="Mobile orientation"
            value={block.mobileOrientation}
            values={[
              ["stacked", "Stacked"],
              ["horizontal", "Horizontal"],
            ]}
            change={(mobileOrientation) =>
              update({
                mobileOrientation:
                  mobileOrientation as NewsletterBlock["mobileOrientation"],
              })
            }
          />
          <p>
            Columns retain their content. Move or remove blocks from the last
            columns before reducing their number.
          </p>
        </>
      )}
      <details>
        <summary>Block position</summary>
        <div className={styles.stack}>
          <div className={ui.actions}>
            <ActionButton
              className={ui.button}
              disabled={!neighbours.up}
              onClick={() =>
                change({ type: "block", id: block.id, action: "up" })
              }
            >
              Move block up
            </ActionButton>
            <ActionButton
              className={ui.button}
              disabled={!neighbours.down}
              onClick={() =>
                change({ type: "block", id: block.id, action: "down" })
              }
            >
              Move block down
            </ActionButton>
            <ActionButton
              className={ui.button}
              onClick={() =>
                change({ type: "block", id: block.id, action: "duplicate" })
              }
            >
              Duplicate block
            </ActionButton>
          </div>
          <Choice
            label="Move to container"
            value={destination}
            values={[
              ["", "Choose a section or column"],
              ...targets.map(
                (target) =>
                  [JSON.stringify(target.target), target.label] as const,
              ),
            ]}
            change={setDestination}
          />
          <ActionButton
            className={ui.button}
            disabled={
              !targets.some(
                (target) => JSON.stringify(target.target) === destination,
              )
            }
            onClick={() => {
              const target = targets.find(
                (entry) => JSON.stringify(entry.target) === destination,
              );
              if (target)
                change({
                  type: "moveBlock",
                  id: block.id,
                  target: target.target,
                });
            }}
          >
            Move block
          </ActionButton>
        </div>
      </details>
    </>
  );
}
