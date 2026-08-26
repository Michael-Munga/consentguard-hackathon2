import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext.js';
import { Download, Send, CheckCircle2, ShieldCheck, AlertCircle, FileText, Globe, Sparkles, Clock, Lock, FileSpreadsheet, ShieldAlert, AlertTriangle, Activity } from 'lucide-react';
import type { ConsentPurpose, Pillar, Region, PrivacyAssessment } from '../../../types/index.js';
import { Pagination } from '../common/Pagination.js';
import { REGION_COUNTIES, ALL_COUNTIES, formatDateTime } from '../../lib/utils.js';

export const ComplianceExports: React.FC = () => {
  const { token, user } = useAuth();
  const [schemaType, setSchemaType] = useState<ConsentPurpose>('donor_reporting');
  const [pillar, setPillar] = useState('ALL');
  const [region, setRegion] = useState('ALL');
  const [county, setCounty] = useState('ALL');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [privacyAssessment, setPrivacyAssessment] = useState<PrivacyAssessment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportPage, setExportPage] = useState(1);
  const [exportPageSize, setExportPageSize] = useState(10);

  const fetchPrivacyAssessment = async () => {
    if (!token) return;
    try {
      const url = pillar !== 'ALL'
        ? `/api/compliance/privacy-assessment?pillar=${encodeURIComponent(pillar)}`
        : '/api/compliance/privacy-assessment';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPrivacyAssessment(data);
      }
    } catch (err) {
      console.error('Failed to fetch privacy assessment:', err);
    }
  };

  useEffect(() => {
    fetchPrivacyAssessment();
  }, [token, pillar]);

  const availableCounties = region === 'ALL'
    ? ALL_COUNTIES
    : REGION_COUNTIES[region] || ALL_COUNTIES;

  const handleProcessExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Please enter a valid recipient email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setExportResult(null);
    setExportPage(1);

    try {
      const res = await fetch('/api/compliance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schemaType,
          recipient_email: recipientEmail.trim(),
          pillar,
          region,
          county,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate compliance export');
      }

      setExportResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Export dispatch failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExport = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!exportResult || !exportResult.records) return;

    const exportRows = exportResult.records.map((r: any) => ({
      'Cohort ID': r.donor_cohort_id || '',
      'Masked Token': r.masked_beneficiary_token || '',
      'Pillar': r.pillar || '',
      'County': r.county || '',
      'KDPA Certified Status': 'VERIFIED',
      'Export ID': exportResult.export_id || '',
      'Export Timestamp': formatDateTime(r.export_timestamp || exportResult.dispatched_at || new Date().toISOString()),
    }));

    if (format === 'csv') {
      const headers = ['Cohort ID', 'Masked Token', 'Pillar', 'County', 'KDPA Certified Status', 'Export ID', 'Export Timestamp'];
      const csvContent = [
        headers.join(','),
        ...exportRows.map((row: any) =>
          headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inuka_Compliance_Export_${schemaType}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      worksheet['!cols'] = [
        { wch: 24 }, // Cohort ID
        { wch: 22 }, // Masked Token
        { wch: 16 }, // Pillar
        { wch: 18 }, // County
        { wch: 22 }, // KDPA Certified Status
        { wch: 28 }, // Export ID
        { wch: 26 }, // Export Timestamp
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Compliance Extract');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inuka_Compliance_Export_${schemaType}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-[#bb0013] dark:text-[#ffb4ab] text-xs font-bold mb-2">
            <Download className="w-3.5 h-3.5" />
            <span>Compliance Export Gateway</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            KDPA Anonymized Export Center
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            Dispatch pseudonymized data extracts to verified donors and partners with mandatory recipient tracking and cryptographic audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] bg-[#f8f9fb] dark:bg-[#121011] px-4 py-3 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Section 25 Masking Engine</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleProcessExport} className="space-y-8">
        {/* Step 1: Export Schema */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#bb0013]">
            <span className="w-5 h-5 rounded-full bg-[#bb0013] text-white flex items-center justify-center text-[10px]">1</span>
            <span>Select Export Schema</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setSchemaType('donor_reporting')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                schemaType === 'donor_reporting'
                  ? 'border-[#bb0013] bg-red-50/40 dark:bg-red-950/30 text-[#191c1e] dark:text-white ring-2 ring-[#bb0013]/20'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#58595b] dark:text-[#cdc4c5] hover:bg-zinc-100'
              }`}
            >
              <div>
                <Globe className="w-5 h-5 text-[#bb0013] mb-2" />
                <h4 className="text-sm font-bold text-[#191c1e] dark:text-white">Donor Report Schema</h4>
                <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-1">Anonymized cohort progress for verified funding partners.</p>
              </div>
              <span className="text-[10px] font-mono font-bold mt-4 text-[#bb0013] block">Purpose: donor_reporting</span>
            </button>

            <button
              type="button"
              onClick={() => setSchemaType('internal_analytics')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                schemaType === 'internal_analytics'
                  ? 'border-[#bb0013] bg-red-50/40 dark:bg-red-950/30 text-[#191c1e] dark:text-white ring-2 ring-[#bb0013]/20'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#58595b] dark:text-[#cdc4c5] hover:bg-zinc-100'
              }`}
            >
              <div>
                <Sparkles className="w-5 h-5 text-[#006193] mb-2" />
                <h4 className="text-sm font-bold text-[#191c1e] dark:text-white">Internal Analytics Schema</h4>
                <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-1">Statistical evaluations for Inuka M&E and program leads.</p>
              </div>
              <span className="text-[10px] font-mono font-bold mt-4 text-[#006193] block">Purpose: internal_analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setSchemaType('third_party_sharing')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                schemaType === 'third_party_sharing'
                  ? 'border-[#bb0013] bg-red-50/40 dark:bg-red-950/30 text-[#191c1e] dark:text-white ring-2 ring-[#bb0013]/20'
                  : 'border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#58595b] dark:text-[#cdc4c5] hover:bg-zinc-100'
              }`}
            >
              <div>
                <Clock className="w-5 h-5 text-purple-600 mb-2" />
                <h4 className="text-sm font-bold text-[#191c1e] dark:text-white">Third-Party Sharing Schema</h4>
                <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] mt-1">Authorized pseudonymized extracts for verified external partners.</p>
              </div>
              <span className="text-[10px] font-mono font-bold mt-4 text-purple-600 block">Purpose: third_party_sharing</span>
            </button>
          </div>
        </div>

        {/* Step 2: Data Boundary Parameters */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#bb0013]">
            <span className="w-5 h-5 rounded-full bg-[#bb0013] text-white flex items-center justify-center text-[10px]">2</span>
            <span>Data Boundary Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#191c1e] dark:text-white mb-1.5">Program Pillar</label>
              <select
                value={pillar}
                onChange={e => setPillar(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-xs text-[#191c1e] dark:text-white focus:ring-2 focus:ring-[#bb0013]"
              >
                <option value="ALL">All Pillars</option>
                <option value="Scholarship">Scholarship</option>
                <option value="Plus">Plus</option>
                <option value="Vocational">Vocational</option>
                <option value="Tech">Tech</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191c1e] dark:text-white mb-1.5">Region Scope</label>
              <select
                value={region}
                onChange={e => {
                  const newRegion = e.target.value;
                  setRegion(newRegion);
                  if (newRegion !== 'ALL') {
                    const valid = REGION_COUNTIES[newRegion] || [];
                    if (county !== 'ALL' && !valid.includes(county)) {
                      setCounty('ALL');
                    }
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-xs text-[#191c1e] dark:text-white focus:ring-2 focus:ring-[#bb0013]"
              >
                <option value="ALL">All Regions (8 Regions)</option>
                {Object.keys(REGION_COUNTIES).map(r => (
                  <option key={r} value={r}>
                    {r} Region
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191c1e] dark:text-white mb-1.5">County Scope</label>
              <select
                value={county}
                onChange={e => setCounty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-xs text-[#191c1e] dark:text-white focus:ring-2 focus:ring-[#bb0013]"
              >
                <option value="ALL">
                  {region === 'ALL' ? 'All Counties (47 Counties)' : `Counties in ${region} (${availableCounties.length})`}
                </option>
                {availableCounties.map(c => (
                  <option key={c} value={c}>
                    {c} County
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Dispatch Directive */}
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#bb0013]">
            <span className="w-5 h-5 rounded-full bg-[#bb0013] text-white flex items-center justify-center text-[10px]">3</span>
            <span>Dispatch Directive & Recipient Logging</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191c1e] dark:text-white mb-1.5">
              Recipient Official Email (Required for Audit Logging)
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="donor.auditor@verified-partner.org"
              className="w-full px-3.5 py-3 rounded-xl border border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-xs text-[#191c1e] dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-[#bb0013]"
            />
            <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1.5">
              The recipient email, dispatch timestamp, executing compliance officer ({user?.email}), and exact exported cohort count will be permanently written to the immutable audit trail.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/40 text-xs space-y-2 text-[#58595b] dark:text-[#cdc4c5]">
            <div className="flex items-center gap-2 font-bold text-[#191c1e] dark:text-white">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>KDPA Section 25 Masking Guarantee</span>
            </div>
            <p>
              Names are automatically transformed into pseudonymized tokens (e.g. &apos;K. K***&apos;). Unconsented records are completely excluded. Program milestone and current stage columns are omitted from donor exports.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#bb0013] hover:bg-[#93000d] text-white font-bold text-xs shadow-lg shadow-red-900/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Process & Dispatch Compliance Export</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Export Result Box */}
      {exportResult && (
        <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-emerald-300 dark:border-emerald-900 shadow-lg space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191c1e] dark:text-white">
                  Compliance Export Dispatched & Certified
                </h3>
                <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] font-mono">
                  Export ID: {exportResult.export_id} • Dispatched to: {exportResult.recipient_email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadExport('xlsx')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
                title="Download as Excel XLSX spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Export (Excel / CSV)</span>
              </button>
              <button
                onClick={() => handleDownloadExport('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Download as comma-separated CSV text"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Eligible Records</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{exportResult.total_eligible_records}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Excluded (No Consent)</span>
              <span className="text-base font-bold text-red-600">{exportResult.excluded_unauthorized_records}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Masking Rule</span>
              <span className="text-xs font-bold text-[#191c1e] dark:text-white">KDPA Sec 25</span>
            </div>

            <div className="p-3 rounded-xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839]">
              <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] block">Audit Log</span>
              <span className="text-xs font-bold text-[#191c1e] dark:text-white">Permanent Append</span>
            </div>
          </div>

          {/* KDPA Linkage Risk & Privacy Assessment Panel */}
          {(exportResult.privacy_assessment || privacyAssessment) && (() => {
            const activeAssessment = exportResult.privacy_assessment || privacyAssessment;
            return (
              <div className="p-5 rounded-2xl bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e2e4e9] dark:border-[#3a3839]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#bb0013]" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#191c1e] dark:text-white">
                      KDPA Linkage Risk & Privacy Intelligence Assessment
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    KDPA Sec 25 Certified • Zero Direct PII
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* k-Anonymity Health Gauge */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1e1b1c] border border-[#e2e4e9] dark:border-[#3a3839]">
                    <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] font-semibold block uppercase">
                      k-Anonymity Health Index
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xl font-extrabold font-mono ${
                        activeAssessment.riskTier === 'LOW'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : activeAssessment.riskTier === 'MEDIUM'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {activeAssessment.kAnonymityScore}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeAssessment.riskTier === 'LOW'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                          : activeAssessment.riskTier === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40'
                      }`}>
                        {activeAssessment.riskTier === 'LOW' ? 'k-Safe (k ≥ 3)' : activeAssessment.riskTier === 'MEDIUM' ? 'Moderate Risk (k ≥ 2)' : 'High Vulnerability (k < 3)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">
                      Quasi-identifier demographic density: (Pillar × County)
                    </p>
                  </div>

                  {/* Singling-Out Vulnerability Counter */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1e1b1c] border border-[#e2e4e9] dark:border-[#3a3839]">
                    <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] font-semibold block uppercase">
                      Singling-Out Linkage Vulnerability
                    </span>
                    <div className="text-xl font-extrabold font-mono mt-1 text-[#bb0013] dark:text-[#ffb4ab]">
                      {activeAssessment.unprotectedRecords} Records
                    </div>
                    <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">
                      {activeAssessment.vulnerableCohorts.length > 0
                        ? `${activeAssessment.vulnerableCohorts.length} vulnerable demographic cohorts detected (k < 3)`
                        : '0 singling-out risks detected across cohort'}
                    </p>
                  </div>

                  {/* Safe Records Protection */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1e1b1c] border border-[#e2e4e9] dark:border-[#3a3839]">
                    <span className="text-[10px] text-[#58595b] dark:text-[#cdc4c5] font-semibold block uppercase">
                      Protected In-Scope Records
                    </span>
                    <div className="text-xl font-extrabold font-mono mt-1 text-emerald-700 dark:text-emerald-300">
                      {activeAssessment.safeRecords} / {activeAssessment.totalRecords}
                    </div>
                    <p className="text-[11px] text-[#58595b] dark:text-[#cdc4c5] mt-1">
                      Meeting statutory 3-record demographic indistinguishability
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Export Records Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#58595b] dark:text-[#cdc4c5]">
                Exported Records Extract ({exportResult.records?.length || 0} Total)
              </h4>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839] flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fb] dark:bg-[#121011] text-[#58595b] dark:text-[#cdc4c5] uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Cohort ID</th>
                      <th className="py-2.5 px-4">Masked Token</th>
                      <th className="py-2.5 px-4">Pillar</th>
                      <th className="py-2.5 px-4">County</th>
                      <th className="py-2.5 px-4">KDPA Certified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
                    {exportResult.records
                      ?.slice((exportPage - 1) * exportPageSize, exportPage * exportPageSize)
                      .map((r: any, i: number) => {
                        const activeAssessment = exportResult.privacy_assessment || privacyAssessment;
                        const cohortKey = `${r.pillar}_${r.county}`;
                        const cohortRisk = activeAssessment?.cohortMap?.[cohortKey];

                        return (
                          <tr key={i} className="hover:bg-[#f8f9fb] dark:hover:bg-[#121011]">
                            <td className="py-2.5 px-4 font-mono">{r.donor_cohort_id}</td>
                            <td className="py-2.5 px-4 font-bold text-[#191c1e] dark:text-white">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{r.masked_beneficiary_token}</span>
                                {cohortRisk?.riskType === 'k=1' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                    ⚠️ High Linkage Risk (k=1)
                                  </span>
                                )}
                                {cohortRisk?.riskType === 'k=2' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    ℹ️ Low k-Anonymity (k=2)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">{r.pillar}</td>
                            <td className="py-2.5 px-4">{r.county}</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">VERIFIED</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {exportResult.records && exportResult.records.length > 0 && (
                <Pagination
                  currentPage={exportPage}
                  totalItems={exportResult.records.length}
                  pageSize={exportPageSize}
                  onPageChange={setExportPage}
                  onPageSizeChange={setExportPageSize}
                  pageSizeOptions={[5, 10, 25, 50]}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
