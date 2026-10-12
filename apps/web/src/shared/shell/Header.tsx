import { Button } from '@capiro/ui/button';
import { DesignIcon } from './DesignIcon';
import styles from './shell.module.css';

const modes = [{ label: 'Meri', icon: 'mode-meri', current: true }, { label: 'Portfolio', icon: 'mode-portfolio', current: false }, { label: 'Modules', icon: 'mode-modules', current: false }];
const actions = [{ label: 'Quick log', icon: 'quick-log' }, { label: 'Master calendar', icon: 'calendar' }, { label: 'Search', icon: 'search' }, { label: 'Updates', icon: 'updates' }];

export function Header({ assetSet = 'home' }: { assetSet?: 'home' | 'cited-answer' }) {
  return <header className={styles.header}>
    <a href="/" className={styles.brand} aria-label="Capiro Home"><img src="/design/home/wordmark.png" width="77" height="26" alt="Capiro" /></a>
    <nav className={styles.modes} aria-label="Product modes">
      {modes.map(mode => <Button key={mode.label} type="button" variant="ghost" className={`${styles.mode} ${mode.current ? styles.currentMode : ''}`} aria-label={mode.current ? mode.label : `${mode.label} — unavailable`} aria-current={mode.current ? 'page' : undefined} disabled={!mode.current} title={mode.current ? (assetSet === 'home' ? 'Meri Home' : 'Meri workspace') : `${mode.label} is not implemented`}><DesignIcon name={mode.icon} assetSet={assetSet} /></Button>)}
    </nav>
    <div className={styles.globalActions}>
      {actions.map(action => <Button key={action.label} type="button" variant="ghost" className={styles.action} disabled aria-label={`${action.label} — unavailable`} title={`${action.label} is unavailable in this disconnected fixture`}><DesignIcon name={action.icon} assetSet={assetSet} /></Button>)}
      <Button type="button" variant="ghost" className={styles.action} disabled aria-label="Synthetic profile — unavailable" title="Synthetic profile; no signed-in session"><DesignIcon name="profile" assetSet={assetSet} /></Button>
    </div>
  </header>;
}
