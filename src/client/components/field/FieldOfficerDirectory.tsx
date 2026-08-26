import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Search, Filter, ShieldCheck, CheckCircle2, XCircle, Clock, MapPin, Eye, Lock } from 'lucide-react';
import { Pagination } from '../common/Pagination.js';
import { REGION_COUNTIES, ALL_COUNTIES } from '../../lib/utils.js';

interface ScopedBeneficiaryItem {
  id: string;
  masked_token: string;
  pillar: string;
  county: string;
  region: string;
  applied_at: string;
  consent_status: {
    donor_reporting: string;
    internal_analytics: string;
    third_party_sharing: string;
  };
}

export const FieldOfficerDirectory: React.FC = () => {
  const { token, pillarScope, user } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<ScopedBeneficiaryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedCounty, setSelectedCounty] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    const fetchFieldBeneficiaries = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/field/beneficiaries', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBeneficiaries(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching field officer beneficiaries:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFieldBeneficiaries();
  }, [token]);

  const availableCounties = selectedRegion === 'ALL'
    ? ALL_COUNTIES
    : REGION_COUNTIES[selectedRegion] || ALL_COUNTIES;

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch =
      b.masked_token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.county.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRegion = selectedRegion === 'ALL' || b.region === selectedRegion;
    const matchesCounty = selectedCounty === 'ALL' || b.county === selectedCounty;
    return matchesSearch && matchesRegion && matchesCounty;
  });

  // Reset to page 1 on filter/search change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    if (newRegion !== 'ALL') {
      const validCounties = REGION_COUNTIES[newRegion] || [];
      if (selectedCounty !== 'ALL' && !validCounties.includes(selectedCounty)) {
        setSelectedCounty('ALL');
      }
    }
    setCurrentPage(1);
  };

  const handleCountyChange = (val: string) => {
    setSelectedCounty(val);
    setCurrentPage(1);
  };

  const paginatedBeneficiaries = filteredBeneficiaries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusBadge = (status: string) => {
    if (status === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
          <CheckCircle2 className="w-3 h-3" />
          <span>Active</span>
        </span>
      );
    } else if (status === 'revoked') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
          <XCircle className="w-3 h-3" />
          <span>Revoked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
        <Clock className="w-3 h-3" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e1b1c] p-6 sm:p-8 rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#006193] dark:text-[#78c9ff] text-xs font-bold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Scoped Workstation: {pillarScope || 'Assigned'} Pillar</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">
            My Beneficiaries Directory
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#58595b] dark:text-[#cdc4c5] max-w-xl">
            Read-only directory of assigned fellowship candidates under your operational supervision with KDPA Section 25 masked identifiers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#58595b] dark:text-[#cdc4c5] bg-[#f8f9fb] dark:bg-[#121011] px-4 py-3 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Server-Side Isolated (Pillar: {pillarScope})</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1e1b1c] p-4 rounded-2xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#58595b] dark:text-[#cdc4c5] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by token, ID, or county..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] text-[#191c1e] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#bb0013]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Region Filter */}
          <div className="flex items-center gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5]">
            <Filter className="w-3.5 h-3.5" />
            <span>Region:</span>
          </div>
          <select
            value={selectedRegion}
            onChange={e => handleRegionChange(e.target.value)}
            className="text-xs bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] text-[#191c1e] dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bb0013]"
          >
            <option value="ALL">All Regions (8)</option>
            {Object.keys(REGION_COUNTIES).map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* County Filter */}
          <div className="flex items-center gap-2 text-xs text-[#58595b] dark:text-[#cdc4c5]">
            <span>County:</span>
          </div>
          <select
            value={selectedCounty}
            onChange={e => handleCountyChange(e.target.value)}
            className="text-xs bg-[#f8f9fb] dark:bg-[#121011] border border-[#e2e4e9] dark:border-[#3a3839] text-[#191c1e] dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bb0013]"
          >
            <option value="ALL">
              {selectedRegion === 'ALL' ? 'All Counties (47)' : `Counties in ${selectedRegion} (${availableCounties.length})`}
            </option>
            {availableCounties.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Beneficiary Table */}
      <div className="bg-white dark:bg-[#1e1b1c] rounded-3xl border border-[#e2e4e9] dark:border-[#3a3839] shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#bb0013]/20 border-t-[#bb0013] rounded-full animate-spin" />
            <p className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">Loading scoped beneficiary directory...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e4e9] dark:border-[#3a3839] bg-[#f8f9fb] dark:bg-[#121011] text-[#58595b] dark:text-[#cdc4c5] uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3.5 px-5">Masked Beneficiary Token</th>
                    <th className="py-3.5 px-4">County / Hub</th>
                    <th className="py-3.5 px-4">Donor Reporting</th>
                    <th className="py-3.5 px-4">Internal M&E</th>
                    <th className="py-3.5 px-4">Third-Party</th>
                    <th className="py-3.5 px-5 text-right">Intake Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e4e9] dark:divide-[#3a3839]">
                  {filteredBeneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#58595b] dark:text-[#cdc4c5] font-mono text-xs">
                        No beneficiaries matched the current search criteria in {pillarScope} pillar.
                      </td>
                    </tr>
                  ) : (
                    paginatedBeneficiaries.map(ben => (
                      <tr key={ben.id} className="hover:bg-[#f8f9fb] dark:hover:bg-[#121011] transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#191c1e] dark:text-white">{ben.masked_token}</span>
                            <span className="text-[10px] font-mono text-[#58595b] dark:text-[#cdc4c5]">({ben.id})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[#191c1e] dark:text-white">
                            <MapPin className="w-3 h-3 text-[#bb0013]" />
                            <span>{ben.county}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(ben.consent_status.donor_reporting)}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(ben.consent_status.internal_analytics)}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(ben.consent_status.third_party_sharing)}</td>
                        <td className="py-3.5 px-5 text-right font-mono text-[#58595b] dark:text-[#cdc4c5]">
                          {new Date(ben.applied_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredBeneficiaries.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredBeneficiaries.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 15, 25, 50]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
