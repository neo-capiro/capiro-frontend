from pathlib import Path
root=Path('/workspace/capiro-remaining-calendar')
p=root/'apps/web/src/features/portfolio/calendar/preparation/schema.ts'
s=p.read_text().replace('  sharedAt: z.string().nullable().optional(),','  sharedAt: z.string().nullable().optional(),\n  sharedByUserId: z.string().nullable().optional(),')
p.write_text(s)
p=root/'apps/web/src/features/portfolio/calendar/review/contracts.ts'
s=p.read_text().replace('  usable: z.boolean(),','  usable: z.boolean(),\n  sharedAt: z.string().datetime({ offset: true }).nullable().optional(),\n  sharedByUserId: z.string().nullable().optional(),')
p.write_text(s)
