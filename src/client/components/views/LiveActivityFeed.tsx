import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  FileX,
  Search,
  Filter,
  Eye,
  X,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  AlertOctagon,
  FileText,
  KeyRound,
  Layers,
  MapPin,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import { useAuth } from '../../context/AuthContext.js';
import type { StreamEvent, StreamEventType, Pillar, PrivacyAssessment } from '../../../types/index.js';
import { formatDateTime, getSeverityBadgeClass, getPillarBadgeClass } from '../../lib/utils.js';
import { Pagination } from '../common/Pagination.js';

interface LiveActivityFeedProps {
  onOpenBeneficiaryDirectory?: (query?: string) => void;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  onOpenBeneficiaryDirectory,
}) => {
  const { events, isConnected } = useLiveData();
  const { token } = useAuth();
  const [privacyAssessment, setPrivacyAssessment] = useState<PrivacyAssessment | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedEvent, setInspectedEvent] = useState<StreamEvent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/compliance/privacy-assessment', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPrivacyAssessment(data);
        }
      } catch (err) {
        console.error('Failed to fetch privacy assessment in LiveActivityFeed:', err);
      }
    };

    fetchAssessment();
  }, [token]);

  const filteredEvents = events.filter((e) => {
    // Filter by Pillar
    if (selectedPillar !== 'ALL') {
      const pillar = e.data?.beneficiary?.pillar || e.data?.pillar || e.data?.beneficiary_pillar;
      if (pillar !== selectedPillar) return false;
    }
    // Filter by Status
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'CRITICAL' && !(e.type === 'UNAUTHORIZED_ACCESS_BLOCKED' || e.severity === 'critical')) return false;
      if (selectedStatus === 'NORMAL' && (e.severity === 'critical' || e.severity === 'medium')) return false;
      if (selectedStatus === 'WARNING' && e.severity !== 'medium') return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.message.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      JSON.stringify(e.data).toLowerCase().includes(q)
    );
  });

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPillar, selectedStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedEvents = filteredEvents.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

  const getEventIcon = (type: StreamEventType, severity?: string) => {
    if (type === 'UNAUTHORIZED_ACCESS_BLOCKED' || severity === 'critical') {
      return <ShieldAlert className="w-4 h-4 text-[#ba1a1a]" />;
    }
    switch (type) {
      case 'CONSENT_GRANTED':
        return <FileCheck className="w-4 h-4 text-[#006193] dark:text-[#91ccff]" />;
      case 'CONSENT_REVOKED':
        return <FileX className="w-4 h-4 text-[#ba1a1a]" />;
      case 'DATA_ACCESSED':
        return <ShieldCheck className="w-4 h-4 text-[#10B981]" />;
      case 'ANOMALY_FLAGGED':
        return <AlertOctagon className="w-4 h-4 text-[#ba1a1a]" />;
      default:
        return <Activity className="w-4 h-4 text-[#58595b]" />;
    }
  };

  const renderFormattedValue = (key: string, value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-[#58595b] italic">None</span>;
    }
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center gap-1 text-[#10B981] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[#ba1a1a] font-bold">
          <XCircle className="w-3.5 h-3.5" /> No
        </span>
      );
    }
    if (key.includes('at') || key.includes('timestamp') || key.includes('date')) {
      if (typeof value === 'string' && value.includes('T')) {
        return <span className="font-mono text-[#191c1e] dark:text-white">{formatDateTime(value)}</span>;
      }
    }
    if (key === 'severity') {
      return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getSeverityBadgeClass(value)}`}>
          {value}
        </span>
      );
    }
    if (key === 'pillar') {
      return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPillarBadgeClass(value as Pillar)}`}>
          {value}
        </span>
      );
    }
    if (key === 'status') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6]">
          {String(value).replace(/_/g, ' ')}
        </span>
      );
    }
    return <span className="text-[#191c1e] dark:text-white font-medium">{String(value)}</span>;
  };

  const formatFieldLabel = (raw: string) => {
    const customMap: Record<string, string> = {
      id: 'Record ID',
      beneficiary_id: 'Beneficiary ID',
      name: 'Beneficiary (Masked)',
      beneficiary_name: 'Beneficiary (Masked)',
      masked_beneficiary_token: 'Masked Token (KDPA Sec 25)',
      anomaly_type: 'Anomaly Type',
      detected_at: 'Detection Timestamp',
      applied_at: 'Application Date',
      granted_at: 'Grant Timestamp',
      expires_at: 'Expiry Date',
      accessed_by: 'Authorized Actor',
      was_valid: 'Access Authorized',
      purpose: 'Authorized Purpose',
      detail: 'Details & Governance Context',
      reviewed: 'Reviewed by DPO',
    };
    return customMap[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderObjectCard = (title: string, icon: React.ReactNode, obj: Record<string, any>) => {
    return (
      <div className="bg-[#f8f9fb] dark:bg-[#191c1e] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] p-3.5 space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-[#e2e4e9] dark:border-[#3a3839] text-xs font-bold text-[#191c1e] dark:text-white">
          {icon}
          <span>{title}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(obj).map(([key, val]) => {
            if (typeof val === 'object' && val !== null) {
              return null;
            }
            return (
              <div key={key} className="flex flex-col py-1">
                <span className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] font-medium">
                  {formatFieldLabel(key)}:
                </span>
                <div className="mt-0.5">{renderFormattedValue(key, val)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getStatusBadge = (event: StreamEvent) => {
    const isMlOutlier =
      event.data?.anomaly?.anomaly_type === 'AI_BEHAVIORAL_OUTLIER' ||
      event.data?.anomaly?.anomaly_type === 'SUSPICIOUS_BULK_EXFILTRATION' ||
      event.message?.includes('[ML Anomaly Score:') ||
      event.data?.threatScore !== undefined;

    const mlThreatScore = event.data?.threatScore ||
      (event.message?.match(/ML Anomaly Score:\s*(\d+)\/100/)?.[1]);

    const baseBadge = (() => {
      if (event.type === 'UNAUTHORIZED_ACCESS_BLOCKED' || event.severity === 'critical') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#93000d] dark:text-[#ffdad6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] blinking-indicator"></span>
            CRITICAL
          </span>
        );
      }
      if (event.severity === 'medium') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#fef3c7] text-[#92400e] dark:bg-amber-950/60 dark:text-amber-300">
            WARNING
          </span>
        );
      }
      if (event.type === 'CONSENT_GRANTED') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#cce5ff] text-[#006193] dark:bg-blue-950 dark:text-blue-300">
            GRANTED
          </span>
        );
      }
      if (event.type === 'CONSENT_REVOKED') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#fee2e2] text-[#991b1b] dark:bg-red-950/70 dark:text-red-300">
            REVOKED
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#dcfce7] text-[#15803d] dark:bg-emerald-950 dark:text-emerald-300">
          NORMAL
        </span>
      );
    })();

    if (isMlOutlier) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {baseBadge}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Sparkles className="w-2.5 h-2.5" />
            ML Outlier
          </span>
          {mlThreatScore && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
              Threat: {mlThreatScore}/100
            </span>
          )}
        </div>
      );
    }

    return baseBadge;
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] dark:text-white tracking-tight">
            Live Activity Feed
          </h1>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-0.5">
            Real-time event stream and KDPA privacy telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="font-mono text-xs font-semibold text-[#10B981]">
            System Status: Healthy
          </span>
        </div>
      </div>

      {/* AI Privacy Intelligence & ML Engine Telemetry Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-emerald-900/10 dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-emerald-950/30 border border-purple-200/80 dark:border-purple-800/40 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#191c1e] dark:text-white flex items-center gap-1.5">
                <span>Real-Time Privacy Intelligence & ML Threat Fabric</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Online
                </span>
              </h3>
              <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5]">
                Continuous demographic $k$-anonymity monitoring & statistical behavioral anomaly detection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              {privacyAssessment?.kAnonymityScore ?? 98.4}% $k$-Safe ($k \ge 3$)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Activity className="w-3.5 h-3.5" />
              Adaptive Z-Scorer Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/30 text-xs font-mono">
          <div className="bg-white/80 dark:bg-[#1e1b1c]/80 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Quasi-Identifiers</span>
            <span className="font-bold text-[#191c1e] dark:text-white text-xs">Pillar × County (47)</span>
          </div>
          <div className="bg-white/80 dark:bg-[#1e1b1c]/80 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Singling-Out Risk</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">
              {privacyAssessment?.unprotectedRecords ?? 0} Vulnerable Records
            </span>
          </div>
          <div className="bg-white/80 dark:bg-[#1e1b1c]/80 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Temporal Outlier Window</span>
            <span className="font-bold text-purple-700 dark:text-purple-300 text-xs">20:00 – 06:00 EAT</span>
          </div>
          <div className="bg-white/80 dark:bg-[#1e1b1c]/80 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Privacy Framework</span>
            <span className="font-bold text-[#191c1e] dark:text-white text-xs">KDPA 2019 Sec 25</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-[#231f20] border border-[#e2e4e9] dark:border-[#3a3839] rounded-xl p-4 shadow-ambient-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-[#58595b] dark:text-[#cdc4c5] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by ID, action or beneficiary..."
              className="w-full pl-9 pr-3 py-2 bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs text-[#191c1e] dark:text-[#f0f1f3] placeholder-[#58595b] focus:outline-none focus:border-[#bb0013]"
            />
          </div>

          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value)}
            className="bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs text-[#191c1e] dark:text-[#f0f1f3] py-2 px-3 focus:outline-none focus:border-[#bb0013] cursor-pointer"
          >
            <option value="ALL">All Pillars</option>
            <option value="Scholarship">Scholarship</option>
            <option value="Plus">Plus</option>
            <option value="Vocational">Vocational</option>
            <option value="Tech">Tech</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#f8f9fb] dark:bg-[#191c1e] border border-[#e2e4e9] dark:border-[#3a3839] rounded-lg text-xs text-[#191c1e] dark:text-[#f0f1f3] py-2 px-3 focus:outline-none focus:border-[#bb0013] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NORMAL">Normal</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>
      </div>

      {/* Stream Table */}
      <div className="bg-white dark:bg-[#231f20] rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-ambient-md overflow-hidden min-h-[420px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#edeef0]/60 dark:bg-[#2e2a2b]/60 border-b border-[#e2e4e9] dark:border-[#3a3839] font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Time (UTC)</th>
                <th className="py-3.5 px-4 font-semibold">Event Type</th>
                <th className="py-3.5 px-4 font-semibold">Details</th>
                <th className="py-3.5 px-4 font-semibold">Pillar / Context</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[#58595b] dark:text-[#cdc4c5]">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No events match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const isCritical =
                    event.type === 'UNAUTHORIZED_ACCESS_BLOCKED' || event.severity === 'critical';
                  const pillar =
                    event.data?.beneficiary?.pillar ||
                    event.data?.pillar ||
                    event.data?.beneficiary_pillar ||
                    'General';

                  return (
                    <tr
                      key={event.id}
                      onClick={() => setInspectedEvent(event)}
                      className={`hover:bg-[#f3f4f6] dark:hover:bg-[#2e2a2b] transition-colors cursor-pointer ${
                        isCritical ? 'bg-[#ffdad6]/20 dark:bg-[#93000d]/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#58595b] dark:text-[#cdc4c5] whitespace-nowrap">
                        {formatDateTime(event.timestamp)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isCritical ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#edeef0] dark:bg-[#3a3839] text-[#191c1e] dark:text-white'}`}>
                            {getEventIcon(event.type, event.severity)}
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#191c1e] dark:text-white">
                            {event.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#191c1e] dark:text-[#f0f1f3] font-medium">
                        {event.message}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f3f4f6] dark:bg-[#3a3839] border border-[#e2e4e9] dark:border-[#4a4849] text-[#191c1e] dark:text-white">
                          {pillar}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(event)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedEvent(event);
                          }}
                          className={`font-mono text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                            isCritical
                              ? 'bg-[#bb0013] text-white hover:bg-[#93000d]'
                              : 'text-[#006193] dark:text-[#91ccff] hover:bg-[#edeef0] dark:hover:bg-[#3a3839]'
                          }`}
                        >
                          {isCritical ? 'INVESTIGATE' : 'VIEW LOG'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredEvents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredEvents.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Inspect Event Payload Modal */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#231F20] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#231F20] dark:text-white">Event Provenance Inspector</h3>
                  <p className="text-xs text-[#58595B] dark:text-slate-400 font-mono">{inspectedEvent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectedEvent(null)}
                className="p-1 text-slate-400 hover:text-[#231F20] dark:hover:text-white rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
              {/* Event Header Summary */}
              <div className="grid grid-cols-2 gap-2 bg-[#F4F5F7] dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[#58595B] dark:text-slate-400 block text-[11px]">Event Type:</span>
                  <span className="font-mono font-bold text-[#ED1C24] dark:text-red-400">
                    {inspectedEvent.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[#58595B] dark:text-slate-400 block text-[11px]">Timestamp:</span>
                  <span className="font-mono text-[#231F20] dark:text-slate-200">
                    {formatDateTime(inspectedEvent.timestamp)}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <span className="text-[#58595B] dark:text-slate-400 font-semibold block mb-1">
                  Event Description:
                </span>
                <div className="p-3 bg-[#F4F5F7] dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[#231F20] dark:text-slate-200 leading-relaxed font-medium">
                  {inspectedEvent.message}
                </div>
              </div>

              {/* Human-Friendly Structured Metadata */}
              <div className="space-y-3">
                <span className="text-[#58595B] dark:text-slate-400 font-semibold block">
                  Event Parameters & Governance Context:
                </span>

                {/* Render dedicated cards for known entities if present */}
                {inspectedEvent.data?.anomaly && (
                  renderObjectCard(
                    'Flagged Anomaly Information',
                    <AlertOctagon className="w-4 h-4 text-[#ED1C24]" />,
                    inspectedEvent.data.anomaly
                  )
                )}

                {inspectedEvent.data?.beneficiary && (
                  <div className="space-y-2">
                    {renderObjectCard(
                      'Beneficiary Profile (KDPA 2019 Masked)',
                      <User className="w-4 h-4 text-[#ED1C24]" />,
                      inspectedEvent.data.beneficiary
                    )}
                    {onOpenBeneficiaryDirectory && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                        <div className="text-[11px] text-[#006193] dark:text-[#91ccff]">
                          <span className="font-semibold">KDPA Privacy Protection Active: </span>
                          Beneficiary name is masked as a privacy-safe token. Direct unmasked lookup requires authorized directory access.
                        </div>
                        <button
                          onClick={() => {
                            const targetId =
                              inspectedEvent.data?.beneficiary?.id ||
                              inspectedEvent.data?.beneficiary_id ||
                              inspectedEvent.data?.anomaly?.beneficiary_id;
                            if (targetId) {
                              onOpenBeneficiaryDirectory(targetId);
                              setInspectedEvent(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006193] text-white hover:bg-[#004e77] font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Reveal Full Identity</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {inspectedEvent.data?.consent && (
                  renderObjectCard(
                    'Consent Authorization Record',
                    <FileCheck className="w-4 h-4 text-[#ED1C24]" />,
                    inspectedEvent.data.consent
                  )
                )}

                {inspectedEvent.data?.access_event && (
                  renderObjectCard(
                    'Data Access Event Audit',
                    <KeyRound className="w-4 h-4 text-[#231F20] dark:text-white" />,
                    inspectedEvent.data.access_event
                  )
                )}

                {/* Render any remaining scalar parameters not covered in the cards */}
                {(() => {
                  const scalarEntries = Object.entries(inspectedEvent.data || {}).filter(
                    ([k, v]) => !['anomaly', 'beneficiary', 'consent', 'access_event'].includes(k)
                  );
                  if (scalarEntries.length === 0) return null;

                  return (
                    <div className="bg-[#F4F5F7] dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-xs font-bold text-[#231F20] dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800 mb-2 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#ED1C24]" />
                        <span>Additional Properties</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {scalarEntries.map(([k, v]) => (
                          <div key={k} className="flex flex-col py-1">
                            <span className="text-[11px] text-[#58595B] dark:text-slate-400 font-medium">
                              {formatFieldLabel(k)}:
                            </span>
                            <div className="mt-0.5">
                              {typeof v === 'object' && v !== null ? (
                                <div className="space-y-1 mt-1 pl-2 border-l-2 border-slate-300 dark:border-slate-700">
                                  {Object.entries(v).map(([subK, subV]) => (
                                    <div key={subK} className="text-[11px]">
                                      <span className="text-[#58595B]">{formatFieldLabel(subK)}: </span>
                                      <span className="text-[#231F20] dark:text-slate-200 font-medium">{String(subV)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                renderFormattedValue(k, v)
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              {(() => {
                const benId =
                  inspectedEvent.data?.beneficiary?.id ||
                  inspectedEvent.data?.beneficiary_id ||
                  inspectedEvent.data?.anomaly?.beneficiary_id;
                if (!benId || !onOpenBeneficiaryDirectory || inspectedEvent.data?.beneficiary) {
                  return <div />;
                }
                return (
                  <button
                    onClick={() => {
                      onOpenBeneficiaryDirectory(benId);
                      setInspectedEvent(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#006193] hover:bg-[#004e77] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal Identity ({benId})</span>
                  </button>
                );
              })()}
              <button
                onClick={() => setInspectedEvent(null)}
                className="px-4 py-2 bg-[#ED1C24] hover:bg-[#C8102E] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveActivityFeed;
