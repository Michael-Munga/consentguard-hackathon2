import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { DbRepository, getDatabase, closeDatabase } from '../server/db/database.js';
import { sseManager } from '../server/api/sse.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../server/auth/crypto.js';
import { seedDatabase } from '../server/db/seed.js';
import { importBeneficiariesFromCsvData, parseCsvString } from '../server/db/importCsv.js';
import { requireBeneficiaryAuth, requireStaffRole } from '../server/auth/middleware.js';
import { TestAnomalyInjector } from '../server/engine/simulator.js';
import { maskBeneficiaryName } from '../types/index.js';
import type { BeneficiaryTokenPayload, StaffTokenPayload, ConsentRecord } from '../types/index.js';

describe('Auth, RBAC Security, Role Scoping & CSV Import Engine', () => {
  let db: Database.Database;
  let repo: DbRepository;

  beforeEach(() => {
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

  describe('Cryptographic Authentication & Token Issuance', () => {
    it('hashes passwords securely and verifies correct passwords', () => {
      const password = 'TestSecurePassphrase123!';
      const hash = hashPassword(password);

      expect(hash).toContain(':');
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('WrongPassword!', hash)).toBe(false);
      expect(verifyPassword('', hash)).toBe(false);
    });

    it('generates and verifies Beneficiary JWT token payload', () => {
      const payload: BeneficiaryTokenPayload = {
        type: 'beneficiary',
        beneficiary_id: 'INK-84920',
        name: 'Faith Kamau',
        email: 'faith.kamau@inuka.ke',
      };

      const token = generateToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyToken<BeneficiaryTokenPayload>(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.type).toBe('beneficiary');
      expect(decoded?.beneficiary_id).toBe('INK-84920');
      expect(decoded?.name).toBe('Faith Kamau');
      expect(decoded?.email).toBe('faith.kamau@inuka.ke');
      expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('generates and verifies Staff JWT token payload with role and pillar scope', () => {
      const payload: StaffTokenPayload = {
        type: 'staff',
        staff_id: 'STF-FLD-001',
        name: 'David Omondi',
        email: 'field.scholarship@inuka.kpc.co.ke',
        role: 'field_officer',
        pillar_scope: 'Scholarship',
      };

      const token = generateToken(payload);
      const decoded = verifyToken<StaffTokenPayload>(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.type).toBe('staff');
      expect(decoded?.role).toBe('field_officer');
      expect(decoded?.pillar_scope).toBe('Scholarship');
    });

    it('rejects tampered or forged JWT tokens', () => {
      const payload: BeneficiaryTokenPayload = {
        type: 'beneficiary',
        beneficiary_id: 'INK-84920',
        name: 'Faith Kamau',
      };

      const token = generateToken(payload);
      const parts = token.split('.');
      const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ ...payload, beneficiary_id: 'ROGUE-ADMIN' })).toString('base64')}.${parts[2]}`;

      const decoded = verifyToken(tampered);
      expect(decoded).toBeNull();
    });
  });

  describe('Beneficiary Portal Self-Service Actions', () => {
    it('authenticates seeded demo beneficiary Faith Kamau via ID or Email', () => {
      const byId = repo.getBeneficiaryByIdentifier('INK-84920');
      expect(byId).toBeDefined();
      expect(byId?.name).toBe('Faith Kamau');
      expect(verifyPassword('Passphrase123!', byId!.password_hash!)).toBe(true);

      const byEmail = repo.getBeneficiaryByIdentifier('faith.kamau@inuka.ke');
      expect(byEmail).toBeDefined();
      expect(byEmail?.id).toBe('INK-84920');
    });

    it('allows beneficiary to grant and revoke consent and records audit logs', () => {
      const benId = 'INK-84920';
      const timestamp = new Date().toISOString();

      // Faith revokes donor_reporting
      const initialConsents = repo.getConsentsForBeneficiary(benId);
      const donorConsent = initialConsents.find(c => c.purpose === 'donor_reporting');
      expect(donorConsent?.status).toBe('granted');

      repo.updateConsentStatus(donorConsent!.id, 'revoked', timestamp, donorConsent!.expires_at);

      // Verify status changed
      const updatedConsents = repo.getConsentsForBeneficiary(benId);
      const updatedDonor = updatedConsents.find(c => c.purpose === 'donor_reporting');
      expect(updatedDonor?.status).toBe('revoked');
      expect(updatedDonor?.revoked_at).toBe(timestamp);

      // Audit log entry
      repo.insertAuditLog({
        id: `AUD-TEST-REVOKE`,
        entity_type: 'consent_record',
        entity_id: donorConsent!.id,
        action: 'DIGITAL_CONSENT_REVOKED',
        actor: benId,
        timestamp,
        before_state: JSON.stringify(donorConsent),
        after_state: JSON.stringify(updatedDonor),
      });

      const auditLogs = repo.getAllAuditLogs(10, benId);
      const latestAudit = auditLogs.find(l => l.action === 'DIGITAL_CONSENT_REVOKED');
      expect(latestAudit).toBeDefined();
      expect(latestAudit?.actor).toBe(benId);
    });

    it('handles multiple consecutive consent grants and revocations without audit ID collision', () => {
      const benId = 'INK-84920';
      const consentId = `CNS-${benId}-donor_reporting`;

      for (let i = 0; i < 5; i++) {
        expect(() => {
          repo.insertAuditLog({
            id: `AUD-GRANT-${consentId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            entity_type: 'consent_record',
            entity_id: consentId,
            action: 'DIGITAL_CONSENT_GRANTED',
            actor: benId,
            timestamp: new Date().toISOString(),
            before_state: null,
            after_state: JSON.stringify({ status: 'granted', iteration: i }),
          });
        }).not.toThrow();
      }
    });
  });

  describe('Field Officer Scoped Boundaries', () => {
    it('restricts Field Officer queries strictly to their assigned pillar scope', () => {
      const scholarshipBens = repo.getBeneficiariesByPillar('Scholarship');
      expect(scholarshipBens.length).toBeGreaterThan(0);
      expect(scholarshipBens.every(b => b.pillar === 'Scholarship')).toBe(true);

      const techBens = repo.getBeneficiariesByPillar('Tech');
      expect(techBens.length).toBeGreaterThan(0);
      expect(techBens.every(b => b.pillar === 'Tech')).toBe(true);
    });

    it('generates scoped Field Officer KPI summary with purpose breakdowns', () => {
      const summary = repo.getFieldOfficerConsentSummary('Scholarship');
      expect(summary.pillar).toBe('Scholarship');
      expect(summary.totalAssigned).toBeGreaterThan(0);
      expect(summary.purposeBreakdown.length).toBe(3);
      expect(summary.purposeBreakdown[0].purpose).toBe('donor_reporting');
      expect(summary.purposeBreakdown[1].purpose).toBe('internal_analytics');
      expect(summary.purposeBreakdown[2].purpose).toBe('third_party_sharing');
    });
  });

  describe('Analyst Aggregate Data Only Enforcement', () => {
    it('returns strictly aggregated counts and never individual identities', () => {
      const insights = repo.getAnalystAggregateInsights();
      expect(insights).toHaveProperty('totalAnalyzableCohort');
      expect(insights).toHaveProperty('globalOptInRate');
      expect(insights).toHaveProperty('recentRevocations');
      expect(insights).toHaveProperty('pillarCoverage');
      expect(insights).toHaveProperty('regionalDistribution');
      expect(insights).not.toHaveProperty('records');
      expect(insights).not.toHaveProperty('beneficiaries');

      const trends = repo.getAnalystTrends();
      expect(trends).toHaveProperty('totalActiveConsents');
      expect(trends).toHaveProperty('netNewGrantsPeriod');
      expect(trends).toHaveProperty('revocationRate');
      expect(trends).toHaveProperty('revocationTriggers');
      expect(trends).toHaveProperty('regionalCompliance');
      expect(trends).not.toHaveProperty('records');
    });
  });

  describe('Compliance Officer Masked Exports & Audit Trail', () => {
    it('masks beneficiary names with KDPA Section 25 tokenization', () => {
      expect(maskBeneficiaryName('Brian Ouma')).toBe('B. O***');
      expect(maskBeneficiaryName('Faith Kamau')).toBe('F. K***');
      expect(maskBeneficiaryName('John Doe')).toBe('J. D***');
    });

    it('verifies staff management and profile updates', () => {
      const complianceStaff = repo.getStaffByEmail('compliance@inuka.kpc.co.ke');
      expect(complianceStaff).toBeDefined();
      expect(complianceStaff?.role).toBe('compliance_officer');

      repo.updateStaffProfile(complianceStaff!.id, 'Sarah Jenkins (Chief Officer)', 's.jenkins@inuka.kpc.co.ke');
      const updated = repo.getStaffById(complianceStaff!.id);
      expect(updated?.name).toBe('Sarah Jenkins (Chief Officer)');
      expect(updated?.email).toBe('s.jenkins@inuka.kpc.co.ke');
    });
  });

  describe('CSV Seeding Capability & Consent Ingestion Rules', () => {
    it('imports beneficiaries from CSV and inserts accurate digital consent records', () => {
      const csvData = `name,pillar,county,region,applied_at,email,password,donor_reporting_status,internal_analytics_status,third_party_sharing_status,donor_reporting_granted_at
Jane Wanjiku,Scholarship,Nyeri,Central,2026-01-10T10:00:00Z,jane.wanjiku@test.ke,SecurePass123!,granted,requested,none,2026-01-12T10:00:00Z
Peter Ochieng,Tech,Kisumu,Nyanza,2026-01-15T10:00:00Z,peter.ochieng@test.ke,SecurePass123!,requested,requested,requested,
Amina Ali,Vocational,Garissa,North Eastern,2026-02-01T10:00:00Z,,,none,none,none,`;

      const rows = parseCsvString(csvData);
      expect(rows.length).toBe(3);

      const result = importBeneficiariesFromCsvData(rows, db);
      expect(result.success).toBe(true);
      expect(result.beneficiariesImported).toBe(3);
      expect(result.withPortalAccess).toBe(2); // Jane and Peter had credentials

      // Jane has a 'granted' status for donor reporting
      const jane = repo.getBeneficiaryByIdentifier('jane.wanjiku@test.ke');
      expect(jane).toBeDefined();
      expect(verifyPassword('SecurePass123!', jane!.password_hash!)).toBe(true);
      const janeConsents = repo.getConsentsForBeneficiary(jane!.id);
      expect(janeConsents.find(c => c.purpose === 'donor_reporting')?.status).toBe('granted');

      // Peter has 'requested' statuses
      const peter = repo.getBeneficiaryByIdentifier('peter.ochieng@test.ke');
      expect(peter).toBeDefined();
      const peterConsents = repo.getConsentsForBeneficiary(peter!.id);
      expect(peterConsents.every(c => c.status === 'requested')).toBe(true);

      // Amina has 'none' and no portal credentials
      const amina = repo.getAllBeneficiaries().find(b => b.name === 'Amina Ali');
      expect(amina).toBeDefined();
      expect(amina?.password_hash).toBeNull();
    });
  });

  describe('Test Anomaly Injection & Real Analyst Queries', () => {
    it('allows compliance officer to inject manual test anomalies and blocks unauthorized access', () => {
      const injector = new TestAnomalyInjector(repo);
      const result = injector.simulateUnauthorizedAccess('rogue_external_bot@test.ke');

      expect(result).toBeDefined();
      expect(result.event.was_valid).toBe(false);
      expect(result.anomaly.severity).toBe('critical');

      const anomalyInDb = repo.getAllAnomalies().find(a => a.id === result.anomaly.id);
      expect(anomalyInDb).toBeDefined();
      expect(anomalyInDb?.reviewed).toBe(false);
    });

    it('returns real calculated aggregate insights with Kenyan pillars and regions', () => {
      const insights = repo.getAnalystAggregateInsights();
      expect(insights.pillarCoverage.length).toBe(4);
      expect(insights.pillarCoverage.map(p => p.name)).toEqual(['Scholarship', 'Plus', 'Vocational', 'Tech']);
      expect(insights.regionalDistribution.length).toBe(8);
      expect(insights.regionalDistribution.some(r => r.framework === 'Nairobi')).toBe(true);

      const trends = repo.getAnalystTrends();
      expect(trends.regionalCompliance.length).toBe(8);
      expect(trends.regionalCompliance.some(r => r.region === 'Rift Valley')).toBe(true);
      expect(trends.revocationTriggers.length).toBeGreaterThan(0);
    });

    it('strictly protects anomaly demo trigger with compliance_officer role authorization', () => {
      // 1. Unauthenticated request
      const unauthReq: any = { headers: {} };
      let unauthStatus = 0;
      let unauthJson: any = null;
      const resHelper = () => ({
        status: (code: number) => {
          unauthStatus = code;
          return {
            json: (payload: any) => { unauthJson = payload; }
          };
        }
      });

      const middleware = (req: any, res: any, next: any) => {
        return requireStaffRole('compliance_officer')(req, res, next);
      };

      // Missing token -> 401
      middleware(unauthReq, resHelper(), () => {});
      expect(unauthStatus).toBe(401);
      expect(unauthJson.error).toContain('Missing Bearer token');

      // Field officer token -> 403 Forbidden
      const fieldToken = generateToken({
        type: 'staff',
        staff_id: 'STF-002',
        email: 'field.scholarship@inuka.kpc.co.ke',
        name: 'Jane Mutua',
        role: 'field_officer',
        pillar_scope: 'Scholarship',
      });
      const fieldReq: any = { headers: { authorization: `Bearer ${fieldToken}` } };
      middleware(fieldReq, resHelper(), () => {});
      expect(unauthStatus).toBe(403);
      expect(unauthJson.error).toContain('Role \'field_officer\' is not authorized');

      // Compliance officer token -> next() called
      const complianceToken = generateToken({
        type: 'staff',
        staff_id: 'STF-001',
        email: 'compliance@inuka.kpc.co.ke',
        name: 'David Mwangi',
        role: 'compliance_officer',
        pillar_scope: null,
      });
      let nextCalled = false;
      const complianceReq: any = { headers: { authorization: `Bearer ${complianceToken}` } };
      middleware(complianceReq, resHelper(), () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });
  });
});
