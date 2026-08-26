import React, { useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { ThemeProvider } from './context/ThemeContext.js';
import { LiveDataProvider } from './context/LiveDataContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { BeneficiaryLogin } from './components/auth/BeneficiaryLogin.js';
import { StaffLogin } from './components/auth/StaffLogin.js';
import { BeneficiaryPortal } from './components/beneficiary/BeneficiaryPortal.js';
import { ComplianceLayout } from './components/compliance/ComplianceLayout.js';
import { FieldOfficerLayout } from './components/field/FieldOfficerLayout.js';
import { AnalystLayout } from './components/analyst/AnalystLayout.js';
import { DemoSwitcher } from './components/common/DemoSwitcher.js';
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

const AppRouter: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'beneficiary' | 'staff'>('staff');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#121011] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#bb0013]/20 border-t-[#bb0013] rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#58595b] dark:text-[#cdc4c5]">Initializing ConsentGuard Fabric...</p>
      </div>
    );
  }

  // Not logged in: Show either Beneficiary Login or Staff Login
  if (!isAuthenticated || !role) {
    return (
      <>
        {authView === 'beneficiary' ? (
          <BeneficiaryLogin onSwitchToStaff={() => setAuthView('staff')} />
        ) : (
          <StaffLogin onSwitchToBeneficiary={() => setAuthView('beneficiary')} />
        )}
        <DemoSwitcher />
      </>
    );
  }

  // Role-Based Router
  return (
    <ErrorBoundary>
      {role === 'beneficiary' && <BeneficiaryPortal />}
      {role === 'compliance_officer' && <ComplianceLayout />}
      {role === 'field_officer' && <FieldOfficerLayout />}
      {role === 'analyst' && <AnalystLayout />}
      <DemoSwitcher />
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LiveDataProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </LiveDataProvider>
    </ThemeProvider>
  );
};

export default App;
