import { Header } from './Header';
import { Sidebar } from './Sidebar';
import styles from './shell.module.css';

export function ProductShell({ children }: { children: React.ReactNode }) {
  return <><div className={styles.target} data-design-target="442:81437"><Header /><div className={styles.workspace}><Sidebar /><main id="main-content" className={styles.main}>{children}</main></div></div><footer className={styles.fixtureNotice} role="note"><strong>Disconnected synthetic fixture.</strong> Jordan, Anduril, recent titles and approval counts are samples. No signed-in identity, authorized source data or sending is available. Drafts stay in this page only.</footer></>;
}
