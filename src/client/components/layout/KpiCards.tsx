import React from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ArrowUp,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import type { TabType } from './Sidebar.js';

interface KpiCardsProps {
  onSelectTab?: (tab: TabType) => void;
  onOpenBeneficiaries?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ onSelectTab, onOpenBeneficiaries }) => {
  const { stats } = useLiveData();

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-[#ffffff] dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] animate-pulse" />
        ))}
      </div>
    );
  }

  const {
    total_beneficiaries,
    active_consents,
    unresolved_anomalies,
    critical_anomalies,
    compliance_rate,
    anomalies_by_severity,
  } = stats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Total Beneficiaries */}
      <div
        onClick={() => {
          if (onOpenBeneficiaries) {
            onOpenBeneficiaries();
          } else {
            onSelectTab?.('analytics');
          }
        }}
        className="bg-[#ffffff] dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-4 flex flex-col justify-between shadow-ambient-md cursor-pointer hover:border-[#bb0013] transition-all group"
        title="Click to open Beneficiary Directory (47 Counties)"
      >
        <div className="flex justify-between items-start mb-2">
          <p className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
            Total Beneficiaries
          </p>
          <Users className="w-5 h-5 text-[#006193] dark:text-[#91ccff]" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-2xl font-bold font-mono text-[#191c1e] dark:text-white">
            {total_beneficiaries.toLocaleString()}
          </h3>
          <span className="text-xs text-[#10B981] font-mono flex items-center font-medium">
            <ArrowUp className="w-3.5 h-3.5" /> 2.4%
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#58595b] dark:text-[#cdc4c5] border-t border-[#e2e4e9] dark:border-[#3a3839] pt-2">
          <span>8 Regions (47 Counties)</span>
          <span className="text-[#bb0013] font-semibold group-hover:underline">Open Directory &rarr;</span>
        </div>
      </div>

      {/* Card 2: Active Digital Consents */}
      <div
        onClick={() => onSelectTab?.('consent')}
        className="bg-[#ffffff] dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-4 flex flex-col justify-between shadow-ambient-md cursor-pointer hover:border-[#10B981] transition-all group"
        title="Click to view Consent Status Grid"
      >
        <div className="flex justify-between items-start mb-2">
          <p className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
            Active Digital Consents
          </p>
          <ShieldCheck className="w-5 h-5 text-[#10B981]" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-2xl font-bold font-mono text-[#191c1e] dark:text-white">
            {active_consents.toLocaleString()}
          </h3>
          <span className="text-xs text-[#10B981] font-mono flex items-center font-medium">
            <ArrowUp className="w-3.5 h-3.5" /> 1.1%
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#58595b] dark:text-[#cdc4c5] border-t border-[#e2e4e9] dark:border-[#3a3839] pt-2">
          <span>KDPA §25 Certified</span>
          <span className="text-[#10B981] font-semibold group-hover:underline">View Grid &rarr;</span>
        </div>
      </div>

      {/* Card 3: Governance Anomalies */}
      <div
        onClick={() => onSelectTab?.('anomalies')}
        className="bg-[#ffffff] dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-4 flex flex-col justify-between shadow-ambient-md relative overflow-hidden cursor-pointer hover:border-[#bb0013] transition-all group"
        title="Click to inspect Governance Anomaly Log"
      >
        <div className="absolute top-0 right-0 w-1.5 h-full bg-[#bb0013]"></div>
        <div className="flex justify-between items-start mb-2">
          <p className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
            Governance Anomalies
          </p>
          <AlertTriangle className="w-5 h-5 text-[#bb0013]" />
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-[#191c1e] dark:text-white">Critical</span>
            <span className="font-mono text-[11px] font-bold bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6] px-2 py-0.5 rounded-full">
              {anomalies_by_severity.critical}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#58595b] dark:text-[#cdc4c5]">Medium / Elevated</span>
            <span className="font-mono text-[11px] font-bold bg-[#fef3c7] text-[#92400e] dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
              {anomalies_by_severity.medium}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#58595b] dark:text-[#cdc4c5] border-t border-[#e2e4e9] dark:border-[#3a3839] pt-1.5">
          <span>{unresolved_anomalies} Unresolved</span>
          <span className="text-[#bb0013] font-semibold group-hover:underline">Review &rarr;</span>
        </div>
      </div>

      {/* Card 4: Write-Time Compliance */}
      <div
        onClick={() => onSelectTab?.('audit')}
        className="bg-[#ffffff] dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-4 flex flex-col justify-between shadow-ambient-md cursor-pointer hover:border-[#006193] transition-all group"
        title="Click to view Immutable Audit Trail"
      >
        <div className="flex justify-between items-start mb-2">
          <p className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
            Write-Time Compliance
          </p>
          <Activity className="w-5 h-5 text-[#006193] dark:text-[#91ccff]" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-2xl font-bold font-mono text-[#191c1e] dark:text-white">
            {compliance_rate}%
          </h3>
        </div>
        <div className="w-full bg-[#edeef0] dark:bg-[#3a3839] h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-[#006193] dark:bg-[#91ccff] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, compliance_rate)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#58595b] dark:text-[#cdc4c5] border-t border-[#e2e4e9] dark:border-[#3a3839] pt-2">
          <span>0 Silently Fixed</span>
          <span className="text-[#006193] dark:text-[#91ccff] font-semibold group-hover:underline">Audit Ledger &rarr;</span>
        </div>
      </div>
    </div>
  );
};

