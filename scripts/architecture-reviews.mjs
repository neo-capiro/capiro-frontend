import { createHash } from 'node:crypto';

/** Size signals remain visible. A review applies only to the exact inspected bytes. */
export function reviewSizeSignals(files, signals, records, evidenceExists) {
  const reviewed = [], pending = [], errors = [], byPath = new Map();
  if (!Array.isArray(records)) return { reviewed, pending: signals, errors: ['Size review records must be an array'] };
  for (const record of records) {
    if (!record || typeof record.path !== 'string' || byPath.has(record.path)) {
      errors.push('Invalid or duplicate size review path');
      continue;
    }
    byPath.set(record.path, record);
  }
  for (const signal of signals) {
    const name = signal.split(': ')[0], record = byPath.get(name), source = files.get(name);
    const valid = record && source !== undefined
      && /^[a-f0-9]{64}$/.test(record.sha256 ?? '')
      && createHash('sha256').update(source).digest('hex') === record.sha256
      && typeof record.rationale === 'string' && record.rationale.trim().length >= 40
      && typeof record.reviewer === 'string' && record.reviewer.trim().length > 0
      && /^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt ?? '')
      && Array.isArray(record.signals) && record.signals.includes(signal)
      && typeof record.evidence === 'string' && evidenceExists(record.evidence);
    (valid ? reviewed : pending).push(signal);
  }
  return { reviewed, pending, errors };
}
