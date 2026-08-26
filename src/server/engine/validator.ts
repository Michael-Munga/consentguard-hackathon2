import crypto from 'crypto';
import type {
  ConsentPurpose,
  ConsentRecord,
  DataAccessEvent,
  ValidationGateResult,
  ProvenanceReport,
  Pillar,
  AnomalyType,
} from '../../types/index.js';

// ============================================================================
// 1. ENTITY-LEVEL CONSENT CONFLICT DETECTION (Gate 1)
// ============================================================================
export interface ConsentConflictResult {
  hasConflict: boolean;
  anomaly?: {
    type: AnomalyType;
    severity: 'low' | 'medium' | 'critical';
    detail: string;
  };
}

export function detectConsentConflict(
  existingRecords: ConsentRecord[],
  newRecord: ConsentRecord
): ConsentConflictResult {
  if (newRecord.status !== 'granted') {
    return { hasConflict: false };
  }

  const newGrantedAt = newRecord.granted_at ? new Date(newRecord.granted_at).getTime() : Date.now();
  const newExpiresAt = newRecord.expires_at ? new Date(newRecord.expires_at).getTime() : Infinity;

  for (const record of existingRecords) {
    if (record.id === newRecord.id) continue;
    if (record.purpose !== newRecord.purpose) continue;
    if (record.status !== 'granted') continue;

    const existingGrantedAt = record.granted_at ? new Date(record.granted_at).getTime() : 0;
    const existingRevokedAt = record.revoked_at ? new Date(record.revoked_at).getTime() : null;
    const existingExpiresAt = record.expires_at ? new Date(record.expires_at).getTime() : Infinity;

    // Check if existing record was active at time of new grant
    const existingIsActive =
      (!existingRevokedAt || existingRevokedAt > newGrantedAt) &&
      existingExpiresAt > newGrantedAt &&
      existingGrantedAt <= newExpiresAt;

    if (existingIsActive) {
      return {
        hasConflict: true,
        anomaly: {
          type: 'INCONSISTENT_CONSENT_STATE',
          severity: 'critical',
          detail: `Entity consent overlap detected for beneficiary ${newRecord.beneficiary_id} on purpose '${newRecord.purpose}'. Active grant '${record.id}' already exists without prior revocation.`,
        },
      };
    }
  }

  return { hasConflict: false };
}

// ============================================================================
// 3. ACCESS-WITHOUT-CONSENT DETECTION (CORE DEMO MOMENT)
// ============================================================================
export interface AccessValidationResult {
  isValid: boolean;
  anomaly?: {
    type: AnomalyType;
    severity: 'low' | 'medium' | 'critical';
    detail: string;
  };
}

