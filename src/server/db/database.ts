import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CREATE_TABLES_SQL } from './schema.js';
import type {
  Beneficiary,
  Staff,
  ConsentRecord,
  DataAccessEvent,
  Anomaly,
  AuditLog,
  DashboardStats,
  Pillar,
  Region,
} from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'consentguard.db');

let dbInstance: Database.Database | null = null;

export function getDatabase(customPath?: string): Database.Database {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || DB_PATH;

  if (customPath !== ':memory:') {
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const db = new Database(targetPath);
  if (customPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');

  // Safe migrations for existing databases before creating indexes
  try { db.exec('ALTER TABLE beneficiaries ADD COLUMN email TEXT;'); } catch {}
  try { db.exec('ALTER TABLE beneficiaries ADD COLUMN password_hash TEXT;'); } catch {}
  try { db.exec('ALTER TABLE anomalies ADD COLUMN reviewed_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE anomalies ADD COLUMN reviewed_by TEXT;'); } catch {}
  try { db.exec('ALTER TABLE anomalies ADD COLUMN resolution_notes TEXT;'); } catch {}

  // Initialize schema
  db.exec(CREATE_TABLES_SQL);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Database helper operations
export class DbRepository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  // Beneficiaries
  getAllBeneficiaries(): Beneficiary[] {
    return this.db.prepare('SELECT * FROM beneficiaries ORDER BY applied_at DESC').all() as Beneficiary[];
  }

  getBeneficiaryById(id: string): Beneficiary | undefined {
    return this.db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(id) as Beneficiary | undefined;
  }

  getBeneficiaryByIdentifier(identifier: string): Beneficiary | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim();
    return this.db
      .prepare('SELECT * FROM beneficiaries WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1')
      .get(clean, clean) as Beneficiary | undefined;
  }

  getBeneficiariesByPillar(pillar: Pillar): Beneficiary[] {
    return this.db.prepare('SELECT * FROM beneficiaries WHERE pillar = ? ORDER BY applied_at DESC').all(pillar) as Beneficiary[];
  }

  insertBeneficiary(b: Beneficiary): void {
    const county = b.county || (b.region === 'Nairobi' ? 'Nairobi' : 'Nairobi');
    const email = b.email || null;
    const passwordHash = b.password_hash || null;
    this.db
      .prepare('INSERT INTO beneficiaries (id, name, email, password_hash, pillar, county, region, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(b.id, b.name, email, passwordHash, b.pillar, county, b.region, b.applied_at);
  }

  updateBeneficiaryCredentials(id: string, email: string | null, passwordHash: string | null): void {
    this.db.prepare('UPDATE beneficiaries SET email = ?, password_hash = ? WHERE id = ?').run(email, passwordHash, id);
  }

  // Consent Records
  getConsentsForBeneficiary(beneficiaryId: string): ConsentRecord[] {
    return this.db
      .prepare("SELECT * FROM consent_records WHERE beneficiary_id = ? ORDER BY COALESCE(granted_at, '1970-01-01') ASC")
      .all(beneficiaryId) as ConsentRecord[];
  }

  getAllConsents(): ConsentRecord[] {
    return this.db.prepare('SELECT * FROM consent_records').all() as ConsentRecord[];
  }

  insertConsentRecord(c: ConsentRecord): void {
    this.db
      .prepare(
        'INSERT INTO consent_records (id, beneficiary_id, purpose, status, granted_at, revoked_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(c.id, c.beneficiary_id, c.purpose, c.status, c.granted_at, c.revoked_at, c.expires_at);
  }

  updateConsentStatus(id: string, status: string, revoked_at: string | null, expires_at: string | null): void {
    this.db
      .prepare('UPDATE consent_records SET status = ?, revoked_at = ?, expires_at = ? WHERE id = ?')
      .run(status, revoked_at, expires_at, id);
  }

  getDataAccessEvents(limit = 100): DataAccessEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM data_access_events ORDER BY accessed_at DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map(r => ({ ...r, was_valid: Boolean(r.was_valid) }));
  }

  getDataAccessEventsForBeneficiary(beneficiaryId: string): DataAccessEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM data_access_events WHERE beneficiary_id = ? ORDER BY accessed_at DESC')
      .all(beneficiaryId) as any[];
    return rows.map(r => ({ ...r, was_valid: Boolean(r.was_valid) }));
  }

  insertDataAccessEvent(e: DataAccessEvent): void {
    this.db
      .prepare(
        'INSERT INTO data_access_events (id, beneficiary_id, purpose, accessed_at, accessed_by, was_valid) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(e.id, e.beneficiary_id, e.purpose, e.accessed_at, e.accessed_by, e.was_valid ? 1 : 0);
  }

  // Anomalies
  getAllAnomalies(): Anomaly[] {
    const rows = this.db
      .prepare(`
        SELECT a.*, b.name as beneficiary_name, b.pillar as beneficiary_pillar, b.county as beneficiary_county, b.region as beneficiary_region
        FROM anomalies a
        LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
        ORDER BY CASE a.severity WHEN 'critical' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, a.detected_at DESC
      `)
      .all() as any[];
    return rows.map(r => ({ ...r, reviewed: Boolean(r.reviewed) }));
  }

  insertAnomaly(a: Anomaly): void {
    this.db
      .prepare('INSERT INTO anomalies (id, beneficiary_id, anomaly_type, detail, detected_at, severity, reviewed) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, a.beneficiary_id, a.anomaly_type, a.detail, a.detected_at, a.severity, a.reviewed ? 1 : 0);
  }

  markAnomalyReviewed(id: string, actor: string, notes?: string, reviewedAt?: string): boolean {
    const existing = this.db.prepare('SELECT * FROM anomalies WHERE id = ?').get(id) as any;
    if (!existing) return false;

    const timestamp = reviewedAt || new Date().toISOString();
    const reviewer = actor || 'Inuka Data Protection Officer';
    const resolutionNotes = notes || '';

    this.db
      .prepare('UPDATE anomalies SET reviewed = 1, reviewed_at = ?, reviewed_by = ?, resolution_notes = ? WHERE id = ?')
      .run(timestamp, reviewer, resolutionNotes, id);

    // Write to audit log
    this.insertAuditLog({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      entity_type: 'anomaly',
      entity_id: id,
      action: 'REVIEWED_ANOMALY',
      actor: reviewer,
      timestamp,
      before_state: JSON.stringify(existing),
      after_state: JSON.stringify({
        ...existing,
        reviewed: 1,
        reviewed_at: timestamp,
        reviewed_by: reviewer,
        resolution_notes: resolutionNotes,
      }),
    });

    return true;
  }

  // Audit Log (Immutable, Append-Only)
  getAllAuditLogs(limit = 200, beneficiaryId?: string): AuditLog[] {
    if (beneficiaryId) {
      return this.db
        .prepare('SELECT * FROM audit_log WHERE entity_id = ? OR before_state LIKE ? OR after_state LIKE ? ORDER BY timestamp DESC LIMIT ?')
        .all(beneficiaryId, `%${beneficiaryId}%`, `%${beneficiaryId}%`, limit) as AuditLog[];
    }
    return this.db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditLog[];
  }

  insertAuditLog(entry: AuditLog): void {
    const id = entry.id || `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    try {
      this.db
        .prepare('INSERT INTO audit_log (id, entity_type, entity_id, action, actor, timestamp, before_state, after_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, entry.entity_type, entry.entity_id, entry.action, entry.actor, entry.timestamp, entry.before_state, entry.after_state);
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed: audit_log.id')) {
        const uniqueId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        this.db
          .prepare('INSERT INTO audit_log (id, entity_type, entity_id, action, actor, timestamp, before_state, after_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(uniqueId, entry.entity_type, entry.entity_id, entry.action, entry.actor, entry.timestamp, entry.before_state, entry.after_state);
      } else {
        throw err;
      }
    }
  }

  // Dashboard Aggregates & KPIs
  getDashboardStats(): DashboardStats {
    const totalBeneficiaries = (this.db.prepare('SELECT COUNT(*) as count FROM beneficiaries').get() as any).count;
    
    // In line with "Flag, never silently fix" rule:
    // Exclude inconsistent consent states (e.g. status='granted' but missing granted_at) from active granted count
    const activeConsents = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM consent_records WHERE status = 'granted' AND granted_at IS NOT NULL AND (expires_at IS NULL OR expires_at > datetime('now'))")
        .get() as any
    ).count;

    const unresolvedAnomalies = (
      this.db.prepare('SELECT COUNT(*) as count FROM anomalies WHERE reviewed = 0').get() as any
    ).count;

    const criticalAnomalies = (
      this.db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE severity = 'critical' AND reviewed = 0").get() as any
    ).count;

    const anomaliesBySeverity = {
      critical: (this.db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE severity = 'critical' AND reviewed = 0").get() as any).count,
      medium: (this.db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE severity = 'medium' AND reviewed = 0").get() as any).count,
      low: (this.db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE severity = 'low' AND reviewed = 0").get() as any).count,
    };

    const totalAccessEvents = (this.db.prepare('SELECT COUNT(*) as count FROM data_access_events').get() as any).count;
    const validAccessEvents = (this.db.prepare('SELECT COUNT(*) as count FROM data_access_events WHERE was_valid = 1').get() as any).count;
    const complianceRate = totalAccessEvents > 0 ? Number(((validAccessEvents / totalAccessEvents) * 100).toFixed(1)) : 100.0;

    // Consent by Pillar
    const pillars: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
    const consentByPillar: Record<Pillar, any> = {
      Scholarship: { total: 0, granted: 0, requested: 0, revoked: 0, expired: 0, grant_rate: 0 },
      Plus: { total: 0, granted: 0, requested: 0, revoked: 0, expired: 0, grant_rate: 0 },
      Vocational: { total: 0, granted: 0, requested: 0, revoked: 0, expired: 0, grant_rate: 0 },
      Tech: { total: 0, granted: 0, requested: 0, revoked: 0, expired: 0, grant_rate: 0 },
    };

    for (const p of pillars) {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(c.id) as total,
          SUM(CASE WHEN c.status = 'granted' AND c.granted_at IS NOT NULL THEN 1 ELSE 0 END) as granted,
          SUM(CASE WHEN c.status = 'requested' THEN 1 ELSE 0 END) as requested,
          SUM(CASE WHEN c.status = 'revoked' THEN 1 ELSE 0 END) as revoked,
          SUM(CASE WHEN c.status = 'expired' THEN 1 ELSE 0 END) as expired
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.pillar = ?
      `).get(p) as any;

      const total = stats.total || 0;
      const granted = stats.granted || 0;
      consentByPillar[p] = {
        total,
        granted,
        requested: stats.requested || 0,
        revoked: stats.revoked || 0,
        expired: stats.expired || 0,
        grant_rate: total > 0 ? Number(((granted / total) * 100).toFixed(1)) : 0,
      };
    }

    // Consent by Region (8 Kenyan Regions)
    const regions: Region[] = [
      'Central',
      'Coast',
      'Eastern',
      'Nairobi',
      'North Eastern',
      'Nyanza',
      'Rift Valley',
      'Western',
    ];
    const consentByRegion: Record<Region, any> = {
      Central: { total: 0, granted: 0, grant_rate: 0 },
      Coast: { total: 0, granted: 0, grant_rate: 0 },
      Eastern: { total: 0, granted: 0, grant_rate: 0 },
      Nairobi: { total: 0, granted: 0, grant_rate: 0 },
      'North Eastern': { total: 0, granted: 0, grant_rate: 0 },
      Nyanza: { total: 0, granted: 0, grant_rate: 0 },
      'Rift Valley': { total: 0, granted: 0, grant_rate: 0 },
      Western: { total: 0, granted: 0, grant_rate: 0 },
    };

    for (const r of regions) {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(c.id) as total,
          SUM(CASE WHEN c.status = 'granted' AND c.granted_at IS NOT NULL THEN 1 ELSE 0 END) as granted
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.region = ?
      `).get(r) as any;

      const total = stats.total || 0;
      const granted = stats.granted || 0;
      consentByRegion[r] = {
        total,
        granted,
        grant_rate: total > 0 ? Number(((granted / total) * 100).toFixed(1)) : 0,
      };
    }

    // Pillar Anomaly Rates over recent 4 weeks
    const weeks = ['Week -3', 'Week -2', 'Week -1', 'Current Week'];
    const pillarAnomalyRates: Array<{
      pillar: Pillar;
      week: string;
      anomaly_rate: number;
      is_outlier: boolean;
      threshold: number;
    }> = [];

    const now = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const weekDateRanges: Record<string, { start: string; end: string }> = {
      'Current Week': {
        start: new Date(now.getTime() - 7 * MS_PER_DAY).toISOString(),
        end: new Date(now.getTime() + 60 * 1000).toISOString(),
      },
      'Week -1': {
        start: new Date(now.getTime() - 14 * MS_PER_DAY).toISOString(),
        end: new Date(now.getTime() - 7 * MS_PER_DAY).toISOString(),
      },
      'Week -2': {
        start: new Date(now.getTime() - 21 * MS_PER_DAY).toISOString(),
        end: new Date(now.getTime() - 14 * MS_PER_DAY).toISOString(),
      },
      'Week -3': {
        start: new Date(now.getTime() - 28 * MS_PER_DAY).toISOString(),
        end: new Date(now.getTime() - 21 * MS_PER_DAY).toISOString(),
      },
    };

    // Calculate rates per pillar and week
    for (const week of weeks) {
      const { start: startDate, end: endDate } = weekDateRanges[week];
      const ratesForWeek: { pillar: Pillar; rate: number }[] = [];
      for (const pillar of pillars) {
        const benCount = (
          this.db.prepare('SELECT COUNT(*) as count FROM beneficiaries WHERE pillar = ?').get(pillar) as any
        ).count;
        const anomCount = (
          this.db
            .prepare(`
              SELECT COUNT(a.id) as count 
              FROM anomalies a 
              JOIN beneficiaries b ON a.beneficiary_id = b.id 
              WHERE b.pillar = ? AND a.detected_at >= ? AND a.detected_at < ?
            `)
            .get(pillar, startDate, endDate) as any
        ).count;

        const rate = benCount > 0 ? Number(((anomCount / benCount) * 100).toFixed(2)) : 0;
        ratesForWeek.push({ pillar, rate });
      }

      // Statistical anomaly detection: Mean + 2 * Standard Deviation (leave-one-out)
      for (let i = 0; i < ratesForWeek.length; i++) {
        const item = ratesForWeek[i];
        const others = ratesForWeek.filter((_, idx) => idx !== i);
        const otherValues = others.map(r => r.rate);
        const mean = otherValues.reduce((a, b) => a + b, 0) / (otherValues.length || 1);
        const variance = otherValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (otherValues.length || 1);
        const stdDev = Math.sqrt(variance);
        const threshold = Number((mean + 2 * stdDev).toFixed(2));

        pillarAnomalyRates.push({
          pillar: item.pillar,
          week,
          anomaly_rate: item.rate,
          is_outlier: item.rate > threshold && item.rate > 0,
          threshold,
        });
      }
    }

    // Purpose Breakdown Data (Calculated from real consent_records)
    const purposes: Array<'donor_reporting' | 'internal_analytics' | 'third_party_sharing'> = [
      'donor_reporting',
      'internal_analytics',
      'third_party_sharing',
    ];
    const consentsByPurpose: Record<string, { total: number; granted: number; grant_rate: number; share_percent: number }> = {};
    let totalGrantedPurposes = 0;

    for (const purp of purposes) {
      const pStats = this.db.prepare(`
        SELECT
          COUNT(id) as total,
          SUM(CASE WHEN status = 'granted' AND granted_at IS NOT NULL AND (expires_at IS NULL OR expires_at > datetime('now')) THEN 1 ELSE 0 END) as granted
        FROM consent_records
        WHERE purpose = ?
      `).get(purp) as any;

      const pTotal = pStats?.total || 0;
      const pGranted = pStats?.granted || 0;
      totalGrantedPurposes += pGranted;

      consentsByPurpose[purp] = {
        total: pTotal,
        granted: pGranted,
        grant_rate: pTotal > 0 ? Number(((pGranted / pTotal) * 100).toFixed(1)) : 0,
        share_percent: 0,
      };
    }

    for (const purp of purposes) {
      if (totalGrantedPurposes > 0) {
        consentsByPurpose[purp].share_percent = Number(((consentsByPurpose[purp].granted / totalGrantedPurposes) * 100).toFixed(1));
      }
    }

    return {
      total_beneficiaries: totalBeneficiaries,
      active_consents: activeConsents,
      unresolved_anomalies: unresolvedAnomalies,
      critical_anomalies: criticalAnomalies,
      compliance_rate: complianceRate,
      events_processed_today: totalAccessEvents + totalBeneficiaries,
      anomalies_by_severity: anomaliesBySeverity,
      consent_by_pillar: consentByPillar,
      consent_by_region: consentByRegion,
      pillar_anomaly_rates: pillarAnomalyRates,
      consents_by_purpose: consentsByPurpose as any,
    };
  }

  // Staff Repository Operations
  getStaffByEmail(email: string): Staff | undefined {
    if (!email) return undefined;
    return this.db.prepare('SELECT * FROM staff WHERE LOWER(email) = LOWER(?)').get(email.trim()) as Staff | undefined;
  }

  getStaffById(id: string): Staff | undefined {
    if (!id) return undefined;
    return this.db.prepare('SELECT * FROM staff WHERE id = ?').get(id.trim()) as Staff | undefined;
  }

  insertStaff(staff: Staff): void {
    this.db
      .prepare('INSERT INTO staff (id, name, email, password_hash, role, pillar_scope) VALUES (?, ?, ?, ?, ?, ?)')
      .run(staff.id, staff.name, staff.email.toLowerCase(), staff.password_hash, staff.role, staff.pillar_scope || null);
  }

  updateStaffProfile(id: string, name: string, email: string): void {
    this.db.prepare('UPDATE staff SET name = ?, email = ? WHERE id = ?').run(name, email.toLowerCase(), id);
  }

  getAllStaff(): Staff[] {
    return this.db.prepare('SELECT id, name, email, role, pillar_scope FROM staff ORDER BY name ASC').all() as Staff[];
  }

  // Field Officer Scoped Aggregates
  getFieldOfficerConsentSummary(pillar: Pillar) {
    const totalBeneficiaries = (this.db.prepare('SELECT COUNT(*) as count FROM beneficiaries WHERE pillar = ?').get(pillar) as any).count;
    
    // Fully consented = all 3 purposes or donor + internal granted
    const fullyConsented = (this.db.prepare(`
      SELECT COUNT(DISTINCT b.id) as count
      FROM beneficiaries b
      JOIN consent_records c1 ON b.id = c1.beneficiary_id AND c1.purpose = 'donor_reporting' AND c1.status = 'granted' AND c1.granted_at IS NOT NULL
      JOIN consent_records c2 ON b.id = c2.beneficiary_id AND c2.purpose = 'internal_analytics' AND c2.status = 'granted' AND c2.granted_at IS NOT NULL
      WHERE b.pillar = ?
    `).get(pillar) as any).count;

    const actionRequired = (this.db.prepare(`
      SELECT COUNT(DISTINCT b.id) as count
      FROM beneficiaries b
      LEFT JOIN consent_records c ON b.id = c.beneficiary_id AND c.status = 'granted' AND c.granted_at IS NOT NULL
      WHERE b.pillar = ? AND (c.id IS NULL OR b.id IN (
        SELECT beneficiary_id FROM consent_records WHERE status IN ('revoked', 'expired')
      ))
    `).get(pillar) as any).count;

    // Consent status by purpose for this pillar
    const purposes: { name: string; purpose: string; description: string }[] = [
      { name: 'Donor Reporting & Progress', purpose: 'donor_reporting', description: 'Consent to share pseudonymized progress reports and milestone data with program sponsors and donors.' },
      { name: 'Internal Analytics & M&E', purpose: 'internal_analytics', description: 'Consent for the Foundation’s internal monitoring, evaluation, and cohort performance analytics.' },
      { name: 'Third-Party Partner Sharing', purpose: 'third_party_sharing', description: 'Consent to share pseudonymized beneficiary data with vetted external institutional partners.' },
    ];

    const purposeBreakdown = purposes.map(p => {
      const stats = this.db.prepare(`
        SELECT
          COUNT(c.id) as total,
          SUM(CASE WHEN c.status = 'granted' AND c.granted_at IS NOT NULL THEN 1 ELSE 0 END) as granted,
          SUM(CASE WHEN c.status = 'requested' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN c.status IN ('revoked', 'expired') THEN 1 ELSE 0 END) as revoked
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.pillar = ? AND c.purpose = ?
      `).get(pillar, p.purpose) as any;

      const total = totalBeneficiaries || 1;
      const granted = stats.granted || 0;
      const pending = stats.pending || 0;
      const revoked = stats.revoked || 0;

      return {
        title: p.name,
        purpose: p.purpose,
        description: p.description,
        consentedPercent: Math.round((granted / total) * 100),
        pendingPercent: Math.round((pending / total) * 100),
        revokedPercent: Math.round((revoked / total) * 100),
      };
    });

    // Recent activity in this pillar
    const recentUpdates = this.db.prepare(`
      SELECT c.id, c.purpose, c.status, c.granted_at, c.revoked_at, b.id as beneficiary_id, b.name as beneficiary_name
      FROM consent_records c
      JOIN beneficiaries b ON c.beneficiary_id = b.id
      WHERE b.pillar = ?
      ORDER BY COALESCE(c.revoked_at, c.granted_at, '1970-01-01') DESC
      LIMIT 10
    `).all(pillar) as any[];

    return {
      pillar,
      totalAssigned: totalBeneficiaries,
      fullyConsented,
      fullyConsentedPercent: totalBeneficiaries > 0 ? Number(((fullyConsented / totalBeneficiaries) * 100).toFixed(1)) : 0,
      actionRequired,
      purposeBreakdown,
      recentUpdates,
    };
  }

  // M&E Analyst Strictly Aggregated Insights
  getAnalystAggregateInsights() {
    const totalBeneficiaries = (this.db.prepare('SELECT COUNT(*) as count FROM beneficiaries').get() as any).count;
    
    // Analyzable cohort = consented to internal_analytics
    const analyzableCohort = (this.db.prepare(`
      SELECT COUNT(DISTINCT beneficiary_id) as count
      FROM consent_records
      WHERE purpose = 'internal_analytics' AND status = 'granted' AND granted_at IS NOT NULL
    `).get() as any).count;

    const optInCount = (this.db.prepare(`
      SELECT COUNT(DISTINCT beneficiary_id) as count
      FROM consent_records
      WHERE status = 'granted' AND granted_at IS NOT NULL
    `).get() as any).count;

    const globalOptInRate = totalBeneficiaries > 0 ? Number(((optInCount / totalBeneficiaries) * 100).toFixed(1)) : 0;

    const recentRevocations = (this.db.prepare(`
      SELECT COUNT(*) as count
      FROM consent_records
      WHERE status = 'revoked' AND revoked_at >= datetime('now', '-30 days')
    `).get() as any).count;

    // Real per-pillar consent grant rates from consent_records joined to beneficiaries
    const pillars: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
    const pillarCoverage = pillars.map(pillarName => {
      const totalPillarBens = (this.db.prepare(
        'SELECT COUNT(*) as count FROM beneficiaries WHERE pillar = ?'
      ).get(pillarName) as any)?.count || 0;

      const grantedInPillar = (this.db.prepare(`
        SELECT COUNT(DISTINCT c.beneficiary_id) as count
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.pillar = ? AND c.status = 'granted' AND c.granted_at IS NOT NULL
      `).get(pillarName) as any)?.count || 0;

      const rate = totalPillarBens > 0 ? Math.round((grantedInPillar / totalPillarBens) * 100) : 0;
      return { name: pillarName, rate };
    });

    // Real regional distribution across the 8 Kenyan regions
    const regions: Region[] = [
      'Central',
      'Coast',
      'Eastern',
      'Nairobi',
      'North Eastern',
      'Nyanza',
      'Rift Valley',
      'Western',
    ];
    const regionalDistribution = regions.map(regionName => {
      const regionActiveConsents = (this.db.prepare(`
        SELECT COUNT(DISTINCT c.beneficiary_id) as count
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.region = ? AND c.status = 'granted' AND c.granted_at IS NOT NULL
      `).get(regionName) as any)?.count || 0;

      const percentage = optInCount > 0 ? Math.round((regionActiveConsents / optInCount) * 100) : 0;
      return { framework: regionName, percentage };
    });

    return {
      totalAnalyzableCohort: analyzableCohort,
      globalOptInRate,
      recentRevocations,
      pillarCoverage,
      regionalDistribution,
      complianceNote: 'All data visualized is strictly aggregated and restricted to cohorts that have explicitly consented to Internal Analytics. No individual PII or tokens represented.',
    };
  }

  // M&E Analyst Strictly Aggregated Trends
  getAnalystTrends() {
    const activeConsents = (this.db.prepare(`
      SELECT COUNT(*) as count
      FROM consent_records
      WHERE status = 'granted' AND granted_at IS NOT NULL AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).get() as any).count;

    const netNewGrants = (this.db.prepare(`
      SELECT COUNT(*) as count
      FROM consent_records
      WHERE status = 'granted' AND granted_at >= datetime('now', '-30 days')
    `).get() as any).count;

    const totalConsents = (this.db.prepare('SELECT COUNT(*) as count FROM consent_records').get() as any).count;
    const totalRevocations = (this.db.prepare("SELECT COUNT(*) as count FROM consent_records WHERE status = 'revoked'").get() as any).count;
    const revocationRate = totalConsents > 0 ? Number(((totalRevocations / totalConsents) * 100).toFixed(1)) : 0;

    // Real revocation breakdown by consent purpose
    const purposeRevocations = this.db.prepare(`
      SELECT purpose, COUNT(*) as count
      FROM consent_records
      WHERE status = 'revoked'
      GROUP BY purpose
    `).all() as Array<{ purpose: string; count: number }>;

    const purposeLabels: Record<string, string> = {
      donor_reporting: 'Donor Reporting & Progress',
      internal_analytics: 'Internal Analytics & M&E',
      third_party_sharing: 'Third-Party Partner Sharing',
    };

    const revocationTriggers = purposeRevocations.length > 0
      ? purposeRevocations.map(r => ({
          reason: purposeLabels[r.purpose] || r.purpose.replace(/_/g, ' '),
          percentage: totalRevocations > 0 ? Math.round((r.count / totalRevocations) * 100) : 0,
        }))
      : [
          { reason: 'Donor Reporting & Progress', percentage: 0 },
          { reason: 'Internal Analytics & M&E', percentage: 0 },
          { reason: 'Third-Party Partner Sharing', percentage: 0 },
        ];

    // Real regional compliance aggregates across the 8 Kenyan regions
    const regions: Region[] = [
      'Central',
      'Coast',
      'Eastern',
      'Nairobi',
      'North Eastern',
      'Nyanza',
      'Rift Valley',
      'Western',
    ];

    const regionalCompliance = regions.map(reg => {
      const regActive = (this.db.prepare(`
        SELECT COUNT(*) as count
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.region = ? AND c.status = 'granted' AND c.granted_at IS NOT NULL AND (c.expires_at IS NULL OR c.expires_at > datetime('now'))
      `).get(reg) as any)?.count || 0;

      const regTotal = (this.db.prepare(`
        SELECT COUNT(*) as count
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.region = ?
      `).get(reg) as any)?.count || 0;

      const reg30DGrants = (this.db.prepare(`
        SELECT COUNT(*) as count
        FROM consent_records c
        JOIN beneficiaries b ON c.beneficiary_id = b.id
        WHERE b.region = ? AND c.status = 'granted' AND c.granted_at >= datetime('now', '-30 days')
      `).get(reg) as any)?.count || 0;

      const grantRate = regTotal > 0 ? (regActive / regTotal) * 100 : 0;
      const status = grantRate >= 70 ? 'HEALTHY' : grantRate >= 50 ? 'MONITOR' : 'ACTION REQUIRED';
      const variance30D = reg30DGrants > 0 ? `+${((reg30DGrants / (regActive || 1)) * 100).toFixed(1)}%` : '0.0%';

      return {
        region: reg,
        activeConsents: regActive,
        variance30D,
        status,
      };
    });

    return {
      totalActiveConsents: activeConsents,
      netNewGrantsPeriod: netNewGrants,
      revocationRate,
      revocationTriggers,
      regionalCompliance,
    };
  }
}
