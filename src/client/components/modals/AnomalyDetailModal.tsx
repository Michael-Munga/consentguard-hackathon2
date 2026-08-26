import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Tag,
  ShieldCheck,
  Check,
  Sparkles,
  Activity,
} from 'lucide-react';
import type { AnomalyEvent } from '../../../types/index.js';
import { useLiveDataContext } from '../../context/LiveDataContext.js';
import { formatDateTime, cn } from '../../lib/utils.js';

export interface AnomalyDetailModalProps {
  anomaly: AnomalyEvent | null;
  onClose: () => void;
}

export const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({
  anomaly,
  onClose,
}) => {
  const { markAnomalyReviewed } = useLiveDataContext();
  const [notes, setNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('Inuka DPO');
  const [submitting, setSubmitting] = useState(false);

  // Reset inputs whenever an anomaly changes
  useEffect(() => {
    setNotes('');
    setReviewerName('Inuka DPO');
  }, [anomaly]);

  if (!anomaly) return null;

  const severityUpper = (anomaly.severity || 'low').toUpperCase();
  const isCritical = severityUpper === 'CRITICAL';
  const isMedium = severityUpper === 'MEDIUM';

  const isMlOutlier = anomaly.anomaly_type === 'AI_BEHAVIORAL_OUTLIER' ||
                      anomaly.anomaly_type === 'SUSPICIOUS_BULK_EXFILTRATION' ||
                      (anomaly.detail && anomaly.detail.includes('[ML Anomaly Score:')) ||
                      (anomaly.description && anomaly.description.includes('[ML Anomaly Score:'));

  const fullText = (anomaly.description || anomaly.detail || '');
  const threatScoreMatch = fullText.match(/ML Anomaly Score:\s*(\d+)\/100/);
  const threatScore = threatScoreMatch ? parseInt(threatScoreMatch[1], 10) : null;
  const zScoreMatch = fullText.match(/Z-Score:\s*([+-]?\d+(\.\d+)?)/);
  const zScore = zScoreMatch ? zScoreMatch[1] : null;

  const severityBadgeClass = isCritical
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    : isMedium
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';

  const beneficiaryName = anomaly.beneficiary_name || 'Beneficiary Record';
  const beneficiaryId = anomaly.beneficiary_id;
  const pillar = anomaly.pillar || anomaly.beneficiary_pillar || 'General';
  const county = anomaly.county || anomaly.beneficiary_county || anomaly.beneficiary_region || 'National';
  const description = anomaly.description || anomaly.detail;

  const handleResolve = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!notes.trim()) return;

    setSubmitting(true);
    try {
      const ok = await markAnomalyReviewed(anomaly.id, notes.trim(), reviewerName.trim());
      if (ok) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to mark anomaly reviewed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#231f20] text-[#191c1e] dark:text-white border border-[#e2e4e9] dark:border-[#3a3839] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e2e4e9] dark:border-[#3a3839]">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl border shrink-0',
                isCritical
                  ? 'bg-rose-500/10 text-[#ED1C24] dark:text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              )}
            >
              {isCritical ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border',
                    severityBadgeClass
                  )}
                >
                  {severityUpper}
                </span>

                {isMlOutlier && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border inline-flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3 h-3" />
                    Behavioral Outlier
                  </span>
                )}

                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border inline-flex items-center gap-1',
                    anomaly.reviewed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  )}
                >
                  {anomaly.reviewed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Reviewed
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" />
                      Unresolved
                    </>
                  )}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#191c1e] dark:text-white tracking-tight mt-1.5">
                {anomaly.anomaly_type.replace(/_/g, ' ')}
              </h3>
              <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] font-mono mt-0.5">
                Record ID: {anomaly.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#58595b] hover:text-[#191c1e] dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-[#edeef0] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Beneficiary Card */}
          <div className="bg-[#f8f9fb] dark:bg-[#191c1e] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#58595b] dark:text-[#cdc4c5] font-semibold block">
                  Beneficiary Context
                </span>
                <div className="font-bold text-[#191c1e] dark:text-white text-xs mt-0.5">
                  {beneficiaryName}
                </div>
                <div className="font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
                  {beneficiaryId}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#58595b] dark:text-[#cdc4c5] font-semibold block">
                  Program Details
                </span>
                <div className="font-semibold text-[#191c1e] dark:text-white text-xs mt-0.5">
                  {pillar} Pillar
                </div>
                <div className="font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
                  {county}
                </div>
              </div>
            </div>
          </div>

          {/* ML Threat Score Card if ML Outlier */}
          {isMlOutlier && threatScore !== null && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-2.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span>Behavioral Access Threat Index (Adaptive Baseline)</span>
                </div>
                <span className="font-extrabold text-sm text-purple-700 dark:text-purple-300">
                  {threatScore} / 100
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-purple-200 dark:bg-purple-900/60 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, threatScore)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    threatScore >= 80
                      ? 'bg-red-600'
                      : threatScore >= 65
                      ? 'bg-purple-600'
                      : 'bg-emerald-600'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-purple-800 dark:text-purple-300">
                <span>Z-Score: +{zScore || 'N/A'}</span>
                <span>Role Scope Baseline Exceeded</span>
              </div>
            </div>
          )}

          {/* Incident Description */}
          <div>
            <span className="font-mono text-[10px] uppercase text-[#58595b] dark:text-[#cdc4c5] font-bold block mb-1">
              Incident Detail & Privacy Policy Impact
            </span>
            <div className="p-3.5 bg-[#f8f9fb] dark:bg-[#191c1e] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] text-[#191c1e] dark:text-[#f0f1f3] leading-relaxed text-xs">
              {description}
            </div>
          </div>

          {/* Detection Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-[#f8f9fb] dark:bg-[#191c1e] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#58595b] dark:text-[#cdc4c5] block">
                  Detected Timestamp
                </span>
                <span className="font-semibold text-[#191c1e] dark:text-white text-xs">
                  {formatDateTime(anomaly.detected_at)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#f8f9fb] dark:bg-[#191c1e] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#58595b] dark:text-[#cdc4c5] block">
                  Enforcement Gate
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                  KDPA Section 25 Intercept
                </span>
              </div>
            </div>
          </div>

          {/* Resolution Info or Resolution Form */}
          {anomaly.reviewed ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Governance Sign-Off Recorded</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#58595b] dark:text-[#cdc4c5] pt-1">
                <div>
                  <span className="text-[#58595b] dark:text-slate-400">Reviewed By: </span>
                  <span className="text-[#191c1e] dark:text-white font-medium">
                    {anomaly.reviewed_by || 'Data Protection Officer'}
                  </span>
                </div>
                <div>
                  <span className="text-[#58595b] dark:text-slate-400">Reviewed At: </span>
                  <span className="text-[#191c1e] dark:text-white font-medium">
                    {anomaly.reviewed_at ? formatDateTime(anomaly.reviewed_at) : formatDateTime(new Date().toISOString())}
                  </span>
                </div>
              </div>
              <div className="text-[11px] pt-1 border-t border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold text-[#58595b] dark:text-slate-400">DPO Notes: </span>
                {anomaly.resolution_notes || 'No notes recorded'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-bold text-[#191c1e] dark:text-white block mb-1">
                  Reviewer Identity / DPO Officer:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl text-xs font-mono text-[#191c1e] dark:text-white placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
                  placeholder="e.g. Inuka DPO"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#191c1e] dark:text-white block">
                    DPO Resolution Notes & Governance Sign-Off:
                  </label>
                  <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                    * Mandatory
                  </span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl text-xs text-[#191c1e] dark:text-white placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
                  placeholder="Enter mandatory DPO remediation notes & justification..."
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-[#e2e4e9] dark:border-[#3a3839] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#edeef0] dark:bg-[#2e2a2b] hover:bg-[#e2e4e9] dark:hover:bg-[#3a3839] text-[#58595b] dark:text-[#cdc4c5] hover:text-[#191c1e] dark:hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
          {!anomaly.reviewed && (
            <button
              type="button"
              disabled={submitting || !notes.trim()}
              onClick={handleResolve}
              className="px-4 py-2 bg-[#bb0013] hover:bg-[#93000d] text-white rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {submitting ? 'Resolving...' : 'Mark Reviewed & Resolve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnomalyDetailModal;
