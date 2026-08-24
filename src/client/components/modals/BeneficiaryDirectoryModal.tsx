import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  Filter,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  FileSpreadsheet,
  Calendar,
  MapPin,
  Sparkles,
  FileCheck2,
  AlertCircle,
  History,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Download,
  Check,
} from 'lucide-react';
import type { Beneficiary, Pillar, Region, County, LifecycleStage, ConsentRecord } from '../../../types/index.js';
import { COUNTIES, COUNTY_TO_REGION, REGIONS } from '../../../types/index.js';
import { getPillarBadgeClass, formatStageLabel, formatDateTime } from '../../lib/utils.js';

interface BeneficiaryDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeneficiaryDirectoryModal: React.FC<BeneficiaryDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCounty, setSelectedCounty] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [isExported, setIsExported] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const pillars: Pillar[] = ['Scholarship', 'Plus', 'Vocational', 'Tech'];
  const regions: Region[] = REGIONS;
  const stages: LifecycleStage[] = [
    'applied',
    'identity_verified',
    'consent_requested',
    'consent_granted',
    'data_processed',
    'consent_reviewed',
  ];

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [bRes, cRes] = await Promise.all([
          fetch('/api/beneficiaries'),
          fetch('/api/consents'),
        ]);
        if (bRes.ok && cRes.ok) {
          const bData = await bRes.json();
          const cData = await cRes.json();
          setBeneficiaries(bData.data || []);
          setConsents(cData || []);
        }
      } catch (err) {
        console.error('Error loading beneficiaries directory:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  // Available counties dynamically filtered by selected region
  const availableCounties = useMemo(() => {
    if (selectedRegion === 'ALL') return COUNTIES;
    return COUNTIES.filter((c) => COUNTY_TO_REGION[c] === selectedRegion);
  }, [selectedRegion]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPillar, selectedRegion, selectedCounty, selectedStage, pageSize]);

  // Group consents by beneficiary_id
  const consentsByBenId = useMemo(() => {
    const map = new Map<string, ConsentRecord[]>();
    for (const c of consents) {
      const list = map.get(c.beneficiary_id) || [];
      list.push(c);
      map.set(c.beneficiary_id, list);
    }
    return map;
  }, [consents]);

  // Filter beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      if (selectedPillar !== 'ALL' && b.pillar !== selectedPillar) return false;
      if (selectedRegion !== 'ALL' && b.region !== selectedRegion) return false;
      if (selectedCounty !== 'ALL' && b.county !== selectedCounty) return false;
      if (selectedStage !== 'ALL' && b.current_stage !== selectedStage) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.county && b.county.toLowerCase().includes(q)) ||
          b.region.toLowerCase().includes(q) ||
          b.pillar.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [beneficiaries, selectedPillar, selectedRegion, selectedCounty, selectedStage, searchTerm]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredBeneficiaries.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBeneficiaries = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredBeneficiaries.slice(start, start + pageSize);
  }, [filteredBeneficiaries, validCurrentPage, pageSize]);

  if (!isOpen) return null;

  // Export as formatted Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    if (!filteredBeneficiaries || filteredBeneficiaries.length === 0) return;

    try {
      const exportRows = filteredBeneficiaries.map((b) => {
        const benConsents = consentsByBenId.get(b.id) || [];
        const activeConsents = benConsents.filter((c) => c.status === 'granted');
        const activePurposes = activeConsents.map((c) => c.purpose.replace(/_/g, ' ')).join(', ') || 'None';

        return {
          'Beneficiary ID': b.id,
          'Full Name': b.name,
          'Inuka Pillar': b.pillar,
          'Kenyan County': b.county || 'Nairobi',
          'Kenyan Region': b.region,
          'Application Timestamp': b.applied_at,
          'Current Lifecycle Stage': formatStageLabel(b.current_stage),
          'Active Consents Count': activeConsents.length,
          'Authorized Purposes': activePurposes,
          'Total Consent Records': benConsents.length,
          'Governance Standard': 'KDPA 2019 Certified',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto-fit column widths
      worksheet['!cols'] = [
        { wch: 18 }, // Beneficiary ID
        { wch: 24 }, // Full Name
        { wch: 16 }, // Inuka Pillar
        { wch: 18 }, // Kenyan County
        { wch: 18 }, // Kenyan Region
        { wch: 26 }, // Application Timestamp
        { wch: 24 }, // Current Lifecycle Stage
        { wch: 22 }, // Active Consents Count
        { wch: 32 }, // Authorized Purposes
        { wch: 22 }, // Total Consent Records
        { wch: 22 }, // Governance Standard
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Beneficiary Master Roster');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Inuka_Beneficiary_Master_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExported(true);
      setTimeout(() => setIsExported(false), 2500);
    } catch (err) {
      console.error('Error generating Excel file:', err);
    }
  };

  const startRecord = filteredBeneficiaries.length === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, filteredBeneficiaries.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-[98vw] max-w-[1560px] h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#ED1C24] dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800/60 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-[#231F20] dark:text-white tracking-tight">
                  KPC Inuka Beneficiary Directory & Master Roster
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 text-[#ED1C24] dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {beneficiaries.length} Total Enrolled
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-[#ED1C24] dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-800/60">
                  <Shield className="w-3.5 h-3.5" /> KDPA §25 Compliant
                </span>
              </div>
              <p className="text-xs text-[#58595B] dark:text-slate-400 font-medium mt-0.5">
                Complete beneficiary registry with real-time lifecycle tracking, regional hub mapping, and active consent gating.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer ${
                isExported
                  ? 'bg-[#C8102E] text-white'
                  : 'bg-[#ED1C24] hover:bg-[#C8102E] text-white'
              }`}
            >
              {isExported ? (
                <>
                  <Check className="w-4 h-4" /> Exported (.xlsx)
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-white" /> Export Excel (.xlsx)
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by beneficiary name, ID, pillar, or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ED1C24] text-[#231F20] dark:text-slate-100 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills and Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pillar Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-[11px] font-bold text-[#58595B] dark:text-slate-400 px-2 uppercase">Pillar:</span>
              <button
                onClick={() => setSelectedPillar('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedPillar === 'ALL'
                    ? 'bg-[#ED1C24] text-white shadow-xs'
                    : 'text-[#231F20] dark:text-slate-300 hover:text-[#ED1C24] dark:hover:text-white'
                }`}
              >
                All (4)
              </button>
              {pillars.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPillar(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPillar === p
                      ? 'bg-[#ED1C24] text-white shadow-xs'
                      : 'text-[#231F20] dark:text-slate-300 hover:text-[#ED1C24] dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Region Filter Dropdown */}
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedCounty('ALL');
              }}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#231F20] dark:text-slate-200 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] cursor-pointer"
            >
              <option value="ALL">All Regions (8 Regions)</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>

            {/* County Filter Dropdown */}
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#231F20] dark:text-slate-200 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] cursor-pointer max-w-[170px]"
            >
              <option value="ALL">
                {selectedRegion === 'ALL' ? 'All Counties (47)' : `Counties in ${selectedRegion} (${availableCounties.length})`}
              </option>
              {availableCounties.map((c) => (
                <option key={c} value={c}>
                  {c} County
                </option>
              ))}
            </select>

            {/* Stage Filter Dropdown */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#231F20] dark:text-slate-200 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ED1C24] cursor-pointer"
            >
              <option value="ALL">All Lifecycle Milestones (6)</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {formatStageLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Area (Spacious Master Table + Optional Side Drawer) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Beneficiary Table */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400">
                <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs font-medium">Loading Inuka beneficiary database...</span>
              </div>
            ) : filteredBeneficiaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400">
                <AlertCircle className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No beneficiaries found matching your filters</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedPillar('ALL');
                    setSelectedRegion('ALL');
                    setSelectedCounty('ALL');
                    setSelectedStage('ALL');
                  }}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 underline font-medium cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase font-bold text-[11px] tracking-wider sticky top-0 z-10 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4.5 whitespace-nowrap">ID</th>
                    <th className="py-3 px-4.5 whitespace-nowrap min-w-[180px]">Beneficiary Name</th>
                    <th className="py-3 px-4 whitespace-nowrap">Inuka Pillar</th>
                    <th className="py-3 px-4 whitespace-nowrap">County & Region</th>
                    <th className="py-3 px-4 whitespace-nowrap">Application Date</th>
                    <th className="py-3 px-4 whitespace-nowrap">Current Stage</th>
                    <th className="py-3 px-4 whitespace-nowrap text-center">Active Consents</th>
                    <th className="py-3 px-4.5 whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedBeneficiaries.map((b) => {
                    const isSelected = selectedBeneficiary?.id === b.id;
                    const benConsents = consentsByBenId.get(b.id) || [];
                    const activeCount = benConsents.filter((c) => c.status === 'granted').length;

                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBeneficiary(isSelected ? null : b)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-blue-950/50'
                            : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <td className="py-3.5 px-4.5 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {b.id}
                        </td>
                        <td className="py-3.5 px-4.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {b.name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getPillarBadgeClass(
                              b.pillar
                            )}`}
                          >
                            {b.pillar}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {b.county ? `${b.county}, ${b.region}` : b.region}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                          {formatDateTime(b.applied_at)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                            {formatStageLabel(b.current_stage)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                              activeCount > 0
                                ? 'bg-red-50 text-[#ED1C24] border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                : 'bg-[#F4F5F7] text-[#58595B] border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {activeCount} Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4.5 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBeneficiary(isSelected ? null : b);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#F4F5F7] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-[#231F20] dark:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {isSelected ? 'Close Details' : 'Details'} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Side Detail Drawer */}
          {selectedBeneficiary && (
            <div className="w-[420px] border-l border-slate-200 dark:border-slate-800 bg-[#F4F5F7] dark:bg-[#231F20] p-6 overflow-y-auto shrink-0 flex flex-col justify-between shadow-lg animate-in slide-in-from-right duration-150">
              <div className="space-y-4.5">
                <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#ED1C24] dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                      {selectedBeneficiary.id}
                    </span>
                    <h3 className="text-lg font-black text-[#231F20] dark:text-white mt-1.5">
                      {selectedBeneficiary.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedBeneficiary(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#231F20] dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="text-[10px] text-[#58595B] uppercase font-bold">Pillar</span>
                    <div className="font-bold text-xs text-[#231F20] dark:text-white mt-0.5 truncate">
                      {selectedBeneficiary.pillar}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="text-[10px] text-[#58595B] uppercase font-bold">County</span>
                    <div className="font-bold text-xs text-[#231F20] dark:text-white mt-0.5 truncate" title={selectedBeneficiary.county || 'N/A'}>
                      {selectedBeneficiary.county || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="text-[10px] text-[#58595B] uppercase font-bold">Region</span>
                    <div className="font-bold text-xs text-[#231F20] dark:text-white mt-0.5 truncate" title={selectedBeneficiary.region}>
                      {selectedBeneficiary.region}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs">
                  <div className="text-[10px] text-[#58595B] uppercase font-bold">Current Lifecycle Stage</div>
                  <div className="text-sm font-bold text-[#ED1C24]">
                    {formatStageLabel(selectedBeneficiary.current_stage)}
                  </div>
                  <div className="text-xs text-[#58595B] dark:text-slate-400">
                    Applied on {formatDateTime(selectedBeneficiary.applied_at)}
                  </div>
                </div>

                {/* Consent Records For Beneficiary */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#58595B] dark:text-slate-400 flex items-center justify-between">
                    <span>Digital Consent Records</span>
                    <span className="font-mono text-xs font-bold text-[#231F20] dark:text-white">
                      {(consentsByBenId.get(selectedBeneficiary.id) || []).length} Records
                    </span>
                  </div>

                  {(consentsByBenId.get(selectedBeneficiary.id) || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-[#58595B] text-center">
                      No consent records created yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(consentsByBenId.get(selectedBeneficiary.id) || []).map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#231F20] dark:text-slate-100">
                              {c.purpose.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                c.status === 'granted'
                                  ? 'bg-red-50 text-[#ED1C24] dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800'
                                  : c.status === 'requested'
                                  ? 'bg-[#F4F5F7] text-[#231F20] dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                                  : 'bg-[#F4F5F7] text-[#C8102E] dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#58595B] dark:text-slate-400">
                            Record ID: {c.id}
                          </div>
                          {c.granted_at && (
                            <div className="text-xs text-[#231F20] dark:text-slate-300">
                              Granted: {formatDateTime(c.granted_at)}
                            </div>
                          )}
                          {c.expires_at && (
                            <div className="text-xs text-[#58595B] dark:text-slate-400">
                              Expires: {formatDateTime(c.expires_at)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-[#58595B] leading-relaxed">
                <span className="font-bold text-[#231F20] dark:text-slate-300">KDPA Compliance Notice:</span> Beneficiary identity protected under Section 25 purpose limitation.
              </div>
            </div>
          )}
        </div>

        {/* Footer with Pagination Controls */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              Showing <strong className="text-slate-900 dark:text-white font-mono font-bold">{startRecord}–{endRecord}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white font-mono font-bold">{filteredBeneficiaries.length}</strong> enrolled beneficiaries
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Pagination Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Indicator */}
            <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
              Page {validCurrentPage} of {totalPages}
            </span>

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
