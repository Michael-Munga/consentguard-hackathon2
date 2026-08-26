import React, { useState } from 'react';
import { useAuth, type UserRole } from '../../context/AuthContext.js';
import { Shield, Sparkles, ChevronDown, ChevronUp, User, Lock, Layers, BarChart3, LogOut } from 'lucide-react';

export const DemoSwitcher: React.FC = () => {
  const { role, user, switchDemoRole, logout, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles: Array<{
    id: UserRole;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    {
      id: 'beneficiary',
      title: 'Beneficiary Self-Service',
      subtitle: 'Faith Kamau (Scholarship)',
      icon: User,
      color: 'bg-red-500',
    },
    {
      id: 'compliance_officer',
      title: 'Compliance & DPO',
      subtitle: 'Sarah Jenkins (All Access)',
      icon: Shield,
      color: 'bg-emerald-500',
    },
    {
      id: 'field_officer',
      title: 'Field Officer Workstation',
      subtitle: 'David Omondi (Scholarship)',
      icon: Layers,
      color: 'bg-blue-500',
    },
    {
      id: 'analyst',
      title: 'M&E Lead Analyst',
      subtitle: 'Dr. Kevin Kiprono (Aggregated)',
      icon: BarChart3,
      color: 'bg-purple-500',
    },
  ];

  return (
    <aside aria-label="Demo role switcher" className="fixed bottom-4 right-4 z-50 select-none">
      <div className="bg-white/95 dark:bg-[#1e1b1c]/95 backdrop-blur-md border border-[#e2e4e9] dark:border-[#3a3839] rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 w-80">
        {/* Header Toggle Bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-[#1e1b1c] text-white flex items-center justify-between text-xs font-bold cursor-pointer hover:bg-[#2e2a2b] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#ffb4ab]" />
            <span>Role Switcher (Hackathon Demo)</span>
          </div>
          <div className="flex items-center gap-2">
            {role && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono capitalize">
                {role.replace('_', ' ')}
              </span>
            )}
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Expandable Menu */}
        {isOpen && (
          <div className="p-3 space-y-2 bg-[#f8f9fb] dark:bg-[#121011]">
            <p className="text-[10px] font-bold text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider px-1">
              Switch Live Portal Role:
            </p>

            <div className="space-y-1.5">
              {roles.map(r => {
                const Icon = r.icon;
                const isActive = role === r.id;

                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      switchDemoRole(r.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'border-[#bb0013] bg-red-50 dark:bg-red-950/40 text-[#bb0013] dark:text-[#ffb4ab] font-bold shadow-xs'
                        : 'border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-[#f0f1f3] hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg ${r.color} text-white flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="block font-bold text-[11px] leading-tight">{r.title}</span>
                        <span className="text-[10px] opacity-70 block">{r.subtitle}</span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#bb0013] dark:bg-[#ffb4ab]" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-red-100/50 dark:bg-red-950/40 hover:bg-red-100 text-[#bb0013] dark:text-[#ffb4ab] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Current Session</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
