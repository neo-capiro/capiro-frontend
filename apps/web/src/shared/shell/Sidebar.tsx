'use client';

import { Button } from '@capiro/ui/button';
import { DesignIcon } from './DesignIcon';
import styles from './shell.module.css';

const destinations = [{ label: 'Conversations', icon: 'conversations', current: true }, { label: 'Files', icon: 'files' }, { label: 'Runs', icon: 'runs' }, { label: 'Approvals · 2', icon: 'approvals' }, { label: 'Memory', icon: 'memory' }, { label: 'Schedules', icon: 'calendar' }, { label: 'Data access', icon: 'data-access' }];
const recents = ['Anduril meeting brief', 'FY27 funding landscape', 'Weekly client updates'];

export function Sidebar() {
  const reset = () => window.dispatchEvent(new Event('meri:reset-local-draft'));
  return <aside className={styles.sidebar} aria-label="Meri navigation">
    <Button type="button" className={styles.newConversation} onClick={reset}><DesignIcon name="plus" />New conversation</Button>
    <Button type="button" variant="ghost" className={styles.navButton} disabled title="No connected conversation store"><DesignIcon name="search" />Search conversations</Button>
    <div className={styles.divider} />
    <nav className={styles.destinations} aria-label="Meri workspace">{destinations.map(item => <Button key={item.label} type="button" variant="ghost" className={`${styles.navButton} ${item.current ? styles.currentDestination : ''}`} aria-current={item.current ? 'page' : undefined} disabled={!item.current} title={item.current ? 'Current local Home' : 'Unavailable: disconnected synthetic fixture'}>{<DesignIcon name={item.icon} />}{item.label}</Button>)}</nav>
    <section className={styles.recents} aria-labelledby="recent-label"><h2 id="recent-label">Recent</h2>{recents.map(title => <Button key={title} type="button" variant="ghost" className={styles.navButton} disabled title="Synthetic title; no conversation exists">{title}</Button>)}</section>
    <div className={styles.preferences}><div className={styles.divider} /><Button type="button" variant="ghost" className={styles.navButton} disabled title="Settings is a future boundary">Preferences</Button><p>Capiro · Your authorized workspace</p></div>
  </aside>;
}
