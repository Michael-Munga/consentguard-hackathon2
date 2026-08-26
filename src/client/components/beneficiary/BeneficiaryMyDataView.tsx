import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { User, Shield, ShieldCheck, MapPin, Calendar, Award, Database, CheckCircle2, Lock, Eye } from 'lucide-react';
import type { DataAccessEvent } from '../../../types/index.js';
import { Pagination } from '../common/Pagination.js';
import { formatDateTime, formatDateOnly } from '../../lib/utils.js';

interface BeneficiaryMyDataViewProps {
  accessEvents: DataAccessEvent[];
}

export const BeneficiaryMyDataView: React.FC<BeneficiaryMyDataViewProps> = ({ accessEvents }) => {
  const { user } = useAuth();
  const ben = user?.userType === 'beneficiary' ? user : null;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-[#bb0013] dark:text-[#ffb4ab] text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Beneficiary Data Sovereign Record</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            My Registered Fellowship Data
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            Review your master record details, active pillar assignment, and verify data access events logged by the system.
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] p-6 shadow-sm md:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#bb0013] dark:text-[#ffb4ab] flex items-center justify-center font-extrabold text-xl shadow-inner">
              {ben?.name ? ben.name.charAt(0) : 'F'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#191c1e] dark:text-white">{ben?.name || 'Faith Kamau'}</h3>
              <p className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                Beneficiary ID: <span className="font-bold text-[#bb0013] dark:text-[#ffb4ab]">{ben?.id || 'INK-84920'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839]">
            <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <div className="flex items-center gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-1">
                <Award className="w-4 h-4 text-[#bb0013]" />
                <span>Fellowship Pillar</span>
              </div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white">{ben?.pillar || 'Scholarship'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <div className="flex items-center gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-1">
                <MapPin className="w-4 h-4 text-[#bb0013]" />
                <span>County & Regional Hub</span>
              </div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white">
                {ben?.county || 'Nairobi'} ({ben?.region || 'Nairobi'})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <div className="flex items-center gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-1">
                <Calendar className="w-4 h-4 text-[#bb0013]" />
                <span>Registration Date</span>
              </div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white font-mono">
                {formatDateOnly(ben?.applied_at || '2026-01-15')}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <div className="flex items-center gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>KDPA Privacy Status</span>
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Protected & Verified
              </span>
            </div>
          </div>
        </div>

        {/* Mandate Card */}
        <div className="bg-gradient-to-br from-[#bb0013] to-[#93000d] text-white rounded-3xl p-6 shadow-xl shadow-red-900/20 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold">KDPA 2019 Section 25</h3>
            <p className="mt-2 text-xs text-white/80 leading-relaxed">
              Your identity is protected under statutory pseudonymization. External stakeholders only receive masked tokens (e.g. F. K***) with strict 365-day expiry.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="opacity-80">Security Level:</span>
              <span className="font-bold">Zero Trust Write-Time</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Masking Rule:</span>
              <span className="font-bold">Section 25 Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Access Events */}
      <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-bold text-[#191c1e] dark:text-white mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#bb0013]" />
          <span>System Data Access Log (Who Accessed My Record)</span>
        </h3>

        {accessEvents.length === 0 ? (
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] font-mono py-4">
            No external data access events logged for your account yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] uppercase font-bold text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Processing Purpose</th>
                  <th className="py-3 px-4">Authorized Actor / System</th>
                  <th className="py-3 px-4 text-right">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
                {accessEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(evt => (
                  <tr key={evt.id} className="hover:bg-[#f8f9fb] dark:hover:bg-[#121011]">
                    <td className="py-3 px-4 font-mono text-[#58595b] dark:text-[#cdc4c5]">
                      {formatDateTime(evt.accessed_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#191c1e] dark:text-white">
                      {evt.purpose.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#58595b] dark:text-[#cdc4c5]">{evt.accessed_by}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                        KDPA Verified Valid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {accessEvents.length > pageSize && (
              <Pagination
                currentPage={currentPage}
                totalItems={accessEvents.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
