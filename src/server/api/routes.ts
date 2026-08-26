import { Router, Request, Response } from 'express';
import { DbRepository, getDatabase } from '../db/database.js';
import { sseManager } from './sse.js';
import { simulator } from '../engine/simulator.js';
import { runFullProvenanceAudit, getLatestProvenanceReport } from '../engine/provenance.js';
import { evaluateCohortRisk } from '../engine/privacyMetrics.js';
import { evaluateAccessEvent } from '../engine/accessAnomalyDetector.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../auth/crypto.js';
import { requireBeneficiaryAuth, requireStaffRole } from '../auth/middleware.js';
import type {
  StreamEvent,
  ConsentPurpose,
  ConsentRecord,
  MaskedBeneficiary,
  Pillar,
  BeneficiaryTokenPayload,
  StaffTokenPayload,
} from '../../types/index.js';
import { maskBeneficiaryName } from '../../types/index.js';

const router = Router();
const repo = new DbRepository(getDatabase());

const VALID_PURPOSES: ConsentPurpose[] = ['donor_reporting', 'internal_analytics', 'third_party_sharing'];

// ============================================================================
// 1. Authentication Endpoints
// ============================================================================

/**
 * Beneficiary Login (using ID or Email + Password/Passphrase)
 */
router.post('/auth/beneficiary/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Beneficiary identifier (ID or Email) and Passphrase are required.' });
    }

    const ben = repo.getBeneficiaryByIdentifier(identifier);
    if (!ben) {
      return res.status(401).json({ error: 'Invalid beneficiary ID or password.' });
    }

    if (ben.password_hash) {
      const isValid = verifyPassword(password, ben.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid beneficiary ID or password.' });
      }
    }

    const payload: BeneficiaryTokenPayload = {
      type: 'beneficiary',
      beneficiary_id: ben.id,
      name: ben.name,
      email: ben.email || null,
    };

    const token = generateToken(payload);

    res.json({
      success: true,
      token,
      beneficiary: {
        id: ben.id,
        name: ben.name,
        email: ben.email,
        pillar: ben.pillar,
        county: ben.county,
        region: ben.region,
        applied_at: ben.applied_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Staff Login (Field Officer, Compliance Officer, Analyst)
 */
router.post('/auth/staff/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const staff = repo.getStaffByEmail(email);
    if (!staff) {
      return res.status(401).json({ error: 'Invalid staff credentials.' });
    }

    const isValid = verifyPassword(password, staff.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid staff credentials.' });
    }

    const payload: StaffTokenPayload = {
      type: 'staff',
      staff_id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      pillar_scope: staff.pillar_scope || null,
    };

    const token = generateToken(payload);

    res.json({
      success: true,
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        pillar_scope: staff.pillar_scope,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Auth Verification / Current Session Lookup
 */
router.get('/auth/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    if (decoded.type === 'beneficiary') {
      const ben = repo.getBeneficiaryById(decoded.beneficiary_id);
      if (!ben) return res.status(404).json({ error: 'Beneficiary not found.' });
      return res.json({
        type: 'beneficiary',
        user: {
          id: ben.id,
          name: ben.name,
          email: ben.email,
          pillar: ben.pillar,
          county: ben.county,
          region: ben.region,
          applied_at: ben.applied_at,
        },
      });
    } else if (decoded.type === 'staff') {
      const staff = repo.getStaffById(decoded.staff_id);
      if (!staff) return res.status(404).json({ error: 'Staff member not found.' });
      return res.json({
        type: 'staff',
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          pillar_scope: staff.pillar_scope,
        },
      });
    }

    res.status(400).json({ error: 'Unknown token type.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. Beneficiary Self-Service Portal Endpoints (requireBeneficiaryAuth)
// ============================================================================

/**
 * GET /api/me: Returns own record, consent records, and consent history
 */
router.get('/me', requireBeneficiaryAuth, (req: Request, res: Response) => {
  try {
    const benId = req.beneficiaryId!;
    const ben = repo.getBeneficiaryById(benId);
    if (!ben) {
      return res.status(404).json({ error: 'Beneficiary record not found.' });
    }

    const consents = repo.getConsentsForBeneficiary(benId);
    const accessEvents = repo.getDataAccessEventsForBeneficiary(benId);
    const auditLogs = repo.getAllAuditLogs(100, benId);

    res.json({
      beneficiary: {
        id: ben.id,
        name: ben.name,
        email: ben.email,
        pillar: ben.pillar,
        county: ben.county,
        region: ben.region,
        applied_at: ben.applied_at,
      },
      consents,
      accessEvents,
      auditLogs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/me/consent/:purpose/grant: Real authenticated consent grant
 */
router.post('/me/consent/:purpose/grant', requireBeneficiaryAuth, (req: Request, res: Response) => {
  try {
    const benId = req.beneficiaryId!;
    const purpose = req.params.purpose as ConsentPurpose;

    if (!VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({
        error: `Invalid consent purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`,
      });
    }

    const ben = repo.getBeneficiaryById(benId);
    if (!ben) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
    const existingConsents = repo.getConsentsForBeneficiary(benId);
    const targetConsent = existingConsents.find(c => c.purpose === purpose);

    const consentId = targetConsent?.id || `CR-${benId}-${purpose.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newOrUpdatedConsent: ConsentRecord = {
      id: consentId,
      beneficiary_id: benId,
      purpose,
      status: 'granted',
      granted_at: timestamp,
      revoked_at: null,
      expires_at: expiresAt,
    };

    if (targetConsent) {
      repo.updateConsentStatus(targetConsent.id, 'granted', null, expiresAt);
    } else {
      repo.insertConsentRecord(newOrUpdatedConsent);
    }

    // Append to immutable audit trail
    repo.insertAuditLog({
      id: `AUD-GRANT-${consentId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      entity_type: 'consent_record',
      entity_id: consentId,
      action: 'DIGITAL_CONSENT_GRANTED',
      actor: benId,
      timestamp,
      before_state: targetConsent ? JSON.stringify(targetConsent) : null,
      after_state: JSON.stringify(newOrUpdatedConsent),
    });

    const maskedToken = maskBeneficiaryName(ben.name);
    const maskedBen: MaskedBeneficiary = {
      ...ben,
      name: maskedToken,
      masked_beneficiary_token: maskedToken,
    };

    // Broadcast masked SSE event
    sseManager.broadcast({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'CONSENT_GRANTED',
      timestamp,
      severity: 'low',
      data: { consent: newOrUpdatedConsent, beneficiary: maskedBen },
      message: `Digital Consent Granted: ${maskedToken} authorized '${purpose}'`,
    });

    res.json({
      success: true,
      message: `Consent granted for '${purpose}'`,
      consent: newOrUpdatedConsent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/me/consent/:purpose/revoke: Real authenticated consent revocation
 */
router.post('/me/consent/:purpose/revoke', requireBeneficiaryAuth, (req: Request, res: Response) => {
  try {
    const benId = req.beneficiaryId!;
    const purpose = req.params.purpose as ConsentPurpose;

    if (!VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({
        error: `Invalid consent purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`,
      });
    }

    const ben = repo.getBeneficiaryById(benId);
    if (!ben) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    const timestamp = new Date().toISOString();
    const existingConsents = repo.getConsentsForBeneficiary(benId);
    const targetConsent = existingConsents.find(c => c.purpose === purpose);

    if (!targetConsent) {
      return res.status(404).json({ error: `No active consent record found for '${purpose}'` });
    }

    repo.updateConsentStatus(targetConsent.id, 'revoked', timestamp, targetConsent.expires_at);

    const revokedConsent: ConsentRecord = {
      ...targetConsent,
      status: 'revoked',
      revoked_at: timestamp,
    };

    // Audit log entry
    repo.insertAuditLog({
      id: `AUD-REVOKE-${targetConsent.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      entity_type: 'consent_record',
      entity_id: targetConsent.id,
      action: 'DIGITAL_CONSENT_REVOKED',
      actor: benId,
      timestamp,
      before_state: JSON.stringify(targetConsent),
      after_state: JSON.stringify(revokedConsent),
    });

    const maskedToken = maskBeneficiaryName(ben.name);
    const maskedBen: MaskedBeneficiary = {
      ...ben,
      name: maskedToken,
      masked_beneficiary_token: maskedToken,
    };

    // Broadcast masked SSE event
    sseManager.broadcast({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'CONSENT_REVOKED',
      timestamp,
      severity: 'low',
      data: {
        consent: revokedConsent,
        beneficiary: maskedBen,
        beneficiary_id: ben.id,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      message: `Digital Consent Revoked: ${maskedToken} revoked authorization for '${purpose}'`,
    });

    res.json({
      success: true,
      message: `Consent revoked for '${purpose}'`,
      consent: revokedConsent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. Field Officer Scoped Endpoints (requireStaffRole('field_officer'))
// ============================================================================

/**
 * GET /api/field/beneficiaries: Scoped strictly by req.pillarScope
 */
router.get('/field/beneficiaries', requireStaffRole('field_officer'), (req: Request, res: Response) => {
  try {
    const pillarScope = req.pillarScope;
    if (!pillarScope) {
      return res.status(403).json({ error: 'Field officer has no assigned pillar scope.' });
    }

    const beneficiaries = repo.getBeneficiariesByPillar(pillarScope);
    const pillarConsents = repo.getConsentsByPillar(pillarScope);

    const consentsByBen = new Map<string, ConsentRecord[]>();
    for (const c of pillarConsents) {
      const list = consentsByBen.get(c.beneficiary_id) || [];
      list.push(c);
      consentsByBen.set(c.beneficiary_id, list);
    }

    // Mask identity tokens and return read-only consent status
    const result = beneficiaries.map(b => {
      const benConsents = consentsByBen.get(b.id) || [];
      const donorConsent = benConsents.find(c => c.purpose === 'donor_reporting');
      const analyticsConsent = benConsents.find(c => c.purpose === 'internal_analytics');
      const thirdPartyConsent = benConsents.find(c => c.purpose === 'third_party_sharing');

      return {
        id: b.id,
        masked_token: maskBeneficiaryName(b.name),
        pillar: b.pillar,
        county: b.county,
        region: b.region,
        applied_at: b.applied_at,
        consent_status: {
          donor_reporting: donorConsent?.status || 'none',
          internal_analytics: analyticsConsent?.status || 'none',
          third_party_sharing: thirdPartyConsent?.status || 'none',
        },
      };
    });

    res.json({
      pillar_scope: pillarScope,
      total: result.length,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/field/consent-summary: Scoped summary for field officer's pillar
 */
router.get('/field/consent-summary', requireStaffRole('field_officer'), (req: Request, res: Response) => {
  try {
    const pillarScope = req.pillarScope;
    if (!pillarScope) {
      return res.status(403).json({ error: 'Field officer has no assigned pillar scope.' });
    }

    const summary = repo.getFieldOfficerConsentSummary(pillarScope);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. M&E / Internal Analyst Endpoints (requireStaffRole('analyst'))
// ============================================================================

/**
 * GET /api/analyst/aggregate-insights: Strictly aggregated data only
 */
router.get('/analyst/aggregate-insights', requireStaffRole('analyst'), (req: Request, res: Response) => {
  try {
    const insights = repo.getAnalystAggregateInsights();
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analyst/trends: Strictly aggregated 30-day trends
 */
router.get('/analyst/trends', requireStaffRole('analyst'), (req: Request, res: Response) => {
  try {
    const trends = repo.getAnalystTrends();
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5. Compliance Officer Endpoints (requireStaffRole('compliance_officer'))
// ============================================================================

/**
 * GET /api/compliance/stats: Compliance Dashboard Stats
 */
router.get('/compliance/stats', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const stats = repo.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/privacy-assessment: Real-time k-Anonymity and Demographic Linkage Risk Assessment
 */
router.get('/compliance/privacy-assessment', requireStaffRole('compliance_officer', 'analyst'), (req: Request, res: Response) => {
  try {
    const pillar = typeof req.query.pillar === 'string' ? req.query.pillar : undefined;
    const assessment = evaluateCohortRisk(pillar);
    res.json(assessment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compliance/export: Masked KDPA Anonymized Export with Recipient Logging
 */
router.post('/compliance/export', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const { schemaType, recipient_email, pillar, region, county } = req.body;

    if (!recipient_email || typeof recipient_email !== 'string' || !recipient_email.includes('@')) {
      return res.status(400).json({
        error: 'Mandatory field missing: A valid recipient_email is required to dispatch compliance exports.',
      });
    }

    const targetPurpose: ConsentPurpose =
      schemaType === 'internal_analytics' || schemaType === 'third_party_sharing'
        ? schemaType
        : 'donor_reporting';

    const beneficiaries = repo.getAllBeneficiaries();
    const consents = repo.getAllConsents();

    // Filter beneficiaries with active granted consent for target purpose
    const compliantBeneficiaries = beneficiaries.filter(b => {
      const bc = consents.find(
        c => c.beneficiary_id === b.id && c.purpose === targetPurpose && c.status === 'granted' && c.granted_at
      );
      return Boolean(bc);
    });

    let filtered = compliantBeneficiaries;
    if (pillar && pillar !== 'ALL') {
      filtered = filtered.filter(b => b.pillar.toLowerCase() === String(pillar).toLowerCase());
    }
    if (region && region !== 'ALL') {
      filtered = filtered.filter(b => b.region.toLowerCase() === String(region).toLowerCase());
    }
    if (county && county !== 'ALL') {
      filtered = filtered.filter(b => b.county && b.county.toLowerCase() === String(county).toLowerCase());
    }

    // Mask records under Section 25 KDPA 2019 — do NOT include program_milestone in export
    const exportRecords = filtered.map((b, idx) => {
      const maskedName = maskBeneficiaryName(b.name);
      const cohortId = `KPC-INUKA-${targetPurpose.substring(0, 3).toUpperCase()}-${(idx + 1001).toString(16).toUpperCase()}`;

      return {
        donor_cohort_id: cohortId,
        masked_beneficiary_token: maskedName,
        pillar: b.pillar,
        county: b.county,
        region: b.region,
        kdpa_consent_verified: true,
        consent_purpose: targetPurpose,
        retention_expiry_window: '365_days',
        export_timestamp: new Date().toISOString(),
      };
    });

    const exportId = `EXP-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const officerEmail = req.staffPayload?.email || 'compliance_officer';
    const officerRole = req.staffPayload?.role || 'compliance_officer';

    // Run Unsupervised Behavioral Access Outlier & Threat Scorer
    const accessEval = evaluateAccessEvent(officerEmail, officerRole, exportRecords.length);

    // Compute cohort privacy assessment for the exported scope
    const privacyAssessment = evaluateCohortRisk(pillar);

    // Log export dispatch to immutable audit log
    repo.insertAuditLog({
      id: `AUD-${exportId}`,
      entity_type: 'compliance_export',
      entity_id: exportId,
      action: 'COMPLIANCE_EXPORT_DISPATCHED',
      actor: officerEmail,
      timestamp,
      before_state: null,
      after_state: JSON.stringify({
        recipient_email,
        schema_type: targetPurpose,
        record_count: exportRecords.length,
        filters: { pillar: pillar || 'ALL', region: region || 'ALL', county: county || 'ALL' },
        ml_threat_score: accessEval.threatScore,
        z_score: accessEval.zScore,
      }),
    });

    // Log data access events for all compliant beneficiaries included in this export
    for (const b of filtered) {
      repo.insertDataAccessEvent({
        id: `DA-EXP-${exportId}-${b.id}`,
        beneficiary_id: b.id,
        purpose: targetPurpose,
        accessed_at: timestamp,
        accessed_by: `${officerEmail} (Export: ${recipient_email})`,
        was_valid: true,
      });
    }

    // Broadcast SSE event
    sseManager.broadcast({
      id: `EVT-${exportId}`,
      type: 'DATA_ACCESSED',
      timestamp,
      severity: 'low',
      data: {
        export_id: exportId,
        recipient_email,
        schema: targetPurpose,
        record_count: exportRecords.length,
      },
      message: `Compliance Export Dispatched: ${exportRecords.length} records exported to ${recipient_email} (${targetPurpose})`,
    });

    res.json({
      success: true,
      export_id: exportId,
      export_title: `KPC Inuka Foundation - Anonymized ${targetPurpose.replace('_', ' ').toUpperCase()} Dataset`,
      recipient_email,
      dispatched_at: timestamp,
      kdpa_certification: 'COMPLIANT_UNDER_KENYA_DATA_PROTECTION_ACT_2019_SEC_25',
      total_eligible_records: exportRecords.length,
      excluded_unauthorized_records: beneficiaries.length - compliantBeneficiaries.length,
      privacy_assessment: privacyAssessment,
      access_evaluation: accessEval,
      records: exportRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Staff Profile Settings GET & PATCH
 */
router.get('/staff/me', requireStaffRole('compliance_officer', 'field_officer', 'analyst'), (req: Request, res: Response) => {
  try {
    const staff = repo.getStaffById(req.staffId!);
    if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

    res.json({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      pillar_scope: staff.pillar_scope,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/staff/me', requireStaffRole('compliance_officer', 'field_officer', 'analyst'), (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    repo.updateStaffProfile(req.staffId!, name.trim(), email.trim());
    const updated = repo.getStaffById(req.staffId!);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      staff: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 6. System & General Endpoints (Public/Compliance)
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    version: '2.0.0',
    app: 'ConsentGuard - Beneficiary Data Privacy & Consent Management Fabric',
    timestamp: new Date().toISOString(),
  });
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = repo.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/beneficiaries', (req: Request, res: Response) => {
  try {
    let list = repo.getAllBeneficiaries();
    const { search, pillar, region, county } = req.query;

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.county && b.county.toLowerCase().includes(q)) ||
          b.region.toLowerCase().includes(q)
      );
    }
    if (pillar && typeof pillar === 'string' && pillar !== 'ALL') {
      list = list.filter(b => b.pillar === pillar);
    }
    if (region && typeof region === 'string' && region !== 'ALL') {
      list = list.filter(b => b.region === region);
    }
    if (county && typeof county === 'string' && county !== 'ALL') {
      list = list.filter(b => b.county === county);
    }

    res.json({
      total: list.length,
      data: list,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/beneficiaries/:id', (req: Request, res: Response) => {
  try {
    const ben = repo.getBeneficiaryById(req.params.id);
    if (!ben) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    const consents = repo.getConsentsForBeneficiary(ben.id);
    const accessEvents = repo.getDataAccessEvents(200).filter(e => e.beneficiary_id === ben.id);
    const auditLogs = repo.getAllAuditLogs(100, ben.id);
    const anomalies = repo.getAllAnomalies().filter(a => a.beneficiary_id === ben.id);

    res.json({
      beneficiary: ben,
      consents,
      accessEvents,
      auditLogs,
      anomalies,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/consents', (req: Request, res: Response) => {
  try {
    const benId = req.query.beneficiary_id as string | undefined;
    if (benId) {
      res.json(repo.getConsentsForBeneficiary(benId));
    } else {
      res.json(repo.getAllConsents());
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/access-events', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    res.json(repo.getDataAccessEvents(limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/anomalies', (req: Request, res: Response) => {
  try {
    let list = repo.getAllAnomalies();
    const { severity, type, reviewed } = req.query;

    if (severity && typeof severity === 'string') {
      list = list.filter(a => a.severity === severity);
    }
    if (type && typeof type === 'string') {
      list = list.filter(a => a.anomaly_type === type);
    }
    if (reviewed !== undefined) {
      const isRev = reviewed === 'true' || reviewed === '1';
      list = list.filter(a => a.reviewed === isRev);
    }

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/anomalies/:id/review', (req: Request, res: Response) => {
  try {
    const { actor, reviewer, notes } = req.body;
    const reviewerName = reviewer || actor || 'Inuka Data Protection Officer';
    const resolutionNotes = notes || '';
    const reviewedAt = new Date().toISOString();

    const success = repo.markAnomalyReviewed(
      req.params.id,
      reviewerName,
      resolutionNotes,
      reviewedAt
    );

    if (!success) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    const updatedAnomaly = repo.getAllAnomalies().find(a => a.id === req.params.id);

    // Broadcast SSE update
    sseManager.broadcast({
      id: `EVT-REV-${Date.now()}`,
      type: 'ANOMALY_REVIEWED',
      timestamp: reviewedAt,
      severity: 'low',
      data: {
        anomaly_id: req.params.id,
        actor: reviewerName,
        reviewer: reviewerName,
        reviewed_at: reviewedAt,
        notes: resolutionNotes,
        anomaly: updatedAnomaly,
      },
      message: `Governance Anomaly ${req.params.id} marked reviewed by ${reviewerName}`,
    });

    res.json({
      success: true,
      message: 'Anomaly marked reviewed and recorded to audit trail.',
      reviewed_at: reviewedAt,
      reviewed_by: reviewerName,
      resolution_notes: resolutionNotes,
      anomaly: updatedAnomaly,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-log', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
    const beneficiaryId = req.query.beneficiary_id as string | undefined;
    const logs = repo.getAllAuditLogs(limit, beneficiaryId);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/provenance/latest', (req: Request, res: Response) => {
  try {
    let report = getLatestProvenanceReport();
    if (!report) {
      report = runFullProvenanceAudit(repo);
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/provenance/generate', (req: Request, res: Response) => {
  try {
    const report = runFullProvenanceAudit(repo);
    sseManager.broadcast({
      id: `EVT-PROV-${Date.now()}`,
      type: 'PROVENANCE_REPORT_GENERATED',
      timestamp: new Date().toISOString(),
      severity: report.overall_status === 'PASSED' ? 'low' : 'medium',
      data: { report },
      message: `ETL Provenance Report Generated: Run ${report.run_id} evaluated with status '${report.overall_status}'`,
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy handler for donor export
const handleDonorReport = (req: Request, res: Response) => {
  try {
    const beneficiaries = repo.getAllBeneficiaries();
    const consents = repo.getAllConsents();
    const { pillar, region, county } = req.query;

    const compliantBeneficiaries = beneficiaries.filter(b => {
      const bc = consents.find(
        c => c.beneficiary_id === b.id && c.purpose === 'donor_reporting' && c.status === 'granted' && c.granted_at
      );
      return Boolean(bc);
    });

    let filteredBeneficiaries = compliantBeneficiaries;
    if (pillar && typeof pillar === 'string' && pillar.trim() && pillar.toUpperCase() !== 'ALL') {
      const p = pillar.trim().toLowerCase();
      filteredBeneficiaries = filteredBeneficiaries.filter(b => b.pillar && b.pillar.toLowerCase() === p);
    }
    if (region && typeof region === 'string' && region.trim() && region.toUpperCase() !== 'ALL') {
      const r = region.trim().toLowerCase();
      filteredBeneficiaries = filteredBeneficiaries.filter(b => b.region && b.region.toLowerCase() === r);
    }
    if (county && typeof county === 'string' && county.trim() && county.toUpperCase() !== 'ALL') {
      const c = county.trim().toLowerCase();
      filteredBeneficiaries = filteredBeneficiaries.filter(b => b.county && b.county.toLowerCase() === c);
    }

    const anonymizedExport = filteredBeneficiaries.map((b, idx) => {
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

    res.json({
      export_title: 'KPC Inuka Foundation - Anonymized M&E Donor Progress Dataset',
      kdpa_compliance_certification: 'COMPLIANT_UNDER_KENYA_DATA_PROTECTION_ACT_2019_SEC_25',
      total_eligible_records: anonymizedExport.length,
      excluded_unauthorized_records: beneficiaries.length - compliantBeneficiaries.length,
      records: anonymizedExport,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/donor-report', handleDonorReport);
router.get('/donor-export', handleDonorReport);

/**
 * POST /api/demo/simulate/unauthorized-access
 */
router.post('/demo/simulate/unauthorized-access', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const actor = req.body.actor || 'unauthorized_donor_auditor@external.org';
    const result = simulator.simulateUnauthorizedAccess(actor);
    const maskedToken = maskBeneficiaryName(result.beneficiary.name);
    res.json({
      success: true,
      message: 'Unauthorized access attempt without valid consent mandate intercepted and blocked at write time!',
      anomaly: {
        ...result.anomaly,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      event: result.event,
      beneficiary: {
        ...result.beneficiary,
        name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/demo/simulate/revoked-access (body: { actor?, beneficiaryId? })
 */
router.post('/demo/simulate/revoked-access', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const actor = req.body.actor || 'batch_donor_reporter@inuka.ke';
    const beneficiaryId = req.body.beneficiaryId;
    const result = simulator.simulateRevokedConsentAccess(actor, beneficiaryId);
    const maskedToken = maskBeneficiaryName(result.beneficiary.name);
    res.json({
      success: true,
      message: 'Access attempt on revoked digital consent mandate intercepted and blocked at write time!',
      anomaly: {
        ...result.anomaly,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      event: result.event,
      beneficiary: {
        ...result.beneficiary,
        name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/demo/simulate/expired-access
 */
router.post('/demo/simulate/expired-access', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const actor = req.body.actor || 'analytics_retention_crawler@partner.org';
    const result = simulator.simulateExpiredConsentAccess(actor);
    const maskedToken = maskBeneficiaryName(result.beneficiary.name);
    res.json({
      success: true,
      message: 'Access attempt on statutory expired consent window intercepted and blocked at write time!',
      anomaly: {
        ...result.anomaly,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      event: result.event,
      beneficiary: {
        ...result.beneficiary,
        name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/demo/simulate/inconsistent-state
 */
router.post('/demo/simulate/inconsistent-state', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const actor = req.body.actor || 'legacy_intake_sync@inuka.ke';
    const result = simulator.simulateInconsistentState(actor);
    const maskedToken = maskBeneficiaryName(result.beneficiary.name);
    res.json({
      success: true,
      message: 'Access rejected due to corrupted/missing timestamp metadata: Enforcing strict metadata integrity policy!',
      anomaly: {
        ...result.anomaly,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      event: result.event,
      beneficiary: {
        ...result.beneficiary,
        name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/demo/simulate/behavioral-outlier (body: { actorId?, recordCount? })
 */
router.post('/demo/simulate/behavioral-outlier', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const actorId = req.body.actorId || 'field_officer_nakuru';
    const recordCount = typeof req.body.recordCount === 'number' ? req.body.recordCount : 65;
    const result = simulator.simulateBehavioralOutlier(actorId, recordCount);
    const maskedToken = maskBeneficiaryName(result.beneficiary.name);
    res.json({
      success: true,
      message: 'Unsupervised AI access outlier flagged: Actor access volume exceeded statistical baseline!',
      anomaly: {
        ...result.anomaly,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      event: result.event,
      beneficiary: {
        ...result.beneficiary,
        name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/demo/simulate/bulk-exfiltration (body: { actorId?, recordCount? })
 */
router.post('/demo/simulate/bulk-exfiltration', requireStaffRole('compliance_officer'), (req: Request, res: Response) => {
  try {
    const actorId = req.body.actorId || 'exfiltration_batch_daemon';
    const recordCount = typeof req.body.recordCount === 'number' ? req.body.recordCount : 350;
    const result = simulator.simulateBulkExfiltration(actorId, recordCount);
    const maskedToken = maskBeneficiaryName(result.beneficiary.name);
    res.json({
      success: true,
      message: 'Critical Suspicious Bulk Exfiltration blocked and flagged by AI threat index scorer!',
      anomaly: {
        ...result.anomaly,
        beneficiary_name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
      event: result.event,
      beneficiary: {
        ...result.beneficiary,
        name: maskedToken,
        masked_beneficiary_token: maskedToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/events/sse', (req: Request, res: Response) => {
  sseManager.addClient(res);
});

export default router;
