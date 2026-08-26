import React from 'react';
import { History, ShieldCheck, CheckCircle2, XCircle, ArrowUpRight, Clock, FileText } from 'lucide-react';
import type { AuditLog, ConsentRecord } from '../../../types/index.js';
import { formatDateTime } from '../../lib/utils.js';

interface BeneficiaryHistoryViewProps {
  auditLogs: AuditLog[];
  consents: ConsentRecord[];
}

export const BeneficiaryHistoryView: React.FC<BeneficiaryHistoryViewProps> = ({
  auditLogs,
  consents,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#006193] dark:text-[#78c9ff] text-xs font-bold mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Immutable Privacy Audit Log</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            Consent Activity & History
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            A transparent, cryptographic timeline of every authorization granted, revoked, or evaluated for your account.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] bg-[#f8f9fb] dark:bg-[#121011] px-4 py-3 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Section 25 KDPA Verified</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-bold text-[#191c1e] dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#bb0013]" />
          <span>Chronological Log Entries</span>
        </h3>

        {auditLogs.length === 0 ? (
          <div className="text-center py-12 text-[#58595b] dark:text-[#cdc4c5] text-xs font-mono">
            No audit records logged yet.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-red-100 dark:border-red-950 space-y-8">
            {auditLogs.map((log, idx) => {
              const isGrant = log.action.includes('GRANT');
              const isRevoke = log.action.includes('REVOKE');
              const isEnroll = log.action.includes('ENROLL') || log.action.includes('INIT');

              return (
                <div key={log.id || idx} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#1e1b1c] ${
                      isGrant
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                        : isRevoke
                        ? 'bg-[#bb0013] shadow-md shadow-red-500/30'
                        : 'bg-blue-500 shadow-md shadow-blue-500/30'
                    }`}
                  />

                  {/* Content Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] hover:border-[#bb0013]/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {isGrant && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {isRevoke && <XCircle className="w-4 h-4 text-[#bb0013]" />}
                        {isEnroll && <FileText className="w-4 h-4 text-blue-600" />}
                        <span className="font-bold text-sm text-[#191c1e] dark:text-white">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#58595b] dark:text-[#cdc4c5]">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5] mt-3 pt-3 border-t border-[#e2e4e9] dark:border-[#3a3839]">
                      <div>
                        <span className="font-semibold">Entity / Purpose: </span>
                        <span className="font-mono text-[#191c1e] dark:text-white">{log.entity_id}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Authorized Actor: </span>
                        <span className="font-mono text-[#191c1e] dark:text-white">{log.actor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
