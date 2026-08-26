import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { TrendingUp, Activity, CheckCircle2, ShieldCheck, AlertCircle, MapPin, Filter, Sparkles } from 'lucide-react';
import { REGION_COUNTIES, ALL_COUNTIES } from '../../lib/utils.js';
import type { PrivacyAssessment } from '../../../types/index.js';

interface AnalystTrendsData {
  totalActiveConsents: number;
  netNewGrantsPeriod: number;
  revocationRate: number;
  revocationTriggers: Array<{ reason: string; percentage: number }>;
  regionalCompliance: Array<{
    region: string;
    activeConsents: number;
    variance30D: string;
    status: string;
  }>;
}

export const AnalystTrends: React.FC = () => {
  const { token } = useAuth();
  const [trends, setTrends] = useState<AnalystTrendsData | null>(null);
  const [privacyData, setPrivacyData] = useState<PrivacyAssessment | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCounty, setSelectedCounty] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const availableCounties = selectedRegion === 'ALL'
    ? ALL_COUNTIES
    : REGION_COUNTIES[selectedRegion] || ALL_COUNTIES;

  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    if (newRegion !== 'ALL') {
      const validCounties = REGION_COUNTIES[newRegion] || [];
      if (selectedCounty !== 'ALL' && !validCounties.includes(selectedCounty)) {
        setSelectedCounty('ALL');
      }
    }
  };

  const handleCountyChange = (newCounty: string) => {
    setSelectedCounty(newCounty);
  };

  const displayedRegionalCompliance = trends?.regionalCompliance.filter((row) => {
    if (selectedRegion === 'ALL') return true;
    return row.region.toLowerCase() === selectedRegion.toLowerCase();
  }) || [];

  useEffect(() => {
    const fetchTrendsAndPrivacy = async () => {
      if (!token) return;
      try {
        const [trendsRes, privacyRes] = await Promise.all([
          fetch('/api/analyst/trends', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/compliance/privacy-assessment', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (trendsRes.ok) {
          const data = await trendsRes.json();
          setTrends(data);
        }
        if (privacyRes.ok) {
          const pData = await privacyRes.json();
          setPrivacyData(pData);
        }
      } catch (err) {
        console.error('Error fetching analyst trends & privacy data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendsAndPrivacy();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#006193] dark:text-[#78c9ff] text-xs font-bold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>30-Day Consent Flow Analysis</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            Consent Trends & Lifecycle Velocity
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            Cohort trend analytics evaluating authorization retention, new digital grants, and primary revocation triggers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] bg-[#f8f9fb] dark:bg-[#121011] px-4 py-3 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Statistically Anonymized</span>
        </div>
      </div>

      {/* Cascading Filter Bar */}
      <div className="bg-white dark:bg-[#1e1b1c] p-4 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#58595b] dark:text-[#cdc4c5]">
            <Filter className="w-3.5 h-3.5 text-[#006193] dark:text-[#78c9ff]" />
            <span>Region Scope:</span>
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="text-xs bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] text-[#191c1e] dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bb0013] cursor-pointer"
          >
            <option value="ALL">All Regions (8 Regions)</option>
            {Object.keys(REGION_COUNTIES).map((r) => (
              <option key={r} value={r}>
                {r} Region
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#58595b] dark:text-[#cdc4c5]">
            <span>County Scope:</span>
          </div>
          <select
            value={selectedCounty}
            onChange={(e) => handleCountyChange(e.target.value)}
            className="text-xs bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] text-[#191c1e] dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bb0013] cursor-pointer"
          >
            <option value="ALL">
              {selectedRegion === 'ALL' ? 'All Counties (47 Counties)' : `Counties in ${selectedRegion} (${availableCounties.length})`}
            </option>
            {availableCounties.map((c) => (
              <option key={c} value={c}>
                {c} County
              </option>
            ))}
          </select>
        </div>

        {(selectedRegion !== 'ALL' || selectedCounty !== 'ALL') && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-blue-50 dark:bg-blue-950/40 text-[#006193] dark:text-[#78c9ff] border border-blue-200 dark:border-blue-900/40 px-2.5 py-1 rounded-full">
              Filtered: {selectedRegion !== 'ALL' ? `${selectedRegion} Region` : 'All Regions'} {selectedCounty !== 'ALL' ? `• ${selectedCounty}` : ''}
            </span>
            <button
              onClick={() => {
                setSelectedRegion('ALL');
                setSelectedCounty('ALL');
              }}
              className="text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Total Active Authorizations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-[#191c1e] dark:text-white font-mono">
            {trends?.totalActiveConsents.toLocaleString() || '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Active valid consents on file</p>
        </div>

        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Net New Grants (30D)</span>
            <Activity className="w-4 h-4 text-[#bb0013]" />
          </div>
          <div className="text-3xl font-extrabold text-[#bb0013] dark:text-[#ffb4ab] font-mono">
            +{trends?.netNewGrantsPeriod.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Verified digitally via OTP</p>
        </div>

        <div className="bg-white dark:bg-[#1e1b1c] p-6 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#58595b] dark:text-[#cdc4c5] font-semibold mb-2">
            <span>Revocation Rate</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 font-mono">
            {trends ? `${trends.revocationRate}%` : '—'}
          </div>
          <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">Opt-out retention index</p>
        </div>
      </div>

      {/* Triggers and Regional Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Revocation Breakdown */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-6">
          <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
            Revocation Distribution by Consent Purpose
          </h3>

          <div className="space-y-4">
            {trends?.revocationTriggers.map(item => (
              <div key={item.reason} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#191c1e] dark:text-white">{item.reason}</span>
                  <span className="font-mono font-bold text-[#bb0013] dark:text-[#ffb4ab]">{item.percentage}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#edeef0] dark:bg-[#2a2426] overflow-hidden">
                  <div style={{ width: `${Math.min(100, item.percentage)}%` }} className="bg-[#bb0013] h-full rounded-full transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Compliance Aggregates */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
            Regional Compliance Aggregates
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] uppercase font-bold text-[10px]">
                  <th className="py-2.5">Region</th>
                  <th className="py-2.5">Active Consents</th>
                  <th className="py-2.5">30D Trend</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
                {displayedRegionalCompliance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#58595b] dark:text-[#cdc4c5] font-mono">
                      No compliance data for selected region filter.
                    </td>
                  </tr>
                ) : (
                  displayedRegionalCompliance.map(row => (
                    <tr key={row.region} className="hover:bg-[#f8f9fb] dark:hover:bg-[#121011]">
                      <td className="py-3 font-semibold text-[#191c1e] dark:text-white">{row.region}</td>
                      <td className="py-3 font-mono">{row.activeConsents.toLocaleString()}</td>
                      <td className="py-3 font-mono text-emerald-600 font-bold">{row.variance30D}</td>
                      <td className="py-3 text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
