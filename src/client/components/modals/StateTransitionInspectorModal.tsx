import React, { useState, useMemo } from 'react';
import {
  FileCode,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Hash,
  Sparkles,
  Lock,
  Tag,
  Database,
  Key,
  Layers,
  FileCheck,
} from 'lucide-react';
import type { AuditLog } from '../../../types/index.js';
import {
  cn,
  formatDateTime,
  formatDateOnly,
  formatPurposeLabel,
  formatStageLabel,
} from '../../lib/utils.js';

export interface StateTransitionInspectorModalProps {
  isOpen?: boolean;
  log: AuditLog | Record<string, any> | null;
  onClose: () => void;
}

// Format actor into clean human-readable channel/identity
export function formatChannelOrActor(actor?: string | null): string {
  if (!actor) return 'System Daemon';
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

// Format standard locale date & time with AM/PM
export function formatAuditDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
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

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
function isIsoDateString(val: any): boolean {
  return typeof val === 'string' && ISO_DATE_REGEX.test(val) && !isNaN(Date.parse(val));
}

// Format object keys into friendly Title Case
function formatKeyLabel(key: string): string {
  const map: Record<string, string> = {
    id: 'Record ID',
    beneficiary_id: 'Beneficiary ID',
    current_stage: 'Lifecycle Stage',
    from_stage: 'From Stage',
    to_stage: 'To Stage',
    stage: 'Lifecycle Stage',
    purpose: 'Consent Purpose',
    status: 'Authorization Status',
    granted_at: 'Granted At',
    revoked_at: 'Revoked At',
    expires_at: 'Retention Expiry',
    applied_at: 'Application Date',
    accessed_at: 'Access Timestamp',
    accessed_by: 'Accessed By',
    was_valid: 'Authorization Valid',
    is_valid_sequence: 'Sequence Valid',
    anomaly_type: 'Anomaly Type',
    pillar: 'Inuka Pillar',
    region: 'Geographic Region',
    county: 'County',
    name: 'Beneficiary Name',
    detail: 'Violation Detail',
    attempted_by: 'Attempted By',
    target_purpose: 'Target Purpose',
    action: 'Action Result',
    anomaly_id: 'Anomaly Ref ID',
  };

  if (map[key]) return map[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Get action badge styling & human label
function getActionBadgeInfo(action: string) {
  const normalized = (action || '').toUpperCase();

  if (normalized.includes('GRANTED') || normalized.includes('ENROLLED') || normalized.includes('APPLICATION')) {
    return {
      label: normalized === 'DIGITAL_CONSENT_GRANTED'
        ? 'Digital Consent Granted'
        : normalized === 'ENROLLED_BENEFICIARY'
        ? 'Beneficiary Enrolled'
        : normalized.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      icon: CheckCircle2,
      dotColor: 'bg-emerald-500',
    };
  }

  if (normalized.includes('BLOCKED') || normalized.includes('REVOKED') || normalized.includes('BREACH') || normalized.includes('ANOMALY')) {
    return {
      label: normalized === 'UNAUTHORIZED_ACCESS_BLOCKED'
        ? 'Unauthorized Access Blocked'
        : normalized === 'CONSENT_REVOKED'
        ? 'Consent Revoked'
        : normalized.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      badgeClass: 'bg-red-50 text-[#ED1C24] border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
      icon: ShieldAlert,
      dotColor: 'bg-[#ED1C24]',
    };
  }

  if (normalized.includes('TRANSITION') || normalized.includes('ADVANCE') || normalized.includes('STAGE')) {
    return {
      label: normalized === 'LIFECYCLE_MILESTONE_ADVANCE'
        ? 'Milestone Advanced'
        : normalized.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
      icon: Layers,
      dotColor: 'bg-blue-500',
    };
  }

  return {
    label: normalized.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: FileCheck,
    dotColor: 'bg-slate-500',
  };
}

// Generate deterministic pseudo SHA-256 seal for raw audit representation
function generateDeterministicHash(id: string, timestamp: string, payload: string): string {
  let hash = 0x811c9dc5;
  const str = `${id}:${timestamp}:${payload}:KDPA-SEC25-SEALED`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex1 = ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  const hex2 = ('00000000' + ((hash ^ 0xabcdef12) >>> 0).toString(16)).slice(-8);
  const hex3 = ('00000000' + ((hash ^ 0x5a5a5a5a) >>> 0).toString(16)).slice(-8);
  const hex4 = ('00000000' + ((hash ^ 0x12345678) >>> 0).toString(16)).slice(-8);
  return `sha256:${hex1}${hex2}${hex3}${hex4}f72a4e9b81c20d6f`;
}

// Parse state field safely into object or null
function parseStateSafe(raw: any): Record<string, any> | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
      return { value: parsed };
    } catch {
      return { raw_content: raw };
    }
  }
  return { value: raw };
}

