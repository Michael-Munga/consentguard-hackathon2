import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateCohortRisk } from '../server/engine/privacyMetrics.js';
import { evaluateAccessEvent } from '../server/engine/accessAnomalyDetector.js';
import { DbRepository, getDatabase } from '../server/db/database.js';

describe('Privacy Metrics & Access Anomaly Detector', () => {
  const repo = new DbRepository(getDatabase());

  describe('evaluateCohortRisk()', () => {
    it('evaluates demographic k-anonymity across active cohorts', () => {
      const assessment = evaluateCohortRisk();

      expect(assessment).toBeDefined();
      expect(typeof assessment.kAnonymityScore).toBe('number');
      expect(assessment.kAnonymityScore).toBeGreaterThanOrEqual(0);
      expect(assessment.kAnonymityScore).toBeLessThanOrEqual(100);
      expect(assessment.totalRecords).toBeGreaterThan(0);
      expect(assessment.safeRecords + assessment.unprotectedRecords).toBe(assessment.totalRecords);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(assessment.riskTier);
      expect(Array.isArray(assessment.vulnerableCohorts)).toBe(true);
      expect(assessment.cohortMap).toBeDefined();
      expect(assessment.pillarBreakdown).toBeDefined();
      expect(Array.isArray(assessment.regionalPrivacyDistribution)).toBe(true);
    });

    it('filters cohort risk by specified pillar', () => {
      const scholarshipAssessment = evaluateCohortRisk('Scholarship');
      expect(scholarshipAssessment).toBeDefined();
      expect(scholarshipAssessment.totalRecords).toBeGreaterThan(0);

      for (const cohort of scholarshipAssessment.vulnerableCohorts) {
        expect(cohort.pillar.toLowerCase()).toBe('scholarship');
      }
    });
  });

  describe('evaluateAccessEvent()', () => {
    it('handles requests gracefully with default baselines and no prior history without division-by-zero', () => {
      const result = evaluateAccessEvent('test_officer@inuka.kpc.co.ke', 'compliance_officer', 15, 14); // 2 PM (normal hours)

      expect(result).toBeDefined();
      expect(result.mean).toBe(15);
      expect(result.stdDev).toBe(8);
      expect(result.zScore).toBe(0);
      expect(result.isOffHours).toBe(false);
      expect(result.isOutOfScope).toBe(false);
      expect(result.isAnomaly).toBe(false);
    });

    it('flags high-volume off-hours requests as behavioral anomalies', () => {
      // 500 records at 2 AM EAT (off hours)
      const result = evaluateAccessEvent('suspicious_user@inuka.kpc.co.ke', 'compliance_officer', 500, 2);

      expect(result.isOffHours).toBe(true);
      expect(result.zScore).toBeGreaterThan(3.5);
      expect(result.threatScore).toBeGreaterThanOrEqual(65);
      expect(result.isAnomaly).toBe(true);
      expect(result.anomalyType).toBe('SUSPICIOUS_BULK_EXFILTRATION');
      expect(result.anomalyId).toBeDefined();
      expect(result.description).toContain('ML Anomaly Score:');
    });

    it('flags out-of-scope field officer bulk requests', () => {
      const result = evaluateAccessEvent('field_agent@inuka.kpc.co.ke', 'field_officer', 250, 10);

      expect(result.isOutOfScope).toBe(true);
      expect(result.threatScore).toBeGreaterThanOrEqual(65);
      expect(result.isAnomaly).toBe(true);
    });
  });
});
