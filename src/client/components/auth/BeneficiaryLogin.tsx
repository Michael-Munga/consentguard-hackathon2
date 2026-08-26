import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface BeneficiaryLoginProps {
  onSwitchToStaff: () => void;
}

export const BeneficiaryLogin: React.FC<BeneficiaryLoginProps> = ({ onSwitchToStaff }) => {
  const { loginBeneficiary } = useAuth();
  const [identifier, setIdentifier] = useState('INK-84920');
  const [password, setPassword] = useState('Passphrase123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your Beneficiary ID or Email and your Passphrase.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await loginBeneficiary(identifier.trim(), password.trim());
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleQuickFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#121011] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-[#bb0013] selection:text-white transition-colors duration-150">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Header */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#bb0013] text-white shadow-xl shadow-red-900/20 mb-4 transform hover:scale-105 transition-transform duration-200">
          <Shield className="w-9 h-9" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1e] dark:text-white">
          Inuka Foundation
        </h2>
        <p className="mt-1 text-sm font-semibold tracking-wider uppercase text-[#bb0013] dark:text-[#ffb4ab]">
          Beneficiary Consent Portal
        </p>
        <p className="mt-2 text-xs text-[#58595b] dark:text-[#cdc4c5] max-w-xs mx-auto">
          Manage your personal data authorizations, view consent timeline, and control your privacy preferences.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-[#1e1b1c] py-8 px-6 sm:px-10 shadow-xl shadow-black/5 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-700 dark:text-red-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] dark:text-[#f0f1f3] mb-1.5">
                Beneficiary Identifier
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#58595b] dark:text-[#cdc4c5]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. INK-84920 or faith.kamau@inuka.ke"
                  className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#191c1e] dark:text-white placeholder-[#8d9095] text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] dark:text-[#f0f1f3] mb-1.5">
                Security Passphrase
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
                  className="block w-full pl-10 pr-10 py-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#191c1e] dark:text-white placeholder-[#8d9095] text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] focus:border-transparent transition-all"
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

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#58595b] dark:text-[#cdc4c5] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                KDPA 2019 Protected
              </span>
              <span className="text-[#58595b] dark:text-[#cdc4c5]">
                Self-Service Portal
              </span>
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
                  <span>Sign In to Consent Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-6 pt-5 border-t border-[#e2e4e9] dark:border-[#3a3839]">
            <p className="text-[11px] font-bold text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider text-center mb-2.5">
              Quick Demo Beneficiary Login
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('INK-84920', 'Passphrase123!')}
                className="w-full text-left p-2.5 rounded-xl bg-[#f8f9fb] dark:bg-[#121011] hover:bg-[#eceef0] dark:hover:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] text-xs transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-[#191c1e] dark:text-white">Faith Kamau (Scholarship)</span>
                  <p className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] font-mono">ID: INK-84920 • Pass: Passphrase123!</p>
                </div>
                <span className="text-[10px] font-bold text-[#bb0013] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                  Primary Demo
                </span>
              </button>
            </div>
          </div>

          {/* Switch to Staff Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSwitchToStaff}
              className="text-xs font-bold text-[#006193] dark:text-[#78c9ff] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>Are you foundation staff or compliance officer? Go to Staff Login</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
