import Database from 'better-sqlite3';
import { getDatabase, closeDatabase, DbRepository } from './database.js';
import type {
  Beneficiary,
  ConsentRecord,
  DataAccessEvent,
  LifecycleTransition,
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  AuditLog,
  Pillar,
  Region,
  County,
  LifecycleStage,
  ConsentPurpose,
} from '../../types/index.js';
import { COUNTIES, COUNTY_TO_REGION, REGIONS } from '../../types/index.js';
import {
  validateLifecycleTransition,
  validateDataAccessEvent,
  detectConsentConflict,
  validateConsentRecordIntegrity,
} from '../engine/validator.js';

const FIRST_NAMES = [
  'Brian', 'Faith', 'Kevin', 'Mercy', 'Emmanuel', 'Brenda', 'Dennis', 'Joyce',
  'Victor', 'Sharon', 'Collins', 'Winnie', 'Evans', 'Esther', 'Peter', 'Grace',
  'Samuel', 'Cynthia', 'Daniel', 'Beatrice', 'Kennedy', 'Maureen', 'Anthony', 'Lilian',
  'Stephen', 'Jackline', 'Joseph', 'Caroline', 'Patrick', 'Vivian', 'Kelvin', 'Peris',
  'Boniface', 'Diana', 'Erick', 'Damaris', 'Allan', 'Rosemary', 'Gideon', 'Purity',
  'Hassan', 'Fatuma', 'Abdi', 'Amina', 'Farah', 'Halima', 'Salim', 'Mwanaisha', 'Juma', 'Khadija',
  'Lemayian', 'Naisula', 'Saitoti', 'Sanayian', 'Senteu', 'Nashipae', 'Leshan', 'Resian',
  'Ekitela', 'Lokidor', 'Akiru', 'Nangiro', 'Lomechu', 'Amuron', 'Ekeno', 'Apeyon',
  'Kiprono', 'Chebet', 'Kipchoge', 'Cherono', 'Koech', 'Chepkirui', 'Kiplagat', 'Jepkemoi',
  'Otieno', 'Achieng', 'Ochieng', 'Akoth', 'Odhiambo', 'Atieno', 'Onyango', 'Adhiambo',
  'Mwangi', 'Wanjiru', 'Maina', 'Wambui', 'Kariuki', 'Njeri', 'Njoroge', 'Nyambura',
  'Wafula', 'Nekesa', 'Simiyu', 'Nasimiyu', 'Wekesa', 'Nafula', 'Barasa', 'Nanjala',
  'Mutua', 'Kavata', 'Mutiso', 'Mumbua', 'Musyoka', 'Mwende', 'Kioko', 'Syombua',
  'Moraa', 'Nyaboke', 'Omwamba', 'Kwamboka', 'Mogaka', 'Kerubo', 'Makori', 'Bikundo',
  'Murithi', 'Makena', 'Mwirigi', 'Kagwiria', 'Kirimi', 'Nkatha', 'Kinoti', 'Gakii'
];

