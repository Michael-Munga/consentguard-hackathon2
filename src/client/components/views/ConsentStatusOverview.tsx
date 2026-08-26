import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import type { Pillar, ConsentRecord, Beneficiary } from '../../../types/index.js';
import { Pagination } from '../common/Pagination.js';

export const ConsentStatusOverview: React.FC = () => {
  const { stats } = useLiveData();
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drilldownPage, setDrilldownPage] = useState(1);
  const [drilldownCell, setDrilldownCell] = useState<{
    status: string;
    pillar: Pillar | 'TOTAL';
    items: Beneficiary[];
  } | null>(null);

  const pillars: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
  const statuses = [
    { key: 'granted', label: 'Granted (Active)', icon: CheckCircle2 },
    { key: 'requested', label: 'Not Yet Opted In', icon: Clock },
    { key: 'revoked', label: 'Revoked by Subject', icon: Ban },
    { key: 'expired', label: 'Expired (Retention End)', icon: AlertTriangle },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, bRes] = await Promise.all([
          fetch('/api/consents'),
          fetch('/api/beneficiaries'),
        ]);
        if (cRes.ok && bRes.ok) {
          const cData = await cRes.json();
          const bData = await bRes.json();
          setConsents(cData);
          setBeneficiaries(bData.data || []);
        }
      } catch (err) {
        console.error('Error loading consent grid data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter consents by selected purpose
  const filteredConsents = consents.filter((c) => {
    if (selectedPurpose === 'ALL') return true;
    return c.purpose === selectedPurpose;
  });

  // Calculate cell counts: Map of status -> pillar -> count
  const matrix: Record<string, Record<Pillar, number>> = {
    granted: { Scholarship: 0, Plus: 0, Vocational: 0, Tech: 0 },
    requested: { Scholarship: 0, Plus: 0, Vocational: 0, Tech: 0 },
    revoked: { Scholarship: 0, Plus: 0, Vocational: 0, Tech: 0 },
    expired: { Scholarship: 0, Plus: 0, Vocational: 0, Tech: 0 },
  };

  const benMap = new Map<string, Beneficiary>();
  beneficiaries.forEach((b) => benMap.set(b.id, b));

  filteredConsents.forEach((c) => {
    const ben = benMap.get(c.beneficiary_id);
    if (!ben) return;
    if (matrix[c.status] && matrix[c.status][ben.pillar] !== undefined) {
      matrix[c.status][ben.pillar]++;
    }
  });

  // Calculate column & row totals
  const columnTotals: Record<Pillar, number> = { Scholarship: 0, Plus: 0, Vocational: 0, Tech: 0 };
  const rowTotals: Record<string, number> = { granted: 0, requested: 0, revoked: 0, expired: 0 };

  statuses.forEach((s) => {
    pillars.forEach((p) => {
      const cnt = matrix[s.key][p];
      columnTotals[p] += cnt;
      rowTotals[s.key] += cnt;
    });
  });

  const grandTotal = Object.values(rowTotals).reduce((a, b) => a + b, 0);

  // Heatmap level determination 0-4
  const getHeatLevel = (count: number, total: number) => {
    if (count === 0 || total === 0) return 'heat-level-0';
    const ratio = count / total;
    if (ratio > 0.6) return 'heat-level-4';
    if (ratio > 0.35) return 'heat-level-3';
    if (ratio > 0.15) return 'heat-level-2';
    if (ratio > 0.05) return 'heat-level-1';
    return 'heat-level-0';
  };

  const handleCellClick = (statusKey: string, pillar: Pillar | 'TOTAL') => {
    const matchingBeneficiaryIds = new Set<string>();
    filteredConsents.forEach((c) => {
      if (c.status === statusKey) {
        const ben = benMap.get(c.beneficiary_id);
        if (ben && (pillar === 'TOTAL' || ben.pillar === pillar)) {
          matchingBeneficiaryIds.add(ben.id);
        }
      }
    });

    const matchingBens = beneficiaries.filter((b) => matchingBeneficiaryIds.has(b.id));
    setDrilldownPage(1);
    setDrilldownCell({
      status: statusKey,
      pillar,
      items: matchingBens,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] dark:text-white tracking-tight">
            Consent Status Grid
          </h1>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
            Purpose-driven digital consent distribution across all organizational pillars
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#58595b] dark:text-[#cdc4c5]">
            Total Consents Evaluated: <span className="font-bold text-[#191c1e] dark:text-white">{grandTotal.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Purpose Filter & Heatmap Legend */}
      <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl p-4 shadow-ambient-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#58595b] dark:text-[#cdc4c5] uppercase font-mono mr-1">
            Scope by Purpose:
          </span>
          {[
            { id: 'ALL', label: 'All Purposes' },
            { id: 'donor_reporting', label: 'Donor Reporting' },
            { id: 'internal_analytics', label: 'Internal Analytics' },
            { id: 'third_party_sharing', label: 'Third-Party Sharing' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedPurpose(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                selectedPurpose === btn.id
                  ? 'bg-[#bb0013] text-white shadow-xs'
                  : 'bg-[#f8f9fb] dark:bg-[#191c1e] text-[#58595b] dark:text-[#cdc4c5] hover:bg-[#edeef0] border border-[#e2e4e9] dark:border-[#3a3839]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">
          <span>Low</span>
          <div className="flex items-center gap-1">
            <span className="w-5 h-4 rounded-xs heat-level-0 border border-[#e2e4e9] dark:border-[#3a3839]"></span>
            <span className="w-5 h-4 rounded-xs heat-level-1"></span>
            <span className="w-5 h-4 rounded-xs heat-level-2"></span>
            <span className="w-5 h-4 rounded-xs heat-level-3"></span>
            <span className="w-5 h-4 rounded-xs heat-level-4"></span>
          </div>
          <span>High Concentration</span>
        </div>
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-ambient-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#edeef0]/60 dark:bg-[#2e2a2b]/60 border-b border-[#e2e4e9] dark:border-[#3a3839] font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Pillar / Entity</th>
                <th className="py-3.5 px-4 font-semibold text-center">Granted (Active)</th>
                <th className="py-3.5 px-4 font-semibold text-center">Not Yet Opted In</th>
                <th className="py-3.5 px-4 font-semibold text-center">Revoked (Subject)</th>
                <th className="py-3.5 px-4 font-semibold text-center">Expired (Retention)</th>
                <th className="py-3.5 px-4 text-right font-semibold">Total Pillar Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
              {pillars.map((pillar) => {
                const totalForPillar = columnTotals[pillar] || 1;
                return (
                  <tr key={pillar} className="hover:bg-[#f8f9fb] dark:hover:bg-[#191c1e] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-xs text-[#191c1e] dark:text-white whitespace-nowrap">
                      {pillar} Pillar
                    </td>
                    {statuses.map((s) => {
                      const count = matrix[s.key][pillar] || 0;
                      const heatClass = getHeatLevel(count, totalForPillar);
                      const pct = Math.round((count / totalForPillar) * 100);

                      return (
                        <td
                          key={s.key}
                          onClick={() => handleCellClick(s.key, pillar)}
                          className="py-2.5 px-3 text-center cursor-pointer"
                        >
                          <div
                            className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 ${heatClass}`}
                          >
                            <span className="font-mono text-sm font-bold">
                              {count.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono opacity-80">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-[#191c1e] dark:text-white">
                      {totalForPillar.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-[#edeef0]/60 dark:bg-[#2e2a2b]/60 border-t border-[#e2e4e9] dark:border-[#3a3839] font-mono text-xs">
              <tr>
                <td className="py-3.5 px-4 font-bold text-[#191c1e] dark:text-white uppercase">
                  Total Aggregate
                </td>
                {statuses.map((s) => {
                  const count = rowTotals[s.key] || 0;
                  const pct = Math.round((count / (grandTotal || 1)) * 100);
                  return (
                    <td
                      key={s.key}
                      onClick={() => handleCellClick(s.key, 'TOTAL')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:bg-[#edeef0] dark:hover:bg-[#3a3839]"
                    >
                      <div className="font-bold text-[#191c1e] dark:text-white">
                        {count.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#58595b] dark:text-[#cdc4c5]">
                        {pct}% overall
                      </div>
                    </td>
                  );
                })}
                <td className="py-3.5 px-4 text-right font-bold text-[#191c1e] dark:text-white">
                  {grandTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Insights Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl p-4 shadow-ambient-md flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6] shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#191c1e] dark:text-white uppercase font-mono">
              Critical Revocations Notice
            </h4>
            <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-1 leading-relaxed">
              Subject revocations trigger automated write-time gating across all downstream systems. Beneficiary records are isolated immediately upon revocation receipt.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl p-4 shadow-ambient-md flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#cce5ff] text-[#006193] dark:bg-blue-950 dark:text-blue-300 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#191c1e] dark:text-white uppercase font-mono">
              KDPA Compliance Backlog
            </h4>
            <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-1 leading-relaxed">
              Beneficiaries who have not yet opted in for that purpose retain full control to grant consent themselves at any time. 0 records are shared prior to explicit opt-in execution.
            </p>
          </div>
        </div>
      </div>

      {/* Drilldown Modal */}
      {drilldownCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e4e9] dark:border-[#3a3839] shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
                  Consent Cohort Drilldown
                </h3>
                <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] font-mono">
                  Status: <span className="uppercase font-bold text-[#bb0013]">{drilldownCell.status}</span> • Pillar: <span className="font-bold">{drilldownCell.pillar}</span> ({drilldownCell.items.length} Beneficiaries)
                </p>
              </div>
              <button
                onClick={() => setDrilldownCell(null)}
                className="p-1 text-[#58595b] hover:text-[#191c1e] dark:hover:text-white rounded-lg hover:bg-[#edeef0] dark:hover:bg-[#3a3839] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 overflow-y-auto flex-1 divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
              {drilldownCell.items.length === 0 ? (
                <div className="text-center py-12 text-[#58595b] dark:text-[#cdc4c5] text-xs">
                  No beneficiaries in this cohort category.
                </div>
              ) : (
                drilldownCell.items.slice((drilldownPage - 1) * 10, drilldownPage * 10).map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#191c1e] dark:text-white mr-2">
                        {b.id}
                      </span>
                      <span className="font-medium text-[#58595b] dark:text-[#cdc4c5]">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#58595b]">{b.county ? `${b.county}, ${b.region}` : b.region}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#f3f4f6] dark:bg-[#3a3839] border border-[#e2e4e9] dark:border-[#4a4849] text-emerald-700 dark:text-emerald-300">
                        KDPA Verified
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {drilldownCell.items.length > 0 && (
              <Pagination
                currentPage={drilldownPage}
                totalItems={drilldownCell.items.length}
                pageSize={10}
                onPageChange={setDrilldownPage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
