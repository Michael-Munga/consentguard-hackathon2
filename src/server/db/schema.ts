export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS beneficiaries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT,
  pillar TEXT NOT NULL CHECK (pillar IN ('Scholarship', 'Plus', 'Vocational', 'Tech')),
  county TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('Central', 'Coast', 'Eastern', 'Nairobi', 'North Eastern', 'Nyanza', 'Rift Valley', 'Western')),
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('field_officer', 'compliance_officer', 'analyst')),
  pillar_scope TEXT CHECK (pillar_scope IS NULL OR pillar_scope IN ('Scholarship', 'Plus', 'Vocational', 'Tech'))
);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  beneficiary_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('donor_reporting', 'internal_analytics', 'third_party_sharing')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'granted', 'revoked', 'expired')),
  granted_at TEXT,
  revoked_at TEXT,
  expires_at TEXT,
  FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS data_access_events (
  id TEXT PRIMARY KEY,
  beneficiary_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('donor_reporting', 'internal_analytics', 'third_party_sharing')),
  accessed_at TEXT NOT NULL,
  accessed_by TEXT NOT NULL,
  was_valid INTEGER NOT NULL CHECK (was_valid IN (0, 1)),
  FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY,
  beneficiary_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL,
  detail TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'critical')),
  reviewed INTEGER NOT NULL DEFAULT 0 CHECK (reviewed IN (0, 1)),
  reviewed_at TEXT,
  reviewed_by TEXT,
  resolution_notes TEXT,
  FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  before_state TEXT,
  after_state TEXT
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_beneficiaries_pillar ON beneficiaries(pillar);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_county ON beneficiaries(county);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_region ON beneficiaries(region);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_pillar_id ON beneficiaries(pillar, id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_region_id ON beneficiaries(region, id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_consent_beneficiary ON consent_records(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_records(status);
CREATE INDEX IF NOT EXISTS idx_consent_purpose ON consent_records(purpose);
CREATE INDEX IF NOT EXISTS idx_consent_ben_status ON consent_records(beneficiary_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_ben_purpose ON consent_records(beneficiary_id, purpose, status);
CREATE INDEX IF NOT EXISTS idx_consent_purpose_status ON consent_records(purpose, status);
CREATE INDEX IF NOT EXISTS idx_data_access_ben ON data_access_events(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_data_access_time ON data_access_events(accessed_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_ben ON anomalies(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_reviewed ON anomalies(reviewed);
CREATE INDEX IF NOT EXISTS idx_anomalies_reviewed_sev ON anomalies(reviewed, severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_ben_time ON anomalies(beneficiary_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp);
`;