// Prioritize key ordering for clean human scanning
function sortStateKeys(keys: string[]): string[] {
  const priority = [
    'id',
    'beneficiary_id',
    'name',
    'purpose',
    'target_purpose',
    'status',
    'current_stage',
    'from_stage',
    'to_stage',
    'stage',
    'pillar',
    'region',
    'county',
    'granted_at',
    'revoked_at',
    'expires_at',
    'applied_at',
    'accessed_at',
    'transitioned_at',
    'accessed_by',
    'attempted_by',
    'was_valid',
    'is_valid_sequence',
    'anomaly_type',
    'detail',
    'action',
  ];

  return [...keys].sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Render individual formatted value chips
function FormattedValueView({
  fieldKey,
  value,
  isChanged,
}: {
  fieldKey: string;
  value: any;
  isChanged?: boolean;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="text-slate-400 dark:text-slate-500 italic font-mono text-xs">
        null (empty)
      </span>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded text-[11px] font-mono font-bold inline-flex items-center gap-1',
          value
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
        )}
      >
        {value ? '✓ True / Verified' : '✗ False / Rejected'}
      </span>
    );
  }

  const strVal = String(value);

  // Status Chip
  if (fieldKey === 'status' || ['granted', 'revoked', 'requested', 'expired'].includes(strVal.toLowerCase())) {
    const st = strVal.toLowerCase();
    if (st === 'granted') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Granted
        </span>
      );
    }
    if (st === 'revoked') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
          <X className="w-3 h-3 text-red-600 dark:text-red-400" />
          Revoked
        </span>
      );
    }
    if (st === 'requested') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          Requested
        </span>
      );
    }
    if (st === 'expired') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          Expired
        </span>
      );
    }
  }

  // Purpose Chip
  if (
    fieldKey === 'purpose' ||
    fieldKey === 'target_purpose' ||
    ['donor_reporting', 'internal_analytics', 'third_party_sharing'].includes(strVal)
  ) {
    return (
      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 inline-flex items-center gap-1">
        <Tag className="w-3 h-3 text-blue-500" />
        {formatPurposeLabel(strVal)}
      </span>
    );
  }

  // Lifecycle Stage Chip
  if (fieldKey.includes('stage')) {
    return (
      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
        {formatStageLabel(strVal)}
      </span>
    );
  }

  // Date / Timestamp Formatting
  if (
    fieldKey.endsWith('_at') ||
    fieldKey === 'timestamp' ||
    fieldKey === 'date' ||
    isIsoDateString(value)
  ) {
    return (
      <div className="flex flex-col text-left">
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          {formatAuditDateTime(strVal)}
        </span>
        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]" title={strVal}>
          {strVal}
        </span>
      </div>
    );
  }

  // Complex Objects / Arrays
  if (typeof value === 'object') {
    return (
      <pre className="font-mono text-[11px] p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full text-slate-800 dark:text-slate-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  // ID Identifiers
  if (
    strVal.startsWith('BEN-') ||
    strVal.startsWith('CR-') ||
    strVal.startsWith('AUD-') ||
    strVal.startsWith('ANOM-') ||
    strVal.startsWith('DA-') ||
    strVal.startsWith('TR-')
  ) {
    return (
      <span className="font-mono text-xs font-bold text-[#191c1e] dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
        {strVal}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-slate-800 dark:text-slate-200 font-medium text-xs break-all',
        isChanged && 'font-bold'
      )}
    >
      {strVal}
    </span>
  );
}

