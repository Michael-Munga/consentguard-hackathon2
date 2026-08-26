import { DbRepository, getDatabase } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import type { Anomaly, AnomalySeverity, AnomalyType } from '../../types/index.js';

export interface AccessEvaluationResult {
  threatScore: number;
  zScore: number;
  isAnomaly: boolean;
  anomalyType?: AnomalyType;
  anomalyId?: string;
  description: string;
  mean: number;
  stdDev: number;
  isOffHours: boolean;
  isOutOfScope: boolean;
}

/**
 * Unsupervised Behavioral Access Outlier & Threat Scorer
 * Evaluates bulk record access requests against statistical actor baselines.
 */
export function evaluateAccessEvent(
  staffId: string,
  staffRole: string,
  requestedRecordCount: number,
  hourOfDay?: number
): AccessEvaluationResult {
  const repo = new DbRepository(getDatabase());

  // 1. Query historical baseline for this actor from data_access_events and audit logs
  let mean = 15;
  let stdDev = 8;

  try {
    const rawDb = getDatabase();
    // Query historical volumes for this actor
    const actorLogs = rawDb
      .prepare(
        "SELECT after_state FROM audit_log WHERE actor = ? AND action IN ('COMPLIANCE_EXPORT_DISPATCHED', 'BULK_DATA_ACCESSED') LIMIT 50"
      )
      .all(staffId) as Array<{ after_state: string | null }>;

    const volumes: number[] = [];
    for (const log of actorLogs) {
      if (log.after_state) {
        try {
          const parsed = JSON.parse(log.after_state);
          if (typeof parsed.record_count === 'number') {
            volumes.push(parsed.record_count);
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    if (volumes.length >= 5) {
      const sum = volumes.reduce((a, b) => a + b, 0);
      mean = sum / volumes.length;
      const variance = volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length;
      stdDev = Math.max(Math.sqrt(variance), 1);
    }
  } catch (err) {
    console.error('Error fetching historical access baseline:', err);
    mean = 15;
    stdDev = 8;
  }

  // 2. Volumetric Z-Score calculation
  const zScore = Number(((requestedRecordCount - mean) / Math.max(stdDev, 1)).toFixed(2));

  // 3. Temporal Outlier calculation (EAT is UTC+3)
  const now = new Date();
  const currentEatHour = hourOfDay !== undefined ? hourOfDay : (now.getUTCHours() + 3) % 24;
  const isOffHours = currentEatHour >= 20 || currentEatHour < 6;

  // 4. Role Scope Evaluation
  const isOutOfScope = (staffRole === 'field_officer' && requestedRecordCount > 50);

  // 5. Threat Score (0 to 100)
  let threatScore = 0;

  // Base score from Z-score
  if (zScore > 3.5) {
    threatScore += 70;
  } else if (zScore > 2.0) {
    threatScore += 40;
  } else if (zScore > 1.0) {
    threatScore += 15;
  } else if (zScore > 0) {
    threatScore += Math.min(10, Math.round(zScore * 5));
  }

  // Temporal penalty
  if (isOffHours) {
    threatScore += 25;
  }

  // Role penalty
  if (isOutOfScope) {
    threatScore += 20;
  }

  threatScore = Math.min(100, Math.max(0, Math.round(threatScore)));

  const isAnomaly = threatScore >= 65;
  const multiple = mean > 0 ? (requestedRecordCount / mean).toFixed(1) : '1.0';
  const timeStr = `${String(currentEatHour).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} EAT`;

  const description = `[ML Anomaly Score: ${threatScore}/100 | Z-Score: +${Math.max(0, zScore).toFixed(1)} | Context: ${multiple}x above user baseline of ${Math.round(mean)} records at ${timeStr}]`;

  let anomalyType: AnomalyType | undefined;
  let anomalyId: string | undefined;

  if (isAnomaly) {
    anomalyType = (requestedRecordCount >= 100 && zScore >= 2.5)
      ? 'SUSPICIOUS_BULK_EXFILTRATION'
      : 'AI_BEHAVIORAL_OUTLIER';

    const severity: AnomalySeverity = threatScore >= 80 ? 'critical' : 'medium';
    anomalyId = `ANOM-ML-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = now.toISOString();

    const sampleBen = repo.getAllBeneficiaries()[0];
    const benId = sampleBen ? sampleBen.id : 'INK-84920';

    const anomalyRecord: Anomaly = {
      id: anomalyId,
      beneficiary_id: benId,
      anomaly_type: anomalyType,
      detail: `Behavioral Outlier by ${staffId} (${staffRole}): Requested ${requestedRecordCount} records. ${description}`,
      detected_at: timestamp,
      severity,
      reviewed: false,
      beneficiary_name: sampleBen?.name,
      beneficiary_pillar: sampleBen?.pillar,
      beneficiary_county: sampleBen?.county,
      beneficiary_region: sampleBen?.region,
    };

    try {
      repo.insertAnomaly(anomalyRecord);

      // Broadcast event to live SSE feed
      sseManager.broadcast({
        id: `EVT-${anomalyId}`,
        type: 'ANOMALY_FLAGGED',
        timestamp,
        severity,
        data: {
          anomaly: anomalyRecord,
          anomaly_id: anomalyId,
          threatScore,
          zScore,
          actor: staffId,
          requestedRecordCount,
          isOffHours,
        },
        message: `AI Privacy Outlier Detected: Actor ${staffId} triggered ${description}`,
      });
    } catch (err) {
      console.error('Failed to insert AI access anomaly:', err);
    }
  }

  return {
    threatScore,
    zScore,
    isAnomaly,
    anomalyType,
    anomalyId,
    description,
    mean,
    stdDev,
    isOffHours,
    isOutOfScope,
  };
}
