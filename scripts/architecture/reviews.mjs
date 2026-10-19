import reviewedSizeFindings from './reviewed-size-findings.json' with { type: 'json' };
import { transferCommit, transferPath, transferSourceRoot } from './transfer-baseline.mjs';

const key = finding => [finding.file, finding.kind, finding.symbol].join('\0');

function validReview(review) {
  return typeof review.file === 'string' && ['file', 'function'].includes(review.kind)
    && typeof review.symbol === 'string' && /^[a-f0-9]{64}$/.test(review.fingerprint)
    && typeof review.reason === 'string' && Boolean(review.reason.trim())
    && typeof review.reviewedBy === 'string' && Boolean(review.reviewedBy.trim())
    && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn);
}

function recordErrors(reviews) {
  const errors = [], seen = new Set();
  for (const review of reviews) {
    if (!validReview(review)) errors.push(`Invalid explicit size review: ${review.file} ${review.symbol}`);
    if (seen.has(key(review))) errors.push(`Duplicate explicit size review: ${review.file} ${review.symbol}`);
    seen.add(key(review));
  }
  return errors;
}

function baselineErrors(baseline) {
  if (!baseline) return [];
  if (baseline.version !== 1 || baseline.commit !== transferCommit || baseline.sourceRoot !== transferSourceRoot || !Array.isArray(baseline.findings)) return ['Size provenance must use the pinned Portfolio transfer inventory'];
  return baseline.findings.flatMap(finding => transferPath(finding.originalFile ?? '') !== finding.file || !/^[a-f0-9]{64}$/.test(finding.fingerprint)
    ? [`Invalid transferred size provenance: ${finding.file}`] : []);
}

/** Review approval and unchanged transfer provenance are deliberately distinct. */
export function assessSizeFindings(findings, { reviews = [], baseline } = {}) {
  const provenanceErrors = baselineErrors(baseline);
  const reviewErrors = [...provenanceErrors, ...recordErrors(reviews)];
  const reviewed = new Map(reviews.map(review => [key(review), review]));
  const inherited = new Map((provenanceErrors.length ? [] : baseline?.findings ?? []).map(finding => [key(finding), finding]));
  const sizeFindings = findings.map(finding => {
    const previous = inherited.get(key(finding));
    const review = reviewed.get(key(finding));
    const accepted = review?.fingerprint === finding.fingerprint && validReview(review);
    const unchanged = previous?.fingerprint === finding.fingerprint;
    return {
      ...finding,
      provenance: unchanged ? 'inherited-unchanged' : previous ? 'changed-since-transfer' : 'new',
      reviewStatus: accepted ? 'reviewed' : review ? 'changed-since-review' : 'unreviewed',
      blocking: !accepted && (!unchanged || Boolean(review)),
      ...(unchanged ? { transferCommit: baseline.commit } : {}),
      ...(accepted ? { review: { reason: review.reason, reviewedBy: review.reviewedBy, reviewedOn: review.reviewedOn } } : {}),
    };
  });
  return {
    reviewErrors,
    sizeFindings,
    sizeSummary: {
      total: sizeFindings.length,
      reviewed: sizeFindings.filter(finding => finding.reviewStatus === 'reviewed').length,
      inheritedUnreviewed: sizeFindings.filter(finding => finding.provenance === 'inherited-unchanged' && finding.reviewStatus !== 'reviewed' && !finding.blocking).length,
      blocking: sizeFindings.filter(finding => finding.blocking).length,
    },
  };
}

// Static evidence has its own owner; assessment logic never generates approvals.
export { reviewedSizeFindings };
