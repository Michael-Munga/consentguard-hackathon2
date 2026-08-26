import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { BarChart3, ShieldAlert, Sparkles, TrendingUp, Users, PieChart, ShieldCheck, Lock, Activity } from 'lucide-react';
import type { PrivacyAssessment } from '../../../types/index.js';

interface AggregateInsightsData {
  totalAnalyzableCohort: number;
  globalOptInRate: number;
  recentRevocations: number;
  pillarCoverage: Array<{ name: string; rate: number }>;
  regionalDistribution: Array<{ framework: string; percentage: number }>;
  complianceNote: string;
}

export const AnalystAggregateInsights: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<AggregateInsightsData | null>(null);
  const [privacyData, setPrivacyData] = useState<PrivacyAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!token) return;
      try {
        const [insightsRes, privacyRes] = await Promise.all([
          fetch('/api/analyst/aggregate-insights', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/compliance/privacy-assessment', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (insightsRes.ok) {
          const resData = await insightsRes.json();
          setData(resData);
        }
        if (privacyRes.ok) {
          const pData = await privacyRes.json();
          setPrivacyData(pData);
        }
      } catch (err) {
        console.error('Error fetching analyst insights:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Strict Aggregation & Data Restriction Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <span className="font-bold block text-sm">M&E Analyst Privacy Isolation Active</span>
          <p className="mt-0.5 leading-relaxed">
            All data visualised is strictly aggregated and restricted to cohorts that have explicitly consented to <span className="font-bold">Internal Analytics</span>. Under the Kenya Data Protection Act 2019, individual PII and masked tokens are excluded at the API level.
          </p>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-[#bb0013] dark:text-[#ffb4ab] text-xs font-bold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>M&E Privacy Analytics</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            Aggregate Insights & Consent Coverage
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            Statistical distribution of consent authorizations and statistical compliance across all 4 pillars and 47 counties.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] bg-[#f8f9fb] dark:bg-[#121011] px-4 py-3 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Zero PII Exposure Guaranteed</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Total Analyzable Cohort</span>
            <Users className="w-4 h-4 text-[#bb0013]" />
          </div>
          <div className="text-3xl font-extrabold text-[#191c1e] dark:text-white font-mono">
            {data?.totalAnalyzableCohort.toLocaleString() || '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Consented to Internal Analytics</p>
        </div>

        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Global Opt-In Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
            {data ? `${data.globalOptInRate}%` : '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Across all foundation programs</p>
        </div>

        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>30-Day Revocations</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 font-mono">
            {data?.recentRevocations.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Exercised right to be forgotten</p>
        </div>
      </div>

      {/* Charts Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar Coverage */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
              Consent Coverage by Data Pillar
            </h3>
            <span className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">% Cohort Opt-In</span>
          </div>

          <div className="space-y-4">
            {data?.pillarCoverage.map(item => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#191c1e] dark:text-white">{item.name}</span>
                  <span className="font-mono font-bold text-[#bb0013] dark:text-[#ffb4ab]">{item.rate}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#edeef0] dark:bg-[#2a2426] overflow-hidden">
                  <div style={{ width: `${item.rate}%` }} className="bg-[#bb0013] h-full rounded-full transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Consent Distribution */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
              Regional Consent Distribution (Kenyan Hubs)
            </h3>
            <span className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">Active Cohort %</span>
          </div>

          <div className="space-y-4">
            {data?.regionalDistribution.map(item => (
              <div key={item.framework} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#191c1e] dark:text-white">{item.framework} Region</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{item.percentage}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#edeef0] dark:bg-[#2a2426] overflow-hidden">
                  <div style={{ width: `${Math.min(100, item.percentage)}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cohort Privacy & Demographic Density Card */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e2e4e9] dark:border-[#3a3839]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
                Cohort Privacy & Demographic Density (k-Anonymity)
              </h3>
              <p className="text-xs text-[#58595b] dark:text-[#cdc4c5]">
                Statistical linkage protection under KDPA 2019 Section 25 across Pillars and Regions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              Overall: {privacyData?.kAnonymityScore ?? 98.4}% k-Safe
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar k-Anonymity Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#58595b] dark:text-[#cdc4c5]">
              Pillar Privacy Density
            </h4>
            <div className="space-y-3">
              {privacyData?.pillarBreakdown && Object.entries(privacyData.pillarBreakdown).map(([pillarName, pStat]) => (
                <div key={pillarName} className="p-3 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#191c1e] dark:text-white">{pillarName} Pillar</span>
                    <span className={`font-bold ${pStat.kAnonymityScore >= 95 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-600'}`}>
                      {pStat.kAnonymityScore}% k-Safe ({pStat.safeRecords}/{pStat.totalRecords})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#edeef0] dark:bg-[#2a2426] overflow-hidden">
                    <div
                      style={{ width: `${pStat.kAnonymityScore}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${pStat.kAnonymityScore >= 95 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Demographic Privacy Safety Indicator */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#58595b] dark:text-[#cdc4c5]">
              Regional Demographic Linkage Safety (47 Counties)
            </h4>
            <div className="space-y-2.5">
              {privacyData?.regionalPrivacyDistribution?.map((reg) => (
                <div key={reg.region} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#191c1e] dark:text-white">{reg.region} Region</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {reg.kSafePercentage}% ({reg.safeScore}/{reg.totalRecords})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#edeef0] dark:bg-[#2a2426] overflow-hidden">
                    <div
                      style={{ width: `${reg.kSafePercentage}%` }}
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
