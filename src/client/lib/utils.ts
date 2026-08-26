import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AnomalySeverity, ConsentPurpose, Pillar, Region } from '../../types/index.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(isoString);
  }
}

export function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(isoString);
  }
}

export function formatAuditDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(isoString);
  }
}

export function formatChannelOrActor(actor?: string | null): string {
  if (!actor) return 'System Process';
  switch (actor) {
    case 'beneficiary_sms_otp_portal':
      return 'SMS / OTP Portal (Beneficiary)';
    case 'portal_public_gateway':
      return 'Public Application Gateway';
    case 'system_intake@inuka.kpc.co.ke':
      return 'Inuka Intake Gateway';
    case 'workflow_coordinator':
      return 'Automated Workflow Coordinator';
    case 'ConsentGuard_WriteTime_Enforcer':
      return 'ConsentGuard Write-Time Enforcer';
    case 'donor_reporting_pipeline':
      return 'Donor Reporting Pipeline';
    case 'inuka_mne_analyst':
      return 'Inuka M&E Analyst';
    case 'scholarship_auditor':
      return 'Scholarship Governance Auditor';
    default:
      if (actor.includes('@')) return actor;
      return actor
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatPurposeLabel(purpose: ConsentPurpose | string): string {
  switch (purpose) {
    case 'donor_reporting':
      return 'Donor Reporting';
    case 'internal_analytics':
      return 'Internal Analytics';
    case 'third_party_sharing':
      return 'Third-Party Sharing';
    default:
      return purpose.replace(/_/g, ' ');
  }
}

export function getSeverityBadgeClass(severity: AnomalySeverity | string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 text-[#ED1C24] border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    case 'medium':
      return 'bg-[#F4F5F7] text-[#C8102E] border-red-200 dark:bg-[#231F20] dark:text-red-300 dark:border-slate-700';
    case 'low':
      return 'bg-[#F4F5F7] text-[#58595B] border-slate-300 dark:bg-[#231F20] dark:text-slate-300 dark:border-slate-700';
    default:
      return 'bg-[#F4F5F7] text-[#58595B] border-slate-300 dark:bg-[#231F20] dark:text-slate-300 dark:border-slate-700';
  }
}

export function getPillarBadgeClass(pillar: Pillar | string): string {
  switch (pillar) {
    case 'Scholarship':
      return 'bg-red-50 text-[#ED1C24] border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    case 'Plus':
      return 'bg-[#231F20] text-[#FFFFFF] border-slate-700 dark:bg-white dark:text-[#231F20] dark:border-slate-300';
    case 'Vocational':
      return 'bg-[#F4F5F7] text-[#58595B] border-slate-300 dark:bg-[#231F20] dark:text-slate-300 dark:border-slate-700';
    case 'Tech':
      return 'bg-red-50 text-[#C8102E] border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
    default:
      return 'bg-[#F4F5F7] text-[#58595B] border-slate-300 dark:bg-[#231F20] dark:text-slate-300 dark:border-slate-700';
  }
}

export const REGION_COUNTIES: Record<string, string[]> = {
  'Nairobi': ['Nairobi'],
  'Central': ['Kiambu', 'Nyeri', "Murang'a", 'Kirinyaga', 'Nyandarua'],
  'Coast': ['Mombasa', 'Kilifi', 'Kwale', 'Taita Taveta', 'Lamu'],
  'Rift Valley': ['Nakuru', 'Uasin Gishu', 'Kajiado', 'Baringo', 'Narok', 'Kericho'],
  'Western': ['Kakamega', 'Bungoma', 'Busia', 'Vihiga'],
  'Nyanza': ['Kisumu', 'Siaya', 'Homa Bay', 'Kisii', 'Migori'],
  'Eastern': ['Machakos', 'Kitui', 'Makueni', 'Meru', 'Embu'],
  'North Eastern': ['Garissa', 'Wajir', 'Mandera']
};

export const ALL_COUNTIES = Object.values(REGION_COUNTIES).flat().sort();

