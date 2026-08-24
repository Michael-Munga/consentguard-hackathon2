# ConsentGuard — Beneficiary Consent & Privacy Fabric

[![CI](https://github.com/Michael-Munga/consentguard/actions/workflows/ci.yml/badge.svg)](https://github.com/Michael-Munga/consentguard/actions/workflows/ci.yml)

### KPC Inuka Fellowship Hackathon 2 — Stage 2 Deliverable
**Domain 5: Data Governance, Security & Compliance**  
**Problem 9: Beneficiary Data Privacy & Consent Management Engine**

---

## 1. Executive Summary & Problem Addressed

The **KPC (Kenya Pipeline Company) Inuka Foundation** empowers youth and communities across Kenya through four core pillars:
- **Scholarship** (academic scholarships)
- **Plus** (general support & enrichment)
- **Vocational** (trades & apprenticeship training)
- **Tech** (software development & digital skills training)

Historically, beneficiary records and digital consents were tracked across manual spreadsheets, partner emails, and decentralized intake forms. Under the **Kenya Data Protection Act (KDPA) 2019**, the Foundation is legally obligated as a Data Controller to enforce purpose limitation, explicit digital consent gating, statutory data retention limits, and verifiable audit trails. 

**ConsentGuard** is a production-grade, event-driven Consent & Privacy Fabric that upgrades the Foundation's data infrastructure from reactive manual oversight into proactive, automated, write-time data governance.

---

## 2. Technical Quality & Integration: The Linkup Check

ConsentGuard directly builds upon and upgrades the architectural principles established in **Stage 1 (FlowMaster / Depot Ops)**. Rather than treating consent as a trivial boolean field, ConsentGuard ports the same validation depth, entity temporal reasoning, flag-don't-silently-fix ethos, and provenance reporting from the petroleum logistics domain into beneficiary privacy management.

### Architectural Lineage: Side-by-Side Comparison

| Architectural Pattern | Stage 1: FlowMaster (Depot Ops) | Stage 2: ConsentGuard (Beneficiary Privacy Fabric) | Architectural Lineage Rationale |
| :--- | :--- | :--- | :--- |
| **Foundational Batch Validation & Data Layer** | **Python 3 + pandas + Data Quality Validation Engine**: Ingested historical CSV depot batch exports and validated sequence & truck turnaround times. | **Python 3 + pandas + Great Expectations (Ephemeral In-Memory Engine)**: Ingests raw Inuka beneficiary CSV exports, executes 7 automated Great Expectations rules, logs rejected rows with full audit trails, and writes clean baseline data to SQLite. | **Direct 1:1 Engineering Lineage**: Genuine Python batch foundation upgraded with Great Expectations (matching the fellowship syllabus). |
| **Multi-Stage Sequence Validation** | **7-Checkpoint Depot Journey** (`gate-in` → `security` → `weighbridge-in` → `bay-assigned` → `loading-start` → `loading-end` → `weighbridge-out` → `gate-out`). Validated every consecutive checkpoint pair individually with dedicated named anomaly types. | **6-Milestone Beneficiary Lifecycle** (`applied` → `identity_verified` → `consent_requested` → `consent_granted` → `data_processed` → `consent_reviewed`). Validates every consecutive stage transition with named anomaly types (e.g. `SKIPPED_IDENTITY_VERIFICATION`, `SKIPPED_CONSENT_GRANT`). | **Direct 1:1 Lineage**: Multi-stage state machine that rejects invalid jumps rather than checking only start/end states. |
| **Entity-Level Cross-Record Detection** | **Truck Overlap Check**: Reasoned across multiple records over time for a single `truck_id` to catch physically impossible overlapping depot journeys. | **Consent Conflict Detection**: Evaluates a beneficiary's entire consent timeline to catch simultaneously active `granted` records for the exact same `purpose` without prior revocation or expiry. | **Temporal Entity Reasoning**: Evaluates records across an entity's timeline over time rather than validating a single row in isolation. |
| **Write-Time Intercept (Core Demo Moment)** | Caught a truck physically unable to be in two locations simultaneously in real time. | **Synchronous Write-Time Authorization**: For every data access event, checks whether valid, active consent exists at `accessed_at`. If missing, immediately sets `was_valid = false` and commits a `critical` anomaly synchronously to SQLite. | **Real-Time Defense**: Intercepts breaches at the exact moment of access, not hours later in a batch job. |
| **Statistical Outlier Detection** | **3× IQR Threshold** on turnaround time (not textbook 1.5×) deliberately chosen because depot queues possess a fat catastrophic-delay tail. | **Leave-One-Out 2-Sigma (Mean + 2σ) Threshold** on per-pillar weekly anomaly rates to detect programmatic drift without alert fatigue from normal intake variations. | **Deliberate Statistical Choices**: Thresholds are selected with stated, defensible mathematical reasoning specific to the operational cohort. |
| **Flag, Never Silently Fix & Deliberate Divergence** | Missing operational timestamps were imputed using depot historical medians and flagged with `_missing` flags to exclude from KPI averages. | Inconsistent consent records (e.g. missing `granted_at` timestamps) are flagged as `INCONSISTENT_CONSENT_STATE` and excluded from KPI metrics. **DELIBERATE DIVERGENCE**: We *never* infer or backfill consent timestamps. Operational metadata can be statistically imputed; legal consent requires verifiable human authorization. | **Principled Divergence**: Imputing consent would destroy legal provability. Flagging and excluding maintains data integrity without fabricating legal consent. |
| **Provenance Reporting** | `etl_run_report.json` recording input hashes, anomaly counts by type, and pass/fail gate statuses. | **Real-Time Provenance Run Report & Audit Certificates** (`etl_run_report.json` + `etl_run_<mode>_<timestamp>.json`) recording runtime duration, validation gate evaluations, anomaly breakdowns, and real SHA-256 cryptographic environment hashes. | **Proven Auditability**: Every pipeline batch writes an immutable provenance snapshot verifying gate health. |
| **Regional Topology** | 5 Petroleum Depots across Kenya. | **5 Kenyan Regional Hubs** (`Nairobi`, `Kisumu`, `Mombasa`, `Eldoret`, `Nakuru`) for operational continuity. | Standardized multi-region monitoring topology. |
| **Data Fabric Evolution** | Batch Python ETL pipeline executed on historical CSV exports. | **Dual-Engine Hybrid Fabric**: Python + Great Expectations handles foundational batch cleaning & scheduled reconciliation; TypeScript + SSE handles sub-second live stream validation. | **Stage 2 Data Fabric Upgrade**: Upgraded hybrid architecture balancing rigorous batch governance with sub-second event interception. |

---

## 3. Deliberate Hybrid Architecture (Python Batch + TypeScript Streaming)

ConsentGuard employs a **deliberate, principled hybrid architecture** designed to solve two fundamentally different data engineering challenges:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              CONSENTGUARD DUAL-ENGINE ARCHITECTURE                              │
├───────────────────────────────────────────────────┬─────────────────────────────────────────────┤
│   PYTHON FOUNDATIONAL ETL & RECONCILIATION LAYER   │       TYPESCRIPT REAL-TIME STREAMING FABRIC │
│   (Batch Governance & Scheduled Consistency)      │       (Instant Write-Time Breach Intercept) │
├───────────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Tooling: Python 3 + pandas + Great Expectations │ • Tooling: TypeScript + Express + Node.js   │
│ • Execution: In-memory ephemeral validation       │ • Execution: In-process synchronous checks  │
│ • Purpose: Batch raw data cleaning, initial       │ • Purpose: Sub-second live event streaming  │
│   ingestion & periodic scheduled reconciliation   │   (SSE) & instant write-time authorization  │
│ • Why Python? Great Expectations and pandas excel │ • Why TypeScript? Re-running batch pipelines│
│   at full-dataset, multi-rule batch validation    │   per event is too slow; TypeScript provides│
│   and cohort-level statistical scans.             │   the sub-20ms latency for live demo defense│
└───────────────────────────────────────────────────┴─────────────────────────────────────────────┘
                                                    │
                                                    ▼
                                  ┌───────────────────────────────────┐
                                  │   Shared SQLite Database (WAL)    │
                                  │       data/consentguard.db        │
                                  └───────────────────────────────────┘
```

1. **Python (Foundational Batch & Reconciliation)**: 
   - Directly carries forward the Stage 1 (`depot-flow-ops`) pipeline foundation.
   - Uses **Great Expectations** (used strictly as an in-memory/ephemeral library without heavy scaffolding) to validate raw beneficiary intake CSVs against 7 explicit business rules.
   - Rejects non-compliant rows into an auditable log (`etl/logs/rejected_rows_<date>.csv`) under the *"Flag, Never Silently Fix"* governance principle.
   - Executes periodic **reconciliation** across newly created database records to catch cross-record drift.
2. **TypeScript (Live Event Streaming & Sub-Second Interception)**:
   - Powers the real-time event simulator and Server-Sent Events (SSE) feed.
   - Executes **synchronous write-time authorization** on every data query in $<20\text{ ms}$, intercepting unconsented queries at the moment of access.
3. **Shared SQLite Single-Source-of-Truth**: Both engines read and write to the exact same database (`data/consentguard.db`), verifying seamless end-to-end integration.

---

## 4. Python ETL Layer Usage & Scheduled Reconciliation

### Installing Python Dependencies
```bash
pip install -r etl/requirements.txt
```

### Running the Python ETL Pipeline

#### 1. Generate Synthetic Raw Data Export (Messy Baseline)
```bash
python3 etl/generate_raw_export.py --count 200
```
*Generates a realistic messy CSV in `etl/raw_data/` containing deliberate data quality issues (temporal inversions, missing regions, typo pillars, unconsented active grants, and duplicate entries) for Great Expectations to validate.*

#### 2. Initial Ingestion Mode (Great Expectations Validation & Database Load)
```bash
python3 etl/pipeline.py --mode initial
```
*Validates the raw CSV using Great Expectations, separates clean rows from rejected rows, logs rejected rows to `etl/logs/rejected_rows_<date>.csv`, loads clean records into SQLite, and produces an immutable SHA-256 provenance certificate.*

#### 3. Scheduled Reconciliation Mode (Periodic Drift Scan)
```bash
python3 etl/pipeline.py --mode reconcile
```
*Scans all records created or modified since the last recorded run (`etl/logs/last_run.txt`), evaluates cross-record consent consistency, computes per-pillar $Mean + 2\sigma$ outlier drift, and records newly detected anomalies into the database.*

---

## 5. Scheduled Reconciliation (Production Deployment)

In a live production deployment at the KPC Inuka Foundation, the reconciliation mode would be scheduled via **cron** to run periodically (e.g. nightly at 2:00 AM):

```bash
# Crontab entry for nightly automated reconciliation at 2:00 AM:
0 2 * * * cd /path/to/consentguard && /usr/bin/python3 etl/pipeline.py --mode reconcile >> etl/logs/cron.log 2>&1
```

### Why Scheduled Reconciliation Complements Real-Time Validation:
- **Instant Write-Time Validation (TypeScript)** catches single-event access violations at the millisecond of arrival.
- **Nightly Batch Reconciliation (Python + Great Expectations)** evaluates aggregate, cohort-level patterns that can only be measured over time across hundreds of records (such as statistical pillar drift, cross-partner duplicate registrations, and multi-record timeline conflicts).
- *Note for Hackathon Evaluation*: For the live competition demonstration, the pipeline is executed on demand via plain terminal commands (`python3 etl/pipeline.py --mode initial/reconcile`) rather than waiting for scheduled cron triggers.

---

## 6. Real-Time Streaming Architecture & Engineering Trade-Offs

### Deliberate Architecture Decision: Server-Sent Events (SSE) vs. Heavy Message Brokers
In evaluating the Stage 2 data streaming requirement, we made a deliberate, principled engineering choice:
- **Decision**: We implemented an in-process, sub-second event generator and real-time broadcast engine using **native Server-Sent Events (SSE)** and SQLite write-ahead logging (WAL), instead of introducing external message brokers like Apache Kafka, Zookeeper, or RabbitMQ.
- **Rationale**:
  1. **Zero External Infrastructure Dependency**: The entire prototype runs locally with a single command without Docker, JVM containers, or external daemon orchestration.
  2. **True Event-Driven Paradigm**: Every synthetic event (intake, consent grant, revocation, data access) is validated **inline, synchronously at the instant of generation**, achieving the exact same architectural shift (validate-on-arrival vs validate-in-batch) without infrastructure overhead.
  3. **Deterministic Demo Reliability**: Includes a dedicated manual **"⚡ Simulate Invalid Access Attempt"** trigger button that guarantees live, sub-2-second breach interception in front of hackathon judges.

---

## 7. System Architecture & Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONSENTGUARD FABRIC                           │
└─────────────────────────────────────────────────────────────────────────┘
        │                                                     │
   [Inuka Intake]                                     [External Partners]
        │                                                     │
        ▼                                                     ▼
┌──────────────────┐                               ┌──────────────────────┐
│ Lifecycle Engine │                               │ Data Access Gating   │
│ (6 Milestones)   │                               │ (KDPA §25 Validator) │
└────────┬─────────┘                               └──────────┬───────────┘
         │                                                    │
         ├────────────────────────┬───────────────────────────┤
         ▼                        ▼                           ▼
┌─────────────────┐      ┌─────────────────┐        ┌───────────────────┐
│ Gate 1: Sequence│      │ Gate 2: Entity  │        │ Gate 3: Write-Time│
│ Check (No skips)│      │ Conflict Check  │        │ Consent Auth Gate │
└────────┬────────┘      └────────┬────────┘        └─────────┬─────────┘
         │                        │                           │
         └────────────────────────┼───────────────────────────┘
                                  ▼
                 ┌─────────────────────────────────┐
                 │     SQLite Data Fabric (WAL)    │
                 │  - beneficiaries                │
                 │  - consent_records              │
                 │  - data_access_events           │
                 │  - lifecycle_transitions        │
                 │  - anomalies (unresolved)       │
                 │  - audit_log (immutable)        │
                 └────────────────┬────────────────┘
                                  │
         ┌────────────────────────┴───────────────────────────┐
         ▼                                                    ▼
┌────────────────────────────────┐                 ┌────────────────────┐
│ SSE Live Stream Broadcaster    │                 │ Provenance Engine  │
│ (Sub-second push to UI)        │                 │ (Run Report Audit) │
└────────────────┬───────────────┘                 └────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       EXECUTIVE REACT DASHBOARD                         │
│  1. Live Activity Feed (Streaming Replay & Details Inspector)           │
│  2. Consent Status Overview (Status × Pillar Heatmap Pivot Grid)        │
│  3. Governance Anomaly Log (Human-in-the-Loop Review Workflow)          │
│  4. Regional & Pillar M&E View (Recharts Analytics & 2σ Outlier Fence)  │
│  5. Immutable Audit Trail (Read-Only Ledger & State Diffs)              │
│  + KDPA 2019 Anonymized Donor Excel (.xlsx) Export & Provenance Reports │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Getting Started (Single-Command Run)

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Setup & Launch
```bash
# 1. Install dependencies
npm install

# 2. Run test suite & check coverage (Vitest)
npm run test:coverage

# 3. Seed synthetic database (220+ beneficiaries across 4 pillars & 5 regions)
# Initializes database with verified baseline data and sample governance anomalies.
npm run seed

# 4. Start fullstack application (Single-port Vite + Express server)
npm run dev
```

Once started, open your browser at:
👉 **`http://localhost:3000`** (or default configured port)

---

## 9. Interactive Feature Walkthrough & Verification Guide

Follow these steps to explore and verify ConsentGuard's core operational capabilities:
1. **Observe the Live Activity Feed**: Watch real-time synthetic beneficiary intakes, lifecycle milestones, and consent authorizations streaming over SSE every 2.5 seconds.
2. **Review the Consent Status Grid**: View the 2D Pivot Heatmap crossing Consent Status by Inuka Pillar (Scholarship, Plus, Vocational, Tech). Click any cell to drill into the specific beneficiary cohort.
3. **Execute the Write-Time Breach Intercept Test**: Click the prominent red button **"⚡ Simulate Invalid Access Attempt"** in the top navigation bar.
   - Within **1 second**, a glowing, animated Critical Alert Banner will appear on screen.
   - The banner verifies that the unauthorized access attempt by an external actor was **intercepted synchronously at write time** (`was_valid = 0`), blocked, and committed to both `anomalies` and `audit_log`.
4. **Inspect the Anomaly Log**: Filter by Critical Severity, view the flagged breach, and click **"Mark Reviewed"** to sign off with DPO credentials.
5. **Open the Provenance Report**: Click **"Provenance Report"** to view the multi-stage validation gate evaluation and genuine SHA-256 cryptographic run hash.
6. **Open the KDPA Donor Export**: Click **"KDPA Donor Export"** to demonstrate Section 25 PII tokenization, automated consent gating, and Excel (.xlsx) export for donor progress reporting.


---

## 10. Test Suite & QA Evidence

ConsentGuard includes a full Vitest test suite validating all 6 core governance algorithms:
```bash
npm run test:coverage
```
- **Gate 1**: Stage Sequence Integrity (valid forward paths, invalid jumps, backward regressions)
- **Gate 2**: Entity-Level Consent Conflicts (overlapping active grants for identical purposes)
- **Gate 3**: Write-Time Consent Authorization (active consents, revoked consents, expired retention windows)
- **Gate 4**: Statistical Outlier Monitoring (leave-one-out 2-sigma cohort drift)
- **Gate 5**: Flag-Never-Silently-Fix Integrity (unverified metadata isolation)
- **Gate 6**: Provenance Run Report Generation (genuine SHA-256 hash digest verification)
- **Integration**: Database operations, SSE streaming, and live breach simulations.

---

## 11. License & Fellowship Attribution

Built for the **KPC Inuka Fellowship Hackathon 2 (Stage 2)** by the ConsentGuard Engineering Team.  
Conforms with the **Kenya Data Protection Act (KDPA) 2019** and the KPC Inuka Foundation Data Governance Charter.
