from pathlib import Path
r=Path('/workspace/capiro-visual-closeout')
p=r/'apps/web/src/features/portfolio/capabilities/CapabilityFields.tsx';s=p.read_text()
for name in ['name','type','sector']:s=s.replace('name="'+name+'"','name="'+name+'"\n            aria-label="'+name.title()+'"',1)
p.write_text(s)
p=r/'apps/web/src/features/modules/calendar/CalendarControls.tsx';s=p.read_text().replace('<details className={styles.moduleNavigation}>','''<details className={styles.moduleNavigation} onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}>''');p.write_text(s)
