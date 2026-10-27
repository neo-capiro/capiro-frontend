import styles from "./share-unavailable.module.css";

/** Every unavailable shared address reveals the same plain page. */
export function ShareUnavailable() {
  return (
    <main className={styles.page}>
      <section aria-label="Link unavailable">
        <h1>Link not available</h1>
        <p>
          This link is not available. It may have expired or been withdrawn.
        </p>
      </section>
    </main>
  );
}