export function validateDataAccessEvent(
  event: Pick<DataAccessEvent, 'beneficiary_id' | 'purpose' | 'accessed_at' | 'accessed_by'>,
  beneficiaryConsents: ConsentRecord[]
): AccessValidationResult {
  const accessTime = new Date(event.accessed_at).getTime();

  // Find consent records for this exact purpose
  const purposeConsents = beneficiaryConsents.filter(c => c.purpose === event.purpose);

  if (purposeConsents.length === 0) {
    return {
      isValid: false,
      anomaly: {
        type: 'UNAUTHORIZED_DATA_ACCESS',
        severity: 'critical',
        detail: `KDPA Compliance Breach: User '${event.accessed_by}' attempted to access beneficiary data for '${event.purpose}', but NO consent record exists on file.`,
      },
    };
  }

  // Check if any consent was granted and active at accessTime
  let foundRevoked = false;
  let foundExpired = false;
  let hasInconsistentState = false;

  for (const c of purposeConsents) {
    // Flag inconsistent state if status is granted but granted_at timestamp is missing
    if (c.status === 'granted' && !c.granted_at) {
      hasInconsistentState = true;
      continue;
    }

    if (c.status === 'revoked') {
      const revokedAt = c.revoked_at ? new Date(c.revoked_at).getTime() : 0;
      if (revokedAt <= accessTime) {
        foundRevoked = true;
      }
      continue;
    }

    if (c.status === 'expired') {
      const expiresAt = c.expires_at ? new Date(c.expires_at).getTime() : 0;
      if (expiresAt <= accessTime) {
        foundExpired = true;
      }
      continue;
    }

    if (c.status === 'granted' && c.granted_at) {
      const grantTime = new Date(c.granted_at).getTime();
      const revokeTime = c.revoked_at ? new Date(c.revoked_at).getTime() : null;
      const expireTime = c.expires_at ? new Date(c.expires_at).getTime() : null;

      if (grantTime <= accessTime) {
        if (revokeTime && revokeTime <= accessTime) {
          foundRevoked = true;
          continue;
        }
        if (expireTime && expireTime <= accessTime) {
          foundExpired = true;
          continue;
        }
        // Valid active consent found!
        return { isValid: true };
      }
    }
  }

  if (foundRevoked) {
    return {
      isValid: false,
      anomaly: {
        type: 'REVOKED_CONSENT_ACCESS',
        severity: 'critical',
        detail: `Unauthorized Access Blocked: Access attempt for '${event.purpose}' occurred after beneficiary explicitly revoked digital consent.`,
      },
    };
  }

  if (foundExpired) {
    return {
      isValid: false,
      anomaly: {
        type: 'EXPIRED_CONSENT_ACCESS',
        severity: 'critical',
        detail: `Unauthorized Access Blocked: Access attempt for '${event.purpose}' occurred after digital consent retention window expired.`,
      },
    };
  }

  if (hasInconsistentState) {
    return {
      isValid: false,
      anomaly: {
        type: 'INCONSISTENT_CONSENT_STATE',
        severity: 'critical',
        detail: `Access rejected: Consent record on file has unverified/missing timestamp metadata. Enforcing 'flag, never silently assume' policy.`,
      },
    };
  }

  return {
    isValid: false,
    anomaly: {
      type: 'UNAUTHORIZED_DATA_ACCESS',
      severity: 'critical',
      detail: `Unauthorized Data Access: No active 'granted' consent was in effect at access timestamp (${event.accessed_at}) for purpose '${event.purpose}'.`,
    },
  };
}

// ============================================================================
// 4. STATISTICAL ANOMALY DETECTION: PER-COHORT RATE MONITORING
// ============================================================================
// RATIONALE FOR THRESHOLD (Mean + 2 Standard Deviations of other pillars):
// In the Stage 1 depot pipeline, turnaround times used a wide 3x-IQR fence
// because operational depot queues possess a fat catastrophic-delay tail.
//
// In this Consent & Privacy Fabric, we evaluate anomaly rates across Inuka's
// 4 program pillars (Scholarship, Plus, Vocational, Tech) per week.
// Each pillar has naturally varying operational intensity (e.g. high-frequency
// vocational partner audits vs annual scholarship bursary cycles).
// We compute the baseline from the other pillars that week and flag any pillar
// whose rate exceeds Mean(other_pillars) + 2 * StdDev(other_pillars) (covering
// ~95.4% of expected cross-pillar operational variance).
// This leave-one-out cohort fence prevents extreme single-pillar surges from
// masking themselves by distorting their own baseline.
// ============================================================================

export interface CohortRateCalculation {
  pillar: Pillar;
  anomalyCount: number;
  beneficiaryCount: number;
  rate: number;
  isOutlier: boolean;
  mean: number;
  stdDev: number;
  threshold: number;
}