const LAST_NAMES = [
  'Ochieng', 'Mwangi', 'Wanjiku', 'Kipchumba', 'Nekesa', 'Otieno', 'Kamau', 'Cherono',
  'Mutua', 'Achieng', 'Njoroge', 'Chepkemoi', 'Wafula', 'Odhiambo', 'Maina', 'Kiplagat',
  'Wambui', 'Kiprono', 'Barasa', 'Nyambura', 'Ombati', 'Koech', 'Muthoni', "Ndung'u",
  'Juma', 'Adhiambo', 'Rotich', 'Kariuki', 'Kiptoo', 'Makori', 'Kurgat', 'Githinji',
  'Mohamed', 'Omar', 'Ali', 'Hussein', 'Bakari', 'Mwinyi', 'Abdalla', 'Abdirahman', 'Said', 'Khamis',
  'Ole Sankale', 'Syril', 'Kanyinke', 'Entito', 'Loontubu', 'Nkatha', 'Ntimama', 'Sironka',
  'Ekal', 'Ereng', 'Lokeris', 'Lokuruka', 'Ebei', 'Akiru', 'Nakure', 'Ekai',
  'Cheruiyot', 'Ruto', 'Koech', 'Bett', 'Kigen', 'Korir', 'Tanui', 'Kurgat',
  'Onyango', 'Okoth', 'Ouma', 'Omondi', 'Ogola', 'Owino', 'Okeyo', 'Ayot',
  'Karanja', 'Gathoni', 'Kimani', 'Waweru', 'Macharia', 'Wagura', 'Kinyua', 'Murage',
  'Wanyonyi', 'Shikuku', 'Khisa', 'Masinde', 'Kundu', 'Were', 'Namwamba', 'Luyali',
  'Musyoki', 'Kyalo', 'Muli', 'Mutisya', 'Nzomo', 'Kaloki', 'Mbithi', 'Mueni',
  'Kemunto', 'Mogere', 'Osoro', 'Ondieki', 'Gichana', 'Bosire', 'Mong\'ina', 'Nyamweya',
  'Mugambi', 'Kathambi', 'Micheni', 'Karani', 'Mutegi', 'Gacheri', 'Gitonga', 'Riungu'
];

const PILLARS: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
const PURPOSES: ConsentPurpose[] = ['donor_reporting', 'internal_analytics', 'third_party_sharing'];
const STAFF_ACTORS = [
  'admin@inuka.kpc.co.ke',
  'm.ochieng@inuka.kpc.co.ke',
  'f.wanjiku@inuka.kpc.co.ke',
  'k.kipchumba@inuka.kpc.co.ke',
  'donor_sync_daemon',
  'analytics_pipeline',
  'field_officer_kisumu',
  'field_officer_mombasa',
  'field_officer_garissa',
  'field_officer_nakuru',
  'field_officer_eldoret',
  'field_officer_nyeri',
  'field_officer_machakos',
];

const ANOMALY_TYPES: AnomalyType[] = [
  'SKIPPED_IDENTITY_VERIFICATION',
  'SKIPPED_CONSENT_REQUEST',
  'SKIPPED_CONSENT_GRANT',
  'INVALID_STAGE_REGRESSION',
  'INCONSISTENT_CONSENT_STATE',
  'EXPIRED_CONSENT_ACCESS',
  'REVOKED_CONSENT_ACCESS',
  'UNAUTHORIZED_DATA_ACCESS',
  'CONSENT_OVERLAP_CONFLICT',
  'STATISTICAL_OUTLIER_COHORT_RATE',
];

const ANOMALY_DETAILS: Record<AnomalyType, string> = {
  UNAUTHORIZED_DATA_ACCESS: 'Unauthorized access attempt detected without valid purpose authorization.',
  CONSENT_OVERLAP_CONFLICT: 'Entity Overlap Conflict: Multiple overlapping active consent records identified.',
  SKIPPED_IDENTITY_VERIFICATION: 'Lifecycle Sequence Breach: Transition bypassed mandatory identity verification stage.',
  SKIPPED_CONSENT_REQUEST: 'Lifecycle Warning: Transitioned without required antecedent consent request milestone.',
  SKIPPED_CONSENT_GRANT: 'Data Processing Flag: Milestone transition attempted prior to formal consent grant.',
  INVALID_STAGE_REGRESSION: 'Invalid Stage Regression: Workflow state reverted backwards without authorized override.',
  INCONSISTENT_CONSENT_STATE: 'Data Integrity Alert: Consent record timestamp inconsistent with lifecycle milestone.',
  EXPIRED_CONSENT_ACCESS: 'Retention Policy Alert: Data queried beyond statutory consent expiration window.',
  REVOKED_CONSENT_ACCESS: 'Access Attempt on Revoked Mandate: Query executed after consent was formally revoked.',
  STATISTICAL_OUTLIER_COHORT_RATE: 'Statistical Outlier: Pillar cohort anomaly rate exceeded 2-sigma threshold.',
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d: Date): string {
  return d.toISOString();
}

