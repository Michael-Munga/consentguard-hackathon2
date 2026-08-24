import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { DbRepository, getDatabase, closeDatabase } from '../server/db/database.js';
import { sseManager } from '../server/api/sse.js';
import { runFullProvenanceAudit, getLatestProvenanceReport } from '../server/engine/provenance.js';
import { RealtimeEventSimulator } from '../server/engine/simulator.js';
import { seedDatabase } from '../server/db/seed.js';

describe('Engine Integration: Provenance and Simulator Modules', () => {
  let db: Database.Database;
  let repo: DbRepository;

  beforeEach(() => {
    // Run seed to ensure fresh realistic data in in-memory DB
    db = getDatabase(':memory:');
    repo = new DbRepository(db);
    seedDatabase(50, db);
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch {}
    }
  });

  afterAll(() => {
    sseManager.destroy();
    closeDatabase();
  });

  describe('Provenance Report Audit Engine', () => {
    it('executes full database audit and evaluates all 5 validation gates', () => {
      const report = runFullProvenanceAudit(repo, 'TEST-RUN-001');

      expect(report.run_id).toBe('TEST-RUN-001');
      expect(report.gates_evaluated.length).toBe(5);
      expect(report.input_event_count).toBeGreaterThan(0);
      expect(report.execution_duration_ms).toBeGreaterThanOrEqual(0);
      expect(report.environment_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(['PASSED', 'WARNING', 'CRITICAL_FAIL']).toContain(report.overall_status);

      // Check gate names
      const gateNames = report.gates_evaluated.map(g => g.gate_name);
      expect(gateNames.some(n => n.includes('Stage Sequence'))).toBe(true);
      expect(gateNames.some(n => n.includes('Entity-Level Consent Conflict'))).toBe(true);
      expect(gateNames.some(n => n.includes('Real-Time Consent Authorization'))).toBe(true);
      expect(gateNames.some(n => n.includes('Metadata Integrity'))).toBe(true);
      expect(gateNames.some(n => n.includes('Statistical Drift'))).toBe(true);
    });

    it('persists and retrieves latest provenance report from disk', () => {
      runFullProvenanceAudit(repo, 'TEST-RUN-DISK');
      const latest = getLatestProvenanceReport();
      expect(latest).not.toBeNull();
      expect(latest?.run_id).toBe('TEST-RUN-DISK');
    });
  });

  describe('Real-Time Event Simulator', () => {
    it('simulates new beneficiary application and inserts into database', () => {
      const sim = new RealtimeEventSimulator(repo);
      const ben = sim.simulateNewBeneficiaryApplication();

      expect(ben.id).toMatch(/^BEN-LIVE-/);
      expect(ben.current_stage).toBe('applied');

      const saved = repo.getBeneficiaryById(ben.id);
      expect(saved).toBeDefined();
      expect(saved?.name).toBe(ben.name);
    });

    it('simulates unauthorized data access and catches anomaly synchronously at write-time', () => {
      const sim = new RealtimeEventSimulator(repo);
      const result = sim.simulateUnauthorizedAccess('rogue_auditor@test.com');

      expect(result.event.was_valid).toBe(false);
      expect(result.anomaly.severity).toBe('critical');
      expect(result.anomaly.beneficiary_id).toBe(result.beneficiary.id);

      // Verify anomaly is written to SQLite table
      const allAnomalies = repo.getAllAnomalies();
      const matched = allAnomalies.find(a => a.id === result.anomaly.id);
      expect(matched).toBeDefined();
      expect(matched?.severity).toBe('critical');
      expect(matched?.reviewed).toBe(false);

      // Verify audit log has the block record
      const logs = repo.getAllAuditLogs(50);
      const auditEntry = logs.find(l => l.entity_id === result.event.id);
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.action).toBe('UNAUTHORIZED_ACCESS_BLOCKED');
    });

    it('controls simulator start, pause, and speed status correctly', () => {
      const sim = new RealtimeEventSimulator(repo);
      expect(sim.getStatus().isRunning).toBe(false);

      sim.start();
      expect(sim.getStatus().isRunning).toBe(true);

      sim.setIntervalMs(1500);
      expect(sim.getStatus().intervalMs).toBe(1500);

      sim.pause();
      expect(sim.getStatus().isRunning).toBe(false);
    });
  });
});
