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
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import type { AuditLog } from '../../../types/index.js';
import { formatDateTime } from '../../lib/utils.js';
import {
  StateTransitionInspectorModal,
  StateTransitionRecordView,
} from '../modals/StateTransitionInspectorModal.js';

export { StateTransitionInspectorModal, StateTransitionRecordView };

export const AuditTrailViewer: React.FC = () => {
  const { stats } = useLiveData();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

  const entityTypes = ['ALL', 'beneficiary', 'consent_record', 'anomaly', 'data_access_breach'];

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] dark:text-white tracking-tight">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
            Cryptographically sealed, append-only ledger of all beneficiary lifecycle mutations and consent verifications
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

        {/* Pagination */}
        {filteredLogs.length > PAGE_SIZE && (
          <div className="p-4 border-t border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-between text-xs font-mono">
            <span className="text-[#58595b] dark:text-[#cdc4c5]">
              Showing {(validPage - 1) * PAGE_SIZE + 1} to {Math.min(validPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} ledger blocks
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage === 1}
                className="px-2.5 py-1 rounded bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="px-2 py-0.5 bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6] rounded font-bold">
                {validPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage === totalPages}
                className="px-2.5 py-1 rounded bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* State Transition Inspector Modal */}
      <StateTransitionInspectorModal
        isOpen={Boolean(inspectedLog)}
        log={inspectedLog}
        onClose={() => setInspectedLog(null)}
      />
    </div>
  );
};
