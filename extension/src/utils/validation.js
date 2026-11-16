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
