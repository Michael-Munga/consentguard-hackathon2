import { Router, Request, Response } from 'express';
import { DbRepository, getDatabase } from '../db/database.js';
import { sseManager } from './sse.js';
import { simulator } from '../engine/simulator.js';
import { runFullProvenanceAudit, getLatestProvenanceReport } from '../engine/provenance.js';
import type { StreamEvent } from '../../types/index.js';

const router = Router();
const repo = new DbRepository(getDatabase());

// ============================================================================
// 1. Health & Dashboard Stats
// ============================================================================
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    version: '1.0.0',
    app: 'ConsentGuard - Beneficiary Consent & Privacy Fabric',
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

// ============================================================================
// 2. Beneficiaries Endpoints
// ============================================================================
router.get('/beneficiaries', (req: Request, res: Response) => {
  try {
    let list = repo.getAllBeneficiaries();
    const { search, pillar, region, county, stage } = req.query;

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
    if (stage && typeof stage === 'string' && stage !== 'ALL') {
      list = list.filter(b => b.current_stage === stage);
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
    const transitions = repo.getTransitionsForBeneficiary(ben.id);
    const accessEvents = repo.getDataAccessEvents(200).filter(e => e.beneficiary_id === ben.id);
    const auditLogs = repo.getAllAuditLogs(100, ben.id);
    const anomalies = repo.getAllAnomalies().filter(a => a.beneficiary_id === ben.id);

    res.json({
      beneficiary: ben,
      consents,
      transitions,
      accessEvents,
      auditLogs,
      anomalies,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. Consent Records & Data Access Events
// ============================================================================
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

// ============================================================================
// 4. Anomalies & Manual Review Workflow
// ============================================================================
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
    const streamEvent: StreamEvent = {
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
    };
    sseManager.broadcast(streamEvent);

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

// ============================================================================
// 5. Immutable Audit Trail
// ============================================================================
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

// ============================================================================
// 6. Provenance Reports & KDPA 2019 Anonymized Export
// ============================================================================
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

router.post('/etl/completed', (req: Request, res: Response) => {
  try {
    const mode = req.body?.mode || 'reconcile';
    const streamEvent: StreamEvent = {
      id: `EVT-ETL-${Date.now()}`,
      type: 'ETL_PIPELINE_COMPLETED',
      timestamp: new Date().toISOString(),
      severity: 'low',
      data: { mode },
      message: 'Python ETL pipeline run completed',
    };
    sseManager.broadcast(streamEvent);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Kenya Data Protection Act 2019 Compliant Anonymized Donor Report Endpoint
const handleDonorReport = (req: Request, res: Response) => {
  try {
    const beneficiaries = repo.getAllBeneficiaries();
    const consents = repo.getAllConsents();

    // Filter beneficiaries who have active granted consent for 'donor_reporting'
    const compliantBeneficiaries = beneficiaries.filter(b => {
      const bc = consents.find(
        c => c.beneficiary_id === b.id && c.purpose === 'donor_reporting' && c.status === 'granted' && c.granted_at
      );
      return Boolean(bc);
    });

    // Mask PII (Pseudonymization / Tokenization under Section 25 of KDPA 2019)
    const anonymizedExport = compliantBeneficiaries.map((b, idx) => {
      const nameParts = b.name.split(' ');
      const maskedName = `${nameParts[0][0]}. ${nameParts[1] ? nameParts[1][0] + '***' : '***'}`;
      const pseudoId = `KPC-INUKA-DONOR-${(idx + 1001).toString(16).toUpperCase()}`;

      return {
        donor_cohort_id: pseudoId,
        masked_beneficiary_token: maskedName,
        pillar: b.pillar,
        county: b.county,
        region: b.region,
        program_milestone: b.current_stage,
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
      excluded_unauthorized_records: beneficiaries.length - anonymizedExport.length,
      records: anonymizedExport,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/donor-report', handleDonorReport);
router.get('/donor-export', handleDonorReport);

// ============================================================================
// 7. Simulation Control & Live Demo Trigger
// ============================================================================
router.post('/simulation/trigger-invalid', (req: Request, res: Response) => {
  try {
    const actor = req.body.actor || 'unauthorized_donor_auditor@external.org';
    const result = simulator.simulateUnauthorizedAccess(actor);
    res.json({
      success: true,
      message: 'Critical unauthorized access attempt triggered and caught synchronously at write time!',
      anomaly: result.anomaly,
      event: result.event,
      beneficiary: result.beneficiary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/simulation/toggle', (req: Request, res: Response) => {
  try {
    const { running, intervalMs } = req.body;
    if (intervalMs) {
      simulator.setIntervalMs(intervalMs);
    }
    if (running !== undefined) {
      if (running) {
        simulator.start();
      } else {
        simulator.pause();
      }
    }
    res.json(simulator.getStatus());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/simulation/status', (req: Request, res: Response) => {
  res.json(simulator.getStatus());
});

// ============================================================================
// 8. Server-Sent Events (SSE) Stream
// ============================================================================
router.get('/events/sse', (req: Request, res: Response) => {
  sseManager.addClient(res);
});

export default router;
