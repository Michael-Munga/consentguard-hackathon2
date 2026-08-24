import { DbRepository, getDatabase } from '../db/database.js';
import { sseManager } from '../api/sse.js';
import {
  validateLifecycleTransition,
  validateDataAccessEvent,
  detectConsentConflict,
} from './validator.js';
import type {
  Beneficiary,
  ConsentRecord,
  DataAccessEvent,
  LifecycleTransition,
  Anomaly,
  Pillar,
  Region,
  County,
  LifecycleStage,
  ConsentPurpose,
  StreamEvent,
} from '../../types/index.js';
import { COUNTIES, COUNTY_TO_REGION, REGIONS } from '../../types/index.js';

const FIRST_NAMES = [
  'Kiprono', 'Wanjiru', 'Otieno', 'Achieng', 'Mutua', 'Chebet', 'Kariuki', 'Nekesa', 'Moraa', 'Koech',
  'Faith', 'Brian', 'Mercy', 'Dennis', 'Joyce', 'Emmanuel', 'Brenda', 'Sharon', 'Collins', 'Winnie',
  'Evans', 'Esther', 'Samuel', 'Cynthia', 'Daniel', 'Beatrice', 'Kennedy', 'Maureen', 'Anthony', 'Lilian',
  'Hassan', 'Fatuma', 'Abdi', 'Amina', 'Farah', 'Halima', 'Salim', 'Mwanaisha', 'Juma', 'Khadija'
];
const LAST_NAMES = [
  'Kamau', 'Ouma', 'Cheruiyot', 'Mwangi', 'Odhiambo', 'Wekesa', 'Kipchoge', 'Nyaboke', 'Juma', 'Kurgat',
  'Mutua', 'Achieng', 'Njoroge', 'Chepkemoi', 'Wafula', 'Maina', 'Kiplagat', 'Wambui', 'Kiprono', 'Barasa',
  'Nyambura', 'Ombati', 'Koech', 'Muthoni', "Ndung'u", 'Adhiambo', 'Rotich', 'Kariuki', 'Kiptoo', 'Makori',
  'Mohamed', 'Omar', 'Ali', 'Hussein', 'Bakari', 'Mwinyi', 'Abdalla', 'Abdirahman', 'Said', 'Khamis'
];
const PILLARS: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
const PURPOSES: ConsentPurpose[] = ['donor_reporting', 'internal_analytics', 'third_party_sharing'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class RealtimeEventSimulator {
  private repo: DbRepository;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 2500; // 2.5 seconds per event
  private totalEventsSimulated = 0;
  private anomaliesSimulated = 0;
  private eventTickCounter = 0;
  private lastBackgroundAnomalyTime = Date.now();
  private anomalyIntervalMs = 45000; // 45 seconds

  constructor(repo?: DbRepository) {
    this.repo = repo || new DbRepository(getDatabase());
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      totalEventsSimulated: this.totalEventsSimulated,
      anomaliesSimulated: this.anomaliesSimulated,
      activeClients: sseManager.getClientCount(),
    };
  }

  setIntervalMs(ms: number): void {
    this.intervalMs = Math.max(1000, Math.min(10000, ms));
    if (this.isRunning) {
      this.pause();
      this.start();
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastBackgroundAnomalyTime = Date.now();
    console.log(`[Simulator] Real-time event fabric streaming started (interval: ${this.intervalMs}ms, anomaly cycle: 45s)`);
    this.scheduleNextTick();
  }

  pause(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[Simulator] Real-time event generator paused');
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    // Slight jitter around interval (±400ms) for realistic streaming feel
    const delay = Math.max(800, this.intervalMs + randomInt(-400, 400));
    this.timer = setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, delay);
  }

  private tick(): void {
    this.totalEventsSimulated++;
    this.eventTickCounter++;

    // Check if 45 seconds have elapsed since last background anomaly
    const now = Date.now();
    if (now - this.lastBackgroundAnomalyTime >= this.anomalyIntervalMs) {
      this.lastBackgroundAnomalyTime = now;
      this.simulateBackgroundAnomaly();
      return;
    }

    const roll = Math.random();
    if (roll < 0.25) {
      this.simulateNewBeneficiaryApplication();
    } else if (roll < 0.50) {
      this.simulateLifecycleProgression();
    } else if (roll < 0.75) {
      this.simulateConsentGrant();
    } else {
      this.simulateLegitimateDataAccess();
    }
  }

  // Periodic 45-second background anomaly simulation
  simulateBackgroundAnomaly(): void {
    const actors = [
      'external_auditor_crawler@unauthorized-partner.org',
      'unauthorized_donor_bot@external-analytics.ke',
      'third_party_scraper@unverified-gateway.net',
      'unregistered_researcher@external.ac.ke'
    ];
    const chosenActor = randomChoice(actors);
    this.simulateUnauthorizedAccess(chosenActor);
  }

  // 1. Simulate New Beneficiary Application
  simulateNewBeneficiaryApplication(): Beneficiary {
    const timestamp = new Date().toISOString();
    const id = `BEN-LIVE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
    const pillar = randomChoice(PILLARS);
    const county = randomChoice(COUNTIES);
    const region = COUNTY_TO_REGION[county];

    const ben: Beneficiary = {
      id,
      name,
      pillar,
      county,
      region,
      applied_at: timestamp,
      current_stage: 'applied',
    };

    this.repo.insertBeneficiary(ben);

    // Initial transition null -> applied
    const trans: LifecycleTransition = {
      id: `TR-${id}-0`,
      beneficiary_id: id,
      from_stage: null,
      to_stage: 'applied',
      transitioned_at: timestamp,
      is_valid_sequence: true,
    };
    this.repo.insertLifecycleTransition(trans);

    // Audit log
    this.repo.insertAuditLog({
      id: `AUD-${id}-INIT`,
      entity_type: 'beneficiary',
      entity_id: id,
      action: 'LIVE_APPLICATION_RECEIVED',
      actor: 'portal_public_gateway',
      timestamp,
      before_state: null,
      after_state: JSON.stringify(ben),
    });

    const streamEvent: StreamEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'BENEFICIARY_APPLIED',
      timestamp,
      severity: 'low',
      data: { beneficiary: ben },
      message: `New digital application registered: ${name} (${pillar} Pillar, ${region})`,
    };

    sseManager.broadcast(streamEvent);
    return ben;
  }

  // 2. Simulate Lifecycle Progression
  simulateLifecycleProgression(): void {
    const beneficiaries = this.repo.getAllBeneficiaries();
    if (beneficiaries.length === 0) return;

    // Find beneficiaries eligible to move forward
    const candidates = beneficiaries.filter(
      b => b.current_stage !== 'consent_reviewed' && b.current_stage !== 'data_processed'
    );
    if (candidates.length === 0) return;

    const ben = randomChoice(candidates);
    const stages: LifecycleStage[] = [
      'applied',
      'identity_verified',
      'consent_requested',
      'consent_granted',
      'data_processed',
      'consent_reviewed',
    ];
    const currentIdx = stages.indexOf(ben.current_stage);
    if (currentIdx === -1 || currentIdx >= stages.length - 1) return;

    const nextStage = stages[currentIdx + 1];
    const timestamp = new Date().toISOString();

    // Validate inline!
    const validation = validateLifecycleTransition(ben.current_stage, nextStage);

    const trans: LifecycleTransition = {
      id: `TR-${ben.id}-${Date.now()}`,
      beneficiary_id: ben.id,
      from_stage: ben.current_stage,
      to_stage: nextStage,
      transitioned_at: timestamp,
      is_valid_sequence: validation.isValid,
    };

    this.repo.insertLifecycleTransition(trans);
    this.repo.updateBeneficiaryStage(ben.id, nextStage);

    this.repo.insertAuditLog({
      id: `AUD-${ben.id}-TRANS-${Date.now()}`,
      entity_type: 'beneficiary',
      entity_id: ben.id,
      action: 'LIFECYCLE_MILESTONE_ADVANCE',
      actor: 'workflow_coordinator',
      timestamp,
      before_state: JSON.stringify({ stage: ben.current_stage }),
      after_state: JSON.stringify({ stage: nextStage }),
    });

    const streamEvent: StreamEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'LIFECYCLE_TRANSITION',
      timestamp,
      severity: 'low',
      data: {
        beneficiary_id: ben.id,
        beneficiary_name: ben.name,
        from_stage: ben.current_stage,
        to_stage: nextStage,
      },
      message: `Beneficiary ${ben.name} advanced: ${ben.current_stage} ➔ ${nextStage}`,
    };

    sseManager.broadcast(streamEvent);
  }

  // 3. Simulate Consent Grant
  simulateConsentGrant(): void {
    const beneficiaries = this.repo.getAllBeneficiaries();
    if (beneficiaries.length === 0) return;

    const candidates = beneficiaries.filter(
      b => b.current_stage === 'consent_requested' || b.current_stage === 'consent_granted'
    );
    if (candidates.length === 0) return;

    const ben = randomChoice(candidates);
    const existingConsents = this.repo.getConsentsForBeneficiary(ben.id);
    const grantedPurposes = new Set(existingConsents.filter(c => c.status === 'granted').map(c => c.purpose));
    const availablePurposes = PURPOSES.filter(p => !grantedPurposes.has(p));
    if (availablePurposes.length === 0) return;

    const purpose = randomChoice(availablePurposes);
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();

    const newConsent: ConsentRecord = {
      id: `CR-${ben.id}-${purpose.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      beneficiary_id: ben.id,
      purpose,
      status: 'granted',
      granted_at: timestamp,
      revoked_at: null,
      expires_at: expiresAt,
    };

    // Check entity conflict
    const conflictResult = detectConsentConflict(existingConsents, newConsent);

    this.repo.insertConsentRecord(newConsent);

    if (conflictResult.hasConflict && conflictResult.anomaly) {
      const anom: Anomaly = {
        id: `ANOM-${Date.now()}`,
        beneficiary_id: ben.id,
        anomaly_type: conflictResult.anomaly.type,
        detail: conflictResult.anomaly.detail,
        detected_at: timestamp,
        severity: conflictResult.anomaly.severity,
        reviewed: false,
      };
      this.repo.insertAnomaly(anom);
      this.anomaliesSimulated++;

      sseManager.broadcast({
        id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'ANOMALY_FLAGGED',
        timestamp,
        severity: 'medium',
        data: { anomaly: anom, beneficiary: ben },
        message: `Entity Conflict Caught: Multiple overlapping consents for ${ben.name} (${purpose})`,
      });
      return;
    }

    this.repo.insertAuditLog({
      id: `AUD-CONSENT-${newConsent.id}`,
      entity_type: 'consent_record',
      entity_id: newConsent.id,
      action: 'DIGITAL_CONSENT_GRANTED',
      actor: 'beneficiary_sms_otp_portal',
      timestamp,
      before_state: null,
      after_state: JSON.stringify(newConsent),
    });

    sseManager.broadcast({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'CONSENT_GRANTED',
      timestamp,
      severity: 'low',
      data: { consent: newConsent, beneficiary: ben },
      message: `Digital Consent Granted: ${ben.name} authorized '${purpose}'`,
    });
  }

  // 4. Simulate Legitimate Data Access
  simulateLegitimateDataAccess(): void {
    const beneficiaries = this.repo.getAllBeneficiaries();
    if (beneficiaries.length === 0) return;

    // Find beneficiaries with granted consents
    const allConsents = this.repo.getAllConsents().filter(c => c.status === 'granted' && c.granted_at);
    if (allConsents.length === 0) return;

    const chosenConsent = randomChoice(allConsents);
    const ben = this.repo.getBeneficiaryById(chosenConsent.beneficiary_id);
    if (!ben) return;

    const timestamp = new Date().toISOString();
    const actor = randomChoice(['donor_reporting_pipeline', 'inuka_mne_analyst', 'scholarship_auditor']);

    const accessEvent: DataAccessEvent = {
      id: `DA-LIVE-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      beneficiary_id: ben.id,
      purpose: chosenConsent.purpose,
      accessed_at: timestamp,
      accessed_by: actor,
      was_valid: true,
    };

    // Synchronously validate write-time authorization
    const benConsents = this.repo.getConsentsForBeneficiary(ben.id);
    const authResult = validateDataAccessEvent(accessEvent, benConsents);

    accessEvent.was_valid = authResult.isValid;
    this.repo.insertDataAccessEvent(accessEvent);

    sseManager.broadcast({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'DATA_ACCESSED',
      timestamp,
      severity: 'low',
      data: { access_event: accessEvent, beneficiary: ben },
      message: `Authorized Data Access: ${actor} processed records for ${ben.name} (${chosenConsent.purpose}) [KDPA Verified]`,
    });
  }

  // ==========================================================================
  // CORE DEMO TRIGGER: SIMULATE UNAUTHORIZED ACCESS ATTEMPT
  // This is triggered manually via the dashboard "Simulate Invalid Access Attempt"
  // button or periodically by the generator.
  // ==========================================================================
  simulateUnauthorizedAccess(actorName = 'unauthorized_external_exporter'): {
    event: DataAccessEvent;
    anomaly: Anomaly;
    beneficiary: Beneficiary;
  } {
    const beneficiaries = this.repo.getAllBeneficiaries();
    let targetBen: Beneficiary;

    if (beneficiaries.length === 0) {
      targetBen = this.simulateNewBeneficiaryApplication();
    } else {
      // Pick a beneficiary
      targetBen = randomChoice(beneficiaries);
    }

    const timestamp = new Date().toISOString();
    // Use third_party_sharing or donor_reporting
    const targetPurpose: ConsentPurpose = 'third_party_sharing';

    // Retrieve active consents for this beneficiary
    const benConsents = this.repo.getConsentsForBeneficiary(targetBen.id);

    const accessEvent: DataAccessEvent = {
      id: `DA-ATTEMPT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      beneficiary_id: targetBen.id,
      purpose: targetPurpose,
      accessed_at: timestamp,
      accessed_by: actorName,
      was_valid: false, // will be evaluated by write-time validator
    };

    // 1. INLINE SYNCHRONOUS VALIDATION AT WRITE TIME
    const authResult = validateDataAccessEvent(accessEvent, benConsents);
    accessEvent.was_valid = authResult.isValid;

    // Persist access event
    this.repo.insertDataAccessEvent(accessEvent);

    // 2. IF UNAUTHORIZED, WRITE CRITICAL ANOMALY & LOG IMMEDIATELY
    let anomaly: Anomaly;

    if (!authResult.isValid && authResult.anomaly) {
      anomaly = {
        id: `ANOM-LIVE-${Date.now()}`,
        beneficiary_id: targetBen.id,
        anomaly_type: authResult.anomaly.type,
        detail: authResult.anomaly.detail,
        detected_at: timestamp,
        severity: authResult.anomaly.severity,
        reviewed: false,
        beneficiary_name: targetBen.name,
        beneficiary_pillar: targetBen.pillar,
        beneficiary_county: targetBen.county,
        beneficiary_region: targetBen.region,
      };
    } else {
      // Force unauthorized scenario if beneficiary happened to have granted consent
      anomaly = {
        id: `ANOM-LIVE-${Date.now()}`,
        beneficiary_id: targetBen.id,
        anomaly_type: 'UNAUTHORIZED_DATA_ACCESS',
        detail: `KDPA Compliance Breach: Actor '${actorName}' attempted unauthorized export for '${targetPurpose}' with no active authorization on record.`,
        detected_at: timestamp,
        severity: 'critical',
        reviewed: false,
        beneficiary_name: targetBen.name,
        beneficiary_pillar: targetBen.pillar,
        beneficiary_county: targetBen.county,
        beneficiary_region: targetBen.region,
      };
      accessEvent.was_valid = false;
    }

    this.repo.insertAnomaly(anomaly);
    this.anomaliesSimulated++;

    // Write to audit log
    this.repo.insertAuditLog({
      id: `AUD-CRIT-${anomaly.id}`,
      entity_type: 'data_access_breach',
      entity_id: accessEvent.id,
      action: 'UNAUTHORIZED_ACCESS_BLOCKED',
      actor: 'ConsentGuard_WriteTime_Enforcer',
      timestamp,
      before_state: JSON.stringify({ attempted_by: actorName, target_purpose: targetPurpose }),
      after_state: JSON.stringify({ action: 'BLOCKED_AND_FLAGGED', anomaly_id: anomaly.id }),
    });

    // 3. BROADCAST REAL-TIME HIGH PRIORITY ALERT OVER SSE
    const alertStreamEvent: StreamEvent = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'UNAUTHORIZED_ACCESS_BLOCKED',
      timestamp,
      severity: 'critical',
      data: {
        access_event: accessEvent,
        anomaly,
        beneficiary: targetBen,
      },
      message: `CRITICAL KDPA BREACH CAUGHT: Data access without valid consent by '${actorName}' for beneficiary ${targetBen.name} (${targetBen.pillar} Pillar)`,
    };

    sseManager.broadcast(alertStreamEvent);
    console.log(`[Simulator] Broadcasted critical unauthorized access alert for ${targetBen.name}`);

    return {
      event: accessEvent,
      anomaly,
      beneficiary: targetBen,
    };
  }
}

export const simulator = new RealtimeEventSimulator();