export function evaluateCohortAnomalyRates(
  cohortData: Array<{ pillar: Pillar; anomalyCount: number; beneficiaryCount: number }>
): CohortRateCalculation[] {
  const rates = cohortData.map(c => ({
    pillar: c.pillar,
    anomalyCount: c.anomalyCount,
    beneficiaryCount: c.beneficiaryCount,
    rate: c.beneficiaryCount > 0 ? (c.anomalyCount / c.beneficiaryCount) * 100 : 0,
  }));

  return rates.map((current, idx) => {
    // Other pillars in the cohort for baseline calculation
    const others = rates.filter((_, otherIdx) => otherIdx !== idx);
    const otherValues = others.length > 0 ? others.map(o => o.rate) : [current.rate];
    const n = otherValues.length || 1;
    const mean = otherValues.reduce((sum, val) => sum + val, 0) / n;
    const variance = otherValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Mean + 2 * Standard Deviation (explicit 2-sigma deliberate fence)
    const threshold = mean + 2 * stdDev;

    return {
      ...current,
      mean: Number(mean.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      threshold: Number(threshold.toFixed(2)),
      isOutlier: current.rate > threshold && current.anomalyCount > 0,
    };
  });
}

// ============================================================================
// 5. FLAG, NEVER SILENTLY FIX: CONSENT INTEGRITY AUDITOR
// ============================================================================
export interface ConsentIntegrityResult {
  isValid: boolean;
  anomaly?: {
    type: AnomalyType;
    severity: 'low' | 'medium' | 'critical';
    detail: string;
  };
}

export function validateConsentRecordIntegrity(record: ConsentRecord): ConsentIntegrityResult {
  if (record.status === 'granted') {
    if (!record.granted_at || record.granted_at.trim() === '') {
      return {
        isValid: false,
        anomaly: {
          type: 'INCONSISTENT_CONSENT_STATE',
          severity: 'medium',
          detail: `Consent record '${record.id}' has status 'granted' but is missing the required 'granted_at' timestamp. Flagged and excluded from KPI metrics.`,
        },
      };
    }
  }

  if (record.status === 'revoked') {
    if (!record.revoked_at || record.revoked_at.trim() === '') {
      return {
        isValid: false,
        anomaly: {
          type: 'INCONSISTENT_CONSENT_STATE',
          severity: 'medium',
          detail: `Consent record '${record.id}' has status 'revoked' but lacks 'revoked_at' audit timestamp.`,
        },
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// 6. PROVENANCE REPORT GENERATOR
// ============================================================================
export function generateProvenanceReport(
  runId: string,
  events: Array<{ type: string; was_valid?: boolean; anomaly_type?: AnomalyType }>,
  gateResults: ValidationGateResult[],
  durationMs: number
): ProvenanceReport {
  const anomaliesByType: Record<string, number> = {};
  let validCount = 0;
  let invalidCount = 0;
  let anomalyCount = 0;

  for (const e of events) {
    if (e.was_valid === false || e.anomaly_type) {
      invalidCount++;
      anomalyCount++;
      const type = e.anomaly_type || 'UNSPECIFIED_ANOMALY';
      anomaliesByType[type] = (anomaliesByType[type] || 0) + 1;
    } else {
      validCount++;
    }
  }

  const hasCriticalFail = gateResults.some(g => !g.passed && g.failure_count > 5);
  const hasWarnings = gateResults.some(g => !g.passed || anomalyCount > 0);

  const overallStatus: 'PASSED' | 'WARNING' | 'CRITICAL_FAIL' = hasCriticalFail
    ? 'CRITICAL_FAIL'
    : hasWarnings
    ? 'WARNING'
    : 'PASSED';

  const timestamp = new Date().toISOString();

  // Compute genuine SHA-256 hash derived from the run data
  const hashPayload = JSON.stringify({
    run_id: runId,
    timestamp,
    input_event_count: events.length,
    valid_event_count: validCount,
    invalid_event_count: invalidCount,
    anomalies_detected: anomalyCount,
    anomalies_by_type: anomaliesByType,
    gates_evaluated: gateResults,
    duration_ms: durationMs,
  });

  const sha256Hex = crypto.createHash('sha256').update(hashPayload).digest('hex');
  const environment_hash = `sha256:${sha256Hex}`;

  return {
    run_id: runId,
    timestamp,
    input_event_count: events.length,
    valid_event_count: validCount,
    invalid_event_count: invalidCount,
    anomalies_detected: anomalyCount,
    anomalies_by_type: anomaliesByType,
    gates_evaluated: gateResults,
    overall_status: overallStatus,
    execution_duration_ms: durationMs,
    environment_hash,
  };
}

