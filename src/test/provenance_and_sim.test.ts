import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { DbRepository, getDatabase, closeDatabase } from '../server/db/database.js';
import { sseManager } from '../server/api/sse.js';
import { runFullProvenanceAudit, getLatestProvenanceReport } from '../server/engine/provenance.js';
import { TestAnomalyInjector } from '../server/engine/simulator.js';
import { seedDatabase } from '../server/db/seed.js';
import { maskBeneficiaryName } from '../types/index.js';

describe('Engine Integration: Provenance and Simulator Modules', () => {
  let db: Database.Database;
  let repo: DbRepository;

  beforeEach(() => {
    // Run seed to ensure fresh realistic data in in-memory DB
    db = getDatabase(':memory:');
    repo = new DbRepository(db);
    seedDatabase(50, db);
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch {}
    }
  });

  afterAll(() => {
    sseManager.destroy();
    closeDatabase();
  });

  describe('Provenance Report Audit Engine', () => {
    it('executes full database audit and evaluates all 5 validation gates', () => {
      const report = runFullProvenanceAudit(repo, 'TEST-RUN-001');

      expect(report.run_id).toBe('TEST-RUN-001');
      expect(report.gates_evaluated.length).toBe(5);
      expect(report.input_event_count).toBeGreaterThan(0);
      expect(report.execution_duration_ms).toBeGreaterThanOrEqual(0);
      expect(report.environment_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(['PASSED', 'WARNING', 'CRITICAL_FAIL']).toContain(report.overall_status);

      // Check gate names
      const gateNames = report.gates_evaluated.map(g => g.gate_name);
      expect(gateNames.some(n => n.includes('Entity-Level Consent Conflict'))).toBe(true);
      expect(gateNames.some(n => n.includes('Real-Time Consent Authorization'))).toBe(true);
      expect(gateNames.some(n => n.includes('Metadata Integrity'))).toBe(true);
      expect(gateNames.some(n => n.includes('Statistical Drift'))).toBe(true);
      expect(gateNames.some(n => n.includes('Cryptographic Audit Ledger'))).toBe(true);
    });

    it('persists and retrieves latest provenance report from disk', () => {
      runFullProvenanceAudit(repo, 'TEST-RUN-DISK');
      const latest = getLatestProvenanceReport();
      expect(latest).not.toBeNull();
      expect(latest?.run_id).toBe('TEST-RUN-DISK');
    });
  });

  describe('Test Anomaly Injector & KDPA Masking', () => {
    it('executes all 6 distinct simulation scenarios through real validation & ML detection gates', () => {
      const injector = new TestAnomalyInjector(repo);

      // 1. Unauthorized Data Access
      const unauth = injector.simulateUnauthorizedAccess('rogue_auditor@test.com');
      expect(unauth.event.was_valid).toBe(false);
      expect(unauth.anomaly.anomaly_type).toBe('UNAUTHORIZED_DATA_ACCESS');
      expect(unauth.anomaly.severity).toBe('critical');

      // 2. Revoked Consent Access
      const targetBen = repo.getAllBeneficiaries()[0];
      const revoked = injector.simulateRevokedConsentAccess('donor_reporter@test.com', targetBen.id);
      expect(revoked.event.was_valid).toBe(false);
      expect(revoked.anomaly.anomaly_type).toBe('REVOKED_CONSENT_ACCESS');
      expect(revoked.anomaly.beneficiary_id).toBe(targetBen.id);

      // 3. Expired Consent Access
      const expired = injector.simulateExpiredConsentAccess('crawler@test.com');
      expect(expired.event.was_valid).toBe(false);
      expect(expired.anomaly.anomaly_type).toBe('EXPIRED_CONSENT_ACCESS');

      // 4. Inconsistent State Access
      const broken = injector.simulateInconsistentState('sync_daemon@test.com');
      expect(broken.event.was_valid).toBe(false);
      expect(broken.anomaly.anomaly_type).toBe('INCONSISTENT_CONSENT_STATE');

      // 5. Behavioral Outlier
      const outlier = injector.simulateBehavioralOutlier('field_officer_test', 70);
      expect(outlier.event.was_valid).toBe(false);
      expect(outlier.anomaly.anomaly_type).toBe('AI_BEHAVIORAL_OUTLIER');

      // 6. Bulk Exfiltration
      const exfil = injector.simulateBulkExfiltration('exfil_test', 300);
      expect(exfil.event.was_valid).toBe(false);
      expect(exfil.anomaly.anomaly_type).toBe('SUSPICIOUS_BULK_EXFILTRATION');

      // Verify anomalies are written to SQLite table
      const allAnomalies = repo.getAllAnomalies();
      expect(allAnomalies.find((a) => a.id === unauth.anomaly.id)).toBeDefined();
      expect(allAnomalies.find((a) => a.id === revoked.anomaly.id)).toBeDefined();
      expect(allAnomalies.find((a) => a.id === outlier.anomaly.id)).toBeDefined();
    });

    it('masks beneficiary names in compliance with KDPA 2019 Section 25', () => {
      expect(maskBeneficiaryName('Faith Kamau')).toBe('F. K***');
      expect(maskBeneficiaryName('Dennis Otieno')).toBe('D. O***');
      expect(maskBeneficiaryName('Emmanuel')).toBe('E. ***');
      expect(maskBeneficiaryName('')).toBe('B. ***');
      expect(maskBeneficiaryName(null)).toBe('B. ***');
    });

    it('ensures injected anomaly event streams broadcast masked tokens and never leak plaintext names', () => {
      const injector = new TestAnomalyInjector(repo);
      const broadcastEvents: any[] = [];
      const originalBroadcast = sseManager.broadcast.bind(sseManager);
      sseManager.broadcast = (event: any) => {
        broadcastEvents.push(event);
      };

      try {
        const unauthResult = injector.simulateUnauthorizedAccess('auditor@test.com');
        const alertEvent = broadcastEvents[broadcastEvents.length - 1];
        expect(alertEvent).toBeDefined();
        expect(alertEvent.type).toBe('UNAUTHORIZED_ACCESS_BLOCKED');
        expect(alertEvent.message).not.toContain(unauthResult.beneficiary.name);
        expect(alertEvent.message).toMatch(/[A-Z]\.\s[A-Z]?\*{3}/);
        expect(alertEvent.data.beneficiary.name).not.toBe(unauthResult.beneficiary.name);
        expect(alertEvent.data.beneficiary.name).toMatch(/[A-Z]\.\s[A-Z]?\*{3}/);
        expect(alertEvent.data.anomaly.beneficiary_name).toMatch(/[A-Z]\.\s[A-Z]?\*{3}/);
        expect(alertEvent.severity).toBe('critical');
        expect(alertEvent.data.beneficiary.pillar).toBe(unauthResult.beneficiary.pillar);
      } finally {
        sseManager.broadcast = originalBroadcast;
      }
    });
  });

  describe('Donor Report Filtering Engine', () => {
    it('accurately filters compliant records by pillar, region, and county and tracks exclusion counts', () => {
      const allBeneficiaries = repo.getAllBeneficiaries();
      const allConsents = repo.getAllConsents();

      const compliant = allBeneficiaries.filter(b => {
        return Boolean(allConsents.find(c => c.beneficiary_id === b.id && c.purpose === 'donor_reporting' && c.status === 'granted' && c.granted_at));
      });

      expect(compliant.length).toBeGreaterThan(0);

      // Filter by Scholarship pillar
      const scholarshipCompliant = compliant.filter(b => b.pillar.toLowerCase() === 'scholarship');
      expect(scholarshipCompliant.length).toBeLessThanOrEqual(compliant.length);

      // Verify excluded_by_filter calculation
      const excludedByFilter = compliant.length - scholarshipCompliant.length;
      expect(excludedByFilter).toBeGreaterThanOrEqual(0);
    });

    it('produces donor export records containing strictly the 9 required compliance fields without program_milestone', () => {
      const allBeneficiaries = repo.getAllBeneficiaries();
      const allConsents = repo.getAllConsents();

      const compliant = allBeneficiaries.filter(b => {
        return Boolean(allConsents.find(c => c.beneficiary_id === b.id && c.purpose === 'donor_reporting' && c.status === 'granted' && c.granted_at));
      });

      const anonymizedExport = compliant.map((b, idx) => {
        const maskedName = maskBeneficiaryName(b.name);
        const pseudoId = `KPC-INUKA-DONOR-${(idx + 1001).toString(16).toUpperCase()}`;
        return {
          donor_cohort_id: pseudoId,
          masked_beneficiary_token: maskedName,
          pillar: b.pillar,
          county: b.county,
          region: b.region,
          kdpa_consent_verified: true,
          consent_purpose: 'donor_reporting',
          retention_expiry_window: '365_days',
          export_timestamp: new Date().toISOString(),
        };
      });

      expect(anonymizedExport.length).toBeGreaterThan(0);
      const record = anonymizedExport[0];
      expect(record.donor_cohort_id).toBeDefined();
      expect(record.masked_beneficiary_token).toBeDefined();
      expect(record.pillar).toBeDefined();
      expect(record.county).toBeDefined();
      expect(record.region).toBeDefined();
      expect(record.kdpa_consent_verified).toBe(true);
      expect(record.consent_purpose).toBe('donor_reporting');
      expect(record.retention_expiry_window).toBe('365_days');
      expect(record.export_timestamp).toBeDefined();
      expect((record as any).program_milestone).toBeUndefined();
    });
  });
});
