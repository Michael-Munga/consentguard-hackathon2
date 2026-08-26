import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLiveData } from '../../context/LiveDataContext.js';
import { ShieldCheck, ShieldAlert, Check, X, AlertTriangle, RefreshCw, Lock, Sparkles, Clock, Globe } from 'lucide-react';
import type { ConsentRecord, ConsentPurpose } from '../../../types/index.js';

interface MyConsentViewProps {
  consents: ConsentRecord[];
  onRefresh: () => Promise<void>;
}

export const MyConsentView: React.FC<MyConsentViewProps> = ({ consents, onRefresh }) => {
  const { token, user } = useAuth();
  const { setLastRevokedBeneficiaryId } = useLiveData();
  const [loadingPurpose, setLoadingPurpose] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getConsentByPurpose = (purpose: ConsentPurpose): ConsentRecord | undefined => {
    return consents.find(c => c.purpose === purpose);
  };

  const handleToggleConsent = async (purpose: ConsentPurpose, currentStatus: string) => {
    if (!token) return;
    setLoadingPurpose(purpose);
    setErrorMessage(null);
    setToastMessage(null);

    const isCurrentlyGranted = currentStatus === 'granted';
    const action = isCurrentlyGranted ? 'revoke' : 'grant';

    try {
      const res = await fetch(`/api/me/consent/${purpose}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} consent`);
      }

      if (isCurrentlyGranted && user?.id) {
        setLastRevokedBeneficiaryId(user.id);
      }

      await onRefresh();
      setToastMessage(
        isCurrentlyGranted
          ? `Authorization revoked for ${purpose.replace('_', ' ')}. Data processing will cease immediately.`
          : `Digital consent granted for ${purpose.replace('_', ' ')}. Authorization recorded to audit trail.`
      );

      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update consent status');
    } finally {
      setLoadingPurpose(null);
    }
  };

  const donorConsent = getConsentByPurpose('donor_reporting');
  const analyticsConsent = getConsentByPurpose('internal_analytics');
  const thirdPartyConsent = getConsentByPurpose('third_party_sharing');

  const activeCount = consents.filter(c => c.status === 'granted').length;
  const revokedCount = consents.filter(c => c.status === 'revoked').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner & Summary Pills */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-[#bb0013] dark:text-[#ffb4ab] text-xs font-bold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Kenya Data Protection Act 2019 Section 25 Protected</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            My Privacy & Consent Controls
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            You hold total control over how your scholarship and personal data is processed by the KPC Inuka Foundation and authorized partners.
          </p>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-center">
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold block">Active Consents</span>
            <span className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 font-mono">{activeCount}</span>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/40 text-center">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-bold block">Revoked</span>
            <span className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-200 font-mono">{revokedCount}</span>
          </div>
        </div>
      </div>

      {/* Interactive Purpose Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Purpose 1: Donor Reporting */}
        <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#bb0013] dark:text-[#ffb4ab] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  donorConsent?.status === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : donorConsent?.status === 'revoked'
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                {donorConsent?.status || 'Pending'}
              </span>
            </div>

            <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
              Donor Reporting & Progress
            </h3>
            <p className="mt-2 text-xs text-[#58595b] dark:text-[#cdc4c5] leading-relaxed">
              Authorizes anonymized progress reports and milestone data to be shared with foundation donors and sponsors.
            </p>

            <div className="mt-4 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] space-y-2 text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
              <div className="flex justify-between">
                <span>Purpose Scope:</span>
                <span className="font-mono font-bold text-[#191c1e] dark:text-white">Donor Reporting</span>
              </div>
              <div className="flex justify-between">
                <span>Data Retention:</span>
                <span className="font-mono">365 Days (Statutory)</span>
              </div>
              {donorConsent?.granted_at && (
                <div className="flex justify-between">
                  <span>Granted On:</span>
                  <span className="font-mono">{new Date(donorConsent.granted_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-between">
            <span className="text-xs font-bold text-[#191c1e] dark:text-white">
              {donorConsent?.status === 'granted' ? 'Authorized' : 'Unauthorized'}
            </span>

            <button
              onClick={() => handleToggleConsent('donor_reporting', donorConsent?.status || 'requested')}
              disabled={loadingPurpose === 'donor_reporting'}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                donorConsent?.status === 'granted' ? 'bg-[#bb0013]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  donorConsent?.status === 'granted' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Purpose 2: Internal Analytics */}
        <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#006193] dark:text-[#78c9ff] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  analyticsConsent?.status === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : analyticsConsent?.status === 'revoked'
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                {analyticsConsent?.status || 'Pending'}
              </span>
            </div>

            <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
              Internal Analytics & M&E
            </h3>
            <p className="mt-2 text-xs text-[#58595b] dark:text-[#cdc4c5] leading-relaxed">
              Allows Inuka Monitoring & Evaluation teams to evaluate fellowship impact and cohort performance across Kenya.
            </p>

            <div className="mt-4 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] space-y-2 text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
              <div className="flex justify-between">
                <span>Purpose Scope:</span>
                <span className="font-mono font-bold text-[#191c1e] dark:text-white">Aggregate M&E</span>
              </div>
              <div className="flex justify-between">
                <span>Data Masking:</span>
                <span className="font-mono">Pseudonymized (Sec 25)</span>
              </div>
              {analyticsConsent?.granted_at && (
                <div className="flex justify-between">
                  <span>Granted On:</span>
                  <span className="font-mono">{new Date(analyticsConsent.granted_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-between">
            <span className="text-xs font-bold text-[#191c1e] dark:text-white">
              {analyticsConsent?.status === 'granted' ? 'Authorized' : 'Unauthorized'}
            </span>

            <button
              onClick={() => handleToggleConsent('internal_analytics', analyticsConsent?.status || 'requested')}
              disabled={loadingPurpose === 'internal_analytics'}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                analyticsConsent?.status === 'granted' ? 'bg-[#bb0013]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  analyticsConsent?.status === 'granted' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Purpose 3: Third-Party Sharing */}
        <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  thirdPartyConsent?.status === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : thirdPartyConsent?.status === 'revoked'
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                {thirdPartyConsent?.status || 'Pending'}
              </span>
            </div>

            <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
              Third-Party Partner Sharing
            </h3>
            <p className="mt-2 text-xs text-[#58595b] dark:text-[#cdc4c5] leading-relaxed">
              Optional sharing of pseudonymized beneficiary records with vetted external institutional partners.
            </p>

            <div className="mt-4 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] space-y-2 text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
              <div className="flex justify-between">
                <span>Purpose Scope:</span>
                <span className="font-mono font-bold text-[#191c1e] dark:text-white">Third-Party Sharing</span>
              </div>
              <div className="flex justify-between">
                <span>Revocable:</span>
                <span className="font-mono text-emerald-600 font-bold">Instant Anytime</span>
              </div>
              {thirdPartyConsent?.granted_at && (
                <div className="flex justify-between">
                  <span>Granted On:</span>
                  <span className="font-mono">{new Date(thirdPartyConsent.granted_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-between">
            <span className="text-xs font-bold text-[#191c1e] dark:text-white">
              {thirdPartyConsent?.status === 'granted' ? 'Authorized' : 'Unauthorized'}
            </span>

            <button
              onClick={() => handleToggleConsent('third_party_sharing', thirdPartyConsent?.status || 'requested')}
              disabled={loadingPurpose === 'third_party_sharing'}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                thirdPartyConsent?.status === 'granted' ? 'bg-[#bb0013]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  thirdPartyConsent?.status === 'granted' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
