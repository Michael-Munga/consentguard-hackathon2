import { describe, it, expect } from 'vitest';
import {
  formatChannelOrActor,
  formatAuditDateTime,
} from '../client/components/modals/StateTransitionInspectorModal.js';
import {
  formatPurposeLabel,
  formatStageLabel,
} from '../client/lib/utils.js';

describe('State Transition Inspector & Audit Trail Presentation', () => {
  it('formats system actors into human-readable channel badges', () => {
    expect(formatChannelOrActor('beneficiary_sms_otp_portal')).toBe('SMS / OTP Portal (Beneficiary)');
    expect(formatChannelOrActor('portal_public_gateway')).toBe('Public Application Gateway');
    expect(formatChannelOrActor('workflow_coordinator')).toBe('Automated Workflow Coordinator');
    expect(formatChannelOrActor('ConsentGuard_WriteTime_Enforcer')).toBe('ConsentGuard Write-Time Enforcer');
    expect(formatChannelOrActor('external_auditor@partner.org')).toBe('external_auditor@partner.org');
  });

  it('formats ISO timestamps into clean locale strings', () => {
    const iso = '2026-08-24T08:39:58.741Z';
    const formatted = formatAuditDateTime(iso);
    expect(formatted).toContain('Aug');
    expect(formatted).toContain('2026');
    expect(formatAuditDateTime(null)).toBe('—');
  });

  it('formats consent purpose labels cleanly', () => {
    expect(formatPurposeLabel('donor_reporting')).toBe('Donor Reporting');
    expect(formatPurposeLabel('internal_analytics')).toBe('Internal Analytics');
    expect(formatPurposeLabel('third_party_sharing')).toBe('Third-Party Sharing');
  });

  it('formats lifecycle stage labels with numeric sequence', () => {
    expect(formatStageLabel('applied')).toBe('1. Applied');
    expect(formatStageLabel('identity_verified')).toBe('2. Identity Verified');
    expect(formatStageLabel('consent_requested')).toBe('3. Consent Requested');
    expect(formatStageLabel('consent_granted')).toBe('4. Consent Granted');
    expect(formatStageLabel('data_processed')).toBe('5. Data Processed');
    expect(formatStageLabel('consent_reviewed')).toBe('6. Consent Reviewed');
  });
});
