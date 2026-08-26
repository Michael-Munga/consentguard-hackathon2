import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useLiveData } from '../../context/LiveDataContext.js';
import { MyConsentView } from './MyConsentView.js';
import { BeneficiaryHistoryView } from './BeneficiaryHistoryView.js';
import { BeneficiaryMyDataView } from './BeneficiaryMyDataView.js';
import { Shield, Lock, History, User, LogOut, Sun, Moon, Radio, Sparkles } from 'lucide-react';
import type { ConsentRecord, DataAccessEvent, AuditLog } from '../../../types/index.js';

export type BeneficiaryTab = 'consent' | 'history' | 'my-data';

export const BeneficiaryPortal: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useLiveData();
  const [activeTab, setActiveTab] = useState<BeneficiaryTab>('consent');

  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [accessEvents, setAccessEvents] = useState<DataAccessEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBeneficiaryData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConsents(data.consents || []);
        setAccessEvents(data.accessEvents || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error('Error fetching beneficiary data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaryData();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#121011] text-[#191c1e] dark:text-[#f0f1f3] flex flex-col font-sans transition-colors duration-150 pb-20 sm:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1e1b1c]/95 backdrop-blur-md border-b border-[#e2e4e9] dark:border-[#3a3839] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#bb0013] text-white flex items-center justify-center shadow-md shadow-red-900/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight">Inuka Privacy Fabric</h1>
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#bb0013] dark:text-[#ffb4ab] text-[10px] font-bold">
                Beneficiary Portal
              </span>
            </div>
            <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] font-mono">
              Self-Service Consent Management
            </p>
          </div>
        </div>

        {/* Center Tab Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#f8f9fb] dark:bg-[#121011] p-1 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <button
            onClick={() => setActiveTab('consent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'consent'
                ? 'bg-[#bb0013] text-white shadow-sm'
                : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>My Consent</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[#bb0013] text-white shadow-sm'
                : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Consent History</span>
          </button>

          <button
            onClick={() => setActiveTab('my-data')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'my-data'
                ? 'bg-[#bb0013] text-white shadow-sm'
                : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Data</span>
          </button>
        </nav>

        {/* Right User Pill & Actions */}
        <div className="flex items-center gap-3">
          {/* Live SSE Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
            <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}`} />
            <span>{isConnected ? 'Fabric Sync Active' : 'Offline'}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#e2e4e9] dark:border-[#3a3839]">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 text-[#bb0013] dark:text-[#ffb4ab] font-bold text-xs flex items-center justify-center">
              {user?.name ? user.name.charAt(0) : 'B'}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold block text-[#191c1e] dark:text-white leading-tight">
                {user?.name || 'Beneficiary'}
              </span>
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] font-mono block">
                {user?.userType === 'beneficiary' ? user.id : 'Fellow'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-[#bb0013]/20 border-t-[#bb0013] rounded-full animate-spin" />
            <p className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">Loading your sovereign privacy record...</p>
          </div>
        ) : (
          <>
            {activeTab === 'consent' && (
              <MyConsentView consents={consents} onRefresh={fetchBeneficiaryData} />
            )}
            {activeTab === 'history' && (
              <BeneficiaryHistoryView auditLogs={auditLogs} consents={consents} />
            )}
            {activeTab === 'my-data' && (
              <BeneficiaryMyDataView accessEvents={accessEvents} />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1e1b1c]/95 backdrop-blur-md border-t border-[#e2e4e9] dark:border-[#3a3839] px-6 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('consent')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-bold ${
            activeTab === 'consent' ? 'text-[#bb0013]' : 'text-[#58595b] dark:text-[#cdc4c5]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Consent</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-bold ${
            activeTab === 'history' ? 'text-[#bb0013]' : 'text-[#58595b] dark:text-[#cdc4c5]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>

        <button
          onClick={() => setActiveTab('my-data')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-bold ${
            activeTab === 'my-data' ? 'text-[#bb0013]' : 'text-[#58595b] dark:text-[#cdc4c5]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Data</span>
        </button>
      </nav>
    </div>
  );
};
