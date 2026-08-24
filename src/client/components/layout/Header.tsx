import React from 'react';
import {
  ShieldAlert,
  FileCheck,
  FileSpreadsheet,
  GitCompare,
  Loader2,
  Sun,
  Moon,
  Shield,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import { useTheme } from '../../context/ThemeContext.js';

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
    triggerInvalidAccessDemo,
  } = useLiveData();
  const { theme, toggleTheme } = useTheme();

  const handleManualDemoClick = async () => {
    try {
      await triggerInvalidAccessDemo('unauthorized_external_auditor@global.org');
    } catch (err) {
      console.error(err);
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
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#bb0013] blinking-indicator' : 'bg-amber-500'}`}></span>
          <span className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5]">
            {isConnected ? 'Live Data Stream Active' : 'Connecting Stream...'}
          </span>
        </div>
      </div>

      {/* Right Actions, Lineage, Demo Button, and Profile */}
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

        {/* SIMULATE INVALID ACCESS ATTEMPT (HIGH-IMPACT LIVE BREACH TRIGGER) */}
        <button
          onClick={handleManualDemoClick}
          disabled={isTriggeringDemo}
          className="bg-[#bb0013] hover:bg-[#93000d] text-white font-mono text-xs font-semibold px-3.5 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
          title="Simulate an unauthorized external data access attempt to test real-time write-time gating"
        >
          {isTriggeringDemo ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-white" />
          )}
          <span className="hidden sm:inline">Simulate Invalid Access Attempt</span>
          <span className="sm:hidden">Simulate Breach</span>
        </button>

        {/* User Profile Avatar */}
        <div
          className="w-9 h-9 rounded-full bg-[#1e1b1c] text-white border border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs"
          title="DPO Compliance Officer (Active Session)"
        >
          <Shield className="w-4 h-4 text-[#e71520] fill-[#e71520]" />
        </div>
      </div>
    </header>
  );
};
