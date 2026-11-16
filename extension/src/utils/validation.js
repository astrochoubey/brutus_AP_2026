/**
 * Validates scan payload structure and non-negative count constraints.
 *
 * @param {Object} scan - Scan payload to validate
 * @returns {{ isValid: boolean, reason: string | null }}
 */
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

/**
 * Validates the completeness and integrity of a scan extraction run.
 *
 * @param {number} reportedCount - Total count displayed on user profile banner
 * @param {number} collectedCount - Actual count extracted through scrolling
 * @param {number} [duplicateCount=0] - Filtered duplicates count
 * @param {number} [errorCount=0] - Extraction error count
 * @returns {import('../types/models').ScanMetadata}
 */
export function validateScanQuality(reportedCount, collectedCount, duplicateCount = 0, errorCount = 0) {
    const reported = Math.max(0, reportedCount || 0);
    const collected = Math.max(0, collectedCount || 0);

    let confidenceScore = 1.0;
    if (reported > 0) {
        confidenceScore = Math.min(1.0, collected / reported);
    } else if (collected === 0) {
        confidenceScore = 1.0;
    }

    let status = 'COMPLETE';
    if (confidenceScore < 0.95 || errorCount > 5) {
        status = 'PARTIAL';
    }
    if (collected === 0 && reported > 0) {
        status = 'FAILED';
    }

    return {
        scanId: `scan_${Date.now()}`,
        scanType: 'FULL',
        reportedCount: reported,
        collectedCount: collected,
        duplicateCount,
        errorCount,
        confidenceScore: parseFloat(confidenceScore.toFixed(4)),
        status,
        timestamp: new Date().toISOString()
    };
}
