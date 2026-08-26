import { DbRepository, getDatabase } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import { validateDataAccessEvent } from './validator.js';
import { evaluateAccessEvent } from './accessAnomalyDetector.js';
import type {
  Beneficiary,
  MaskedBeneficiary,
  DataAccessEvent,
  Anomaly,
  ConsentPurpose,
  ConsentRecord,
  StreamEvent,
} from '../../types/index.js';
import { maskBeneficiaryName } from '../../types/index.js';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface SimulationResult {
  event: DataAccessEvent;
  anomaly: Anomaly;
  beneficiary: Beneficiary;
}

/**
 * Manual On-Demand Anomaly Scenario Generator (for live demonstration).
 * Each scenario calls the real write-time validator or ML access anomaly detector.
 */
export class TestAnomalyInjector {
  private repo: DbRepository;

  constructor(repo?: DbRepository) {
    this.repo = repo || new DbRepository(getDatabase());
  }

  private handleBlockedAccessEvent(
    targetBen: Beneficiary,
    targetPurpose: ConsentPurpose,
    actorName: string,
    benConsents: ConsentRecord[],
    actionLabel = 'UNAUTHORIZED_ACCESS_BLOCKED'
  ): SimulationResult {
    const timestamp = new Date().toISOString();
    const maskedToken = maskBeneficiaryName(targetBen.name);
    const maskedBen: MaskedBeneficiary = {
      ...targetBen,
      name: maskedToken,
      masked_beneficiary_token: maskedToken,
    };

    const accessEvent: DataAccessEvent = {
      id: `DA-ATTEMPT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      beneficiary_id: targetBen.id,
      masked_beneficiary_token: maskedToken,
      purpose: targetPurpose,
      accessed_at: timestamp,
      accessed_by: actorName,
      was_valid: false,
    };

    // 1. Inline synchronous validation through the real write-time gate
    const authResult = validateDataAccessEvent(accessEvent, benConsents);
    accessEvent.was_valid = authResult.isValid;

    this.repo.insertDataAccessEvent(accessEvent);

    const anomalyType = authResult.anomaly?.type || 'UNAUTHORIZED_DATA_ACCESS';
    const severity = authResult.anomaly?.severity || 'critical';
    const detail =
      authResult.anomaly?.detail ||
      `KDPA Compliance Breach: Actor '${actorName}' attempted unauthorized access for '${targetPurpose}'.`;

    const anomaly: Anomaly = {
      id: `ANOM-LIVE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      beneficiary_id: targetBen.id,
      anomaly_type: anomalyType,
      detail,
      detected_at: timestamp,
      severity,
      reviewed: false,
      beneficiary_name: targetBen.name,
      beneficiary_pillar: targetBen.pillar,
      beneficiary_county: targetBen.county,
      beneficiary_region: targetBen.region,
    };

    this.repo.insertAnomaly(anomaly);

    // 2. Log to immutable audit ledger
    this.repo.insertAuditLog({
      id: `AUD-CRIT-${anomaly.id}`,
      entity_type: 'data_access_breach',
      entity_id: accessEvent.id,
      action: actionLabel,
      actor: 'ConsentGuard_WriteTime_Enforcer',
      timestamp,
      before_state: JSON.stringify({ attempted_by: actorName, target_purpose: targetPurpose }),
      after_state: JSON.stringify({
        action: 'BLOCKED_AND_FLAGGED',
        anomaly_id: anomaly.id,
        anomaly_type: anomalyType,
      }),
    });

    const maskedAnomaly: Anomaly = {
      ...anomaly,
      beneficiary_name: maskedToken,
      masked_beneficiary_token: maskedToken,
    };

    // 3. Broadcast real-time alert over SSE
    const alertStreamEvent: StreamEvent = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'UNAUTHORIZED_ACCESS_BLOCKED',
      timestamp,
      severity,
      data: {
        access_event: accessEvent,
        anomaly: maskedAnomaly,
        beneficiary: maskedBen,
      },
      message: `CRITICAL KDPA INTERCEPT: ${anomalyType.replace(/_/g, ' ')} by '${actorName}' on ${maskedToken} (${targetBen.pillar} Pillar)`,
    };

    sseManager.broadcast(alertStreamEvent);
    console.log(`[Simulator] Broadcasted ${anomalyType} alert for ${maskedToken}`);

