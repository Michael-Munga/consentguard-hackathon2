import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DbRepository } from '../db/database.js';
import {
  generateProvenanceReport,
  validateLifecycleTransition,
  detectConsentConflict,
  validateDataAccessEvent,
  validateConsentRecordIntegrity,
  evaluateCohortAnomalyRates,
} from './validator.js';
import type { ProvenanceReport, ValidationGateResult } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROVENANCE_DIR = path.resolve(__dirname, '../../../data/provenance');
const LATEST_REPORT_PATH = path.join(PROVENANCE_DIR, 'etl_run_report.json');

export function runFullProvenanceAudit(repo: DbRepository, customRunId?: string): ProvenanceReport {
  const startTime = Date.now();
  const year = new Date().getFullYear();
  const runId = customRunId || `PROV-INUKA-${year}-${Date.now().toString().slice(-6)}`;

  if (!fs.existsSync(PROVENANCE_DIR)) {
    fs.mkdirSync(PROVENANCE_DIR, { recursive: true });
  }

  // 1. Audit Transitions (Stage Sequence Gate)
  const beneficiaries = repo.getAllBeneficiaries();
  let sequenceFailures = 0;
  let totalTransitionsEvaluated = 0;

  for (const b of beneficiaries) {
    const transitions = repo.getTransitionsForBeneficiary(b.id);
    for (const t of transitions) {
      totalTransitionsEvaluated++;
      const result = validateLifecycleTransition(t.from_stage, t.to_stage);
      if (!result.isValid) {
        sequenceFailures++;
      }
    }
  }

  const gate1: ValidationGateResult = {
    gate_name: 'Gate 1: Stage Sequence Integrity Gate',
    passed: sequenceFailures === 0,
    evaluated_count: totalTransitionsEvaluated,
    failure_count: sequenceFailures,
    description: 'Validates strict consecutive ordering across the 6 beneficiary lifecycle milestones.',
  };

  // 2. Audit Consents for Entity Overlaps (Entity Conflict Gate)
  let overlapFailures = 0;
  let totalConsentsEvaluated = 0;

  for (const b of beneficiaries) {
    const consents = repo.getConsentsForBeneficiary(b.id);
    for (let i = 0; i < consents.length; i++) {
      totalConsentsEvaluated++;
      const priorConsents = consents.slice(0, i);
      const conflict = detectConsentConflict(priorConsents, consents[i]);
      if (conflict.hasConflict) {
        overlapFailures++;
      }
    }
  }

  const gate2: ValidationGateResult = {
    gate_name: 'Gate 2: Entity-Level Consent Conflict Gate',
    passed: overlapFailures === 0,
    evaluated_count: totalConsentsEvaluated,
    failure_count: overlapFailures,
    description: 'Enforces cross-record timeline non-overlap for identical consent purposes per beneficiary.',
  };

  // 3. Audit Data Access Events (Write-Time Authorization Gate)
  const accessEvents = repo.getDataAccessEvents(500);
  let unauthorizedAccessFailures = 0;

  for (const a of accessEvents) {
    const consents = repo.getConsentsForBeneficiary(a.beneficiary_id);
    const authResult = validateDataAccessEvent(a, consents);
    if (!authResult.isValid) {
      unauthorizedAccessFailures++;
    }
  }

  const gate3: ValidationGateResult = {
    gate_name: 'Gate 3: Real-Time Consent Authorization Gate',
    passed: unauthorizedAccessFailures === 0,
    evaluated_count: accessEvents.length,
    failure_count: unauthorizedAccessFailures,
    description: 'Verifies active, non-revoked digital consent authorization at write timestamp.',
  };

  // 4. Audit Consent Record Integrity (Flag, Never Silently Fix Gate)
  const allConsents = repo.getAllConsents();
  let stateIntegrityFailures = 0;

  for (const c of allConsents) {
    const integResult = validateConsentRecordIntegrity(c);
    if (!integResult.isValid) {
      stateIntegrityFailures++;
    }
  }

  const gate4: ValidationGateResult = {
    gate_name: 'Gate 4: Metadata Integrity & Provenance Gate',
    passed: stateIntegrityFailures === 0,
    evaluated_count: allConsents.length,
    failure_count: stateIntegrityFailures,
    description: 'Enforces flag-never-silently-fix policy on missing or corrupted timestamp metadata.',
  };

  // 5. Cohort Statistical Anomaly Rate Evaluation (2-Sigma Fence Gate)
  const stats = repo.getDashboardStats();
  const cohortInputs = (['Scholarship', 'Plus', 'Vocational', 'Tech'] as const).map(p => {
    const benCount = beneficiaries.filter(b => b.pillar === p).length;
    const anomCount = stats.pillar_anomaly_rates.filter(r => r.pillar === p && r.is_outlier).length;
    return { pillar: p, anomalyCount: anomCount, beneficiaryCount: benCount };
  });

  const cohortEvaluations = evaluateCohortAnomalyRates(cohortInputs);
  const outlierCohorts = cohortEvaluations.filter(c => c.isOutlier);

  const gate5: ValidationGateResult = {
    gate_name: 'Gate 5: Cross-Cohort Statistical Drift Gate (Mean + 2σ)',
    passed: outlierCohorts.length === 0,
    evaluated_count: cohortEvaluations.length,
    failure_count: outlierCohorts.length,
    description: 'Monitors per-pillar anomaly density exceeding the 2-sigma leave-one-out cohort threshold.',
  };

  const allAnomalies = repo.getAllAnomalies();
  const eventSummaries: Array<{ type: string; was_valid: boolean; anomaly_type?: any }> = [];

  // 1. Add valid lifecycle transitions
  const validTransitionsCount = Math.max(0, totalTransitionsEvaluated - sequenceFailures);
  for (let i = 0; i < validTransitionsCount; i++) {
    eventSummaries.push({ type: 'LIFECYCLE_TRANSITION', was_valid: true });
  }

  // 2. Add valid consent records
  const validConsentsCount = Math.max(0, totalConsentsEvaluated - overlapFailures - stateIntegrityFailures);
  for (let i = 0; i < validConsentsCount; i++) {
    eventSummaries.push({ type: 'CONSENT_RECORD_VALID', was_valid: true });
  }

  // 3. Add valid data access events
  const validAccessCount = Math.max(0, accessEvents.length - unauthorizedAccessFailures);
  for (let i = 0; i < validAccessCount; i++) {
    eventSummaries.push({ type: 'DATA_ACCESS_AUTHORIZED', was_valid: true });
  }

  // 4. Add all flagged anomalies
  for (const a of allAnomalies) {
    eventSummaries.push({
      type: 'GOVERNANCE_ANOMALY',
      was_valid: false,
      anomaly_type: a.anomaly_type,
    });
  }

  const durationMs = Math.max(1, Date.now() - startTime);
  const report = generateProvenanceReport(
    runId,
    eventSummaries,
    [gate1, gate2, gate3, gate4, gate5],
    durationMs
  );

  // Write latest report to disk
  fs.writeFileSync(LATEST_REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  // Also write run-specific report
  const historicalPath = path.join(PROVENANCE_DIR, `${runId}.json`);
  fs.writeFileSync(historicalPath, JSON.stringify(report, null, 2), 'utf-8');

  return report;
}

export function getLatestProvenanceReport(): ProvenanceReport | null {
  if (fs.existsSync(LATEST_REPORT_PATH)) {
    try {
      const content = fs.readFileSync(LATEST_REPORT_PATH, 'utf-8');
      return JSON.parse(content) as ProvenanceReport;
    } catch {
      return null;
    }
  }
  return null;
}
