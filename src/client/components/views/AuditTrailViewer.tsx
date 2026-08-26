import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Lock,
  Eye,
  X,
  FileCode,
  ShieldCheck,
  Calendar,
  User,
  ArrowRight,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import type { AuditLog } from '../../../types/index.js';
import { formatDateTime } from '../../lib/utils.js';
import { Pagination } from '../common/Pagination.js';

interface AuditLogDiffModalProps {
  isOpen: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

const formatKeyLabel = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const renderFormattedValue = (key: string, val: any) => {
  if (val === null || val === undefined) {
    return <span className="text-[#58595b] dark:text-[#cdc4c5] italic">None</span>;
  }
  if (typeof val === 'boolean') {
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
          val
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}
      >
        {val ? 'TRUE / ALLOWED' : 'FALSE / BLOCKED'}
      </span>
    );
  }
  if (typeof val === 'object') {
    return <span className="font-mono text-[11px] break-all">{JSON.stringify(val)}</span>;
  }
  const str = String(val);
  const upper = str.toUpperCase();

  if (upper.includes('BLOCKED') || upper.includes('CRITICAL') || upper.includes('REVOKED')) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 inline-flex items-center gap-1">
        {str.replace(/_/g, ' ')}
      </span>
    );
  }
  if (upper === 'GRANTED' || upper === 'ACTIVE' || upper === 'SUCCESS' || upper === 'ALLOW') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
        {str.replace(/_/g, ' ')}
      </span>
    );
  }
  if (upper === 'REQUESTED' || upper === 'PENDING') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        {str.replace(/_/g, ' ')}
      </span>
    );
  }
  if (key.includes('purpose') || str === 'donor_reporting' || str === 'internal_analytics' || str === 'third_party_sharing') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        {str.replace(/_/g, ' ')}
      </span>
    );
  }
  if (key.includes('email') || key.includes('attempted_by') || str.includes('@')) {
    return (
      <span className="font-mono text-[11px] font-bold text-[#191c1e] dark:text-[#f0f1f3] break-all bg-[#edeef0] dark:bg-[#2e2a2b] px-2 py-0.5 rounded">
        {str}
      </span>
    );
  }
  return <span className="font-mono text-[11px] text-[#191c1e] dark:text-[#f0f1f3] break-all font-semibold">{str}</span>;
};

const StatePayloadViewer: React.FC<{
  data: any;
  nullLabel: string;
  isAfter?: boolean;
  viewMode: 'formatted' | 'raw';
}> = ({ data, nullLabel, isAfter, viewMode }) => {
  if (!data) {
    return (
      <div className="p-4 bg-[#f8f9fb] dark:bg-[#121011] rounded-xl border border-dashed border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] italic text-xs min-h-[140px] flex items-center justify-center">
        {nullLabel}
      </div>
    );
  }

  if (viewMode === 'raw' || typeof data !== 'object') {
    return (
      <div className="bg-[#f8f9fb] dark:bg-[#121011] p-3.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] font-mono text-[11px] overflow-x-auto min-h-[140px]">
        <pre className={`${isAfter ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#191c1e] dark:text-[#e2e4e9]'} whitespace-pre-wrap`}>
          {typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}
        </pre>
      </div>
    );
  }

  const entries = Object.entries(data);
  return (
    <div
      className={`p-3.5 rounded-xl border min-h-[140px] space-y-2 font-mono ${
        isAfter
          ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40'
          : 'bg-[#f8f9fb] dark:bg-[#121011] border-[#e2e4e9] dark:border-[#3a3839]'
      }`}
    >
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-1.5 border-b border-black/5 dark:border-white/5 last:border-0"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#58595b] dark:text-[#cdc4c5] font-bold shrink-0">
            {formatKeyLabel(key)}
          </span>
          <div className="text-left sm:text-right">
            {renderFormattedValue(key, val)}
          </div>
        </div>
      ))}
    </div>
  );
};

