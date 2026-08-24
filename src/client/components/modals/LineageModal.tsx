import React from 'react';
import { GitCompare, CheckCircle2, ArrowRight, Shield, X, AlertTriangle, Cpu } from 'lucide-react';

interface LineageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LineageModal: React.FC<LineageModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const comparisonRows = [
    {
      domain: 'Multi-Stage Sequence Validation',
      stage1: '7-Checkpoint Depot Sequence (gate-in → security → weigh-in → bay → load-start → load-end → weigh-out → gate-out). Validates all 7 consecutive pairs individually with named anomaly types.',
      stage2: '6-Milestone Beneficiary Lifecycle (applied → identity_verified → consent_requested → consent_granted → data_processed → consent_reviewed). Every adjacent transition validated individually with dedicated named anomalies.',
      linkup: 'Direct 1:1 Architectural Lineage',
    },
    {
      domain: 'Entity-Level Cross-Record Detection',
      stage1: 'Truck-Overlap Detection: Evaluated a truck (truck_id) across records over time to flag physically impossible overlapping journeys.',
      stage2: 'Consent-Conflict Detection: Evaluates a beneficiary across full consent history over time to flag conflicting overlapping active grants for the exact same purpose.',
      linkup: 'Entity-Aware Temporal Reasoning',
    },
    {
      domain: 'Core Demo Catch Moment',
      stage1: 'Caught truck in two places at once in real time.',
      stage2: 'Synchronous Write-Time Intercept: Catches unauthorized data access attempts with no active digital consent instantly at write time (sets was_valid = false and writes critical anomaly).',
      linkup: 'Live Real-Time Intercept Moment',
    },
    {
      domain: 'Statistical Outlier Thresholds',
      stage1: 'Deliberate 3× IQR fence (not textbook 1.5×) chosen deliberately because depot queues have a genuine fat catastrophic-delay tail.',
      stage2: 'Deliberate Mean + 2 Standard Deviations (2σ) leave-one-out cohort fence across Inuka pillars to catch programmatic drift without intake noise.',
      linkup: 'Deliberate, Defensible Cohort Statistics',
    },
    {
      domain: 'Flag, Never Silently Fix & Deliberate Divergence',
      stage1: 'Flagged and excluded imputed rows from KPI averages. Imputed operational timestamps using depot medians.',
      stage2: 'Flagged inconsistent records (e.g. missing granted_at) and excluded from KPIs. DELIBERATE DIVERGENCE: We NEVER impute or guess consent timestamps, as consent requires provable subject authorization.',
      linkup: 'Principled Governance Divergence',
    },
    {
      domain: 'Provenance Reporting',
      stage1: 'etl_run_report.json: recorded input hash, anomaly counts by type, and pass/fail gate status.',
      stage2: 'Real-Time Provenance Audit Report: records runtime duration, 5-gate evaluation health, anomaly breakdown, and SHA-256 cryptographic run hash.',
      linkup: 'Full Audit Provenance Transparency',
    },
    {
      domain: 'Regional Continuity',
      stage1: '5 Petroleum Depots across Kenya.',
      stage2: 'Full Nationwide Coverage: 8 Kenyan Regions rolling up all 47 Counties for comprehensive governance.',
      linkup: 'Consistent Operational Topology',
    },
    {
      domain: 'Data Fabric Upgrade',
      stage1: 'Batch ETL pipeline executed periodically via Python script.',
      stage2: 'Upgraded Event-Driven Streaming Fabric with Server-Sent Events (SSE) and write-time synchronous inline validation.',
      linkup: 'Stage 2 Real-Time Data Fabric Upgrade',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md">
      <div className="bg-white dark:bg-[#231F20] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#231F20] dark:text-white flex items-center gap-2">
                Technical Architecture Lineage & Continuity Matrix
              </h3>
              <p className="text-xs text-[#58595B] dark:text-slate-400">
                Architectural pattern lineage from Stage 1 (Depot Operations) to Stage 2 (ConsentGuard Governance Fabric)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#231F20] dark:hover:text-white rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          <div className="bg-[#F4F5F7] dark:bg-slate-950 p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 text-[#231F20] dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-[#ED1C24]">System Lineage Narrative:</span> ConsentGuard directly transitions the foundational data engineering principles established in Stage 1 into Inuka Foundation’s digital consent and data governance fabric. Every multi-stage validation, temporal entity conflict check, deliberate statistical choice, and provenance audit has been elevated into an event-driven, real-time streaming architecture.
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-800 text-[11px] uppercase tracking-wider bg-[#F4F5F7] dark:bg-slate-950 text-[#58595B] dark:text-slate-400">
                  <th className="p-3 font-semibold w-1/4">Architectural Pattern</th>
                  <th className="p-3 font-semibold w-1/3 text-[#58595B] dark:text-slate-300">Stage 1: FlowMaster Depot Ops</th>
                  <th className="p-3 font-semibold w-1/3 text-[#ED1C24]">Stage 2: ConsentGuard Fabric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F4F5F7]/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-[#231F20] dark:text-slate-200">
                      <div>{row.domain}</div>
                      <div className="text-[10px] text-[#ED1C24] font-mono mt-0.5">
                        ✓ {row.linkup}
                      </div>
                    </td>
                    <td className="p-3 text-[#58595B] dark:text-slate-300 leading-relaxed bg-[#F4F5F7]/50 dark:bg-slate-950/40">
                      {row.stage1}
                    </td>
                    <td className="p-3 text-[#231F20] dark:text-slate-200 leading-relaxed bg-red-50/30 dark:bg-red-950/10 font-medium">
                      {row.stage2}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#ED1C24] hover:bg-[#C8102E] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Close Lineage Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