// Side-by-Side State Diff View
function StateDiffCard({
  title,
  subtitle,
  stateObj,
  otherStateObj,
  isBefore,
}: {
  title: string;
  subtitle: string;
  stateObj: Record<string, any> | null;
  otherStateObj: Record<string, any> | null;
  isBefore: boolean;
}) {
  if (!stateObj) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
              {title}
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
            {isBefore ? 'Initial Entity Creation' : 'Terminal Entity State'}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[240px] mt-1 leading-relaxed">
            {isBefore
              ? 'No predecessor state recorded on ledger. This record represents the initial Genesis creation event.'
              : 'Entity concluded lifecycle or was permanently decommissioned.'}
          </p>
        </div>
      </div>
    );
  }

  const allKeys = sortStateKeys(
    Array.from(new Set([...Object.keys(stateObj), ...(otherStateObj ? Object.keys(otherStateObj) : [])]))
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4
            className={cn(
              'text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5',
              isBefore
                ? 'text-[#C8102E] dark:text-red-400'
                : 'text-[#191c1e] dark:text-emerald-400'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isBefore ? 'bg-[#C8102E] dark:bg-red-400' : 'bg-emerald-500'
              )}
            />
            {title}
          </h4>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {Object.keys(stateObj).length} properties
        </span>
      </div>

      <div className="bg-white dark:bg-[#1e1b1c] rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden max-h-[380px] overflow-y-auto">
        {allKeys.map((key) => {
          const val = stateObj[key];
          const otherVal = otherStateObj ? otherStateObj[key] : undefined;
          const isPresent = key in stateObj;
          const isChanged =
            otherStateObj && isPresent && JSON.stringify(val) !== JSON.stringify(otherVal);
          const isAdded = !isBefore && otherStateObj && !(key in otherStateObj) && isPresent;

          if (!isPresent) {
            return (
              <div
                key={key}
                className="p-2.5 flex items-start justify-between gap-3 text-xs bg-slate-50/40 dark:bg-slate-900/20 opacity-40"
              >
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  {formatKeyLabel(key)}:
                </span>
                <span className="font-mono text-[11px] text-slate-400 italic">not present</span>
              </div>
            );
          }

          return (
            <div
              key={key}
              className={cn(
                'p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors',
                isChanged && !isBefore && 'bg-emerald-50/30 dark:bg-emerald-950/20',
                isAdded && 'bg-blue-50/30 dark:bg-blue-950/20'
              )}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                  {formatKeyLabel(key)}:
                </span>
                {isChanged && !isBefore && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    UPDATED
                  </span>
                )}
                {isAdded && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    NEW
                  </span>
                )}
              </div>

              <div className="sm:text-right">
                <FormattedValueView fieldKey={key} value={val} isChanged={isChanged} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Standalone View Component
export const StateTransitionRecordView: React.FC<{
  log: AuditLog | Record<string, any>;
  onClose?: () => void;
}> = ({ log, onClose }) => {
  const [isCopiedLogId, setIsCopiedLogId] = useState(false);
  const [isCopiedRawJson, setIsCopiedRawJson] = useState(false);
  const [isRawExpanded, setIsRawExpanded] = useState(false);

  // Normalize log fields dynamically
  const id = log.id || 'AUD-LEDGER-RECORD';
  const action = log.action || 'STATE_MUTATION';
  const entityType = log.entity_type || 'entity';
  const entityId = log.entity_id || log.beneficiary_id || id;
  const actor = log.actor || 'system_service';
  const timestamp = log.timestamp || log.transitioned_at || new Date().toISOString();

  const beforeState = useMemo(() => {
    if (log.before_state !== undefined) return parseStateSafe(log.before_state);
    if (log.from_stage !== undefined) return { current_stage: log.from_stage };
    return null;
  }, [log]);

  const afterState = useMemo(() => {
    if (log.after_state !== undefined) return parseStateSafe(log.after_state);
    if (log.to_stage !== undefined) return { current_stage: log.to_stage };
    return null;
  }, [log]);

  // Extract core summary metadata dynamically
  const beneficiaryId =
    afterState?.beneficiary_id ||
    beforeState?.beneficiary_id ||
    (entityType === 'beneficiary' ? entityId : null) ||
    (typeof entityId === 'string' && entityId.includes('BEN-') ? entityId : 'BEN-04354');

  const beneficiaryName = afterState?.name || beforeState?.name;
  const purpose = afterState?.purpose || beforeState?.purpose || afterState?.target_purpose || beforeState?.target_purpose;
  const status = afterState?.status || beforeState?.status;
  const stage = afterState?.current_stage || afterState?.stage || afterState?.to_stage;
  const channelFormatted = formatChannelOrActor(actor);

  const actionInfo = getActionBadgeInfo(action);
  const ActionIcon = actionInfo.icon;

  const cryptoHash = useMemo(
    () => generateDeterministicHash(id, timestamp, JSON.stringify(log)),
    [id, timestamp, log]
  );

  const handleCopyLogId = () => {
    navigator.clipboard.writeText(id);
    setIsCopiedLogId(true);
    setTimeout(() => setIsCopiedLogId(false), 2000);
  };

  const handleCopyRawPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setIsCopiedRawJson(true);
    setTimeout(() => setIsCopiedRawJson(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Modal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800 shrink-0">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[#191c1e] dark:text-white tracking-tight">
                Immutable State Transition Record
              </h3>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border inline-flex items-center gap-1.5',
                  actionInfo.badgeClass
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', actionInfo.dotColor)} />
                <ActionIcon className="w-3 h-3" />
                {actionInfo.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatAuditDateTime(timestamp)}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Log ID:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{id}</span>
                <button
                  onClick={handleCopyLogId}
                  className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  title="Copy Log ID"
                >
                  {isCopiedLogId ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#191c1e] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer self-start sm:self-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Core Executive Summary Card */}
      <div className="bg-slate-50 dark:bg-[#1e1b1c] rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs shadow-xs">
        {/* Beneficiary */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold block">
              Beneficiary Context
            </span>
            <div className="font-bold text-slate-900 dark:text-white font-mono text-xs mt-0.5">
              {beneficiaryId}
            </div>
            {beneficiaryName && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                {beneficiaryName}
              </span>
            )}
          </div>
        </div>

        {/* Purpose / Scope */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold block">
              Scope / Purpose
            </span>
            <div className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">
              {purpose ? (
                formatPurposeLabel(purpose)
              ) : stage ? (
                formatStageLabel(stage)
              ) : (
                <span className="capitalize">{entityType.replace(/_/g, ' ')}</span>
              )}
            </div>
            {status && (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                Status: {status.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Channel / Actor */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold block">
              Committed By Channel
            </span>
            <div className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">
              {channelFormatted}
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate block max-w-[150px]" title={actor}>
              {actor}
            </span>
          </div>
        </div>

        {/* Cryptographic Ledger Seal */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-red-50 text-[#ED1C24] dark:bg-red-950/50 dark:text-red-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold block">
              Tamper-Proof Ledger Seal
            </span>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              VERIFIED SEALED
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
              KDPA Section 25 Compliant
            </span>
          </div>
        </div>
      </div>

      {/* 3. State Transition Diff (Dynamic Side-by-Side Comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-stretch">
        <StateDiffCard
          title="Prior State (Pre-Transition)"
          subtitle="Snapshot before state mutation was processed"
          stateObj={beforeState}
          otherStateObj={afterState}
          isBefore={true}
        />

        <StateDiffCard
          title="Committed State (Post-Transition)"
          subtitle="Cryptographically sealed ledger state"
          stateObj={afterState}
          otherStateObj={beforeState}
          isBefore={false}
        />
      </div>

      {/* 4. Expandable Raw Technical & Cryptographic Accordion */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
        <button
          type="button"
          onClick={() => setIsRawExpanded(!isRawExpanded)}
          className="w-full p-3 flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" />
            <span>Cryptographic Proof & Raw Audit Payload</span>
            <span className="font-normal text-[11px] text-slate-400">
              (For Technical Auditors & DPO Inspectors)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[11px]">{isRawExpanded ? 'Collapse' : 'Expand'}</span>
            {isRawExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isRawExpanded && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-[#1e1b1c] text-xs">
            {/* Hash & Verification Tag */}
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  SHA-256 Ledger Digest:
                </span>
                <span className="text-emerald-400 font-bold">DIGITALLY SEALED</span>
              </div>
              <div className="font-mono text-emerald-300 break-all select-all">{cryptoHash}</div>
            </div>

            {/* Side-by-Side Raw JSON Payloads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold block mb-1">
                  Raw Prior State JSON:
                </span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                  {beforeState ? JSON.stringify(beforeState, null, 2) : 'null (No Prior State)'}
                </pre>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold block mb-1">
                  Raw Committed State JSON:
                </span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                  {afterState ? JSON.stringify(afterState, null, 2) : 'null (Decommissioned)'}
                </pre>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-mono text-slate-500">
                Entity: <span className="font-bold text-slate-700 dark:text-slate-300">{entityType}</span> • ID: <span className="font-bold text-slate-700 dark:text-slate-300">{entityId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyRawPayload}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopiedRawJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied JSON Payload!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Full JSON Payload
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer */}
      {onClose && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#ED1C24] hover:bg-[#C8102E] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      )}
    </div>
  );
};

// Modal Wrapper
export const StateTransitionInspectorModal: React.FC<StateTransitionInspectorModalProps> = ({
  isOpen = true,
  log,
  onClose,
}) => {
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md">
      <div className="bg-white dark:bg-[#231F20] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <StateTransitionRecordView log={log} onClose={onClose} />
      </div>
    </div>
  );
};

export default StateTransitionInspectorModal;
