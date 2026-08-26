import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Users, CheckCircle2, AlertTriangle, Clock, Layers, ShieldCheck, ArrowRight } from 'lucide-react';

interface PurposeBreakdownItem {
  title: string;
  purpose: string;
  description: string;
  consentedPercent: number;
  pendingPercent: number;
  revokedPercent: number;
}

interface FieldOfficerConsentSummary {
  pillar: string;
  totalAssigned: number;
  fullyConsented: number;
  fullyConsentedPercent: number;
  actionRequired: number;
  purposeBreakdown: PurposeBreakdownItem[];
  recentUpdates: Array<{
    id: string;
    purpose: string;
    status: string;
    granted_at: string | null;
    revoked_at: string | null;
    beneficiary_id: string;
    beneficiary_name: string;
  }>;
}

export const FieldOfficerConsentStatus: React.FC = () => {
  const { token, pillarScope } = useAuth();
  const [summary, setSummary] = useState<FieldOfficerConsentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConsentSummary = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/field/consent-summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (err) {
        console.error('Error fetching field consent summary:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsentSummary();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#006193] dark:text-[#78c9ff] text-xs font-bold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Pillar Governance Metrics</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            Consent Status Overview ({pillarScope} Pillar)
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            Real-time breakdown of beneficiary consent authorizations and compliance adherence across the {pillarScope} program.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] bg-[#f8f9fb] dark:bg-[#121011] px-4 py-3 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>KDPA Rule 25 Compliant</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Total Assigned Candidates</span>
            <Users className="w-4 h-4 text-[#bb0013]" />
          </div>
          <div className="text-3xl font-extrabold text-[#191c1e] dark:text-white font-mono">
            {summary?.totalAssigned.toLocaleString() || '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Supervised in {pillarScope} cohort</p>
        </div>

        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Fully Consented Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
            {summary ? `${summary.fullyConsentedPercent}%` : '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">{summary?.fullyConsented || 0} active authorizations</p>
        </div>

        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Action Required / In-Flight</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
            {summary?.actionRequired || '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Pending intake or expired mandates</p>
        </div>
      </div>

      {/* Purpose Progress Breakdown */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
            Consent Authorization by Processing Purpose
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Consented
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Revoked
            </span>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          {summary?.purposeBreakdown.map(item => (
            <div key={item.purpose} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#191c1e] dark:text-white">{item.title}</span>
                  <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5]">{item.description}</p>
                </div>
                <div className="text-right font-mono font-bold text-xs text-[#191c1e] dark:text-white">
                  {item.consentedPercent}% Authorized
                </div>
              </div>

              {/* Progress Stack */}
              <div className="w-full h-3 rounded-full bg-[#edeef0] dark:bg-[#2a2426] flex overflow-hidden">
                <div style={{ width: `${item.consentedPercent}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
                <div style={{ width: `${item.pendingPercent}%` }} className="bg-amber-400 h-full transition-all duration-500" />
                <div style={{ width: `${item.revokedPercent}%` }} className="bg-[#bb0013] h-full transition-all duration-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
