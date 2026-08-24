import { describe, it, expect } from 'vitest';
import {
  validateLifecycleTransition,
  detectConsentConflict,
  validateDataAccessEvent,
  evaluateCohortAnomalyRates,
  validateConsentRecordIntegrity,
  generateProvenanceReport,
} from '../server/engine/validator.js';
import type { ConsentRecord, DataAccessEvent, ValidationGateResult } from '../types/index.js';

describe('Validation Logic Module (ConsentGuard Engine)', () => {
  // ==========================================================================
  // 1. Stage Sequence Validation
  // ==========================================================================
  describe('Gate 1: Stage Sequence Validation', () => {
    it('validates a correct, sequential forward lifecycle progression', () => {
      expect(validateLifecycleTransition(null, 'applied').isValid).toBe(true);
      expect(validateLifecycleTransition('applied', 'identity_verified').isValid).toBe(true);
      expect(validateLifecycleTransition('identity_verified', 'consent_requested').isValid).toBe(true);
      expect(validateLifecycleTransition('consent_requested', 'consent_granted').isValid).toBe(true);
      expect(validateLifecycleTransition('consent_granted', 'data_processed').isValid).toBe(true);
      expect(validateLifecycleTransition('data_processed', 'consent_reviewed').isValid).toBe(true);
    });

    it('allows valid renewal and re-request transitions from consent_reviewed', () => {
      expect(validateLifecycleTransition('consent_reviewed', 'consent_granted').isValid).toBe(true);
      expect(validateLifecycleTransition('consent_reviewed', 'consent_requested').isValid).toBe(true);
    });

    it('rejects skipping identity verification and consent request (applied -> consent_granted)', () => {
      const result = validateLifecycleTransition('applied', 'consent_granted');
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('SKIPPED_IDENTITY_VERIFICATION');
      expect(result.anomaly?.severity).toBe('medium');
    });

    it('rejects processing data directly from application without consent (applied -> data_processed)', () => {
      const result = validateLifecycleTransition('applied', 'data_processed');
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('SKIPPED_CONSENT_GRANT');
      expect(result.anomaly?.severity).toBe('critical');
    });

    it('rejects skipping consent request (identity_verified -> consent_granted)', () => {
      const result = validateLifecycleTransition('identity_verified', 'consent_granted');
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('SKIPPED_CONSENT_REQUEST');
    });

    it('rejects invalid backward regressions (data_processed -> applied)', () => {
      const result = validateLifecycleTransition('data_processed', 'applied');
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('INVALID_STAGE_REGRESSION');
    });
  });

  // ==========================================================================
  // 2. Entity-Level Consent Conflict Detection
  // ==========================================================================
  describe('Gate 2: Entity-Level Consent Conflict Detection', () => {
    it('allows new consent when no existing consent for that purpose exists', () => {
      const existing: ConsentRecord[] = [
        {
          id: 'c1',
          beneficiary_id: 'ben-001',
          purpose: 'internal_analytics',
          status: 'granted',
          granted_at: '2026-01-01T00:00:00Z',
          revoked_at: null,
          expires_at: null,
        },
      ];

      const newRecord: ConsentRecord = {
        id: 'c2',
        beneficiary_id: 'ben-001',
        purpose: 'donor_reporting',
        status: 'granted',
        granted_at: '2026-02-01T00:00:00Z',
        revoked_at: null,
        expires_at: null,
      };

      const result = detectConsentConflict(existing, newRecord);
      expect(result.hasConflict).toBe(false);
    });

    it('flags conflicting overlapping active grants for the exact same purpose', () => {
      const existing: ConsentRecord[] = [
        {
          id: 'c1',
          beneficiary_id: 'ben-002',
          purpose: 'donor_reporting',
          status: 'granted',
          granted_at: '2026-01-01T00:00:00Z',
          revoked_at: null,
          expires_at: '2027-01-01T00:00:00Z',
        },
      ];

      const conflictingRecord: ConsentRecord = {
        id: 'c2',
        beneficiary_id: 'ben-002',
        purpose: 'donor_reporting',
        status: 'granted',
        granted_at: '2026-03-01T00:00:00Z',
        revoked_at: null,
        expires_at: '2027-03-01T00:00:00Z',
      };

      const result = detectConsentConflict(existing, conflictingRecord);
      expect(result.hasConflict).toBe(true);
      expect(result.anomaly?.type).toBe('CONSENT_OVERLAP_CONFLICT');
      expect(result.anomaly?.severity).toBe('critical');
    });

    it('allows new grant if previous grant was revoked prior to the new grant', () => {
      const existing: ConsentRecord[] = [
        {
          id: 'c1',
          beneficiary_id: 'ben-003',
          purpose: 'donor_reporting',
          status: 'revoked',
          granted_at: '2026-01-01T00:00:00Z',
          revoked_at: '2026-02-01T00:00:00Z',
          expires_at: null,
        },
      ];

      const newRecord: ConsentRecord = {
        id: 'c2',
        beneficiary_id: 'ben-003',
        purpose: 'donor_reporting',
        status: 'granted',
        granted_at: '2026-02-15T00:00:00Z',
        revoked_at: null,
        expires_at: null,
      };

      const result = detectConsentConflict(existing, newRecord);
      expect(result.hasConflict).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Access-Without-Consent Detection (CORE DEMO MOMENT)
  // ==========================================================================
  describe('Gate 3: Access-Without-Consent Detection (Write-Time Enforcement)', () => {
    it('authorizes access when active valid consent exists at access timestamp', () => {
      const event: Pick<DataAccessEvent, 'beneficiary_id' | 'purpose' | 'accessed_at' | 'accessed_by'> = {
        beneficiary_id: 'ben-100',
        purpose: 'donor_reporting',
        accessed_at: '2026-06-15T10:00:00Z',
        accessed_by: 'officer@inuka.kpc.co.ke',
      };

      const consents: ConsentRecord[] = [
        {
          id: 'c-valid',
          beneficiary_id: 'ben-100',
          purpose: 'donor_reporting',
          status: 'granted',
          granted_at: '2026-01-01T00:00:00Z',
          revoked_at: null,
          expires_at: '2027-01-01T00:00:00Z',
        },
      ];

      const result = validateDataAccessEvent(event, consents);
      expect(result.isValid).toBe(true);
      expect(result.anomaly).toBeUndefined();
    });

    it('blocks access and immediately flags critical anomaly when NO consent exists', () => {
      const event: Pick<DataAccessEvent, 'beneficiary_id' | 'purpose' | 'accessed_at' | 'accessed_by'> = {
        beneficiary_id: 'ben-101',
        purpose: 'third_party_sharing',
        accessed_at: '2026-06-15T10:00:00Z',
        accessed_by: 'external_partner@org.ke',
      };

      const result = validateDataAccessEvent(event, []);
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('UNAUTHORIZED_DATA_ACCESS');
      expect(result.anomaly?.severity).toBe('critical');
    });

    it('blocks access when consent was explicitly revoked prior to access time', () => {
      const event: Pick<DataAccessEvent, 'beneficiary_id' | 'purpose' | 'accessed_at' | 'accessed_by'> = {
        beneficiary_id: 'ben-102',
        purpose: 'donor_reporting',
        accessed_at: '2026-06-15T10:00:00Z',
        accessed_by: 'analytics_system',
      };

      const consents: ConsentRecord[] = [
        {
          id: 'c-revoked',
          beneficiary_id: 'ben-102',
          purpose: 'donor_reporting',
          status: 'revoked',
          granted_at: '2026-01-01T00:00:00Z',
          revoked_at: '2026-05-01T00:00:00Z', // Revoked before access attempt!
          expires_at: '2027-01-01T00:00:00Z',
        },
      ];

      const result = validateDataAccessEvent(event, consents);
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('REVOKED_CONSENT_ACCESS');
      expect(result.anomaly?.severity).toBe('critical');
    });

    it('blocks access when consent has expired prior to access timestamp', () => {
      const event: Pick<DataAccessEvent, 'beneficiary_id' | 'purpose' | 'accessed_at' | 'accessed_by'> = {
        beneficiary_id: 'ben-103',
        purpose: 'donor_reporting',
        accessed_at: '2026-06-15T10:00:00Z',
        accessed_by: 'reporting_daemon',
      };

      const consents: ConsentRecord[] = [
        {
          id: 'c-expired',
          beneficiary_id: 'ben-103',
          purpose: 'donor_reporting',
          status: 'expired',
          granted_at: '2025-01-01T00:00:00Z',
          revoked_at: null,
          expires_at: '2026-01-01T00:00:00Z', // Expired 5 months ago
        },
      ];

      const result = validateDataAccessEvent(event, consents);
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('EXPIRED_CONSENT_ACCESS');
      expect(result.anomaly?.severity).toBe('critical');
    });
  });

  // ==========================================================================
  // 4. Per-Cohort Anomaly Rate Monitoring (Mean + 2 StdDev)
  // ==========================================================================
  describe('Gate 4: Per-Cohort Statistical Outlier Monitoring', () => {
    it('detects an anomalous spike in a pillar exceeding Mean + 2 Sigma threshold', () => {
      const cohortData = [
        { pillar: 'Scholarship' as const, anomalyCount: 2, beneficiaryCount: 100 }, // 2%
        { pillar: 'Plus' as const, anomalyCount: 3, beneficiaryCount: 100 },        // 3%
        { pillar: 'Vocational' as const, anomalyCount: 2, beneficiaryCount: 100 },  // 2%
        { pillar: 'Tech' as const, anomalyCount: 25, beneficiaryCount: 100 },       // 25% - extreme surge
      ];

      const results = evaluateCohortAnomalyRates(cohortData);
      expect(results.length).toBe(4);

      const techCohort = results.find(r => r.pillar === 'Tech')!;
      expect(techCohort.isOutlier).toBe(true);
      expect(techCohort.rate).toBe(25);

      const scholarshipCohort = results.find(r => r.pillar === 'Scholarship')!;
      expect(scholarshipCohort.isOutlier).toBe(false);
    });
  });

  // ==========================================================================
  // 5. Flag, Never Silently Fix
  // ==========================================================================
  describe('Gate 5: Flag-Never-Silently-Fix Integrity Auditor', () => {
    it('flags granted consent records that have missing timestamps', () => {
      const faultyRecord: ConsentRecord = {
        id: 'c-inconsistent',
        beneficiary_id: 'ben-200',
        purpose: 'donor_reporting',
        status: 'granted',
        granted_at: null as any, // Missing timestamp!
        revoked_at: null,
        expires_at: null,
      };

      const result = validateConsentRecordIntegrity(faultyRecord);
      expect(result.isValid).toBe(false);
      expect(result.anomaly?.type).toBe('INCONSISTENT_CONSENT_STATE');
      expect(result.anomaly?.severity).toBe('medium');
    });

    it('passes fully consistent records with intact provenance timestamps', () => {
      const cleanRecord: ConsentRecord = {
        id: 'c-clean',
        beneficiary_id: 'ben-201',
        purpose: 'donor_reporting',
        status: 'granted',
        granted_at: '2026-03-01T08:00:00Z',
        revoked_at: null,
        expires_at: '2027-03-01T08:00:00Z',
      };

      const result = validateConsentRecordIntegrity(cleanRecord);
      expect(result.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Provenance Report Generation
  // ==========================================================================
  describe('Gate 6: Provenance Run Report Generation', () => {
    it('generates an accurate JSON provenance run report matching batch metrics', () => {
      const syntheticBatch = [
        { type: 'BENEFICIARY_APPLIED', was_valid: true },
        { type: 'CONSENT_GRANTED', was_valid: true },
        { type: 'DATA_ACCESS', was_valid: false, anomaly_type: 'UNAUTHORIZED_DATA_ACCESS' as const },
        { type: 'LIFECYCLE_TRANSITION', was_valid: false, anomaly_type: 'SKIPPED_IDENTITY_VERIFICATION' as const },
      ];

      const gateResults: ValidationGateResult[] = [
        { gate_name: 'Sequence Gate', passed: false, evaluated_count: 4, failure_count: 1, description: 'Stage sequence' },
        { gate_name: 'Access Authorization Gate', passed: false, evaluated_count: 4, failure_count: 1, description: 'Write-time consent check' },
      ];

      const report = generateProvenanceReport('run-batch-001', syntheticBatch, gateResults, 45);

      expect(report.run_id).toBe('run-batch-001');
      expect(report.input_event_count).toBe(4);
      expect(report.valid_event_count).toBe(2);
      expect(report.invalid_event_count).toBe(2);
      expect(report.anomalies_detected).toBe(2);
      expect(report.anomalies_by_type['UNAUTHORIZED_DATA_ACCESS']).toBe(1);
      expect(report.anomalies_by_type['SKIPPED_IDENTITY_VERIFICATION']).toBe(1);
      expect(report.overall_status).toBe('WARNING');
      expect(report.execution_duration_ms).toBe(45);
      expect(report.environment_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });
});

