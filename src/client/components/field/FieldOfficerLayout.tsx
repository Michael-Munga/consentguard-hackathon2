import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useLiveData } from '../../context/LiveDataContext.js';
import { FieldOfficerDirectory } from './FieldOfficerDirectory.js';
import { FieldOfficerConsentStatus } from './FieldOfficerConsentStatus.js';
import {
  Users,
  Shield,
  Layers,
  FileCheck,
  LogOut,
  Sun,
  Moon,
  Radio,
  User,
  BookOpen,
  MapPin,
} from 'lucide-react';

export type FieldOfficerTab = 'directory' | 'status' | 'policies';

export const FieldOfficerLayout: React.FC = () => {
  const { user, pillarScope, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useLiveData();
  const [activeTab, setActiveTab] = useState<FieldOfficerTab>('directory');

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#121011] text-[#191c1e] dark:text-[#f0f1f3] flex flex-col font-sans transition-colors duration-150">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1e1b1c]/95 backdrop-blur-md border-b border-[#e2e4e9] dark:border-[#3a3839] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#bb0013] text-white flex items-center justify-center shadow-md shadow-red-900/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight">ConsentGuard</h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#006193] dark:text-[#78c9ff] text-[10px] font-bold">
                Field Officer Workstation
              </span>
            </div>
            <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] font-mono">
              Pillar: <span className="font-bold text-[#bb0013]">{pillarScope || 'General'}</span>
            </p>
          </div>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#f8f9fb] dark:bg-[#121011] p-1 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-[#bb0013] text-white shadow-sm'
                : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Beneficiaries</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'status'
                ? 'bg-[#bb0013] text-white shadow-sm'
                : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Consent Status</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'policies'
                ? 'bg-[#bb0013] text-white shadow-sm'
                : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Privacy Guidelines</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
            <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}`} />
            <span>{isConnected ? 'Fabric Sync Active' : 'Offline'}</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-[#e2e4e9] dark:border-[#3a3839]">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#006193] dark:text-[#78c9ff] font-bold text-xs flex items-center justify-center">
              {user?.name ? user.name.charAt(0) : 'D'}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold block text-[#191c1e] dark:text-white leading-tight">
                {user?.name || 'Field Officer'}
              </span>
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] font-mono block">
                {pillarScope} Field Lead
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1">
        {activeTab === 'directory' && <FieldOfficerDirectory />}
        {activeTab === 'status' && <FieldOfficerConsentStatus />}
        {activeTab === 'policies' && (
          <div className="bg-white dark:bg-[#1e1b1c] p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-6">
            <h2 className="text-xl font-extrabold text-[#191c1e] dark:text-white">
              Field Officer Data Protection & Privacy Code of Conduct
            </h2>
            <div className="space-y-4 text-xs text-[#58595b] dark:text-[#cdc4c5] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
                <h4 className="font-bold text-[#191c1e] dark:text-white mb-1">1. Read-Only Scoped Mandate</h4>
                <p>Field officers possess read-only access to their designated pillar cohort. Digital consent changes may only be executed directly by the authenticated beneficiary through their sovereign portal.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
                <h4 className="font-bold text-[#191c1e] dark:text-white mb-1">2. Kenya Data Protection Act (KDPA 2019) Section 25</h4>
                <p>Never write down, extract, or photograph full unmasked beneficiary names or identity tokens outside secure foundation workstations. All public materials must use pseudonymized tokens.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
                <h4 className="font-bold text-[#191c1e] dark:text-white mb-1">3. Immediate Revocation Enforcement</h4>
                <p>When a candidate revokes authorization for any purpose, their data is instantly excluded from automated donor pipelines and analytics extracts.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
