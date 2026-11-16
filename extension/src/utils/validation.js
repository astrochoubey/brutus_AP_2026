export function validateScan(scan) {
  if (!scan || typeof scan !== 'object') {
    return { isValid: false, reason: 'Scan data must be a non-null object' };
  }
  const { reportedCount, collectedCount } = scan;
  if (!Number.isFinite(reportedCount) || reportedCount < 0 || !Number.isFinite(collectedCount) || collectedCount < 0) {
    return { isValid: false, reason: 'Counts must be non-negative finite numbers' };
  }
  if (collectedCount > reportedCount) {
    return { isValid: false, reason: 'collectedCount cannot exceed reportedCount' };
  }
  return { isValid: true, reason: null };
}
