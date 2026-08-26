import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  MapPin,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { REGION_COUNTIES, ALL_COUNTIES } from '../../lib/utils.js';
import type { Pillar, Region } from '../../../types/index.js';

export const RegionalAndPillarView: React.FC = () => {
  const { stats } = useLiveData();
  const { theme } = useTheme();
  const [selectedRegion, setSelectedRegion] = React.useState<string>('ALL');
  const [selectedCounty, setSelectedCounty] = React.useState<string>('ALL');

  if (!stats) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-500 text-xs">
        Loading regional & pillar analytics...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const axisStroke = isDark ? '#64748b' : '#94a3b8';
  const axisTickFill = isDark ? '#94a3b8' : '#475569';
  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };

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

  // 1. Regional Data (8 Kenyan Regions)
  const allRegions = Object.keys(stats.consent_by_region) as Region[];
  const displayedRegions = selectedRegion === 'ALL'
    ? allRegions
    : allRegions.filter(r => r === selectedRegion);

  const regionalData = displayedRegions.map((r) => ({
    region: r,
    grant_rate: stats.consent_by_region[r]?.grant_rate || 0,
    total: stats.consent_by_region[r]?.total || 0,
    granted: stats.consent_by_region[r]?.granted || 0,
  }));

  // 2. Pillar Trend Data over 4 weeks
  const weeks = ['Week -3', 'Week -2', 'Week -1', 'Current Week'];
  const trendData = weeks.map((w) => {
    const weekRecords = stats.pillar_anomaly_rates.filter((r) => r.week === w);
    const row: any = { week: w };
    let threshold = 5.0;

    weekRecords.forEach((r) => {
      row[r.pillar] = r.anomaly_rate;
      threshold = r.threshold;
    });

    row.threshold = threshold;
    return row;
  });

  // 3. Purpose Breakdown Data (Computed dynamically from real database stats)
  const purposeColors: Record<string, string> = {
    donor_reporting: '#ED1C24',
    internal_analytics: '#006193',
    third_party_sharing: '#58595B',
  };
  const purposeLabels: Record<string, string> = {
    donor_reporting: 'Donor Reporting',
    internal_analytics: 'Internal Analytics',
    third_party_sharing: 'Third-Party Sharing',
  };

  const purposeData = stats.consents_by_purpose
    ? (['donor_reporting', 'internal_analytics', 'third_party_sharing'] as const).map((p) => ({
        name: purposeLabels[p] || p,
        value: stats.consents_by_purpose?.[p]?.share_percent ?? 0,
        count: stats.consents_by_purpose?.[p]?.granted ?? 0,
        color: purposeColors[p] || '#ED1C24',
      }))
    : [
        { name: 'Donor Reporting', value: 0, count: 0, color: '#ED1C24' },
        { name: 'Internal Analytics', value: 0, count: 0, color: '#006193' },
        { name: 'Third-Party Sharing', value: 0, count: 0, color: '#58595B' },
      ];

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] dark:text-white tracking-tight">
            Regional & Pillar M&E
          </h1>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
            Geographic distributions, consent adoption trajectories, and 2-sigma statistical bounds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5] bg-white dark:bg-[#231f20] px-3 py-1.5 rounded-lg border border-[#e2e4e9] dark:border-[#3a3839]">
            Coverage: <span className="font-bold text-[#191c1e] dark:text-white">47 Counties • 8 Regions</span>
          </span>
        </div>
      </div>

      {/* Cascading Filter Bar */}
      <div className="bg-white dark:bg-[#231f20] p-4 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-ambient-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#58595b] dark:text-[#cdc4c5]">
            <Filter className="w-3.5 h-3.5 text-[#bb0013]" />
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
            <span className="text-[11px] font-mono bg-red-50 dark:bg-red-950/40 text-[#bb0013] dark:text-[#ffb4ab] border border-red-200 dark:border-red-900/40 px-2.5 py-1 rounded-full">
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

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top-Left: Beneficiary Distribution by Region (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-5 shadow-ambient-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e4e9] dark:border-[#3a3839] mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#bb0013]" />
              <h3 className="font-bold text-xs text-[#191c1e] dark:text-white uppercase font-mono tracking-wider">
                Beneficiary Distribution By Region (8 Regions)
              </h3>
            </div>
            <span className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">
              Active Cohort Total: <span className="font-bold text-[#191c1e] dark:text-white">{stats.total_beneficiaries.toLocaleString()}</span>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="region"
                  tick={{ fill: axisTickFill, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  stroke={axisStroke}
                />
                <YAxis
                  tick={{ fill: axisTickFill, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  stroke={axisStroke}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: any) => [`${val} Beneficiaries`, 'Total']}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {regionalData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? '#bb0013' : '#006193'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-Right: Consent Type Distribution Donut (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-5 shadow-ambient-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e4e9] dark:border-[#3a3839] mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#006193] dark:text-[#91ccff]" />
              <h3 className="font-bold text-xs text-[#191c1e] dark:text-white uppercase font-mono tracking-wider">
                Consent Type Breakdown
              </h3>
            </div>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={purposeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {purposeData.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => [`${val}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#e2e4e9] dark:border-[#3a3839]">
            {purposeData.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#58595b] dark:text-[#cdc4c5]">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-[#191c1e] dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Full-Width: Consent Growth Over Time & 2σ Anomaly Outliers (12 Cols) */}
        <div className="lg:col-span-12 bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-5 shadow-ambient-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e2e4e9] dark:border-[#3a3839] gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#bb0013]" />
              <div>
                <h3 className="font-bold text-xs text-[#191c1e] dark:text-white uppercase font-mono tracking-wider">
                  Programmatic Intake Trajectory & 2-Sigma Outlier Detection
                </h3>
                <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
                  Automated cohort monitoring fences Mean + 2 Standard Deviations (2σ)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-[#bb0013]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#bb0013]"></span> Anomaly Rate
              </span>
              <span className="flex items-center gap-1 text-[#58595b] dark:text-[#cdc4c5]">
                <span className="w-2.5 h-0.5 bg-[#58595b]"></span> 2σ Threshold (5.0%)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: axisTickFill, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  stroke={axisStroke}
                />
                <YAxis
                  unit="%"
                  tick={{ fill: axisTickFill, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  stroke={axisStroke}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine
                  y={5.0}
                  stroke="#bb0013"
                  strokeDasharray="4 4"
                  label={{ value: '2σ Threshold', fill: '#bb0013', fontSize: 10, position: 'insideTopRight' }}
                />
                <Line
                  type="monotone"
                  dataKey="Scholarship"
                  stroke="#bb0013"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#bb0013' }}
                />
                <Line
                  type="monotone"
                  dataKey="Plus"
                  stroke="#006193"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#006193' }}
                />
                <Line
                  type="monotone"
                  dataKey="Vocational"
                  stroke="#58595b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#58595b' }}
                />
                <Line
                  type="monotone"
                  dataKey="Tech"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#d97706' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
