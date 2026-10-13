"use client";
import { ActionButton } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { moreCatalog } from "./more-catalog";

export function MoreScreen() {
  const route = useLegiWatchRoute();
  if (route.moreView)
    return (
      <>
        <div className={styles.actions}>
          <ActionButton onClick={() => route.navigate({ lwMore: null })}>
            More LegiWatch
          </ActionButton>
        </div>
        <MoreContent view={route.moreView} />
      </>
    );
  return (
    <div className={styles.menuGrid}>
      {moreCatalog.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.menuCard}
          onClick={() => route.navigate({ lwMore: item.id })}
        >
          <strong>{item.title}</strong>
          <span>{item.description}</span>
        </button>
      ))}
    </div>
  );
}
function MoreContent({ view }: { view: string }) {
  const item = moreCatalog.find((item) => item.id === view);
  return item ? (
    <item.Screen />
  ) : (
    <p className={styles.description}>
      This LegiWatch view could not be found.
    </p>
  );
}