    return {
      event: accessEvent,
      anomaly,
      beneficiary: targetBen,
    };
  }

  /**
   * 1. Simulate Unauthorized Data Access (no consent record on file for purpose)
   */
  simulateUnauthorizedAccess(actorName = 'unauthorized_external_exporter'): SimulationResult {
    const beneficiaries = this.repo.getAllBeneficiaries();
    if (beneficiaries.length === 0) throw new Error('No beneficiaries in database.');
    const targetBen = randomChoice(beneficiaries);
    const targetPurpose: ConsentPurpose = 'third_party_sharing';
    // Real path: purposeConsents is empty
    return this.handleBlockedAccessEvent(targetBen, targetPurpose, actorName, []);
  }

  /**
   * 2. Simulate Access on Revoked Consent Mandate (chains to beneficiaryId if supplied)
   */
  simulateRevokedConsentAccess(actorName = 'batch_donor_reporter', beneficiaryId?: string): SimulationResult {
    let targetBen: Beneficiary | null = null;
    const targetPurpose: ConsentPurpose = 'third_party_sharing';

    if (beneficiaryId) {
      targetBen = this.repo.getBeneficiaryById(beneficiaryId);
    }

    if (!targetBen) {
      const allBens = this.repo.getAllBeneficiaries();
      if (allBens.length === 0) throw new Error('No beneficiaries available.');
      targetBen = randomChoice(allBens);
    }

    const benConsents = this.repo.getConsentsForBeneficiary(targetBen.id);
    const revokedConsent: ConsentRecord = {
      id: `CR-REVOKED-${targetBen.id}-${targetPurpose}`,
      beneficiary_id: targetBen.id,
      purpose: targetPurpose,
      status: 'revoked',
      granted_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      revoked_at: new Date(Date.now() - 60000).toISOString(),
      expires_at: new Date(Date.now() + 335 * 86400000).toISOString(),
    };
    const consentsToValidate = [
      ...benConsents.filter((c) => c.purpose !== targetPurpose),
      revokedConsent,
    ];

    return this.handleBlockedAccessEvent(targetBen, targetPurpose, actorName, consentsToValidate);
  }

  /**
   * 3. Simulate Access on Expired Consent
   */
  simulateExpiredConsentAccess(actorName = 'analytics_retention_crawler'): SimulationResult {
    const allBens = this.repo.getAllBeneficiaries();
    if (allBens.length === 0) throw new Error('No beneficiaries available.');
    const targetBen = randomChoice(allBens);
    const targetPurpose: ConsentPurpose = 'internal_analytics';

    const benConsents = this.repo.getConsentsForBeneficiary(targetBen.id);
    const expiredConsent: ConsentRecord = {
      id: `CR-EXPIRED-${targetBen.id}-${targetPurpose}`,
      beneficiary_id: targetBen.id,
      purpose: targetPurpose,
      status: 'expired',
      granted_at: new Date(Date.now() - 400 * 86400000).toISOString(),
      revoked_at: null,
      expires_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    };
    const consentsToValidate = [
      ...benConsents.filter((c) => c.purpose !== targetPurpose),
      expiredConsent,
    ];

    return this.handleBlockedAccessEvent(targetBen, targetPurpose, actorName, consentsToValidate);
  }

  /**
   * 4. Simulate Inconsistent Consent State (Missing/corrupted timestamp)
   */
  simulateInconsistentState(actorName = 'unverified_legacy_sync'): SimulationResult {
    const allBens = this.repo.getAllBeneficiaries();
    if (allBens.length === 0) throw new Error('No beneficiaries found.');
    const targetBen = randomChoice(allBens);
    const targetPurpose: ConsentPurpose = 'donor_reporting';

    const benConsents = this.repo.getConsentsForBeneficiary(targetBen.id);
    const inconsistentConsent: ConsentRecord = {
      id: `CR-INCONSISTENT-${targetBen.id}-${targetPurpose}`,
      beneficiary_id: targetBen.id,
      purpose: targetPurpose,
      status: 'granted',
      granted_at: null,
      revoked_at: null,
      expires_at: null,
    };
    const consentsToValidate = [
      ...benConsents.filter((c) => c.purpose !== targetPurpose),
      inconsistentConsent,
    ];

    return this.handleBlockedAccessEvent(targetBen, targetPurpose, actorName, consentsToValidate);
  }

  /**
   * 5. Simulate AI Behavioral Outlier (Moderate Volume Surge)
   */
  simulateBehavioralOutlier(actorId = 'field_officer_nakuru', requestedRecordCount = 65): SimulationResult {
    const timestamp = new Date().toISOString();
    const accessEval = evaluateAccessEvent(actorId, 'field_officer', requestedRecordCount, 22);

    const allBens = this.repo.getAllBeneficiaries();
    if (allBens.length === 0) throw new Error('No beneficiaries in database.');
    const targetBen = randomChoice(allBens);
    const maskedToken = maskBeneficiaryName(targetBen.name);

    const accessEvent: DataAccessEvent = {
      id: `DA-ML-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      beneficiary_id: targetBen.id,
      masked_beneficiary_token: maskedToken,
      purpose: 'internal_analytics',
      accessed_at: timestamp,
      accessed_by: `${actorId} (Export: ${requestedRecordCount} records)`,
      was_valid: false,
    };
    this.repo.insertDataAccessEvent(accessEvent);

    const anomaly: Anomaly = {
      id: accessEval.anomalyId || `ANOM-ML-${Date.now()}`,
      beneficiary_id: targetBen.id,
      anomaly_type: 'AI_BEHAVIORAL_OUTLIER',
      detail: `Behavioral Outlier by ${actorId} (field_officer): Requested ${requestedRecordCount} records. ${accessEval.description}`,
      detected_at: timestamp,
      severity: accessEval.threatScore >= 80 ? 'critical' : 'medium',
      reviewed: false,
      beneficiary_name: targetBen.name,
      beneficiary_pillar: targetBen.pillar,
      beneficiary_county: targetBen.county,
      beneficiary_region: targetBen.region,
    };
    try {
      this.repo.insertAnomaly(anomaly);
    } catch {}

    this.repo.insertAuditLog({
      id: `AUD-ML-${accessEvent.id}`,
      entity_type: 'behavioral_outlier',
      entity_id: accessEvent.id,
      action: 'AI_BEHAVIORAL_OUTLIER_DETECTED',
      actor: actorId,
      timestamp,
      before_state: null,
      after_state: JSON.stringify({
        actor: actorId,
        requestedRecordCount,
        threatScore: accessEval.threatScore,
        zScore: accessEval.zScore,
        anomalyId: anomaly.id,
      }),
    });

    return {
      event: accessEvent,
      anomaly,
      beneficiary: targetBen,
    };
  }

  /**
   * 6. Simulate Suspicious Bulk Exfiltration (Critical Volume Surge)
   */
  simulateBulkExfiltration(actorId = 'exfiltration_batch_daemon', requestedRecordCount = 350): SimulationResult {
    const timestamp = new Date().toISOString();
    const accessEval = evaluateAccessEvent(actorId, 'field_officer', requestedRecordCount, 23);

    const allBens = this.repo.getAllBeneficiaries();
    if (allBens.length === 0) throw new Error('No beneficiaries in database.');
    const targetBen = randomChoice(allBens);
    const maskedToken = maskBeneficiaryName(targetBen.name);

    const accessEvent: DataAccessEvent = {
      id: `DA-EXFIL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      beneficiary_id: targetBen.id,
      masked_beneficiary_token: maskedToken,
      purpose: 'third_party_sharing',
      accessed_at: timestamp,
      accessed_by: `${actorId} (Bulk Exfiltration: ${requestedRecordCount} records)`,
      was_valid: false,
    };
    this.repo.insertDataAccessEvent(accessEvent);

    const anomaly: Anomaly = {
      id: accessEval.anomalyId || `ANOM-ML-${Date.now()}`,
      beneficiary_id: targetBen.id,
      anomaly_type: 'SUSPICIOUS_BULK_EXFILTRATION',
      detail: `Suspicious Bulk Exfiltration by ${actorId} (field_officer): Requested ${requestedRecordCount} records. ${accessEval.description}`,
      detected_at: timestamp,
      severity: 'critical',
      reviewed: false,
      beneficiary_name: targetBen.name,
      beneficiary_pillar: targetBen.pillar,
      beneficiary_county: targetBen.county,
      beneficiary_region: targetBen.region,
    };
    try {
      this.repo.insertAnomaly(anomaly);
    } catch {}

    this.repo.insertAuditLog({
      id: `AUD-EXFIL-${accessEvent.id}`,
      entity_type: 'bulk_exfiltration',
      entity_id: accessEvent.id,
      action: 'SUSPICIOUS_BULK_EXFILTRATION_BLOCKED',
      actor: actorId,
      timestamp,
      before_state: null,
      after_state: JSON.stringify({
        actor: actorId,
        requestedRecordCount,
        threatScore: accessEval.threatScore,
        zScore: accessEval.zScore,
        anomalyId: anomaly.id,
      }),
    });

    return {
      event: accessEvent,
      anomaly,
      beneficiary: targetBen,
    };
  }
}

export const testAnomalyInjector = new TestAnomalyInjector();
export const simulator = testAnomalyInjector;
