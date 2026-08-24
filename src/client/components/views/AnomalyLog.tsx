import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  X,
  FileWarning,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import type { Anomaly, AnomalyEvent, AnomalySeverity, AnomalyType } from '../../../types/index.js';
import {
  formatDateTime,
  getSeverityBadgeClass,
  getPillarBadgeClass,
} from '../../lib/utils.js';
import { AnomalyDetailModal } from '../modals/AnomalyDetailModal.js';

export const AnomalyLog: React.FC = () => {
  const { stats, markAnomalyReviewed } = useLiveData();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'REVIEWED'>('UNRESOLVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  // Selected anomaly for detail modal
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);

  // Review modal state
  const [reviewingAnomaly, setReviewingAnomaly] = useState<Anomaly | null>(null);
  const [reviewerName, setReviewerName] = useState('Inuka Data Protection Officer');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchAnomalies = async () => {
    try {
      const res = await fetch('/api/anomalies');
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data);
      }
    } catch (err) {
      console.error('Failed to load anomalies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [stats]);

  useEffect(() => {
    setCurrentPage(1);
  }, [severityFilter, typeFilter, statusFilter, searchQuery]);

  const filteredAnomalies = anomalies.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (typeFilter !== 'ALL' && a.anomaly_type !== typeFilter) return false;
    if (statusFilter === 'UNRESOLVED' && a.reviewed) return false;
    if (statusFilter === 'REVIEWED' && !a.reviewed) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.anomaly_type.toLowerCase().includes(q) ||
        (a.beneficiary_name && a.beneficiary_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAnomalies.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedAnomalies = filteredAnomalies.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

  const handleOpenReview = (a: Anomaly) => {
    setReviewNotes('');
    setReviewingAnomaly(a);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingAnomaly || !reviewNotes.trim()) return;
    setIsSubmittingReview(true);

    try {
      const ok = await markAnomalyReviewed(reviewingAnomaly.id, reviewNotes.trim(), reviewerName.trim());
      if (ok) {
        await fetchAnomalies();
        setReviewingAnomaly(null);
        setReviewNotes('');
      }
    } catch (err) {
      console.error('Failed to mark reviewed:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const criticalCount = anomalies.filter((a) => a.severity === 'critical' && !a.reviewed).length;
  const mediumCount = anomalies.filter((a) => a.severity === 'medium' && !a.reviewed).length;
  const lowCount = anomalies.filter((a) => a.severity === 'low' && !a.reviewed).length;
  const totalUnresolved = criticalCount + mediumCount + lowCount;

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] dark:text-white tracking-tight">
            Governance Anomaly Log
          </h1>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
            Critical privacy policy deviations, write-time gating intercepts, and compliance alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#bb0013]">
            {totalUnresolved} Unresolved Action Items
          </span>
        </div>
      </div>

      {/* 12-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Review Queue Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl p-4 shadow-ambient-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Tabs */}
              <div className="flex items-center rounded-lg bg-[#edeef0] dark:bg-[#2e2a2b] p-0.5">
                {(['UNRESOLVED', 'ALL', 'REVIEWED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#bb0013] text-white shadow-xs'
                        : 'text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e]'
                    }`}
                  >
                    {st === 'UNRESOLVED' ? 'Open Queue' : st === 'ALL' ? 'All' : 'Reviewed'}
                  </button>
                ))}
              </div>

              {/* Severity Pill Filter */}
              <div className="flex items-center gap-1">
                {['ALL', 'critical', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-[#191c1e] text-white dark:bg-white dark:text-[#191c1e]'
                        : 'bg-[#f8f9fb] dark:bg-[#191c1e] text-[#58595b] hover:bg-[#edeef0] border border-[#e2e4e9] dark:border-[#3a3839]'
                    }`}
                  >
                    {sev.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-[#58595b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anomalies..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs text-[#191c1e] dark:text-[#f0f1f3] placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-ambient-md overflow-hidden min-h-[380px] flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#edeef0]/60 dark:bg-[#2e2a2b]/60 border-b border-[#e2e4e9] dark:border-[#3a3839] font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Severity</th>
                    <th className="py-3.5 px-4 font-semibold">Anomaly Type</th>
                    <th className="py-3.5 px-4 font-semibold">Beneficiary Context</th>
                    <th className="py-3.5 px-4 font-semibold">Detected At</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
                  {paginatedAnomalies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-[#58595b] dark:text-[#cdc4c5]">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#10B981] opacity-80" />
                        No anomalies matching current queue filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedAnomalies.map((a) => {
                      const isCritical = a.severity === 'critical';

                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAnomaly(a)}
                          className={`hover:bg-[#f8f9fb] dark:hover:bg-[#191c1e] cursor-pointer transition-colors ${
                            isCritical && !a.reviewed ? 'bg-[#ffdad6]/20 dark:bg-[#93000d]/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] blinking-indicator"></span>
                                CRITICAL
                              </span>
                            ) : a.severity === 'medium' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#fef3c7] text-[#92400e] dark:bg-amber-950/60 dark:text-amber-300">
                                ELEVATED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f3f4f6] text-[#58595b] dark:bg-[#3a3839] dark:text-[#cdc4c5]">
                                STANDARD
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#191c1e] dark:text-white max-w-[200px] truncate">
                            {a.anomaly_type.replace(/_/g, ' ')}
                            <p className="text-[11px] font-sans font-normal text-[#58595b] dark:text-[#cdc4c5] truncate mt-0.5">
                              {a.detail}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-xs text-[#191c1e] dark:text-white">
                              {a.beneficiary_name || a.beneficiary_id}
                            </div>
                            <div className="text-[11px] font-mono text-[#58595b] dark:text-[#cdc4c5]">
                              {a.beneficiary_pillar} • {a.beneficiary_region}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] whitespace-nowrap">
                            {formatDateTime(a.detected_at)}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {a.reviewed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#10B981]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(a);
                                }}
                                className={`font-mono text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isCritical
                                    ? 'bg-[#bb0013] text-white hover:bg-[#93000d] shadow-xs'
                                    : 'bg-[#191c1e] text-white hover:bg-black dark:bg-[#3a3839] dark:hover:bg-[#4a4849]'
                                }`}
                              >
                                Mark Reviewed
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredAnomalies.length > PAGE_SIZE && (
              <div className="p-4 border-t border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-between text-xs font-mono">
                <span className="text-[#58595b] dark:text-[#cdc4c5]">
                  Showing {(validPage - 1) * PAGE_SIZE + 1} to {Math.min(validPage * PAGE_SIZE, filteredAnomalies.length)} of {filteredAnomalies.length} anomalies
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage === 1}
                    className="px-2.5 py-1 rounded bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6] rounded font-bold">
                    {validPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage === totalPages}
                    className="px-2.5 py-1 rounded bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] text-[#58595b] disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: At a Glance Severity & DPO Escalation Card */}
        <div className="lg:col-span-4 space-y-4">
          {/* At a Glance Severity Card */}
          <div className="bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-5 shadow-ambient-md space-y-4">
            <h3 className="font-bold text-sm text-[#191c1e] dark:text-white uppercase font-mono tracking-wider border-b border-[#e2e4e9] dark:border-[#3a3839] pb-3">
              Unresolved By Severity
            </h3>

            {/* Critical Row */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-[#ba1a1a] dark:text-[#ffdad6] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
                  Critical Violations
                </span>
                <span className="font-mono font-bold text-xs">{criticalCount}</span>
              </div>
              <div className="w-full bg-[#edeef0] dark:bg-[#3a3839] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#bb0013] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (criticalCount / (totalUnresolved || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Elevated / Medium Row */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#92400e] dark:text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#d97706]"></span>
                  Elevated / Medium
                </span>
                <span className="font-mono font-bold text-xs">{mediumCount}</span>
              </div>
              <div className="w-full bg-[#edeef0] dark:bg-[#3a3839] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#d97706] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (mediumCount / (totalUnresolved || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Standard / Low Row */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-[#58595b] dark:text-[#cdc4c5] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#64748b]"></span>
                  Standard / Low
                </span>
                <span className="font-mono font-bold text-xs">{lowCount}</span>
              </div>
              <div className="w-full bg-[#edeef0] dark:bg-[#3a3839] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#64748b] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (lowCount / (totalUnresolved || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* DPO Action Required Escalation Card */}
          <div className="bg-[#bb0013] text-white rounded-xl p-5 shadow-ambient-md space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-white" />
              <h3 className="font-bold text-xs uppercase font-mono tracking-wider">
                DPO Action Required
              </h3>
            </div>
            <p className="text-xs leading-relaxed opacity-95">
              KDPA Section 25 Enforcement requires manual sign-off on all critical write-time blocks before beneficiary state progression.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSeverityFilter('critical');
                  setStatusFilter('UNRESOLVED');
                }}
                className="w-full py-2 bg-[#1e1b1c] hover:bg-black text-white rounded-lg text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                FILTER TO CRITICAL QUEUE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DPO Review Modal */}
      {reviewingAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#231f20] text-[#191c1e] dark:text-white border border-[#e2e4e9] dark:border-[#3a3839] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e4e9] dark:border-[#3a3839]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#bb0013]" />
                <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
                  DPO Anomaly Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setReviewingAnomaly(null)}
                className="p-1 text-[#58595b] hover:text-[#191c1e] dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-[#edeef0] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-[#f8f9fb] dark:bg-[#191c1e] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] space-y-1">
                <div className="font-bold text-[#bb0013]">
                  {reviewingAnomaly.anomaly_type.replace(/_/g, ' ')}
                </div>
                <div className="text-[#58595b] dark:text-[#cdc4c5]">{reviewingAnomaly.detail}</div>
              </div>

              <div>
                <label className="font-bold text-[#191c1e] dark:text-white block mb-1">
                  Data Protection Officer Name:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs font-mono text-[#191c1e] dark:text-white placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#191c1e] dark:text-white block">
                    Governance Review Notes & Cryptographic Certification:
                  </label>
                  <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                    * Mandatory
                  </span>
                </div>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs text-[#191c1e] dark:text-white placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
                  placeholder="Enter mandatory DPO remediation notes & justification..."
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingAnomaly(null)}
                  className="px-4 py-2 bg-[#edeef0] dark:bg-[#2e2a2b] hover:bg-[#e2e4e9] dark:hover:bg-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || !reviewNotes.trim()}
                  className="px-4 py-2 bg-[#bb0013] hover:bg-[#93000d] text-white rounded-lg font-bold font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingReview ? 'Signing...' : 'Commit DPO Sign-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Anomaly Detail Modal */}
      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        onClose={() => {
          setSelectedAnomaly(null);
          fetchAnomalies();
        }}
      />
    </div>
  );
};
