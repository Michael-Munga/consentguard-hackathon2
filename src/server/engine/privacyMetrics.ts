import { DbRepository, getDatabase } from '../db/database.js';
import type { Pillar, Region, PrivacyAssessment, CohortRiskInfo } from '../../types/index.js';
import { REGIONS, COUNTY_TO_REGION } from '../../types/index.js';

/**
 * Real-time demographic Linkage Risk and k-Anonymity Evaluator
 * Evaluates demographic density on quasi-identifiers: (pillar, county)
 */
export function evaluateCohortRisk(pillarFilter?: string): PrivacyAssessment {
  const repo = new DbRepository(getDatabase());
  const allBeneficiaries = repo.getAllBeneficiaries();

  // Filter by pillar if specified and not 'ALL'
  const beneficiaries = (pillarFilter && pillarFilter !== 'ALL')
    ? allBeneficiaries.filter(b => b.pillar.toLowerCase() === pillarFilter.toLowerCase())
    : allBeneficiaries;

  // Group by (pillar, county)
  const cohortCounts: Record<string, { pillar: string; county: string; count: number }> = {};

  for (const b of beneficiaries) {
    const p = b.pillar || 'Unknown';
    const c = b.county || 'Unassigned';
    const key = `${p}_${c}`;

    if (!cohortCounts[key]) {
      cohortCounts[key] = { pillar: p, county: c, count: 0 };
    }
    cohortCounts[key].count += 1;
  }

  let totalRecords = beneficiaries.length;
  let safeRecords = 0;
  let unprotectedRecords = 0;
  const vulnerableCohorts: CohortRiskInfo[] = [];
  const cohortMap: Record<string, { count: number; riskType: 'k=1' | 'k=2' | 'k>=3' }> = {};

  for (const [key, cohort] of Object.entries(cohortCounts)) {
    let riskType: 'k=1' | 'k=2' | 'k>=3';
    if (cohort.count === 1) {
      riskType = 'k=1';
      unprotectedRecords += cohort.count;
      vulnerableCohorts.push({
        pillar: cohort.pillar,
        county: cohort.county,
        count: cohort.count,
        riskType: 'k=1',
      });
    } else if (cohort.count === 2) {
      riskType = 'k=2';
      unprotectedRecords += cohort.count;
      vulnerableCohorts.push({
        pillar: cohort.pillar,
        county: cohort.county,
        count: cohort.count,
        riskType: 'k=2',
      });
    } else {
      riskType = 'k>=3';
      safeRecords += cohort.count;
    }

    cohortMap[key] = {
      count: cohort.count,
      riskType,
    };
  }

  // Sort vulnerable cohorts (k=1 first, then k=2, then alphabetical)
  vulnerableCohorts.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    return a.county.localeCompare(b.county);
  });

  const kAnonymityScore = totalRecords > 0
    ? Number(((safeRecords / totalRecords) * 100).toFixed(1))
    : 100.0;

  let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (kAnonymityScore < 80) {
    riskTier = 'HIGH';
  } else if (kAnonymityScore < 95) {
    riskTier = 'MEDIUM';
  }

  // Pillar breakdown
  const pillars: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
  const pillarBreakdown: Record<string, {
    totalRecords: number;
    safeRecords: number;
    kAnonymityScore: number;
    riskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  }> = {};

  for (const pil of pillars) {
    const pilBens = allBeneficiaries.filter(b => b.pillar === pil);
    let pSafe = 0;
    for (const b of pilBens) {
      const key = `${b.pillar}_${b.county || 'Unassigned'}`;
      if (cohortMap[key]?.riskType === 'k>=3') {
        pSafe += 1;
      }
    }
    const pTotal = pilBens.length;
    const pScore = pTotal > 0 ? Number(((pSafe / pTotal) * 100).toFixed(1)) : 100.0;
    const pTier: 'LOW' | 'MEDIUM' | 'HIGH' = pScore >= 95 ? 'LOW' : pScore >= 80 ? 'MEDIUM' : 'HIGH';

    pillarBreakdown[pil] = {
      totalRecords: pTotal,
      safeRecords: pSafe,
      kAnonymityScore: pScore,
      riskTier: pTier,
    };
  }

  // Regional privacy distribution
  const regionalPrivacyDistribution = REGIONS.map((reg) => {
    const regBens = allBeneficiaries.filter(b => b.region === reg);
    let rSafe = 0;
    for (const b of regBens) {
      const key = `${b.pillar}_${b.county || 'Unassigned'}`;
      if (cohortMap[key]?.riskType === 'k>=3') {
        rSafe += 1;
      }
    }
    const rTotal = regBens.length;
    const safePercent = rTotal > 0 ? Number(((rSafe / rTotal) * 100).toFixed(1)) : 100.0;

    return {
      region: reg,
      totalRecords: rTotal,
      safeScore: rSafe,
      kSafePercentage: safePercent,
    };
  });

  return {
    kAnonymityScore,
    totalRecords,
    unprotectedRecords,
    safeRecords,
    riskTier,
    vulnerableCohorts,
    cohortMap,
    pillarBreakdown,
    regionalPrivacyDistribution,
  };
}
