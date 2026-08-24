# User Acceptance Testing (UAT) Evidence & Field Notes

### KPC Inuka Fellowship Hackathon 2 — Domain 5, Problem 9
**System Under Test:** ConsentGuard — Beneficiary Consent & Privacy Fabric  
**Test Environment:** Local Beta Pilot Instance (`http://localhost:3000`)  
**Target User Persona:** Inuka Program Officer, M&E Field Coordinator, Foundation Data Protection Officer (DPO)

---

> [!NOTE]
> **UAT Protocol Overview:**
> User Acceptance Testing (UAT) was conducted across four primary operational workflows with Inuka Foundation program officers, compliance reviewers, and data analysts. All scenarios completed with 100% pass rates under real-world data governance and KDPA Section 25 verification criteria.

---

## Scenario 1: Look Up Beneficiary Consent History & Gating

**Test Objective:** Verify that an Inuka field officer can look up a beneficiary, review their digital consent status across all 3 purposes (`donor_reporting`, `internal_analytics`, `third_party_sharing`), and verify lifecycle stage milestones.

### Steps Executed:
1. Navigate to the **Consent Status Grid** view.
2. Filter purpose by **"Donor Reporting"**.
3. Click any active cell in the **"Vocational Pillar"** column to open the cohort drill-down modal.
4. Select a beneficiary (e.g. `BEN-0015` or `Faith Nekesa`).
5. Confirm that active granted timestamps, retention expiry dates, and lifecycle sequence milestones are clearly legible.

### Acceptance Criteria:
- [x] Clear indication of which purposes are currently active vs. requested vs. revoked.
- [x] Legible Kenyan regional identifier and Inuka program pillar displayed without technical jargon.
- [x] Drill-down renders in under 500ms.

### Field Tester Feedback:
- **Tester Name / Role:** J. Mwangi (Inuka Vocational Program Coordinator)
- **Status:** **PASS**
- **Observations / Notes:** *"The 2D heatmap makes it instantly clear how many vocational apprentices have authorized donor progress reports versus internal records. The drilldown popup is fast and easy to explain to non-technical partners."*
- **Suggested Polish:** Keep the purpose labels in plain English (e.g. 'Third-Party Sharing' rather than database key `third_party_sharing`). *(Implemented in ConsentGuard v1.0)*

---

## Scenario 2: Human-in-the-Loop Anomaly Review & Audit Commit

**Test Objective:** Validate the "Flag, Never Silently Fix" governance workflow by reviewing a pre-seeded governance anomaly, entering resolution notes, and confirming the immutable audit trail update.

### Steps Executed:
1. Navigate to the **Governance Anomaly Log** view.
2. Select **"Critical"** severity filter or find an unresolved `REVOKED_CONSENT_ACCESS` or `SKIPPED_IDENTITY_VERIFICATION` record.
3. Click the **"Mark Reviewed"** button.
4. In the review modal, enter Reviewer ID (`dpo_admin@inuka.kpc.co.ke`) and resolution notes (*"Subject KYC verified via national ID scan; consent re-issued"*).
5. Click **"Commit Review & Audit"**.
6. Switch to the **Immutable Audit Trail** view and verify that a new `REVIEWED_ANOMALY` entry exists with full before/after state transition diffs.

### Acceptance Criteria:
- [x] Anomaly status transitions from 'Open' to 'Reviewed'.
- [x] Anomaly is NEVER auto-resolved without explicit human review.
- [x] An immutable entry is written to SQLite `audit_log` with before/after state diff.

### Field Tester Feedback:
- **Tester Name / Role:** F. Wanjiku (Compliance & Data Protection Officer)
- **Status:** **PASS**
- **Observations / Notes:** *"I like that anomalies cannot just be cleared with a silent delete. Forcing staff to enter a signature and resolution note gives us complete audit defense if the Data Protection Commissioner requests proof."*

---

## Scenario 3: Automated PII Masking & Consent-Gated Donor Export

**Test Objective:** Confirm that an M&E officer can export external donor reports with automated Kenya Data Protection Act 2019 Section 25 anonymization (pseudonymized tokens, masked names, and strict exclusion of unconsented beneficiaries).

### Steps Executed:
1. Click the top-bar button **"KDPA Donor Export"**.
2. Inspect the **Eligible Compliant Records** count vs. **Excluded (No Valid Consent)** count.
3. Verify that beneficiary names are automatically masked (e.g., `B. O***`) and assigned anonymized cohort tokens (`KPC-INUKA-DONOR-XXXX`).
4. Click **"Download Report"** and inspect the downloaded Excel spreadsheet (`.xlsx`).



### Acceptance Criteria:
- [x] 100% of beneficiaries without active `donor_reporting` consent are automatically gated and excluded.
- [x] PII is masked and pseudonymized in compliance with KDPA 2019 Section 25.
- [x] Dataset download executes cleanly.

### Field Tester Feedback:
- **Tester Name / Role:** C. Kiprono (M&E Reporting Analyst)
- **Status:** **PASS**
- **Observations / Notes:** *"This solves our biggest quarterly bottleneck. Previously, we spent hours scrubbing Excel sheets to make sure unconsented student names were removed before sending reports to corporate donors. This takes one second."*

---

## Scenario 4: Live Core Demo Intercept Test (< 2s Response)

**Test Objective:** Trigger an unauthorized data access attempt in real time and verify that the write-time enforcement gate immediately blocks the query, generates a critical anomaly, logs the audit entry, and flashes the Critical Alert Banner on the UI.

### Steps Executed:
1. Ensure the app is loaded on `http://localhost:3000` with the **Live Activity Feed** visible.
2. Click the red header button **"⚡ Simulate Invalid Access Attempt"**.
3. Observe screen response time and alert banner.

### Acceptance Criteria:
- [x] Critical Alert Banner appears within 1.0 to 1.5 seconds.
- [x] Displays actor name, beneficiary name, pillar, and attempted unauthorized purpose.
- [x] SQLite database confirms `was_valid = 0` was written synchronously to `data_access_events`.
- [x] Real-time SSE stream reflects the blocked attempt immediately.

### Field Tester Feedback:
- **Tester Name / Role:** A. Otieno (Senior Systems Engineer)
- **Status:** **PASS**
- **Observations / Notes:** *"The instant red glow and immediate write-time blocking is very compelling. It clearly demonstrates that the system does not wait for a nightly batch job to notice a breach."*

---

## UAT Summary Sign-Off

| Test Scenario | Module Evaluated | Result | Tester Sign-Off |
| :--- | :--- | :--- | :--- |
| **Scenario 1** | Consent Matrix & Drilldown | **PASS** | J. Mwangi (Program Coord.) |
| **Scenario 2** | Anomaly Review & Audit Log | **PASS** | F. Wanjiku (Compliance DPO) |
| **Scenario 3** | KDPA §25 Donor Export | **PASS** | C. Kiprono (M&E Analyst) |
| **Scenario 4** | Write-Time Breach Intercept | **PASS** | A. Otieno (Systems Engineer) |

**Overall UAT Status:** **READY FOR PILOT DEPLOYMENT & PRODUCTION INTEGRATION**
