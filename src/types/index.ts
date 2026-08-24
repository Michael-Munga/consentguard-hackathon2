export type Pillar = 'Scholarship' | 'Plus' | 'Vocational' | 'Tech';

export type Region =
  | 'Central'
  | 'Coast'
  | 'Eastern'
  | 'Nairobi'
  | 'North Eastern'
  | 'Nyanza'
  | 'Rift Valley'
  | 'Western';

export type County =
  // Central (5)
  | 'Kiambu'
  | 'Kirinyaga'
  | "Murang'a"
  | 'Nyandarua'
  | 'Nyeri'
  // Coast (6)
  | 'Kilifi'
  | 'Kwale'
  | 'Lamu'
  | 'Mombasa'
  | 'Taita-Taveta'
  | 'Tana River'
  // Eastern (8)
  | 'Embu'
  | 'Isiolo'
  | 'Kitui'
  | 'Machakos'
  | 'Makueni'
  | 'Marsabit'
  | 'Meru'
  | 'Tharaka-Nithi'
  // Nairobi (1)
  | 'Nairobi'
  // North Eastern (3)
  | 'Garissa'
  | 'Mandera'
  | 'Wajir'
  // Nyanza (6)
  | 'Homa Bay'
  | 'Kisii'
  | 'Kisumu'
  | 'Migori'
  | 'Nyamira'
  | 'Siaya'
  // Rift Valley (14)
  | 'Baringo'
  | 'Bomet'
  | 'Elgeyo-Marakwet'
  | 'Kajiado'
  | 'Kericho'
  | 'Laikipia'
  | 'Nakuru'
  | 'Nandi'
  | 'Narok'
  | 'Samburu'
  | 'Trans-Nzoia'
  | 'Turkana'
  | 'Uasin Gishu'
  | 'West Pokot'
  // Western (4)
  | 'Bungoma'
  | 'Busia'
  | 'Kakamega'
  | 'Vihiga';

export const REGIONS: Region[] = [
  'Central',
  'Coast',
  'Eastern',
  'Nairobi',
  'North Eastern',
  'Nyanza',
  'Rift Valley',
  'Western',
];

export const COUNTY_TO_REGION: Record<County, Region> = {
  // Central
  Kiambu: 'Central',
  Kirinyaga: 'Central',
  "Murang'a": 'Central',
  Nyandarua: 'Central',
  Nyeri: 'Central',
  // Coast
  Kilifi: 'Coast',
  Kwale: 'Coast',
  Lamu: 'Coast',
  Mombasa: 'Coast',
  'Taita-Taveta': 'Coast',
  'Tana River': 'Coast',
  // Eastern
  Embu: 'Eastern',
  Isiolo: 'Eastern',
  Kitui: 'Eastern',
  Machakos: 'Eastern',
  Makueni: 'Eastern',
  Marsabit: 'Eastern',
  Meru: 'Eastern',
  'Tharaka-Nithi': 'Eastern',
  // Nairobi
  Nairobi: 'Nairobi',
  // North Eastern
  Garissa: 'North Eastern',
  Mandera: 'North Eastern',
  Wajir: 'North Eastern',
  // Nyanza
  'Homa Bay': 'Nyanza',
  Kisii: 'Nyanza',
  Kisumu: 'Nyanza',
  Migori: 'Nyanza',
  Nyamira: 'Nyanza',
  Siaya: 'Nyanza',
  // Rift Valley
  Baringo: 'Rift Valley',
  Bomet: 'Rift Valley',
  'Elgeyo-Marakwet': 'Rift Valley',
  Kajiado: 'Rift Valley',
  Kericho: 'Rift Valley',
  Laikipia: 'Rift Valley',
  Nakuru: 'Rift Valley',
  Nandi: 'Rift Valley',
  Narok: 'Rift Valley',
  Samburu: 'Rift Valley',
  'Trans-Nzoia': 'Rift Valley',
  Turkana: 'Rift Valley',
  'Uasin Gishu': 'Rift Valley',
  'West Pokot': 'Rift Valley',
  // Western
  Bungoma: 'Western',
  Busia: 'Western',
  Kakamega: 'Western',
  Vihiga: 'Western',
};

export const COUNTIES = Object.keys(COUNTY_TO_REGION) as County[];

