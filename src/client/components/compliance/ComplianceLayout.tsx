import React, { useState } from 'react';
import { Header } from '../layout/Header.js';
import { Sidebar, type TabType } from '../layout/Sidebar.js';
import { KpiCards } from '../layout/KpiCards.js';
import { AnomalyAlertBanner } from '../common/AnomalyAlertBanner.js';
import { LiveActivityFeed } from '../views/LiveActivityFeed.js';
import { ConsentStatusOverview } from '../views/ConsentStatusOverview.js';
import { AnomalyLog } from '../views/AnomalyLog.js';
import { RegionalAndPillarView } from '../views/RegionalAndPillarView.js';
import { AuditTrailViewer } from '../views/AuditTrailViewer.js';
import { ComplianceExports } from './ComplianceExports.js';
import { ProvenanceReportModal } from '../modals/ProvenanceReportModal.js';
import { DonorReportModal } from '../modals/DonorReportModal.js';
import { LineageModal } from '../modals/LineageModal.js';
import { BeneficiaryDirectoryModal } from '../modals/BeneficiaryDirectoryModal.js';

export const ComplianceLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [isDonorReportOpen, setIsDonorReportOpen] = useState(false);
  const [isLineageOpen, setIsLineageOpen] = useState(false);
  const [isBeneficiaryDirectoryOpen, setIsBeneficiaryDirectoryOpen] = useState(false);
  const [beneficiaryDirectoryTargetId, setBeneficiaryDirectoryTargetId] = useState<string | null>(null);

  const handleOpenBeneficiaryDirectory = (targetId?: string) => {
    setBeneficiaryDirectoryTargetId(targetId || null);
    setIsBeneficiaryDirectoryOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#191c1e] text-[#191c1e] dark:text-[#f0f1f3] flex flex-col font-sans transition-colors duration-150">
      {/* Real-time Critical Breach Alert Banner */}
      <AnomalyAlertBanner onNavigateToAnomalies={() => setActiveTab('anomalies')} />

      {/* Left Fixed SideNavBar (260px) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenLineage={() => setIsLineageOpen(true)}
      />

      {/* Top Fixed Header (72px) */}
      <Header
        onOpenProvenance={() => setIsProvenanceOpen(true)}
        onOpenDonorReport={() => setIsDonorReportOpen(true)}
        onOpenLineage={() => setIsLineageOpen(true)}
        onNavigateHome={() => setActiveTab('feed')}
      />

      {/* Main Content Canvas */}
      <div className="md:ml-[260px] pt-[72px] min-h-screen flex flex-col flex-1">
        <main className="p-6 max-w-[1440px] w-full mx-auto flex-1 pb-16">
          {/* Top KPI Metric Cards (shown on primary dashboard views) */}
          {activeTab !== 'exports' && (
            <KpiCards
              onSelectTab={setActiveTab}
              onOpenBeneficiaries={() => handleOpenBeneficiaryDirectory()}
            />
          )}

          {/* Active Module View */}
          {activeTab === 'feed' && (
            <LiveActivityFeed onOpenBeneficiaryDirectory={handleOpenBeneficiaryDirectory} />
          )}
          {activeTab === 'consent' && <ConsentStatusOverview />}
          {activeTab === 'anomalies' && <AnomalyLog />}
          {activeTab === 'analytics' && <RegionalAndPillarView />}
          {activeTab === 'audit' && <AuditTrailViewer />}
          {activeTab === 'exports' && <ComplianceExports />}
        </main>
      </div>

      {/* Specialized Governance Modals */}
      <BeneficiaryDirectoryModal
        isOpen={isBeneficiaryDirectoryOpen}
        initialBeneficiaryId={beneficiaryDirectoryTargetId}
        onClose={() => {
          setIsBeneficiaryDirectoryOpen(false);
          setBeneficiaryDirectoryTargetId(null);
        }}
      />
      <ProvenanceReportModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
      />
      <DonorReportModal
        isOpen={isDonorReportOpen}
        onClose={() => setIsDonorReportOpen(false)}
      />
      <LineageModal
        isOpen={isLineageOpen}
        onClose={() => setIsLineageOpen(false)}
      />
    </div>
  );
};
