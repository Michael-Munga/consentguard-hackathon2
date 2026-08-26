import Database from 'better-sqlite3';
import { getDatabase, closeDatabase, DbRepository } from './database.js';
import { hashPassword } from '../auth/crypto.js';
import type {
  Beneficiary,
  Staff,
  ConsentRecord,
  DataAccessEvent,
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  AuditLog,
  Pillar,
  Region,
  County,
  ConsentPurpose,
} from '../../types/index.js';
import { COUNTIES, COUNTY_TO_REGION, REGIONS } from '../../types/index.js';
import {
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
  'UNAUTHORIZED_DATA_ACCESS',
  'INCONSISTENT_CONSENT_STATE',
  'EXPIRED_CONSENT_ACCESS',
  'REVOKED_CONSENT_ACCESS',
  'AI_BEHAVIORAL_OUTLIER',
  'SUSPICIOUS_BULK_EXFILTRATION',
];

const ANOMALY_DETAILS: Record<AnomalyType, string> = {
  UNAUTHORIZED_DATA_ACCESS: 'Unauthorized access attempt detected without valid purpose authorization.',
  INCONSISTENT_CONSENT_STATE: 'Data Integrity Alert: Consent record timestamp inconsistent with authorized mandate.',
  EXPIRED_CONSENT_ACCESS: 'Retention Policy Alert: Data queried beyond statutory consent expiration window.',
  REVOKED_CONSENT_ACCESS: 'Access Attempt on Revoked Mandate: Query executed after consent was formally revoked.',
  AI_BEHAVIORAL_OUTLIER: 'AI Behavioral Outlier: Statistical anomaly in actor access volume.',
  SUSPICIOUS_BULK_EXFILTRATION: 'Suspicious Bulk Exfiltration: High-volume data export beyond normal threshold.',
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
    DELETE FROM data_access_events;
    DELETE FROM consent_records;
    DELETE FROM staff;
    DELETE FROM beneficiaries;
  `);

  console.log(`[Seed] Seeding staff accounts for all roles...`);
  const defaultStaffPasswordHash = hashPassword('Password123!');
  const staffMembers: Staff[] = [
    {
      id: 'STF-COMP-001',
      name: 'Sarah Jenkins',
      email: 'compliance@inuka.kpc.co.ke',
      password_hash: defaultStaffPasswordHash,
      role: 'compliance_officer',
      pillar_scope: null,
    },
    {
      id: 'STF-COMP-002',
      name: 'Admin Officer',
      email: 'admin@inuka.kpc.co.ke',
      password_hash: defaultStaffPasswordHash,
      role: 'compliance_officer',
      pillar_scope: null,
    },
    {
      id: 'STF-COMP-003',
      name: 'Sarah Jenkins (Gov)',
      email: 's.jenkins@consentguard.gov',
      password_hash: defaultStaffPasswordHash,
      role: 'compliance_officer',
      pillar_scope: null,
    },
    {
      id: 'STF-FLD-001',
      name: 'David Omondi',
      email: 'field.scholarship@inuka.kpc.co.ke',
      password_hash: defaultStaffPasswordHash,
      role: 'field_officer',
      pillar_scope: 'Scholarship',
    },
    {
      id: 'STF-FLD-002',
      name: 'Amina Hassan',
      email: 'field.tech@inuka.kpc.co.ke',
      password_hash: defaultStaffPasswordHash,
      role: 'field_officer',
      pillar_scope: 'Tech',
    },
    {
      id: 'STF-FLD-003',
      name: 'Field Officer General',
      email: 'field@inuka.kpc.co.ke',
      password_hash: defaultStaffPasswordHash,
      role: 'field_officer',
      pillar_scope: 'Scholarship',
    },
    {
      id: 'STF-ANL-001',
      name: 'Dr. Kevin Kiprono',
      email: 'analyst@inuka.kpc.co.ke',
      password_hash: defaultStaffPasswordHash,
      role: 'analyst',
      pillar_scope: null,
    },
  ];

  for (const s of staffMembers) {
    repo.insertStaff(s);
  }

  console.log(`[Seed] Generating ${count} realistic synthetic beneficiaries across 4 pillars, 47 counties & 8 regions...`);

  const now = new Date();
  const beneficiaries: Beneficiary[] = [];
  const consents: ConsentRecord[] = [];
  const accessEvents: DataAccessEvent[] = [];
  const anomalies: Anomaly[] = [];
  const auditLogs: AuditLog[] = [];

  const defaultBeneficiaryPasswordHash = hashPassword('Passphrase123!');

  // Primary Demo Beneficiary matching Stitch UI design: Faith Kamau (INK-84920)
  const demoAppliedDate = new Date(now.getTime() - 45 * 86400000);
  const demoAppliedStr = formatDate(demoAppliedDate);
  const demoBen: Beneficiary = {
    id: 'INK-84920',
    name: 'Faith Kamau',
    email: 'faith.kamau@inuka.ke',
    password_hash: defaultBeneficiaryPasswordHash,
    pillar: 'Scholarship',
    county: 'Nairobi',
    region: 'Nairobi',
    applied_at: demoAppliedStr,
  };
  beneficiaries.push(demoBen);

  // Consents for Faith Kamau: donor_reporting (granted), internal_analytics (granted), third_party_sharing (revoked)
  consents.push(
    {
      id: 'CR-INK-84920-DON',
      beneficiary_id: 'INK-84920',
      purpose: 'donor_reporting',
      status: 'granted',
      granted_at: formatDate(new Date(demoAppliedDate.getTime() + 2 * 86400000)),
      revoked_at: null,
      expires_at: formatDate(new Date(demoAppliedDate.getTime() + 367 * 86400000)),
    },
    {
      id: 'CR-INK-84920-INT',
      beneficiary_id: 'INK-84920',
      purpose: 'internal_analytics',
      status: 'granted',
      granted_at: formatDate(new Date(demoAppliedDate.getTime() + 2 * 86400000)),
      revoked_at: null,
      expires_at: formatDate(new Date(demoAppliedDate.getTime() + 367 * 86400000)),
    },
    {
      id: 'CR-INK-84920-THI',
      beneficiary_id: 'INK-84920',
      purpose: 'third_party_sharing',
      status: 'revoked',
      granted_at: formatDate(new Date(demoAppliedDate.getTime() + 2 * 86400000)),
      revoked_at: formatDate(new Date(now.getTime() - 5 * 86400000)),
      expires_at: formatDate(new Date(demoAppliedDate.getTime() + 367 * 86400000)),
    }
  );

  accessEvents.push({
    id: 'DA-INK-84920-1',
    beneficiary_id: 'INK-84920',
    purpose: 'donor_reporting',
    accessed_at: formatDate(new Date(now.getTime() - 10 * 86400000)),
    accessed_by: 'inuka_scholarship_auditor',
    was_valid: true,
  });

  auditLogs.push(
    {
      id: 'AUD-INK-84920-INIT',
      entity_type: 'beneficiary',
      entity_id: 'INK-84920',
      action: 'ENROLLED_BENEFICIARY',
      actor: 'system_intake@inuka.kpc.co.ke',
      timestamp: demoAppliedStr,
      before_state: null,
      after_state: JSON.stringify(demoBen),
    },
    {
      id: 'AUD-INK-84920-REVOKE',
      entity_type: 'consent_record',
      entity_id: 'CR-INK-84920-THI',
      action: 'DIGITAL_CONSENT_REVOKED',
      actor: 'INK-84920',
      timestamp: formatDate(new Date(now.getTime() - 5 * 86400000)),
      before_state: JSON.stringify({ purpose: 'third_party_sharing', status: 'granted' }),
      after_state: JSON.stringify({ purpose: 'third_party_sharing', status: 'revoked' }),
    }
  );

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

    // Realistic consent state distribution:
    // 75% granted across all purposes
    // 15% mixed (some granted, some revoked)
    // 10% requested but pending
    const profileRoll = Math.random();
    const benConsents: ConsentRecord[] = [];
    const benAccessEvents: DataAccessEvent[] = [];
    const benAnomalies: Anomaly[] = [];

    for (const purpose of PURPOSES) {
      const consentId = `CR-${id}-${purpose.substring(0, 3).toUpperCase()}`;

      if (profileRoll < 0.75) {
        // Fully granted
        const grantDelay = randomInt(1, 4);
        const grantDate = new Date(appliedDate.getTime() + grantDelay * 86400000);
        const expireDate = new Date(grantDate.getTime() + 365 * 86400000);

        benConsents.push({
          id: consentId,
          beneficiary_id: id,
          purpose,
          status: 'granted',
          granted_at: formatDate(grantDate),
          revoked_at: null,
          expires_at: formatDate(expireDate),
        });

        // Add 1-3 valid access events for active consents
        const numAccess = randomInt(1, 3);
        for (let a = 0; a < numAccess; a++) {
          const accessDays = randomInt(1, Math.max(1, daysAgo - grantDelay));
          const accessDate = new Date(now.getTime() - accessDays * 86400000);
          benAccessEvents.push({
            id: `DA-${id}-${purpose.substring(0, 3).toUpperCase()}-${a + 1}`,
            beneficiary_id: id,
            purpose,
            accessed_at: formatDate(accessDate),
            accessed_by: randomChoice(STAFF_ACTORS),
            was_valid: true,
          });
        }
      } else if (profileRoll < 0.9) {
        // Mixed state
        const isGranted = Math.random() > 0.4;
        const grantDelay = randomInt(1, 4);
        const grantDate = new Date(appliedDate.getTime() + grantDelay * 86400000);
        const expireDate = new Date(grantDate.getTime() + 365 * 86400000);

        if (isGranted) {
          benConsents.push({
            id: consentId,
            beneficiary_id: id,
            purpose,
            status: 'granted',
            granted_at: formatDate(grantDate),
            revoked_at: null,
            expires_at: formatDate(expireDate),
          });
        } else {
          // Revoked
          const revokeDelay = randomInt(5, 30);
          const revokeDate = new Date(grantDate.getTime() + revokeDelay * 86400000);
          benConsents.push({
            id: consentId,
            beneficiary_id: id,
            purpose,
            status: 'revoked',
            granted_at: formatDate(grantDate),
            revoked_at: formatDate(revokeDate),
            expires_at: formatDate(expireDate),
          });
        }
      } else {
        // Requested only
        benConsents.push({
          id: consentId,
          beneficiary_id: id,
          purpose,
          status: 'requested',
          granted_at: null,
          revoked_at: null,
          expires_at: null,
        });
      }
    }

    const hasPortalAccess = i < 50;
    const email = hasPortalAccess ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@inuka.ke` : null;
    const passwordHash = hasPortalAccess ? defaultBeneficiaryPasswordHash : null;

    const ben: Beneficiary = {
      id,
      name,
      email,
      password_hash: passwordHash,
      pillar,
      county,
      region,
      applied_at: appliedStr,
    };
    beneficiaries.push(ben);
    consents.push(...benConsents);
    accessEvents.push(...benAccessEvents);
    anomalies.push(...benAnomalies);

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
    granted_at: formatDate(new Date(now.getTime() - 60 * 86400000)),
    revoked_at: formatDate(new Date(now.getTime() - 10 * 86400000)),
    expires_at: formatDate(new Date(now.getTime() + 305 * 86400000)),
  };
  consents.push(revokedConsent);
  const revokedAccess: DataAccessEvent = {
    id: `DA-ANOM-002`,
    beneficiary_id: ben2.id,
    purpose: 'donor_reporting',
    accessed_at: formatDate(new Date(now.getTime() - 3 * 86400000)),
    accessed_by: 'donor_reporting_batch_job',
    was_valid: false,
  };
  accessEvents.push(revokedAccess);
  anomalies.push({
    id: `ANOM-002`,
    beneficiary_id: ben2.id,
    anomaly_type: 'REVOKED_CONSENT_ACCESS',
    detail: `Access Attempt on Revoked Mandate: Query executed after beneficiary formally revoked 'donor_reporting' authorization on ${revokedConsent.revoked_at}.`,
    detected_at: revokedAccess.accessed_at,
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 3: Medium - Expired Consent Access
  const ben3 = beneficiaries[20];
  const expiredConsent: ConsentRecord = {
    id: `CR-EXPIRED-003`,
    beneficiary_id: ben3.id,
    purpose: 'internal_analytics',
    status: 'expired',
    granted_at: formatDate(new Date(now.getTime() - 400 * 86400000)),
    revoked_at: null,
    expires_at: formatDate(new Date(now.getTime() - 35 * 86400000)),
  };
  consents.push(expiredConsent);
  const expiredAccess: DataAccessEvent = {
    id: `DA-ANOM-003`,
    beneficiary_id: ben3.id,
    purpose: 'internal_analytics',
    accessed_at: formatDate(new Date(now.getTime() - 5 * 86400000)),
    accessed_by: 'internal_m_and_e_analyst',
    was_valid: false,
  };
  accessEvents.push(expiredAccess);
  anomalies.push({
    id: `ANOM-003`,
    beneficiary_id: ben3.id,
    anomaly_type: 'EXPIRED_CONSENT_ACCESS',
    detail: `Retention Policy Alert: Data queried for 'internal_analytics' beyond statutory 365-day expiration window. Expired on ${expiredConsent.expires_at}.`,
    detected_at: expiredAccess.accessed_at,
    severity: 'medium',
    reviewed: false,
  });

  // Anomaly 4: Critical - Unauthorized Third-Party Research Access
  const ben4 = beneficiaries[35];
  anomalies.push({
    id: `ANOM-004`,
    beneficiary_id: ben4.id,
    anomaly_type: 'UNAUTHORIZED_DATA_ACCESS',
    detail: `Unauthorized Access Attempt: Beneficiary record queried for external research without valid third-party consent mandate.`,
    detected_at: formatDate(new Date(now.getTime() - 12 * 86400000)),
    severity: 'critical',
    reviewed: false,
  });

  // Anomaly 5: Medium - Inconsistent Consent State (Missing Timestamp)
  const ben5 = beneficiaries[40];
  const brokenConsent: ConsentRecord = {
    id: `CR-BROKEN-005`,
    beneficiary_id: ben5.id,
    purpose: 'donor_reporting',
    status: 'granted',
    granted_at: null,
    revoked_at: null,
    expires_at: null,
  };
  consents.push(brokenConsent);
  anomalies.push({
    id: `ANOM-005`,
    beneficiary_id: ben5.id,
    anomaly_type: 'INCONSISTENT_CONSENT_STATE',
    detail: `Data Integrity Alert: Record marked 'granted' with null timestamp. Flagged and excluded from KPI calculations.`,
    detected_at: formatDate(new Date(now.getTime() - 14 * 86400000)),
    severity: 'medium',
    reviewed: false,
  });

  // ==========================================================================
  // Proportional Background Anomalies (3-6% of all seeded beneficiaries spread across 4 pillars)
  // ==========================================================================
  console.log(`[Seed] Generating proportional background anomalies across pillars over recent 28 days...`);
  let anomSeq = 6;
  for (const ben of beneficiaries) {
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
    for (const a of accessEvents) repo.insertDataAccessEvent(a);
    for (const an of anomalies) repo.insertAnomaly(an);
    for (const log of auditLogs) repo.insertAuditLog(log);
  });

  insertMany();

  console.log(`[Seed] Successfully seeded:`);
  console.log(`  - ${beneficiaries.length} Beneficiaries`);
  console.log(`  - ${consents.length} Consent Records`);
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
