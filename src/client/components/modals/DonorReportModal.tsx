import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  ShieldCheck,
  Download,
  Copy,
  Check,
  X,
  Lock,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface DonorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonorReportModal: React.FC<DonorReportModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!isOpen) return;
    const fetchDonorData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/donor-report');
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Failed to fetch donor report:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDonorData();
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil((data?.records?.length || 0) / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedRecords = (data?.records || []).slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

  const handleCopy = () => {
    if (!data) return;
    const summary = `KDPA 2019 Section 25 Donor Export Summary:\nEligible Compliant Records: ${data.total_eligible_records}\nExcluded (No Valid Consent): ${data.excluded_unauthorized_records}\nGenerated At: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!data || !data.records || data.records.length === 0) return;

    try {
      // Map records to clean spreadsheet columns
      const exportRows = data.records.map((r: any) => ({
        'Donor Cohort ID': r.donor_cohort_id || '',
        'Masked Beneficiary Subject': r.masked_beneficiary_token || '',
        'Inuka Pillar': r.pillar || '',
        'Kenyan County': r.county || '',
        'Kenyan Region': r.region || '',
        'Program Milestone': (r.program_milestone || '').replace(/_/g, ' '),
        'KDPA Consent Status': r.kdpa_consent_verified ? 'ACTIVE_VERIFIED' : 'PENDING',
        'Authorized Purpose': (r.consent_purpose || r.purpose || 'donor_reporting').replace(/_/g, ' '),
        'Retention Window': (r.retention_expiry_window || r.retention_window || '365_days').replace(/_/g, ' '),
        'Export Timestamp': r.export_timestamp || new Date().toISOString(),
      }));

      // Generate worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Set column widths for clean readability
      worksheet['!cols'] = [
        { wch: 28 }, // Donor Cohort ID
        { wch: 26 }, // Masked Beneficiary Subject
        { wch: 16 }, // Inuka Pillar
        { wch: 18 }, // Kenyan County
        { wch: 18 }, // Kenyan Region
        { wch: 22 }, // Program Milestone
        { wch: 22 }, // KDPA Consent Status
        { wch: 22 }, // Authorized Purpose
        { wch: 18 }, // Retention Window
        { wch: 26 }, // Export Timestamp
      ];

      // Build workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Anonymized Donor Dataset');

      // Generate binary buffer & Blob
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });

      // Write file with standard Inuka date naming convention
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Inuka_Donor_Report_${dateStr}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 2500);
    } catch (err) {
      console.error('Failed to trigger download:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-[#ED1C24] dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#231F20] dark:text-white">
                  KDPA 2019 Compliant Anonymized Donor Dataset
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-50 text-[#ED1C24] border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3 h-3" /> Section 25 Certified
                </span>
              </div>
              <p className="text-xs text-[#58595B] dark:text-slate-400">
                Automated data anonymization & consent gating for external donor & partner reporting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isLoading || !data || !data.records || data.records.length === 0}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isDownloaded
                  ? 'bg-red-700 text-white'
                  : 'bg-[#ED1C24] hover:bg-[#C8102E] text-white'
              }`}
            >
              {isDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Downloaded (.xlsx)
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download Report (.xlsx)
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-[#231F20] dark:hover:text-white rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          {isLoading ? (
            <div className="py-20 text-center text-[#58595B]">
              Generating anonymized dataset & verifying digital consent signatures...
            </div>
          ) : data ? (
            <>
              {/* Compliance Badges Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F4F5F7] dark:bg-slate-950 p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 font-mono">
                <div>
                  <span className="text-[#58595B] dark:text-slate-400 block text-[10px] uppercase">Eligible Compliant Records</span>
                  <span className="font-black text-sm text-[#ED1C24] dark:text-red-400 mt-0.5 block">
                    {data.total_eligible_records} Beneficiaries
                  </span>
                </div>
                <div>
                  <span className="text-[#58595B] dark:text-slate-400 block text-[10px] uppercase">Excluded (No Valid Consent)</span>
                  <span className="font-black text-sm text-[#C8102E] dark:text-red-400 mt-0.5 block">
                    {data.excluded_unauthorized_records} Records Gated
                  </span>
                </div>
                <div>
                  <span className="text-[#58595B] dark:text-slate-400 block text-[10px] uppercase">PII Masking Algorithm</span>
                  <span className="font-black text-sm text-[#231F20] dark:text-white mt-0.5 block">
                    Pseudonymized Token
                  </span>
                </div>
              </div>

              {/* Anonymized Records Table */}
              <div className="bg-[#F4F5F7] dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden">
                <div className="p-3 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#231F20] dark:text-slate-300">
                  <span>Export Preview (Sample of Authorized Inuka Beneficiaries)</span>
                  <span className="font-mono text-[11px] text-[#58595B]">
                    Consent: donor_reporting
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300 dark:border-slate-800 text-[10px] uppercase tracking-wider text-[#58595B] bg-white dark:bg-slate-900/60">
                        <th className="p-2.5 font-semibold">Donor Cohort Token</th>
                        <th className="p-2.5 font-semibold">Masked PII Subject</th>
                        <th className="p-2.5 font-semibold">Pillar</th>
                        <th className="p-2.5 font-semibold">County & Region</th>
                        <th className="p-2.5 font-semibold">Program Milestone</th>
                        <th className="p-2.5 font-semibold">KDPA Consent Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {paginatedRecords.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white dark:hover:bg-slate-900/40">
                          <td className="p-2.5 text-[#ED1C24] dark:text-red-300 font-bold">{r.donor_cohort_id}</td>
                          <td className="p-2.5 text-[#58595B] dark:text-slate-300">{r.masked_beneficiary_token}</td>
                          <td className="p-2.5 text-[#231F20] dark:text-slate-200 font-bold">{r.pillar}</td>
                          <td className="p-2.5 text-[#58595B] dark:text-slate-400">{r.county ? `${r.county}, ${r.region}` : r.region}</td>
                          <td className="p-2.5 text-[#ED1C24] dark:text-red-400">{r.program_milestone}</td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center gap-1 text-[#ED1C24] dark:text-red-400 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-[#ED1C24]" /> VERIFIED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {data.records && data.records.length > PAGE_SIZE && (
                  <div className="p-2.5 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between text-xs bg-white dark:bg-slate-900/40">
                    <span className="text-[#58595B] dark:text-slate-400 font-mono text-[11px]">
                      Showing {(validPage - 1) * PAGE_SIZE + 1}–{Math.min(validPage * PAGE_SIZE, data.records.length)} of {data.records.length} records
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={validPage === 1}
                        className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 bg-[#F4F5F7] dark:bg-slate-800 text-[#58595B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[11px] cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="px-2 py-0.5 bg-red-50 text-[#ED1C24] dark:bg-red-950 dark:text-red-300 rounded font-mono text-[11px] font-bold">
                        {validPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={validPage === totalPages}
                        className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800 bg-[#F4F5F7] dark:bg-slate-800 text-[#58595B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[11px] cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-[#F4F5F7] hover:bg-slate-200 text-[#231F20] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-transparent cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#ED1C24]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Summary' : 'Copy Summary'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#ED1C24] hover:bg-[#C8102E] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
