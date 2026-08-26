import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle, FileCheck, Layers, Cpu, Database } from 'lucide-react';

interface StaffLoginProps {
  onSwitchToBeneficiary: () => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onSwitchToBeneficiary }) => {
  const { loginStaff } = useAuth();
  const [email, setEmail] = useState('compliance@inuka.kpc.co.ke');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your staff email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await loginStaff(email.trim(), password.trim());
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify staff credentials.');
    }
  };

  const handlePresetSelect = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#121011] flex flex-col lg:flex-row font-sans selection:bg-[#bb0013] selection:text-white transition-colors duration-150">
      {/* Left Security Branding Panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-[#1e1b1c] via-[#2a2426] to-[#121011] text-white p-8 lg:p-16 flex flex-col justify-between border-r border-[#3a3839]">
        <div>
          {/* Top Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#bb0013] text-white flex items-center justify-center shadow-lg shadow-red-900/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">ConsentGuard</h1>
              <p className="text-[11px] text-[#cdc4c5] tracking-wider uppercase font-semibold">Privacy Fabric 2.0</p>
            </div>
          </div>

          <div className="mt-16 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 text-xs font-mono font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-[#bb0013] animate-ping" />
              <span>Internal Governance & Compliance Gateway</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Beneficiary Data Privacy & Consent Management Engine
            </h2>
            <p className="mt-4 text-sm text-[#cdc4c5] leading-relaxed">
              KPC Inuka Fellowship privacy fabric ensuring strict compliance with the Kenya Data Protection Act 2019 (KDPA Section 25) with zero-trust write-time enforcement.
            </p>

            {/* Architecture Highlights */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <Layers className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Multi-Tier RBAC Scoping</h4>
                  <p className="text-[11px] text-[#cdc4c5] mt-0.5">Strict server-side isolation for Compliance, Field & M&E Analysts.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <Database className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Immutable Audit Trail</h4>
                  <p className="text-[11px] text-[#cdc4c5] mt-0.5">Cryptographic log of every digital consent change and data access.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <Cpu className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Write-Time Zero-Trust</h4>
                  <p className="text-[11px] text-[#cdc4c5] mt-0.5">Synchronous authorization checking blocks unauthorized exports immediately.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">KDPA Anonymized Exports</h4>
                  <p className="text-[11px] text-[#cdc4c5] mt-0.5">Automated tokenization and mandatory recipient tracking.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-[#cdc4c5] flex items-center justify-between">
          <span>KPC Inuka Foundation • Domain 5, Problem 9</span>
          <span className="font-mono">v2.0-SEC-COMPLIANT</span>
        </div>
      </div>

      {/* Right Login Canvas */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center max-w-xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#191c1e] dark:text-white">
            Staff Portal Access
          </h2>
          <p className="mt-1 text-sm text-[#58595b] dark:text-[#cdc4c5]">
            Sign in with your foundation credentials to access your role-scoped workstation.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-700 dark:text-red-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] dark:text-[#f0f1f3] mb-1.5">
              Official Email Address
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#58595b] dark:text-[#cdc4c5]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="officer@inuka.kpc.co.ke"
                className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-white placeholder-[#8d9095] text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] dark:text-[#f0f1f3] mb-1.5">
              Password
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#58595b] dark:text-[#cdc4c5]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-10 py-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-white placeholder-[#8d9095] text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-red-900/20 text-sm font-bold text-white bg-[#bb0013] hover:bg-[#93000d] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#bb0013] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-150"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Role Presets / Demo Credentials */}
        <div className="mt-8 pt-6 border-t border-[#e2e4e9] dark:border-[#3a3839]">
          <p className="text-[11px] font-bold text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider mb-3">
            Quick Role Presets (Select for Instant Testing)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePresetSelect('compliance@inuka.kpc.co.ke', 'Password123!')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                email === 'compliance@inuka.kpc.co.ke'
                  ? 'border-[#bb0013] bg-red-50/50 dark:bg-red-950/30 text-[#bb0013] dark:text-[#ffb4ab] font-bold shadow-sm'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-[#f0f1f3] hover:bg-[#f8f9fb] dark:hover:bg-[#231f20]'
              }`}
            >
              <span className="font-bold block">Compliance Officer</span>
              <span className="text-[10px] opacity-75 font-mono">compliance@inuka.kpc.co.ke</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('field.scholarship@inuka.kpc.co.ke', 'Password123!')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                email === 'field.scholarship@inuka.kpc.co.ke'
                  ? 'border-[#bb0013] bg-red-50/50 dark:bg-red-950/30 text-[#bb0013] dark:text-[#ffb4ab] font-bold shadow-sm'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-[#f0f1f3] hover:bg-[#f8f9fb] dark:hover:bg-[#231f20]'
              }`}
            >
              <span className="font-bold block">Field Officer (Scholarship)</span>
              <span className="text-[10px] opacity-75 font-mono">field.scholarship@inuka.kpc.co.ke</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('field.tech@inuka.kpc.co.ke', 'Password123!')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                email === 'field.tech@inuka.kpc.co.ke'
                  ? 'border-[#bb0013] bg-red-50/50 dark:bg-red-950/30 text-[#bb0013] dark:text-[#ffb4ab] font-bold shadow-sm'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-[#f0f1f3] hover:bg-[#f8f9fb] dark:hover:bg-[#231f20]'
              }`}
            >
              <span className="font-bold block">Field Officer (Tech)</span>
              <span className="text-[10px] opacity-75 font-mono">field.tech@inuka.kpc.co.ke</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('analyst@inuka.kpc.co.ke', 'Password123!')}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                email === 'analyst@inuka.kpc.co.ke'
                  ? 'border-[#bb0013] bg-red-50/50 dark:bg-red-950/30 text-[#bb0013] dark:text-[#ffb4ab] font-bold shadow-sm'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-white dark:bg-[#1e1b1c] text-[#191c1e] dark:text-[#f0f1f3] hover:bg-[#f8f9fb] dark:hover:bg-[#231f20]'
              }`}
            >
              <span className="font-bold block">M&E Analyst</span>
              <span className="text-[10px] opacity-75 font-mono">analyst@inuka.kpc.co.ke</span>
            </button>
          </div>
        </div>

        {/* Switch to Beneficiary Portal */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onSwitchToBeneficiary}
            className="text-xs font-bold text-[#bb0013] dark:text-[#ffb4ab] hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <span>Are you a fellowship beneficiary? Go to Beneficiary Self-Service Portal</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
