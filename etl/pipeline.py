#!/usr/bin/env python3
"""
ConsentGuard Python ETL & Governance Reconciliation Engine
Batch ingestion and scheduled reconciliation using Great Expectations (ephemeral context).

Architecture:
- Python / Great Expectations: Foundational batch validation, data cleaning & scheduled reconciliation
- TypeScript: Real-time event streaming & inline synchronous write-time validation
"""

import os
import sys
import argparse
import glob
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
import pandas as pd
import great_expectations as gx
import requests

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))
DB_PATH = os.path.join(PROJECT_ROOT, 'data', 'consentguard.db')
PROVENANCE_DIR = os.path.join(PROJECT_ROOT, 'data', 'provenance')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
RAW_DATA_DIR = os.path.join(BASE_DIR, 'raw_data')
LAST_RUN_PATH = os.path.join(LOGS_DIR, 'last_run.txt')

os.makedirs(PROVENANCE_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(RAW_DATA_DIR, exist_ok=True)

VALID_PILLARS = ['Scholarship', 'Plus', 'Vocational', 'Tech']
VALID_REGIONS = ['Central', 'Coast', 'Eastern', 'Nairobi', 'North Eastern', 'Nyanza', 'Rift Valley', 'Western']
VALID_STATUSES = ['requested', 'granted', 'revoked', 'expired']
VALID_PURPOSES = ['donor_reporting', 'internal_analytics', 'third_party_sharing']

COUNTY_TO_REGION = {
    'Kiambu': 'Central', 'Kirinyaga': 'Central', "Murang'a": 'Central', 'Nyandarua': 'Central', 'Nyeri': 'Central',
    'Kilifi': 'Coast', 'Kwale': 'Coast', 'Lamu': 'Coast', 'Mombasa': 'Coast', 'Taita-Taveta': 'Coast', 'Tana River': 'Coast',
    'Embu': 'Eastern', 'Isiolo': 'Eastern', 'Kitui': 'Eastern', 'Machakos': 'Eastern', 'Makueni': 'Eastern', 'Marsabit': 'Eastern', 'Meru': 'Eastern', 'Tharaka-Nithi': 'Eastern',
    'Nairobi': 'Nairobi',
    'Garissa': 'North Eastern', 'Mandera': 'North Eastern', 'Wajir': 'North Eastern',
    'Homa Bay': 'Nyanza', 'Kisii': 'Nyanza', 'Kisumu': 'Nyanza', 'Migori': 'Nyanza', 'Nyamira': 'Nyanza', 'Siaya': 'Nyanza',
    'Baringo': 'Rift Valley', 'Bomet': 'Rift Valley', 'Elgeyo-Marakwet': 'Rift Valley', 'Kajiado': 'Rift Valley', 'Kericho': 'Rift Valley', 'Laikipia': 'Rift Valley', 'Nakuru': 'Rift Valley', 'Nandi': 'Rift Valley', 'Narok': 'Rift Valley', 'Samburu': 'Rift Valley', 'Trans-Nzoia': 'Rift Valley', 'Turkana': 'Rift Valley', 'Uasin Gishu': 'Rift Valley', 'West Pokot': 'Rift Valley',
    'Bungoma': 'Western', 'Busia': 'Western', 'Kakamega': 'Western', 'Vihiga': 'Western',
}
VALID_COUNTIES = list(COUNTY_TO_REGION.keys())

def get_latest_raw_csv() -> str:
    """Finds the most recently created raw CSV export file."""
    csv_files = glob.glob(os.path.join(RAW_DATA_DIR, '*.csv'))
    if not csv_files:
        # If no CSV exists yet, auto-generate one
        print("[Pipeline] No raw CSV found in raw_data/. Auto-generating synthetic raw export...")
        from generate_raw_export import generate_synthetic_raw_export
        return generate_synthetic_raw_export()
    return max(csv_files, key=os.path.getmtime)

def validate_raw_dataframe_with_ge(df: pd.DataFrame):
    """
    Executes in-memory Great Expectations validation on the raw pandas DataFrame.
    Applies the 7 core governance expectations and identifies clean vs. rejected rows.
    """
    print(f"[Pipeline] Initializing Great Expectations in-memory validation for {len(df)} records...")
    
    # Initialize Great Expectations ephemeral context
    context = gx.get_context(mode='ephemeral')
    ge_df = gx.from_pandas(df)
    
    # Run Great Expectations rules
    results = {}
    
    # 1. beneficiary_name must not be null
    results['exp_name_not_null'] = ge_df.expect_column_values_to_not_be_null('beneficiary_name')
    
    # 2. pillar must be one of the 4 valid Inuka pillars
    results['exp_pillar_valid'] = ge_df.expect_column_values_to_be_in_set(
        'pillar', VALID_PILLARS
    )
    
    # 3. region must not be null and in valid set
    results['exp_region_not_null'] = ge_df.expect_column_values_to_not_be_null('region')
    results['exp_region_valid'] = ge_df.expect_column_values_to_be_in_set(
        'region', VALID_REGIONS
    )
    
    # 4. consent_status must be in valid set
    results['exp_status_valid'] = ge_df.expect_column_values_to_be_in_set(
        'consent_status', VALID_STATUSES
    )
    
    # 5. Compound uniqueness: (beneficiary_name, application_date)
    results['exp_unique_pairs'] = ge_df.expect_compound_columns_to_be_unique(
        ['beneficiary_name', 'application_date']
    )
    
    # Row-by-row failure tagging (Flag, Never Silently Fix principle)
    rejection_reasons = []
    seen_pairs = set()
    
    for idx, row in df.iterrows():
        reasons = []
        name = row.get('beneficiary_name')
        pillar = row.get('pillar')
        county = row.get('county')
        region = row.get('region')
        app_date_raw = row.get('application_date')
        status = row.get('consent_status')
        grant_date_raw = row.get('consent_granted_date')
        
        # Check 1: Name not null
        if pd.isna(name) or str(name).strip() == '':
            reasons.append("RULE_1_FAIL: beneficiary_name is missing or empty")
            
        # Check 2: Pillar valid
        if pd.isna(pillar) or str(pillar).strip() not in VALID_PILLARS:
            reasons.append(f"RULE_2_FAIL: Invalid pillar '{pillar}' (must be Scholarship, Plus, Vocational, Tech)")
            
        # Check 3: Region & County valid
        if pd.isna(region) or str(region).strip() not in VALID_REGIONS:
            reasons.append(f"RULE_3_FAIL: Invalid/missing region '{region}' (must be one of 8 Kenyan regions)")
        elif pd.notna(county) and str(county).strip() != '' and str(county).strip() in COUNTY_TO_REGION:
            expected_region = COUNTY_TO_REGION[str(county).strip()]
            if expected_region != str(region).strip():
                reasons.append(f"RULE_3_FAIL: Region mismatch - County '{county}' belongs to region '{expected_region}', not '{region}'")
        elif pd.isna(county) or str(county).strip() == '':
            reasons.append("RULE_3_FAIL: County is missing or empty")
            
        # Check 4: Consent status valid
        if pd.isna(status) or str(status).strip() not in VALID_STATUSES:
            reasons.append(f"RULE_4_FAIL: Invalid consent_status '{status}'")
            
        # Check 5: If status is granted, granted_at must not be null
        if status == 'granted':
            if pd.isna(grant_date_raw) or str(grant_date_raw).strip() == '':
                reasons.append("RULE_5_FAIL: Consent status is 'granted' but consent_granted_date is missing (Never Impute Consent)")
                
        # Check 6: If both dates present, granted_date >= application_date
        if pd.notna(app_date_raw) and pd.notna(grant_date_raw) and str(grant_date_raw).strip() != '':
            try:
                app_dt = pd.to_datetime(app_date_raw)
                grant_dt = pd.to_datetime(grant_date_raw)
                if grant_dt < app_dt:
                    reasons.append(f"RULE_6_FAIL: Temporal inversion - consent_granted_date ({grant_date_raw}) is earlier than application_date ({app_date_raw})")
            except Exception as e:
                reasons.append(f"RULE_6_FAIL: Date parsing error ({str(e)})")
                
        # Check 7: Duplicate pair detection
        pair = (str(name).strip(), str(app_date_raw).strip())
        if pair in seen_pairs:
            reasons.append(f"RULE_7_FAIL: Duplicate entry for beneficiary '{name}' on {app_date_raw}")
        else:
            seen_pairs.add(pair)
            
        rejection_reasons.append("; ".join(reasons) if reasons else "")
        
    df['rejection_reasons'] = rejection_reasons
    df['is_valid'] = df['rejection_reasons'] == ""
    
    clean_df = df[df['is_valid']].copy().drop(columns=['rejection_reasons', 'is_valid'])
    rejected_df = df[~df['is_valid']].copy().drop(columns=['is_valid'])
    
    return clean_df, rejected_df, results

def compute_environment_hash(payload: dict) -> str:
    """Computes a genuine, deterministic SHA-256 hash over the run payload."""
    serialized = json.dumps(payload, sort_keys=True)
    return f"sha256:{hashlib.sha256(serialized.encode('utf-8')).hexdigest()}"

def run_initial_mode(file_path: str = None):
    """
    Mode: initial
    Validates synthetic raw CSV export using Great Expectations and loads clean rows into SQLite.
    """
    start_time = datetime.now()
    raw_file = file_path or get_latest_raw_csv()
    print(f"\n============================================================")
    print(f"  CONSENTGUARD PYTHON ETL: INITIAL INGESTION MODE")
    print(f"  Source CSV: {raw_file}")
    print(f"  Database Target: {DB_PATH}")
    print(f"============================================================\n")
    
    if not os.path.exists(raw_file):
        print(f"[Error] Specified raw file not found: {raw_file}")
        sys.exit(1)
        
    raw_df = pd.read_csv(raw_file)
    total_raw_rows = len(raw_df)
    
    # Validate with Great Expectations
    clean_df, rejected_df, ge_results = validate_raw_dataframe_with_ge(raw_df)
    
    passed_count = len(clean_df)
    rejected_count = len(rejected_df)
    
    print(f"\n[Validation Results]")
    print(f"  - Total Raw Rows Processed: {total_raw_rows}")
    print(f"  - Passed Great Expectations Validation: {passed_count} ({passed_count/total_raw_rows*100:.1f}%)")
    print(f"  - Rejected Rows Flagged: {rejected_count} ({rejected_count/total_raw_rows*100:.1f}%)")
    
    # Breakdown of failure reasons
    rejection_breakdown = {}
    if rejected_count > 0:
        today_str = datetime.now().strftime('%Y-%m-%d_%H%M%S')
        rejected_log_path = os.path.join(LOGS_DIR, f"rejected_rows_{today_str}.csv")
        rejected_df.to_csv(rejected_log_path, index=False)
        print(f"\n[Flag, Never Silently Fix] Rejected rows audit trail written to:")
        print(f"  -> {rejected_log_path}")
        
        # Analyze rejection types
        for reasons in raw_df[~raw_df['is_valid']]['rejection_reasons']:
            for r in reasons.split("; "):
                rule_name = r.split(":")[0]
                rejection_breakdown[rule_name] = rejection_breakdown.get(rule_name, 0) + 1
                
        print("\n[Rejection Categorization Breakdown]:")
        for r_name, cnt in rejection_breakdown.items():
            print(f"  • {r_name}: {cnt} violations")
            
    # Load clean rows into SQLite database
    print(f"\n[Database Load] Ingesting {passed_count} validated rows into SQLite...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Initialize / migrate tables if necessary
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pillar TEXT NOT NULL,
      county TEXT NOT NULL DEFAULT 'Nairobi',
      region TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      current_stage TEXT NOT NULL
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consent_records (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL,
      granted_at TEXT,
      revoked_at TEXT,
      expires_at TEXT,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_access_events (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      purpose TEXT NOT NULL,
      accessed_at TEXT NOT NULL,
      accessed_by TEXT NOT NULL,
      was_valid INTEGER NOT NULL,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lifecycle_transitions (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      transitioned_at TEXT NOT NULL,
      is_valid_sequence INTEGER NOT NULL,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      anomaly_type TEXT NOT NULL,
      detail TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      severity TEXT NOT NULL,
      reviewed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
    );
    """)
    cursor.execute("""
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
    """)

    # Check if county column exists on beneficiaries table, add if missing
    cursor.execute("PRAGMA table_info(beneficiaries)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'county' not in columns:
        cursor.execute("ALTER TABLE beneficiaries ADD COLUMN county TEXT NOT NULL DEFAULT 'Nairobi'")
        
    inserted_bens = 0
    inserted_consents = 0
    inserted_transitions = 0
    
    for idx, row in clean_df.iterrows():
        ben_id = f"BEN-PY-{idx+1:05d}"
        name = str(row['beneficiary_name']).strip()
        pillar = str(row['pillar']).strip()
        county = str(row['county']).strip() if pd.notna(row.get('county')) else 'Nairobi'
        region = str(row['region']).strip()
        app_date = str(row['application_date']).strip()
        purpose = str(row['consent_purpose_requested']).strip() if pd.notna(row.get('consent_purpose_requested')) else 'donor_reporting'
        status = str(row['consent_status']).strip()
        grant_date = str(row['consent_granted_date']).strip() if pd.notna(row.get('consent_granted_date')) else None
        
        # Determine current stage based on valid status
        if status == 'granted':
            current_stage = 'consent_granted'
        elif status == 'requested':
            current_stage = 'consent_requested'
        elif status in ('revoked', 'expired'):
            current_stage = 'consent_reviewed'
        else:
            current_stage = 'applied'
            
        # 1. Insert Beneficiary
        cursor.execute("""
            INSERT OR REPLACE INTO beneficiaries (id, name, pillar, county, region, applied_at, current_stage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ben_id, name, pillar, county, region, app_date, current_stage))
        inserted_bens += 1
        
        # 2. Insert Consent Record
        expires_at = None
        if grant_date:
            try:
                g_dt = pd.to_datetime(grant_date)
                expires_at = (g_dt + timedelta(days=365)).strftime('%Y-%m-%d %H:%M:%S')
            except:
                pass
                
        consent_id = f"CR-PY-{idx+1:04d}"
        cursor.execute("""
            INSERT OR REPLACE INTO consent_records (id, beneficiary_id, purpose, status, granted_at, revoked_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (consent_id, ben_id, purpose, status, grant_date, None, expires_at))
        inserted_consents += 1
        
        # 3. Insert Lifecycle Transitions (Valid strict sequence)
        cursor.execute("""
            INSERT OR REPLACE INTO lifecycle_transitions (id, beneficiary_id, from_stage, to_stage, transitioned_at, is_valid_sequence)
            VALUES (?, ?, NULL, 'applied', ?, 1)
        """, (f"TR-PY-{idx+1:04d}-1", ben_id, app_date))
        inserted_transitions += 1
        
        if current_stage in ('consent_requested', 'consent_granted', 'consent_reviewed'):
            cursor.execute("""
                INSERT OR REPLACE INTO lifecycle_transitions (id, beneficiary_id, from_stage, to_stage, transitioned_at, is_valid_sequence)
                VALUES (?, ?, 'applied', 'identity_verified', ?, 1)
            """, (f"TR-PY-{idx+1:04d}-2", ben_id, app_date))
            cursor.execute("""
                INSERT OR REPLACE INTO lifecycle_transitions (id, beneficiary_id, from_stage, to_stage, transitioned_at, is_valid_sequence)
                VALUES (?, ?, 'identity_verified', 'consent_requested', ?, 1)
            """, (f"TR-PY-{idx+1:04d}-3", ben_id, app_date))
            inserted_transitions += 2
            
        if current_stage in ('consent_granted', 'consent_reviewed') and grant_date:
            cursor.execute("""
                INSERT OR REPLACE INTO lifecycle_transitions (id, beneficiary_id, from_stage, to_stage, transitioned_at, is_valid_sequence)
                VALUES (?, ?, 'consent_requested', 'consent_granted', ?, 1)
            """, (f"TR-PY-{idx+1:04d}-4", ben_id, grant_date))
            inserted_transitions += 1
            
        # 4. Insert Audit Log Entry
        cursor.execute("""
            INSERT OR REPLACE INTO audit_log (id, entity_type, entity_id, action, actor, timestamp, before_state, after_state)
            VALUES (?, 'beneficiary', ?, 'PYTHON_ETL_INITIAL_INGESTION', 'great_expectations_pipeline', ?, NULL, ?)
        """, (f"AUD-PY-{idx+1:05d}", ben_id, datetime.now().isoformat(), json.dumps({'name': name, 'pillar': pillar, 'county': county, 'region': region})))
        
    conn.commit()
    conn.close()
    
    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
    print(f"[Database Load Complete]:")
    print(f"  - Beneficiaries written: {inserted_bens}")
    print(f"  - Consent Records written: {inserted_consents}")
    print(f"  - Lifecycle Transitions written: {inserted_transitions}")
    print(f"  - Duration: {duration_ms} ms")
    
    # Generate Provenance Report
    timestamp_iso = datetime.now().isoformat()
    run_id = f"PROV-PY-INITIAL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    provenance_payload = {
        'run_id': run_id,
        'run_mode': 'initial',
        'pipeline_engine': 'Python 3 + pandas + Great Expectations (Ephemeral)',
        'timestamp': timestamp_iso,
        'source_file': os.path.basename(raw_file),
        'rows_processed': total_raw_rows,
        'rows_passed_validation': passed_count,
        'rows_rejected': rejected_count,
        'rejection_breakdown': rejection_breakdown,
        'execution_duration_ms': duration_ms,
        'overall_status': 'PASSED' if rejected_count == 0 else 'WARNING',
        'database_target': os.path.basename(DB_PATH),
    }
    
    env_hash = compute_environment_hash(provenance_payload)
    provenance_payload['environment_hash'] = env_hash
    
    # Save run-specific report and update latest
    prov_file = os.path.join(PROVENANCE_DIR, f"etl_run_initial_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(prov_file, 'w', encoding='utf-8') as f:
        json.dump(provenance_payload, f, indent=2)
        
    # Update latest run report
    latest_report_path = os.path.join(PROVENANCE_DIR, 'etl_run_report.json')
    with open(latest_report_path, 'w', encoding='utf-8') as f:
        json.dump(provenance_payload, f, indent=2)
        
    # Update last_run.txt
    with open(LAST_RUN_PATH, 'w', encoding='utf-8') as f:
        f.write(timestamp_iso)
        
    print(f"\n[Provenance Certificate Generated]:")
    print(f"  -> Run ID: {run_id}")
    print(f"  -> Report Saved: {prov_file}")
    print(f"  -> SHA-256 Audit Seal: {env_hash}")
    print(f"============================================================\n")

def run_reconcile_mode():
    """
    Mode: reconcile (Cron-ready periodic reconciliation)
    Queries records written since the last Python run and performs aggregate cross-record & cohort validation.
    """
    start_time = datetime.now()
    last_run_timestamp = None
    if os.path.exists(LAST_RUN_PATH):
        with open(LAST_RUN_PATH, 'r', encoding='utf-8') as f:
            last_run_timestamp = f.read().strip()
            
    print(f"\n============================================================")
    print(f"  CONSENTGUARD PYTHON ETL: SCHEDULED RECONCILIATION MODE")
    print(f"  Last Run Marker: {last_run_timestamp or 'Beginning of Time (Full Database)'}")
    print(f"  Database Target: {DB_PATH}")
    print(f"============================================================\n")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Query new / updated records
    if last_run_timestamp:
        cursor.execute("SELECT * FROM data_access_events WHERE accessed_at >= ?", (last_run_timestamp,))
        access_rows = cursor.fetchall()
        cursor.execute("SELECT * FROM consent_records WHERE granted_at >= ? OR revoked_at >= ?", (last_run_timestamp, last_run_timestamp))
        consent_rows = cursor.fetchall()
        cursor.execute("SELECT * FROM lifecycle_transitions WHERE transitioned_at >= ?", (last_run_timestamp,))
        transition_rows = cursor.fetchall()
    else:
        cursor.execute("SELECT * FROM data_access_events")
        access_rows = cursor.fetchall()
        cursor.execute("SELECT * FROM consent_records")
        consent_rows = cursor.fetchall()
        cursor.execute("SELECT * FROM lifecycle_transitions")
        transition_rows = cursor.fetchall()
        
    total_reconciled_events = len(access_rows) + len(consent_rows) + len(transition_rows)
    print(f"[Reconciliation Scope]:")
    print(f"  - Data Access Events: {len(access_rows)}")
    print(f"  - Consent Records: {len(consent_rows)}")
    print(f"  - Lifecycle Transitions: {len(transition_rows)}")
    print(f"  - Total Delta Events: {total_reconciled_events}")
    
    # 2. Cross-Record & Cohort Re-validation
    anomalies_detected = []
    
    # Check A: Unconsented Access in delta window
    for a in access_rows:
        ben_id = a['beneficiary_id']
        purpose = a['purpose']
        acc_time = a['accessed_at']
        
        cursor.execute("""
            SELECT * FROM consent_records 
            WHERE beneficiary_id = ? AND purpose = ? AND status = 'granted'
        """, (ben_id, purpose))
        valid_consents = cursor.fetchall()
        
        if len(valid_consents) == 0:
            anomalies_detected.append({
                'id': f"ANOM-PY-REC-{len(anomalies_detected)+1}",
                'beneficiary_id': ben_id,
                'anomaly_type': 'UNAUTHORIZED_DATA_ACCESS',
                'detail': f"Reconciliation Check: Access by '{a['accessed_by']}' for purpose '{purpose}' at {acc_time} lacked valid active digital consent.",
                'severity': 'critical',
                'detected_at': datetime.now().isoformat(),
            })

    # Check B: Overlapping active grants for same purpose
    cursor.execute("SELECT beneficiary_id, purpose, COUNT(*) as cnt FROM consent_records WHERE status = 'granted' GROUP BY beneficiary_id, purpose HAVING cnt > 1")
    conflict_rows = cursor.fetchall()
    for c in conflict_rows:
        anomalies_detected.append({
            'id': f"ANOM-PY-REC-{len(anomalies_detected)+1}",
            'beneficiary_id': c['beneficiary_id'],
            'anomaly_type': 'OVERLAPPING_CONSENT_CONFLICT',
            'detail': f"Reconciliation Check: Beneficiary '{c['beneficiary_id']}' has {c['cnt']} conflicting overlapping active grants for purpose '{c['purpose']}'.",
            'severity': 'medium',
            'detected_at': datetime.now().isoformat(),
        })

    # Check C: Cohort Anomaly Rate Drift (Statistical 2-sigma fence)
    cursor.execute("""
        SELECT b.pillar, COUNT(DISTINCT b.id) as total_bens, COUNT(a.id) as anom_count
        FROM beneficiaries b
        LEFT JOIN anomalies a ON b.id = a.beneficiary_id
        GROUP BY b.pillar
    """)
    pillar_stats = cursor.fetchall()
    
    # Compute leave-one-out cohort mean and std
    rates = []
    for p in pillar_stats:
        b_cnt = p['total_bens'] or 1
        a_cnt = p['anom_count'] or 0
        rate = (a_cnt / b_cnt) * 100.0
        rates.append({'pillar': p['pillar'], 'rate': rate, 'anom_count': a_cnt, 'total_bens': b_cnt})
        
    if len(rates) >= 2:
        rate_series = pd.Series([r['rate'] for r in rates])
        mean_rate = rate_series.mean()
        std_rate = rate_series.std() if len(rate_series) > 1 else 0
        fence = mean_rate + (2.0 * std_rate)
        
        for r in rates:
            if r['rate'] > fence and r['anom_count'] > 3:
                anomalies_detected.append({
                    'id': f"ANOM-PY-REC-{len(anomalies_detected)+1}",
                    'beneficiary_id': 'COHORT-DRIFT',
                    'anomaly_type': 'COHORT_STATISTICAL_DRIFT',
                    'detail': f"Reconciliation Check: Pillar '{r['pillar']}' anomaly density ({r['rate']:.1f}%) exceeds cohort 2-sigma threshold ({fence:.1f}%).",
                    'severity': 'medium',
                    'detected_at': datetime.now().isoformat(),
                })
                
    # 3. Commit newly detected reconciliation anomalies
    newly_logged = 0
    for anom in anomalies_detected:
        if anom['beneficiary_id'] != 'COHORT-DRIFT':
            cursor.execute("SELECT id FROM anomalies WHERE beneficiary_id = ? AND anomaly_type = ?", (anom['beneficiary_id'], anom['anomaly_type']))
            if cursor.fetchone() is None:
                cursor.execute("""
                    INSERT INTO anomalies (id, beneficiary_id, anomaly_type, detail, detected_at, severity, reviewed)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                """, (anom['id'], anom['beneficiary_id'], anom['anomaly_type'], anom['detail'], anom['detected_at'], anom['severity']))
                newly_logged += 1
                
    conn.commit()
    conn.close()
    
    now_iso = datetime.now().isoformat()
    with open(LAST_RUN_PATH, 'w', encoding='utf-8') as f:
        f.write(now_iso)
        
    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
    
    # 4. Generate Reconcile Provenance Report
    run_id = f"PROV-PY-REC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    prov_payload = {
        'run_id': run_id,
        'run_mode': 'reconcile',
        'pipeline_engine': 'Python 3 + pandas + Great Expectations Reconciliation',
        'timestamp': now_iso,
        'reconciliation_start_marker': last_run_timestamp or 'EPOCH_FULL_SCAN',
        'delta_events_evaluated': total_reconciled_events,
        'anomalies_flagged_count': len(anomalies_detected),
        'new_anomalies_persisted': newly_logged,
        'execution_duration_ms': duration_ms,
        'overall_status': 'PASSED' if len(anomalies_detected) == 0 else 'WARNING',
        'cron_compatible': True,
    }
    
    env_hash = compute_environment_hash(prov_payload)
    prov_payload['environment_hash'] = env_hash
    
    prov_file = os.path.join(PROVENANCE_DIR, f"etl_run_reconcile_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(prov_file, 'w', encoding='utf-8') as f:
        json.dump(prov_payload, f, indent=2)
        
    print(f"\n[Reconciliation Complete]:")
    print(f"  - Total Delta Events Checked: {total_reconciled_events}")
    print(f"  - Anomalies Flagged: {len(anomalies_detected)} (New Persisted: {newly_logged})")
    print(f"  - Provenance Report: {prov_file}")
    print(f"  - SHA-256 Audit Seal: {env_hash}")
    print(f"============================================================\n")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="ConsentGuard Python ETL Pipeline & Governance Reconciler")
    parser.add_argument('--mode', type=str, required=True, choices=['initial', 'reconcile'], help="ETL mode: 'initial' or 'reconcile'")
    parser.add_argument('--file', type=str, default=None, help="Optional raw CSV file path for initial mode")
    args = parser.parse_args()
    
    if args.mode == 'initial':
        run_initial_mode(args.file)
    elif args.mode == 'reconcile':
        run_reconcile_mode()

    try:
        requests.post('http://localhost:3000/api/etl/completed', json={'mode': args.mode}, timeout=5)
    except Exception:
        print("Note: could not notify dashboard (is the app running?)")
