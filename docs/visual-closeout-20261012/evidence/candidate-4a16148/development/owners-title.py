from pathlib import Path
r=Path('/workspace/capiro-visual-closeout/apps/web/src/features/portfolio/client-profile')
p=r/'ClientOverview.tsx';s=p.read_text().replace('<TeamDialog\n        clientId={clientId}', '<TeamDialog\n        clientId={clientId}\n        clientName={value.name}');p.write_text(s)
p=r/'TeamDialog.tsx';s=p.read_text().replace('  clientId,\n', '  clientId,\n  clientName,\n').replace('  clientId: string;','  clientId: string;\n  clientName?: string;').replace('          clientId={clientId}','          clientId={clientId}\n          clientName={clientName}').replace('        clientId={clientId}','        clientId={clientId}\n        clientName={clientName}')
s=s.replace('          clientName={clientName}\n          clientName={clientName}','          clientName={clientName}').replace('        clientName={clientName}\n          clientName={clientName}','        clientName={clientName}')
p.write_text(s)
p=r/'OrderedOwnerFields.tsx';s=p.read_text().replace('  clientId: string;','  clientId: string;\n  clientName?: string;').replace('title="Owners"','title={props.clientName ? `Owners · ${props.clientName}` : "Owners"}');p.write_text(s)
p=r/'OwnerCards.tsx';s=p.read_text().replace('{value && (\n                <button\n                  className={styles.remove}', '{value && index > 0 && (\n                <button\n                  className={styles.remove}');p.write_text(s)
p=r/'owners.module.css';s=p.read_text().replace('  flex-shrink: 0;\n  font: inherit;', '  flex-shrink: 0;\n  min-width: 24px;\n  min-height: 24px;\n  font: inherit;');p.write_text(s)
