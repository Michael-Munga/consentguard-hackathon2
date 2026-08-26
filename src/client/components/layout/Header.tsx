import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldOff,
  Clock,
  FileWarning,
  TrendingUp,
  Database,
  FileCheck,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  GitCompare,
  Loader2,
  Sun,
  Moon,
  Shield,
  LogOut,
  Zap,
  ChevronDown,
  X,
  UserX,
  Sparkles,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  onOpenProvenance: () => void;
  onOpenDonorReport: () => void;
  onOpenLineage: () => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProvenance,
  onOpenDonorReport,
  onOpenLineage,
}) => {
  const {
    isConnected,
    isTriggeringDemo,
    lastRevokedBeneficiaryId,
    simulateUnauthorizedAccess,
    simulateRevokedAccess,
    simulateExpiredAccess,
    simulateInconsistentState,
    simulateBehavioralOutlier,
    simulateBulkExfiltration,
    triggerRealComplianceExport,
    triggerRealReviewLatestAnomaly,
    triggerRealProvenanceGenerate,
  } = useLiveData();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState(false);
  const [toastInfo, setToastInfo] = useState<string | null>(null);

  const isComplianceOfficer = !user || user.role === 'compliance_officer';

  const handleAction = async (fn: () => Promise<any>, successLabel: string) => {
    try {
      await fn();
      setToastInfo(successLabel);
      setTimeout(() => setToastInfo(null), 4000);
    } catch (err: any) {
      setToastInfo(`Error: ${err.message || 'Action failed'}`);
      setTimeout(() => setToastInfo(null), 4500);
    }
  };

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-260px)] h-[72px] bg-[#f8f9fb] dark:bg-[#191c1e] shadow-sm border-b border-[#e2e4e9] dark:border-[#3a3839] flex justify-between items-center px-6 z-40 transition-colors">
      {/* Left Title & Live Stream Status */}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-base text-[#191c1e] dark:text-white tracking-tight">
          Compliance Engine
        </h2>
        <div className="hidden sm:flex items-center gap-2 bg-[#f3f4f6] dark:bg-[#231f20] px-3 py-1.5 rounded-full border border-[#e2e4e9] dark:border-[#3a3839]">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#bb0013] blinking-indicator' : 'bg-amber-500'}`}
          ></span>
          <span className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5]">
            {isConnected ? 'Live Data Stream Active' : 'Connecting Stream...'}
          </span>
        </div>
      </div>

      {/* Right Actions, Lineage, Demo Control Panel, and Profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Action Icon Buttons */}
        <div className="flex items-center gap-1 border-r border-[#e2e4e9] dark:border-[#3a3839] pr-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 text-[#58595b] dark:text-[#cdc4c5] hover:text-[#bb0013] hover:bg-[#edeef0] dark:hover:bg-[#2e2a2b] rounded-lg transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#ffb4ab]" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenProvenance}
            aria-label="Provenance analytics"
            className="p-2 text-[#58595b] dark:text-[#cdc4c5] hover:text-[#bb0013] hover:bg-[#edeef0] dark:hover:bg-[#2e2a2b] rounded-lg transition-colors cursor-pointer"
            title="View Provenance Report & SHA-256 Audit Seal"
          >
            <FileCheck className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenDonorReport}
            aria-label="Donor export"
            className="p-2 text-[#58595b] dark:text-[#cdc4c5] hover:text-[#bb0013] hover:bg-[#edeef0] dark:hover:bg-[#2e2a2b] rounded-lg transition-colors cursor-pointer"
            title="Export KDPA Section 25 Donor Report"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>

        {/* Stage 1 -> 2 Lineage Button */}
        <button
          onClick={onOpenLineage}
          className="hidden lg:inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#191c1e] dark:text-[#f0f1f3] border border-[#e2e4e9] dark:border-[#3a3839] px-3.5 py-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#2e2a2b] transition-colors cursor-pointer"
        >
          <GitCompare className="w-3.5 h-3.5 text-[#006193] dark:text-[#91ccff]" />
          <span>Stage 1 ➔ 2 Lineage</span>
        </button>

        {/* DEMO CONTROL PANEL TOGGLE (COMPLIANCE OFFICER ONLY) */}
        {isComplianceOfficer && (
          <div className="relative">
            <button
              onClick={() => setIsDemoPanelOpen(!isDemoPanelOpen)}
              disabled={isTriggeringDemo}
              className="bg-[#bb0013] hover:bg-[#93000d] text-white font-mono text-xs font-bold px-3.5 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
              title="Open Live Demonstration Control Panel with 6 Anomaly Scenarios & 3 Real Action Presets"
            >
              {isTriggeringDemo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
              <span className="hidden sm:inline">Demo Scenarios</span>
              <span className="sm:hidden">Demo</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDemoPanelOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover */}
            {isDemoPanelOpen && (
              <>
                {/* Backdrop to close on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDemoPanelOpen(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-[400px] sm:w-[460px] bg-white dark:bg-[#1e1b1c] rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-2xl z-50 p-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between border-b border-[#e2e4e9] dark:border-[#3a3839] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#bb0013] fill-[#bb0013]" />
                        <h3 className="font-bold text-sm text-[#191c1e] dark:text-white font-mono uppercase tracking-wider">
                          Demo Control Panel
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                        Interactive write-time breach gates & real governance presets
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDemoPanelOpen(false)}
                      className="p-1 rounded-md text-[#58595b] hover:text-[#191c1e] dark:text-[#cdc4c5] dark:hover:text-white hover:bg-[#edeef0] dark:hover:bg-[#2e2a2b] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toast notification inside panel */}
                  {toastInfo && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium animate-in fade-in duration-150">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{toastInfo}</span>
                    </div>
                  )}

                  {/* SECTION 1: SIMULATED WRITE-TIME & ML ANOMALIES */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#bb0013] dark:text-[#ff858d] flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Simulated Anomaly Triggers (6)
                      </span>
                      <span className="text-[10px] font-mono text-[#58595b] dark:text-[#cdc4c5]">
                        Write-Time & ML Gates
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {/* 1. Unauthorized Access */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => simulateUnauthorizedAccess(),
                            'Simulated: Unauthorized access attempt blocked at write-time!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-[#ba1a1a] dark:text-[#ffdad6] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <UserX className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-[#bb0013] dark:group-hover:text-[#ff858d] transition-colors">
                              Simulate: Unrecorded Access Attempt
                            </span>
                            <span className="text-[10px] font-mono bg-red-50 dark:bg-red-950/40 text-[#ba1a1a] dark:text-[#ffb4ab] px-1.5 py-0.2 rounded border border-red-200 dark:border-red-900/50">
                              No Consent
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Write-time block on beneficiary with zero consent on record (KDPA §25)
                          </p>
                        </div>
                      </button>

                      {/* 2. Access After Revocation */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => simulateRevokedAccess(),
                            'Simulated: Access attempt on revoked consent blocked!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <ShieldOff className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors">
                              Simulate: Access After Revocation
                            </span>
                            <span className="text-[10px] font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/50">
                              Revoked
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Intercept query executed after formal beneficiary opt-out
                            {lastRevokedBeneficiaryId && (
                              <span className="block text-[10px] text-[#bb0013] dark:text-[#ff858d] font-mono font-bold mt-0.5">
                                ➔ Targeted: {lastRevokedBeneficiaryId} (Session Revoked)
                              </span>
                            )}
                          </p>
                        </div>
                      </button>

                      {/* 3. Access After Expiry */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => simulateExpiredAccess(),
                            'Simulated: Access attempt on expired retention window blocked!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                              Simulate: Access After Expiry
                            </span>
                            <span className="text-[10px] font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900/50">
                              365d Window
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Write-time gate rejects queries beyond statutory retention period
                          </p>
                        </div>
                      </button>

                      {/* 4. Corrupted / Inconsistent State */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => simulateInconsistentState(),
                            'Simulated: Inconsistent metadata rejected by integrity gate!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <FileWarning className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                              Simulate: Corrupted Consent Record
                            </span>
                            <span className="text-[10px] font-mono bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 px-1.5 py-0.2 rounded border border-orange-200 dark:border-orange-900/50">
                              Integrity Gate
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Flags missing timestamps ('never silently assume validity' rule)
                          </p>
                        </div>
                      </button>

                      {/* 5. Abnormal Access Volume (AI Outlier) */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => simulateBehavioralOutlier(),
                            'Simulated: AI Behavioral Outlier detected & flagged!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                              Simulate: Abnormal Access Volume
                            </span>
                            <span className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-900/50">
                              ML +6.2σ
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Unsupervised AI access scorer flags actor surge above statistical baseline
                          </p>
                        </div>
                      </button>

                      {/* 6. Bulk Exfiltration Attempt */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => simulateBulkExfiltration(),
                            'Simulated: Critical bulk exfiltration attempt intercepted!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] hover:bg-[#f8f9fb] dark:hover:bg-[#2e2a2b] transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                              Simulate: Bulk Exfiltration Attempt
                            </span>
                            <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-900/50">
                              Critical Threat
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            High-volume data export breach intercepted and flagged (350 records)
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 2: REAL GOVERNANCE ACTIONS (PRESETS) */}
                  <div className="pt-2 border-t border-[#e2e4e9] dark:border-[#3a3839]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Real Governance Actions (3)
                      </span>
                      <span className="text-[10px] font-mono text-[#58595b] dark:text-[#cdc4c5]">
                        Live 1-Click Presets
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {/* Real 1: Run Compliance Export */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => triggerRealComplianceExport(),
                            'Real Action: Compliance export executed with KDPA §25 masking!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                              Demo: Run Compliance Export
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded font-bold">
                              REAL
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Calls real POST /compliance/export with donor reporting preset
                          </p>
                        </div>
                      </button>

                      {/* Real 2: Review Latest Anomaly */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => triggerRealReviewLatestAnomaly(),
                            'Real Action: Latest anomaly signed off by DPO!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                              Demo: Review Latest Anomaly
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded font-bold">
                              REAL
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Signs off on the newest unreviewed anomaly with DPO audit notes
                          </p>
                        </div>
                      </button>

                      {/* Real 3: Regenerate Provenance Report */}
                      <button
                        onClick={() =>
                          handleAction(
                            () => triggerRealProvenanceGenerate(),
                            'Real Action: 5-Gate Provenance report regenerated!'
                          )
                        }
                        disabled={isTriggeringDemo}
                        className="w-full text-left p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1e] dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                              Demo: Regenerate Provenance Report
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded font-bold">
                              REAL
                            </span>
                          </div>
                          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
                            Executes 5 validation gates and calculates fresh SHA-256 audit seal
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* User Profile Avatar & Signout */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#e2e4e9] dark:border-[#3a3839]">
          <div
            className="w-9 h-9 rounded-full bg-[#1e1b1c] text-white border border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs"
            title="DPO Compliance Officer (Active Session)"
          >
            <Shield className="w-4 h-4 text-[#e71520] fill-[#e71520]" />
          </div>
          <button
            onClick={logout}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
