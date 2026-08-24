import React, { useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { ThemeProvider } from './context/ThemeContext.js';
import { LiveDataProvider, useLiveData } from './context/LiveDataContext.js';
import { Header } from './components/layout/Header.js';
import { Sidebar, type TabType } from './components/layout/Sidebar.js';
import { KpiCards } from './components/layout/KpiCards.js';
import { AnomalyAlertBanner } from './components/common/AnomalyAlertBanner.js';
import { LiveActivityFeed } from './components/views/LiveActivityFeed.js';
import { ConsentStatusOverview } from './components/views/ConsentStatusOverview.js';
import { AnomalyLog } from './components/views/AnomalyLog.js';
import { RegionalAndPillarView } from './components/views/RegionalAndPillarView.js';
import { AuditTrailViewer } from './components/views/AuditTrailViewer.js';
import { ProvenanceReportModal } from './components/modals/ProvenanceReportModal.js';
import { DonorReportModal } from './components/modals/DonorReportModal.js';
import { LineageModal } from './components/modals/LineageModal.js';
import { BeneficiaryDirectoryModal } from './components/modals/BeneficiaryDirectoryModal.js';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in dashboard:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-8 max-w-xl mx-auto bg-white dark:bg-[#231f20] rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-[#bb0013] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#191c1e] dark:text-white">
            Component Render Error
          </h2>
          <p className="text-xs text-[#58595b] dark:text-[#cdc4c5] font-mono">
            {this.state.error?.message || 'An error occurred while loading this view.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#bb0013] hover:bg-[#93000d] text-white rounded-lg text-xs font-mono font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload View</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [isDonorReportOpen, setIsDonorReportOpen] = useState(false);
  const [isLineageOpen, setIsLineageOpen] = useState(false);
  const [isBeneficiaryDirectoryOpen, setIsBeneficiaryDirectoryOpen] = useState(false);

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
          {/* Top KPI Metric Cards */}
          <KpiCards
            onSelectTab={setActiveTab}
            onOpenBeneficiaries={() => setIsBeneficiaryDirectoryOpen(true)}
          />

          <ErrorBoundary>
            {/* Active Module View */}
            {activeTab === 'feed' && <LiveActivityFeed />}
            {activeTab === 'consent' && <ConsentStatusOverview />}
            {activeTab === 'anomalies' && <AnomalyLog />}
            {activeTab === 'analytics' && <RegionalAndPillarView />}
            {activeTab === 'audit' && <AuditTrailViewer />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Specialized Governance Modals */}
      <BeneficiaryDirectoryModal
        isOpen={isBeneficiaryDirectoryOpen}
        onClose={() => setIsBeneficiaryDirectoryOpen(false)}
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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LiveDataProvider>
        <MainDashboard />
      </LiveDataProvider>
    </ThemeProvider>
  );
};

export default App;