export type LifecycleStage =
  | 'applied'
  | 'identity_verified'
  | 'consent_requested'
  | 'consent_granted'
  | 'data_processed'
  | 'consent_reviewed';

export type ConsentPurpose =
  | 'donor_reporting'
  | 'internal_analytics'
  | 'third_party_sharing';

export type ConsentStatus =
  | 'requested'
  | 'granted'
  | 'revoked'
  | 'expired';

export type AnomalySeverity = 'low' | 'medium' | 'critical';

export type AnomalyType =
  | 'UNAUTHORIZED_DATA_ACCESS'
  | 'CONSENT_OVERLAP_CONFLICT'
  | 'SKIPPED_IDENTITY_VERIFICATION'
  | 'SKIPPED_CONSENT_REQUEST'
  | 'SKIPPED_CONSENT_GRANT'
  | 'INVALID_STAGE_REGRESSION'
  | 'INCONSISTENT_CONSENT_STATE'
  | 'EXPIRED_CONSENT_ACCESS'
  | 'REVOKED_CONSENT_ACCESS'
  | 'STATISTICAL_OUTLIER_COHORT_RATE';

export interface Beneficiary {
  id: string;
  name: string;
  pillar: Pillar;
  county?: County | string;
  region: Region;
  applied_at: string;
  current_stage: LifecycleStage;
}

export interface ConsentRecord {
  id: string;
  beneficiary_id: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

export interface DataAccessEvent {
  id: string;
  beneficiary_id: string;
  purpose: ConsentPurpose;
  accessed_at: string;
  accessed_by: string;
  was_valid: boolean;
}

export interface LifecycleTransition {
  id: string;
  beneficiary_id: string;
  from_stage: LifecycleStage | null;
  to_stage: LifecycleStage;
  transitioned_at: string;
  is_valid_sequence: boolean;
}

export interface Anomaly {
  id: string;
  beneficiary_id: string;
  anomaly_type: AnomalyType;
  detail: string;
  detected_at: string;
  severity: AnomalySeverity;
  reviewed: boolean;
  beneficiary_name?: string;
  beneficiary_pillar?: Pillar;
  beneficiary_county?: County | string;
  beneficiary_region?: Region;
  description?: string;
  pillar?: Pillar;
  county?: County | string;
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;
}

export type AnomalyEvent = Anomaly;

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  timestamp: string;
  before_state: string | null;
  after_state: string | null;
}

export interface ValidationGateResult {
  gate_name: string;
  passed: boolean;
  evaluated_count: number;
  failure_count: number;
  description: string;
}

export interface ProvenanceReport {
  run_id: string;
  timestamp: string;
  input_event_count: number;
  valid_event_count: number;
  invalid_event_count: number;
  anomalies_detected: number;
  anomalies_by_type: Record<string, number>;
  gates_evaluated: ValidationGateResult[];
  overall_status: 'PASSED' | 'WARNING' | 'CRITICAL_FAIL';
  execution_duration_ms: number;
  environment_hash: string;
}

export interface DashboardStats {
  total_beneficiaries: number;
  active_consents: number;
  unresolved_anomalies: number;
  critical_anomalies: number;
  compliance_rate: number;
  events_processed_today: number;
  anomalies_by_severity: {
    critical: number;
    medium: number;
    low: number;
  };
  consent_by_pillar: Record<Pillar, {
    total: number;
    granted: number;
    requested: number;
    revoked: number;
    expired: number;
    grant_rate: number;
  }>;
  consent_by_region: Record<Region, {
    total: number;
    granted: number;
    grant_rate: number;
  }>;
  pillar_anomaly_rates: Array<{
    pillar: Pillar;
    week: string;
    anomaly_rate: number;
    is_outlier: boolean;
    threshold: number;
  }>;
}

export type StreamEventType =
  | 'BENEFICIARY_APPLIED'
  | 'LIFECYCLE_TRANSITION'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'DATA_ACCESSED'
  | 'UNAUTHORIZED_ACCESS_BLOCKED'
  | 'ANOMALY_FLAGGED'
  | 'ANOMALY_REVIEWED'
  | 'PROVENANCE_REPORT_GENERATED'
  | 'SIMULATION_TICK'
  | 'ETL_PIPELINE_COMPLETED';

export interface StreamEvent {
  id: string;
  type: StreamEventType;
  timestamp: string;
  severity?: AnomalySeverity;
  data: Record<string, any>;
  message: string;
}
