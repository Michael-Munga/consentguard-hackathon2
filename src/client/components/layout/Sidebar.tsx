import React from 'react';
import {
  Radio,
  LayoutGrid,
  AlertTriangle,
  GitFork,
  History,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';

export type TabType = 'feed' | 'consent' | 'anomalies' | 'analytics' | 'audit';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenLineage: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onOpenLineage }) => {
  const { stats, isConnected } = useLiveData();

  const navItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    materialIcon: string;
    badge?: string | number | null;
  }> = [
    {
      id: 'feed',
      label: 'Live Activity Feed',
      icon: Radio,
      materialIcon: 'sensors',
      badge: isConnected ? 'LIVE' : null,
    },
    {
      id: 'consent',
      label: 'Consent Status Grid',
      icon: LayoutGrid,
      materialIcon: 'grid_view',
    },
    {
      id: 'anomalies',
      label: 'Governance Anomaly Log',
      icon: AlertTriangle,
      materialIcon: 'warning',
      badge: stats && stats.unresolved_anomalies > 0 ? stats.unresolved_anomalies : null,
    },
    {
      id: 'analytics',
      label: 'Regional & Pillar M&E',
      icon: GitFork,
      materialIcon: 'account_tree',
    },
    {
      id: 'audit',
      label: 'Immutable Audit Trail',
      icon: History,
      materialIcon: 'history',
    },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-[260px] bg-[#1e1b1c] shadow-md flex flex-col z-50 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#bb0013] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Shield className="w-5 h-5 fill-white text-[#bb0013]" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm text-white tracking-tight leading-tight truncate">
            Compliance Portal
          </h1>
          <p className="text-[11px] font-mono text-[#cdc4c5] tracking-wide">Governance Engine</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`mx-2 my-0.5 px-4 py-3 rounded-lg flex items-center justify-between text-left transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#e71520] text-white font-semibold shadow-sm scale-[0.98]'
                  : 'text-[#cdc4c5] hover:text-white hover:bg-[#2e2a2b]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-[#cdc4c5] group-hover:text-white'}`} />
                <span className="text-xs font-medium tracking-tight truncate">{item.label}</span>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 ml-2 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#ba1a1a] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / System Status & Lineage */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <button
          onClick={onOpenLineage}
          className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-[#cdc4c5] hover:text-white font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#e71520]" />
          <span>Stage 1 ➔ 2 Lineage</span>
        </button>

        <div className="flex items-center justify-between px-2 text-[11px] text-[#cdc4c5]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#10B981] animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="font-mono text-[10px] uppercase">
              {isConnected ? 'System Nominal' : 'Reconnecting'}
            </span>
          </div>
          <span className="font-mono text-[10px] opacity-70">v2.4.0</span>
        </div>
      </div>
    </nav>
  );
};
