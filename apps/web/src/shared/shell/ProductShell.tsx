import { SelectedClientGate } from '../session/SelectedClient';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import styles from './shell.module.css';

export function ProductShell({ children, designTarget = '442:81437', assetSet = 'home' }: { children: React.ReactNode; designTarget?: string; assetSet?: 'home' | 'cited-answer' }) {
  return <><div className={styles.target} data-design-target={designTarget}><Header assetSet={assetSet} /><div className={styles.workspace}><Sidebar assetSet={assetSet} /><main id="main-content" className={styles.main}><SelectedClientGate>{children}</SelectedClientGate></main></div></div><footer className={styles.fixtureNotice} role="note"><strong>Disconnected synthetic fixture.</strong> Jordan, Anduril, recent titles, answer, citations and approval counts are samples. No signed-in identity, authorized source data or sending is available. Drafts stay in this page only.</footer></>;
}
