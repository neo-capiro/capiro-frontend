"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { clientViews } from "@/shared/portfolio/shell/client-views";
import { useClientViewKeys } from "./useClientViewKeys";
import styles from "./view-switcher.module.css";
import header from "./client-header.module.css";

export function ClientViewSwitcher({
  base,
  name,
  view,
}: {
  base: string;
  name: string;
  view: (typeof clientViews)[number];
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const changeOpen = useCallback((value: boolean) => {
    setSearch("");
    setActive(0);
    setOpen(value);
  }, []);
  const toggle = useCallback(() => changeOpen(!open), [changeOpen, open]);
  useClientViewKeys(base, toggle);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);
  const matches = clientViews.filter((item) =>
    `${item.label} ${item.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const navigate = (suffix: string) => {
    changeOpen(false);
    router.push(`${base}${suffix}`);
  };
  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger
        className={header.view}
        aria-label={`Switch client view: ${view.label}`}
        aria-keyshortcuts="Meta+J Control+J"
      >
        <img src="/design/411-55991-imgIconLayoutGrid.svg" alt="" />
        {view.label}
        <img src="/design/411-55991-imgIconChevronDown.svg" alt="" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.popup}
          align="start"
          sideOffset={6}
          collisionPadding={8}
        >
          <div className={styles.filter}>
            <img src="/design/remaining-intake/411-47740.svg" alt="" />
            <input
              role="combobox"
              aria-label="Jump to a view"
              placeholder="Jump to a view…"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-activedescendant={
                matches[active] ? `${id}-${active}` : undefined
              }
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((value) =>
                    matches.length
                      ? (value +
                          (event.key === "ArrowDown"
                            ? 1
                            : matches.length - 1)) %
                        matches.length
                      : 0,
                  );
                }
                if (event.key === "Enter" && matches[active]) {
                  event.preventDefault();
                  navigate(matches[active].suffix);
                }
              }}
            />
            <kbd>⌘J / Ctrl J</kbd>
          </div>
          <p className={styles.group}>{name} views</p>
          <div
            role="listbox"
            aria-label="Client views"
            id={`${id}-list`}
            className={styles.list}
          >
            {matches.map((item, index) => (
              <Link
                role="option"
                aria-label={item.label}
                id={`${id}-${index}`}
                key={item.suffix}
                href={`${base}${item.suffix}`}
                aria-selected={index === active}
                aria-current={item === view ? "page" : undefined}
                tabIndex={-1}
                className={styles.option}
                onClick={() => changeOpen(false)}
                onPointerMove={() => setActive(index)}
              >
                <span className={styles.icon} data-overview={!item.suffix}>
                  <img
                    src={`/design/remaining-intake/${item.menuIcon}.svg`}
                    alt=""
                  />
                </span>
                <span className={styles.text}>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {item.shortcut && <kbd>G {item.shortcut.toUpperCase()}</kbd>}
              </Link>
            ))}
          </div>
          {!matches.length && (
            <p role="status" className={styles.empty}>
              No matching client views.
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
