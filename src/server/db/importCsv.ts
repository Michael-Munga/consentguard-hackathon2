import fs from 'fs';
import Database from 'better-sqlite3';
import { getDatabase, DbRepository } from './database.js';
import { hashPassword } from '../auth/crypto.js';
import type {
  Beneficiary,
  ConsentRecord,
  ConsentPurpose,
  ConsentStatus,
  Pillar,
  Region,
  County,
} from '../../types/index.js';
import { COUNTY_TO_REGION } from '../../types/index.js';

export interface CsvImportRow {
  name: string;
  pillar: string;
  county?: string;
  region?: string;
  applied_at?: string;
  email?: string;
  password?: string;
  donor_reporting_status?: string;
  internal_analytics_status?: string;
  third_party_sharing_status?: string;
  donor_reporting_granted_at?: string;
  internal_analytics_granted_at?: string;
  third_party_sharing_granted_at?: string;
  [key: string]: any;
}

export interface CsvImportResult {
  success: boolean;
  totalProcessed: number;
  beneficiariesImported: number;
  withPortalAccess: number;
  errors: string[];
}

/**
 * Simple robust CSV string parser that handles quoted commas and trims fields
 */
export function parseCsvString(csvContent: string): CsvImportRow[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header line
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values.map(v => v.replace(/^["']|["']$/g, '').trim());
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s-]+/g, '_'));
  const rows: CsvImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = parseLine(lines[i]);
    if (rawValues.length === 0 || (rawValues.length === 1 && !rawValues[0])) continue;

    const rowObj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      rowObj[headers[h]] = rawValues[h] || '';
    }
    rows.push(rowObj as unknown as CsvImportRow);
  }

  return rows;
}

/**
 * Import Beneficiaries from parsed CSV data.
 */
export function importBeneficiariesFromCsvData(
  rows: CsvImportRow[],
  customDb?: Database.Database
): CsvImportResult {
  const db = customDb || getDatabase();
  const repo = new DbRepository(db);

  const errors: string[] = [];
  let importedCount = 0;
  let portalAccessCount = 0;

  const insertTransaction = db.transaction(() => {
    let seq = 1;
    const nowStr = new Date().toISOString();

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        if (!row.name || !row.pillar) {
          errors.push(`Row ${idx + 1}: Missing mandatory 'name' or 'pillar'. Skipping.`);
          continue;
        }

        const name = row.name.trim();
        const rawPillar = row.pillar.trim();
        // Capitalize pillar
        const pillar = (rawPillar.charAt(0).toUpperCase() + rawPillar.slice(1).toLowerCase()) as Pillar;
        const validPillars: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
        if (!validPillars.includes(pillar)) {
          errors.push(`Row ${idx + 1}: Invalid pillar '${rawPillar}'. Skipping.`);
          continue;
        }

        const county = row.county?.trim() || 'Nairobi';
        const region = (row.region?.trim() || COUNTY_TO_REGION[county as County] || 'Nairobi') as Region;
        const appliedAt = row.applied_at?.trim() || nowStr;

        // Credentials
        const email = row.email?.trim() || null;
        const passwordPlain = row.password?.trim() || null;
        let passwordHash: string | null = null;

        if (email && passwordPlain) {
          passwordHash = hashPassword(passwordPlain);
          portalAccessCount++;
        }

        // Generate ID e.g. INK-CSV-0001
        const benId = `BEN-CSV-${String(seq++).padStart(4, '0')}`;

        // Build Consent Records from CSV status columns
        const benConsents: ConsentRecord[] = [];
        const purposes: Array<{ purpose: ConsentPurpose; statusKey: string; dateKey: string }> = [
          { purpose: 'donor_reporting', statusKey: 'donor_reporting_status', dateKey: 'donor_reporting_granted_at' },
          { purpose: 'internal_analytics', statusKey: 'internal_analytics_status', dateKey: 'internal_analytics_granted_at' },
          { purpose: 'third_party_sharing', statusKey: 'third_party_sharing_status', dateKey: 'third_party_sharing_granted_at' },
        ];

        for (const p of purposes) {
          const rawStatus = (row[p.statusKey] || 'none').toLowerCase().trim();
          if (rawStatus === 'none' || rawStatus === '') continue;

          let status: ConsentStatus = 'requested';
          if (rawStatus === 'granted') status = 'granted';
          else if (rawStatus === 'revoked') status = 'revoked';
          else if (rawStatus === 'expired') status = 'expired';

          const grantedDate = row[p.dateKey]
            ? row[p.dateKey].trim()
            : status === 'granted'
            ? appliedAt
            : null;
          const expiresDate = status === 'granted' && grantedDate
            ? new Date(new Date(grantedDate).getTime() + 365 * 86400000).toISOString()
            : null;

          const consentRecord: ConsentRecord = {
            id: `CR-${benId}-${p.purpose.substring(0, 3).toUpperCase()}`,
            beneficiary_id: benId,
            purpose: p.purpose,
            status,
            granted_at: grantedDate,
            revoked_at: status === 'revoked' ? nowStr : null,
            expires_at: expiresDate,
          };
          benConsents.push(consentRecord);
        }

        const beneficiary: Beneficiary = {
          id: benId,
          name,
          email,
          password_hash: passwordHash,
          pillar,
          county,
          region,
          applied_at: appliedAt,
        };

        repo.insertBeneficiary(beneficiary);

        for (const cr of benConsents) {
          repo.insertConsentRecord(cr);
        }

        // Audit Log
        repo.insertAuditLog({
          id: `AUD-CSV-${benId}`,
          entity_type: 'beneficiary',
          entity_id: benId,
          action: 'CSV_SEED_IMPORT',
          actor: 'csv_seeder_daemon',
          timestamp: nowStr,
          before_state: null,
          after_state: JSON.stringify({
            id: benId,
            name,
            email,
            pillar,
            county,
            consents_count: benConsents.length,
          }),
        });

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${idx + 1}: ${err.message}`);
      }
    }
  });

  insertTransaction();

  return {
    success: errors.length === 0,
    totalProcessed: rows.length,
    beneficiariesImported: importedCount,
    withPortalAccess: portalAccessCount,
    errors,
  };
}

/**
 * Import directly from a CSV file path on disk
 */
export function importBeneficiariesFromCsvFile(filePath: string, customDb?: Database.Database): CsvImportResult {
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      totalProcessed: 0,
      beneficiariesImported: 0,
      withPortalAccess: 0,
      errors: [`File not found: ${filePath}`],
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsvString(content);
  return importBeneficiariesFromCsvData(rows, customDb);
}