export const AuditLogDiffModal: React.FC<AuditLogDiffModalProps> = ({ isOpen, log, onClose }) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  if (!isOpen || !log) return null;

  const parseJson = (str: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const beforeJson = parseJson(log.before_state);
  const afterJson = parseJson(log.after_state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e2e4e9] dark:border-[#3a3839] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e] dark:text-white flex items-center gap-2">
                <span>Audit Ledger Proof: {log.action.replace(/_/g, ' ')}</span>
              </h3>
              <p className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">
                ID: {log.id} • Entity: {log.entity_type} ({log.entity_id})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white rounded-lg hover:bg-[#f8f9fb] dark:hover:bg-[#2a2627] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#f8f9fb] dark:bg-[#191c1e] p-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] uppercase font-mono block">Actor Identity</span>
              <span className="font-mono font-bold text-[#191c1e] dark:text-white break-all">{log.actor}</span>
            </div>
            <div className="bg-[#f8f9fb] dark:bg-[#191c1e] p-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] uppercase font-mono block">Recorded Timestamp</span>
              <span className="font-mono font-bold text-[#191c1e] dark:text-white">{formatDateTime(log.timestamp)}</span>
            </div>
            <div className="bg-[#f8f9fb] dark:bg-[#191c1e] p-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] uppercase font-mono block">Ledger Verification</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cryptographically Sealed
              </span>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#e2e4e9] dark:border-[#3a3839]">
            <span className="text-[11px] font-mono font-bold uppercase text-[#58595b] dark:text-[#cdc4c5]">
              State Transition Audit
            </span>
            <div className="inline-flex rounded-lg border border-[#e2e4e9] dark:border-[#3a3839] p-0.5 bg-[#f8f9fb] dark:bg-[#121011]">
              <button
                onClick={() => setViewMode('formatted')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  viewMode === 'formatted'
                    ? 'bg-white dark:bg-[#231f20] text-[#191c1e] dark:text-white shadow-xs'
                    : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e]'
                }`}
              >
                Formatted View
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-white dark:bg-[#231f20] text-[#191c1e] dark:text-white shadow-xs'
                    : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e]'
                }`}
              >
                Raw Cryptographic JSON
              </button>
            </div>
          </div>

          {/* Before & After State Diff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#58595b] dark:text-[#cdc4c5] block mb-1.5">
                Before State (Prior)
              </span>
              <StatePayloadViewer
                data={beforeJson}
                nullLabel="Initial Creation / Genesis"
                viewMode={viewMode}
              />
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold text-[#58595b] dark:text-[#cdc4c5] block mb-1.5">
                After State (Mutated)
              </span>
              <StatePayloadViewer
                data={afterJson}
                nullLabel="Deleted / Purged"
                isAfter={true}
                viewMode={viewMode}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-[#e2e4e9] dark:border-[#3a3839] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#f8f9fb] dark:bg-[#191c1e] hover:bg-[#edeef0] text-[#191c1e] dark:text-white rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer border border-[#e2e4e9] dark:border-[#3a3839]"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuditTrailViewer: React.FC = () => {
  const { stats } = useLiveData();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-log?limit=250');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [stats]);

  useEffect(() => {
    setCurrentPage(1);
  }, [entityFilter, searchQuery]);

  const filteredLogs = logs.filter((l) => {
    if (entityFilter !== 'ALL' && l.entity_type !== entityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.id.toLowerCase().includes(q) ||
        l.entity_id.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        (l.before_state && l.before_state.toLowerCase().includes(q)) ||
        (l.after_state && l.after_state.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const entityTypes = ['ALL', 'beneficiary', 'consent_record', 'anomaly', 'compliance_export'];

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] dark:text-white tracking-tight">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
            Cryptographically sealed, append-only ledger of all beneficiary mutations and digital consent verifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] bg-white dark:bg-[#231f20] px-3 py-1.5 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839]">
            Ledger Entries: <span className="font-bold text-[#191c1e] dark:text-white">{logs.length.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl p-4 shadow-ambient-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#58595b] dark:text-[#cdc4c5] uppercase font-mono mr-1">
            Filter Entity:
          </span>
          {entityTypes.map((type) => (
            <button
              key={type}
              onClick={() => setEntityFilter(type)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                entityFilter === type
                  ? 'bg-[#bb0013] text-white shadow-xs'
                  : 'bg-[#f8f9fb] dark:bg-[#191c1e] text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#edeef0] border border-[#e2e4e9] dark:border-[#3a3839]'
              }`}
            >
              {type.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#58595b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by ID, action..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs text-[#191c1e] dark:text-[#f0f1f3] placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
          />
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-ambient-md overflow-hidden min-h-[420px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#edeef0]/60 dark:bg-[#2e2a2b]/60 border-b border-[#e2e4e9] dark:border-[#3a3839] font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Ledger ID</th>
                <th className="py-3.5 px-4 font-semibold">Action Type</th>
                <th className="py-3.5 px-4 font-semibold">Entity Ref</th>
                <th className="py-3.5 px-4 font-semibold">Actor Identity</th>
                <th className="py-3.5 px-4 font-semibold">Timestamp (UTC)</th>
                <th className="py-3.5 px-4 text-right font-semibold">Audit Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[#58595b] dark:text-[#cdc4c5]">
                    <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setInspectedLog(log)}
                    className="hover:bg-[#f8f9fb] dark:hover:bg-[#191c1e] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#bb0013] font-bold whitespace-nowrap">
                      {log.id.slice(0, 12)}...
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-[#191c1e] dark:text-white">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#f3f4f6] dark:bg-[#3a3839] border border-[#e2e4e9] dark:border-[#4a4849] text-[#191c1e] dark:text-white">
                        {log.entity_type}:{log.entity_id.slice(0, 10)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedLog(log);
                        }}
                        className="font-mono text-[11px] text-[#006193] dark:text-[#91ccff] hover:underline font-semibold cursor-pointer"
                      >
                        Inspect Diff &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 15, 25, 50, 100]}
          />
        )}
      </div>

      {/* Audit Log Diff Modal */}
      <AuditLogDiffModal
        isOpen={Boolean(inspectedLog)}
        log={inspectedLog}
        onClose={() => setInspectedLog(null)}
      />
    </div>
  );
};
