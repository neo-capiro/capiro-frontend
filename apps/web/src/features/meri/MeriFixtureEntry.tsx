import { Button } from '@capiro/ui/button';
import styles from './fixture.module.css';

export function MeriFixtureEntry() {
  return <main className={styles.entry}><p className={styles.eyebrow}>Capiro frontend foundation</p><h1>Explore a synthetic Meri Home.</h1><p>This disconnected design fixture uses sample Jordan, Anduril, conversation titles and approval counts. There is no signed-in session, client authorization, source data or chat service.</p><p>You can edit a local draft and select suggestions. Sending and attachments remain unavailable. Nothing is persisted or submitted.</p><Button asChild className={styles.open}><a href="/meri">Open synthetic Meri Home</a></Button><p className={styles.note}>Portfolio is available from the product header and uses its own configured service access. Modules and Settings remain future areas. The Meri backend and its trusted contracts remain independently owned and deployed.</p></main>;
}
