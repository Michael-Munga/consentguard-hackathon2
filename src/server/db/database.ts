import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CREATE_TABLES_SQL } from './schema.js';
import type {
  Beneficiary,
  ConsentRecord,
  DataAccessEvent,
  LifecycleTransition,
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
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const db = new Database(targetPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(CREATE_TABLES_SQL);

  // Safe migrations for existing databases
  try { db.exec('ALTER TABLE anomalies ADD COLUMN reviewed_at TEXT;'); } catch {}
  try { db.exec('ALTER TABLE anomalies ADD COLUMN reviewed_by TEXT;'); } catch {}
  try { db.exec('ALTER TABLE anomalies ADD COLUMN resolution_notes TEXT;'); } catch {}

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

  insertBeneficiary(b: Beneficiary): void {
    const county = b.county || (b.region === 'Nairobi' ? 'Nairobi' : 'Nairobi');
    this.db
      .prepare('INSERT INTO beneficiaries (id, name, pillar, county, region, applied_at, current_stage) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(b.id, b.name, b.pillar, county, b.region, b.applied_at, b.current_stage);
  }

  updateBeneficiaryStage(id: string, stage: string): void {
    this.db.prepare('UPDATE beneficiaries SET current_stage = ? WHERE id = ?').run(stage, id);
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

  // Data Access Events
  getDataAccessEvents(limit = 100): DataAccessEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM data_access_events ORDER BY accessed_at DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map(r => ({ ...r, was_valid: Boolean(r.was_valid) }));
  }

  insertDataAccessEvent(e: DataAccessEvent): void {
    this.db
      .prepare(
        'INSERT INTO data_access_events (id, beneficiary_id, purpose, accessed_at, accessed_by, was_valid) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(e.id, e.beneficiary_id, e.purpose, e.accessed_at, e.accessed_by, e.was_valid ? 1 : 0);
  }

  // Lifecycle Transitions
  getTransitionsForBeneficiary(beneficiaryId: string): LifecycleTransition[] {
    const rows = this.db
      .prepare('SELECT * FROM lifecycle_transitions WHERE beneficiary_id = ? ORDER BY transitioned_at ASC')
      .all(beneficiaryId) as any[];
    return rows.map(r => ({ ...r, is_valid_sequence: Boolean(r.is_valid_sequence) }));
  }

  insertLifecycleTransition(t: LifecycleTransition): void {
    this.db
      .prepare(
        'INSERT INTO lifecycle_transitions (id, beneficiary_id, from_stage, to_stage, transitioned_at, is_valid_sequence) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(t.id, t.beneficiary_id, t.from_stage, t.to_stage, t.transitioned_at, t.is_valid_sequence ? 1 : 0);
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
    this.db
      .prepare('INSERT INTO audit_log (id, entity_type, entity_id, action, actor, timestamp, before_state, after_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(entry.id, entry.entity_type, entry.entity_id, entry.action, entry.actor, entry.timestamp, entry.before_state, entry.after_state);
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
    };
  }
}