export function seedDatabase(count = 5200, customDb?: Database.Database): void {
  const db = customDb || getDatabase();
  const repo = new DbRepository(db);

  console.log(`[Seed] Purging existing database tables...`);
  db.exec(`
    DELETE FROM audit_log;
    DELETE FROM anomalies;
    DELETE FROM lifecycle_transitions;
    DELETE FROM data_access_events;
    DELETE FROM consent_records;
    DELETE FROM beneficiaries;
  `);

  console.log(`[Seed] Generating ${count} realistic synthetic beneficiaries across 4 pillars, 47 counties & 8 regions...`);

  const now = new Date();
  const beneficiaries: Beneficiary[] = [];
  const consents: ConsentRecord[] = [];
  const transitions: LifecycleTransition[] = [];
  const accessEvents: DataAccessEvent[] = [];
  const anomalies: Anomaly[] = [];
  const auditLogs: AuditLog[] = [];

  let benIndex = 1;

  for (let i = 0; i < count; i++) {
    const id = `BEN-${String(benIndex++).padStart(5, '0')}`;
    const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
    const pillar = PILLARS[i % PILLARS.length];
    const county = COUNTIES[i % COUNTIES.length];
    const region = COUNTY_TO_REGION[county];

    // Staggered application dates over the past 180 days
    const daysAgo = randomInt(5, 180);
    const appliedDate = new Date(now.getTime() - daysAgo * 86400000);
    const appliedStr = formatDate(appliedDate);

    // Distribution of stages
    // 70% fully progressed (data_processed or consent_reviewed)
    // 30% in-flight (applied, identity_verified, consent_requested, consent_granted)
    const stageRoll = Math.random();
    let currentStage: LifecycleStage = 'data_processed';
    if (stageRoll < 0.08) currentStage = 'applied';
    else if (stageRoll < 0.16) currentStage = 'identity_verified';
    else if (stageRoll < 0.28) currentStage = 'consent_requested';
    else if (stageRoll < 0.45) currentStage = 'consent_granted';
    else if (stageRoll < 0.80) currentStage = 'data_processed';
    else currentStage = 'consent_reviewed';

    const ben: Beneficiary = {
      id,
      name,
      pillar,
      county,
      region,
      applied_at: appliedStr,
      current_stage: currentStage,
    };
    beneficiaries.push(ben);

    // Generate Lifecycle Transitions up to current stage
    const stagesInOrder: LifecycleStage[] = [
      'applied',
      'identity_verified',
      'consent_requested',
      'consent_granted',
      'data_processed',
      'consent_reviewed',
    ];
    const targetIdx = stagesInOrder.indexOf(currentStage);

    let stageTime = new Date(appliedDate);
    for (let s = 0; s <= targetIdx; s++) {
      const toStg = stagesInOrder[s];
      const fromStg = s === 0 ? null : stagesInOrder[s - 1];
      stageTime = new Date(stageTime.getTime() + randomInt(1, 3) * 86400000);

      const transId = `TR-${id}-${s}`;
      const trans: LifecycleTransition = {
        id: transId,
        beneficiary_id: id,
        from_stage: fromStg,
        to_stage: toStg,
        transitioned_at: formatDate(stageTime),
        is_valid_sequence: true,
      };
      transitions.push(trans);
    }

    // Generate Consents if progressed past consent_requested
    if (targetIdx >= 3) {
      for (const purpose of PURPOSES) {
        // Most beneficiaries grant donor_reporting and internal_analytics; 60% grant third_party_sharing
        const shouldGrant = purpose !== 'third_party_sharing' || Math.random() > 0.4;
        const consentId = `CR-${id}-${purpose.substring(0, 3).toUpperCase()}`;

        const grantDate = new Date(appliedDate.getTime() + 4 * 86400000);
        const expireDate = new Date(grantDate.getTime() + 365 * 86400000); // 1 year retention

        const cr: ConsentRecord = {
          id: consentId,
          beneficiary_id: id,
          purpose,
          status: shouldGrant ? 'granted' : 'requested',
          granted_at: shouldGrant ? formatDate(grantDate) : null,
          revoked_at: null,
          expires_at: shouldGrant ? formatDate(expireDate) : null,
        };
        consents.push(cr);
      }
    }

    // Generate legitimate Data Access Events for data_processed/consent_reviewed beneficiaries
    if (targetIdx >= 4) {
      const accessCount = randomInt(1, 4);
      for (let a = 0; a < accessCount; a++) {
        const accessPurpose: ConsentPurpose = Math.random() > 0.3 ? 'donor_reporting' : 'internal_analytics';
        const accessTime = new Date(appliedDate.getTime() + randomInt(6, Math.max(7, daysAgo - 1)) * 86400000);

        const dEvent: DataAccessEvent = {
          id: `DA-${id}-${a + 1}`,
          beneficiary_id: id,
          purpose: accessPurpose,
          accessed_at: formatDate(accessTime),
          accessed_by: randomChoice(STAFF_ACTORS),
          was_valid: true,
        };
        accessEvents.push(dEvent);
      }
    }

    // Audit log entry for creation
    auditLogs.push({
      id: `AUD-${id}-INIT`,
      entity_type: 'beneficiary',
      entity_id: id,
      action: 'ENROLLED_BENEFICIARY',
      actor: 'system_intake@inuka.kpc.co.ke',
      timestamp: appliedStr,
      before_state: null,
      after_state: JSON.stringify(ben),
    });
  }

  // ==========================================================================
  // PRE-SEEDED ANOMALIES (Deliberate 7 Realistic Anomaly Scenarios)
  // Ensures the dashboard, anomaly log, and M&E views are demonstrably populated
  // ==========================================================================
  console.log(`[Seed] Injecting 7 deliberate pre-seeded governance anomalies...`);

  // Anomaly 1: Critical - Unauthorized Access without consent
  const ben1 = beneficiaries[10];
  const anomAccess1: DataAccessEvent = {
    id: `DA-ANOM-001`,
    beneficiary_id: ben1.id,
    purpose: 'third_party_sharing',
    accessed_at: formatDate(new Date(now.getTime() - 2 * 86400000)),
    accessed_by: 'external_auditor@partner.org',
    was_valid: false,
  };
  accessEvents.push(anomAccess1);
  anomalies.push({
    id: `ANOM-001`,
    beneficiary_id: ben1.id,
    anomaly_type: 'UNAUTHORIZED_DATA_ACCESS',
    detail: `KDPA Compliance Breach: External auditor attempted data export for 'third_party_sharing' with no consent granted on file.`,
    detected_at: anomAccess1.accessed_at,
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 2: Critical - Revoked Consent Access Attempt
  const ben2 = beneficiaries[15];
  const revokedConsent: ConsentRecord = {
    id: `CR-REVOKED-002`,
    beneficiary_id: ben2.id,
    purpose: 'donor_reporting',
    status: 'revoked',
    granted_at: formatDate(new Date(now.getTime() - 40 * 86400000)),
    revoked_at: formatDate(new Date(now.getTime() - 10 * 86400000)),
    expires_at: formatDate(new Date(now.getTime() + 300 * 86400000)),
  };
  consents.push(revokedConsent);
  const anomAccess2: DataAccessEvent = {
    id: `DA-ANOM-002`,
    beneficiary_id: ben2.id,
    purpose: 'donor_reporting',
    accessed_at: formatDate(new Date(now.getTime() - 3 * 86400000)), // 7 days after revocation!
    accessed_by: 'donor_sync_daemon',
    was_valid: false,
  };
  accessEvents.push(anomAccess2);
  anomalies.push({
    id: `ANOM-002`,
    beneficiary_id: ben2.id,
    anomaly_type: 'REVOKED_CONSENT_ACCESS',
    detail: `Unauthorized Access Blocked: Automated sync daemon attempted extraction for 'donor_reporting' 7 days after beneficiary formally revoked consent.`,
    detected_at: anomAccess2.accessed_at,
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 3: Critical - Expired Consent Access
  const ben3 = beneficiaries[20];
  const expiredConsent: ConsentRecord = {
    id: `CR-EXPIRED-003`,
    beneficiary_id: ben3.id,
    purpose: 'internal_analytics',
    status: 'expired',
    granted_at: formatDate(new Date(now.getTime() - 400 * 86400000)),
    revoked_at: null,
    expires_at: formatDate(new Date(now.getTime() - 35 * 86400000)), // Expired 35 days ago
  };
  consents.push(expiredConsent);
  const anomAccess3: DataAccessEvent = {
    id: `DA-ANOM-003`,
    beneficiary_id: ben3.id,
    purpose: 'internal_analytics',
    accessed_at: formatDate(new Date(now.getTime() - 5 * 86400000)),
    accessed_by: 'analytics_pipeline',
    was_valid: false,
  };
  accessEvents.push(anomAccess3);
  anomalies.push({
    id: `ANOM-003`,
    beneficiary_id: ben3.id,
    anomaly_type: 'EXPIRED_CONSENT_ACCESS',
    detail: `Data Retention Policy Breach: Analytics pipeline accessed record after statutory 1-year retention window expired.`,
    detected_at: anomAccess3.accessed_at,
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 4: Critical - Entity Consent Overlap Conflict
  const ben4 = beneficiaries[25];
  const conf1: ConsentRecord = {
    id: `CR-CONF-004A`,
    beneficiary_id: ben4.id,
    purpose: 'donor_reporting',
    status: 'granted',
    granted_at: formatDate(new Date(now.getTime() - 60 * 86400000)),
    revoked_at: null,
    expires_at: formatDate(new Date(now.getTime() + 300 * 86400000)),
  };
  const conf2: ConsentRecord = {
    id: `CR-CONF-004B`,
    beneficiary_id: ben4.id,
    purpose: 'donor_reporting',
    status: 'granted',
    granted_at: formatDate(new Date(now.getTime() - 15 * 86400000)),
    revoked_at: null,
    expires_at: formatDate(new Date(now.getTime() + 345 * 86400000)),
  };
  consents.push(conf1, conf2);
  anomalies.push({
    id: `ANOM-004`,
    beneficiary_id: ben4.id,
    anomaly_type: 'CONSENT_OVERLAP_CONFLICT',
    detail: `Entity Overlap Conflict: Beneficiary has two concurrently active 'granted' records for 'donor_reporting' without intervening revocation (mirrors truck journey overlap).`,
    detected_at: conf2.granted_at!,
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 5: Medium - Skipped Identity Verification
  const ben5 = beneficiaries[30];
  transitions.push({
    id: `TR-ANOM-005`,
    beneficiary_id: ben5.id,
    from_stage: 'applied',
    to_stage: 'consent_granted',
    transitioned_at: formatDate(new Date(now.getTime() - 8 * 86400000)),
    is_valid_sequence: false,
  });
  anomalies.push({
    id: `ANOM-005`,
    beneficiary_id: ben5.id,
    anomaly_type: 'SKIPPED_IDENTITY_VERIFICATION',
    detail: `Lifecycle Sequence Breach: Transition jumped from 'applied' directly to 'consent_granted', bypassing mandatory 'identity_verified' KYC checkpoint.`,
    detected_at: formatDate(new Date(now.getTime() - 8 * 86400000)),
    severity: 'medium',
    reviewed: false,
  });

  // Anomaly 6: Critical - Skipped Consent Grant
  const ben6 = beneficiaries[35];
  transitions.push({
    id: `TR-ANOM-006`,
    beneficiary_id: ben6.id,
    from_stage: 'identity_verified',
    to_stage: 'data_processed',
    transitioned_at: formatDate(new Date(now.getTime() - 12 * 86400000)),
    is_valid_sequence: false,
  });
  anomalies.push({
    id: `ANOM-006`,
    beneficiary_id: ben6.id,
    anomaly_type: 'SKIPPED_CONSENT_GRANT',
    detail: `Illegal Data Processing: Beneficiary data entered 'data_processed' stage without recorded digital consent authorization.`,
    detected_at: formatDate(new Date(now.getTime() - 12 * 86400000)),
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 7: Medium - Inconsistent Consent State (Missing Timestamp)
  const ben7 = beneficiaries[40];
  const brokenConsent: ConsentRecord = {
    id: `CR-BROKEN-007`,
    beneficiary_id: ben7.id,
    purpose: 'donor_reporting',
    status: 'granted',
    granted_at: null, // Deliberately missing timestamp to test Flag-Never-Silently-Fix
    revoked_at: null,
    expires_at: null,
  };
  consents.push(brokenConsent);
  anomalies.push({
    id: `ANOM-007`,
    beneficiary_id: ben7.id,
    anomaly_type: 'INCONSISTENT_CONSENT_STATE',
    detail: `Data Integrity Alert: Record marked 'granted' with null timestamp. Flagged and excluded from KPI calculations per 'Flag, never silently fix' policy.`,
    detected_at: formatDate(new Date(now.getTime() - 14 * 86400000)),
    severity: 'medium',
    reviewed: false,
  });

  // ==========================================================================
  // Proportional Background Anomalies (3-6% of all seeded beneficiaries spread across 4 pillars)
  // Distributed across the last 28 days (4 weekly buckets) with 'low' and 'medium' severity
  // ==========================================================================
  console.log(`[Seed] Generating proportional background anomalies across pillars over recent 28 days...`);
  let anomSeq = 8;
  for (const ben of beneficiaries) {
    // Roughly 3-6% selection rate (~4.5%)
    if (Math.random() < 0.045) {
      const anomType = randomChoice(ANOMALY_TYPES);
      const severity: AnomalySeverity = Math.random() > 0.5 ? 'medium' : 'low';
      const daysAgo = randomInt(0, 27);
      const detectedDate = new Date(now.getTime() - daysAgo * 86400000 - randomInt(0, 86399) * 1000);

      anomalies.push({
        id: `ANOM-${String(anomSeq++).padStart(3, '0')}`,
        beneficiary_id: ben.id,
        anomaly_type: anomType,
        detail: ANOMALY_DETAILS[anomType],
        detected_at: formatDate(detectedDate),
        severity,
        reviewed: false,
      });
    }
  }

  // Insert all in transaction
  console.log(`[Seed] Inserting batch into SQLite database...`);
  const insertMany = db.transaction(() => {
    for (const b of beneficiaries) repo.insertBeneficiary(b);
    for (const c of consents) repo.insertConsentRecord(c);
    for (const t of transitions) repo.insertLifecycleTransition(t);
    for (const a of accessEvents) repo.insertDataAccessEvent(a);
    for (const an of anomalies) repo.insertAnomaly(an);
    for (const log of auditLogs) repo.insertAuditLog(log);
  });

  insertMany();

  console.log(`[Seed] Successfully seeded:`);
  console.log(`  - ${beneficiaries.length} Beneficiaries`);
  console.log(`  - ${consents.length} Consent Records`);
  console.log(`  - ${transitions.length} Lifecycle Transitions`);
  console.log(`  - ${accessEvents.length} Data Access Events`);
  console.log(`  - ${anomalies.length} Pre-seeded Governance Anomalies`);
  console.log(`  - ${auditLogs.length} Audit Trail Records`);
}

// Allow direct execution
if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase();
  closeDatabase();
  console.log('[Seed] Database initialization complete.');
}
