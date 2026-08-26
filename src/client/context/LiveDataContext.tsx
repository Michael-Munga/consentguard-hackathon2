import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { DashboardStats, StreamEvent } from '../../types/index.js';

interface LiveDataContextType {
  isConnected: boolean;
  stats: DashboardStats | null;
  events: StreamEvent[];
  latestCriticalAlert: {
    event: StreamEvent;
    timestamp: number;
  } | null;
  isTriggeringDemo: boolean;
  lastRevokedBeneficiaryId: string | null;
  dismissCriticalAlert: () => void;
  markAnomalyReviewed: (id: string, notes?: string, reviewer?: string) => Promise<boolean>;
  refreshStats: () => Promise<void>;
  setLastRevokedBeneficiaryId: (id: string | null) => void;

  // 6 Distinct Scenario Simulations
  simulateUnauthorizedAccess: (actorName?: string) => Promise<any>;
  simulateRevokedAccess: (beneficiaryId?: string, actorName?: string) => Promise<any>;
  simulateExpiredAccess: (actorName?: string) => Promise<any>;
  simulateInconsistentState: (actorName?: string) => Promise<any>;
  simulateBehavioralOutlier: (recordCount?: number, actorId?: string) => Promise<any>;
  simulateBulkExfiltration: (recordCount?: number, actorId?: string) => Promise<any>;

  // 3 Real Governance Action Shortcuts
  triggerRealComplianceExport: () => Promise<any>;
  triggerRealReviewLatestAnomaly: () => Promise<any>;
  triggerRealProvenanceGenerate: () => Promise<any>;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [latestCriticalAlert, setLatestCriticalAlert] = useState<{
    event: StreamEvent;
    timestamp: number;
  } | null>(null);
  const [isTriggeringDemo, setIsTriggeringDemo] = useState(false);
  const [lastRevokedBeneficiaryId, setLastRevokedBeneficiaryId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initialize data and SSE stream
  useEffect(() => {
    fetchStats();

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let statsTimeout: NodeJS.Timeout | null = null;

    const debouncedFetchStats = () => {
      if (statsTimeout) clearTimeout(statsTimeout);
      statsTimeout = setTimeout(() => {
        fetchStats();
      }, 800);
    };

    const connectSSE = () => {
      eventSource = new EventSource('/api/events/sse');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const streamEvent: StreamEvent = JSON.parse(e.data);
          if (streamEvent.type === ('CONNECTED' as any)) return;

          setEvents((prev) => [streamEvent, ...prev.slice(0, 99)]);

          // Automatically chain beneficiary revocation to demo context
          if (streamEvent.type === 'CONSENT_REVOKED') {
            const benId =
              streamEvent.data?.beneficiary_id ||
              streamEvent.data?.consent?.beneficiary_id ||
              streamEvent.data?.beneficiary?.id;
            if (benId) {
              setLastRevokedBeneficiaryId(benId);
            }
          }

          // Trigger high-priority alert banner on unauthorized access intercepts
          if (streamEvent.type === 'UNAUTHORIZED_ACCESS_BLOCKED') {
            setLatestCriticalAlert({
              event: streamEvent,
              timestamp: Date.now(),
            });
          }

          if (streamEvent.type === 'ETL_PIPELINE_COMPLETED') {
            fetchStats();
          }

          // Debounce stats fetch to prevent double re-renders
          debouncedFetchStats();
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        // Reconnect after 3s
        retryTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      if (statsTimeout) clearTimeout(statsTimeout);
    };
  }, [fetchStats]);

  const dismissCriticalAlert = useCallback(() => {
    setLatestCriticalAlert(null);
  }, []);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('consentguard_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // 1. Simulate Unauthorized Access
  const simulateUnauthorizedAccess = useCallback(
    async (actorName = 'unauthorized_donor_auditor@external.org') => {
      setIsTriggeringDemo(true);
      try {
        const res = await fetch('/api/demo/simulate/unauthorized-access', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actor: actorName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to simulate unauthorized access');
        await fetchStats();
        return data;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [authHeaders, fetchStats]
  );

  // 2. Simulate Access After Revocation (chains to lastRevokedBeneficiaryId by default)
  const simulateRevokedAccess = useCallback(
    async (beneficiaryId?: string, actorName = 'batch_donor_reporter@inuka.ke') => {
      setIsTriggeringDemo(true);
      try {
        const targetId = beneficiaryId || lastRevokedBeneficiaryId || undefined;
        const res = await fetch('/api/demo/simulate/revoked-access', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actor: actorName, beneficiaryId: targetId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to simulate revoked access');
        await fetchStats();
        return data;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [authHeaders, fetchStats, lastRevokedBeneficiaryId]
  );

  // 3. Simulate Access After Expiry
  const simulateExpiredAccess = useCallback(
    async (actorName = 'analytics_retention_crawler@partner.org') => {
      setIsTriggeringDemo(true);
      try {
        const res = await fetch('/api/demo/simulate/expired-access', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actor: actorName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to simulate expired access');
        await fetchStats();
        return data;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [authHeaders, fetchStats]
  );

  // 4. Simulate Corrupted / Inconsistent State
  const simulateInconsistentState = useCallback(
    async (actorName = 'legacy_intake_sync@inuka.ke') => {
      setIsTriggeringDemo(true);
      try {
        const res = await fetch('/api/demo/simulate/inconsistent-state', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actor: actorName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to simulate inconsistent state');
        await fetchStats();
        return data;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [authHeaders, fetchStats]
  );

  // 5. Simulate Abnormal Access Volume (AI Outlier)
  const simulateBehavioralOutlier = useCallback(
    async (recordCount = 65, actorId = 'field_officer_nakuru') => {
      setIsTriggeringDemo(true);
      try {
        const res = await fetch('/api/demo/simulate/behavioral-outlier', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actorId, recordCount }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to simulate behavioral outlier');
        await fetchStats();
        return data;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [authHeaders, fetchStats]
  );

  // 6. Simulate Bulk Exfiltration Attempt
  const simulateBulkExfiltration = useCallback(
    async (recordCount = 350, actorId = 'exfiltration_batch_daemon') => {
      setIsTriggeringDemo(true);
      try {
        const res = await fetch('/api/demo/simulate/bulk-exfiltration', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actorId, recordCount }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to simulate bulk exfiltration');
        await fetchStats();
        return data;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [authHeaders, fetchStats]
  );

  // REAL ACTION 1: Run Compliance Export
  const triggerRealComplianceExport = useCallback(async () => {
    setIsTriggeringDemo(true);
    try {
      const res = await fetch('/api/compliance/export', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          recipient_email: 'compliance.auditor@kpc-foundation.org',
          schemaType: 'donor_reporting',
          pillar: 'ALL',
          region: 'ALL',
          county: 'ALL',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch compliance export');
      await fetchStats();
      return data;
    } finally {
      setIsTriggeringDemo(false);
    }
  }, [authHeaders, fetchStats]);

  // REAL ACTION 2: Review Latest Unreviewed Anomaly
  const triggerRealReviewLatestAnomaly = useCallback(async () => {
    setIsTriggeringDemo(true);
    try {
      const anomRes = await fetch('/api/anomalies');
      if (!anomRes.ok) throw new Error('Failed to fetch anomalies queue');
      const allAnoms = await anomRes.json();
      const unreviewed = allAnoms.find((a: any) => !a.reviewed);
      if (!unreviewed) {
        throw new Error('No unreviewed anomalies currently in queue.');
      }
      const res = await fetch(`/api/anomalies/${unreviewed.id}/review`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          reviewer: 'Sarah Jenkins (Compliance DPO)',
          actor: 'Sarah Jenkins (Compliance DPO)',
          notes: 'Remediated & signed off under KDPA §25 statutory protocol.',
          reviewed_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review anomaly');
      await fetchStats();
      return { success: true, anomalyId: unreviewed.id };
    } finally {
      setIsTriggeringDemo(false);
    }
  }, [authHeaders, fetchStats]);

  // REAL ACTION 3: Regenerate Provenance Report
  const triggerRealProvenanceGenerate = useCallback(async () => {
    setIsTriggeringDemo(true);
    try {
      const res = await fetch('/api/provenance/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          run_id: `DEMO-PROV-${Date.now().toString().slice(-6)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate provenance report');
      await fetchStats();
      return data;
    } finally {
      setIsTriggeringDemo(false);
    }
  }, [authHeaders, fetchStats]);

  const markAnomalyReviewed = useCallback(
    async (id: string, notes?: string, reviewer?: string) => {
      const reviewerName = reviewer || 'Inuka Data Protection Officer';
      const resolutionNotes = notes || '';
      const timestamp = new Date().toISOString();

      try {
        const res = await fetch(`/api/anomalies/${id}/review`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            reviewer: reviewerName,
            actor: reviewerName,
            notes: resolutionNotes,
            reviewed_at: timestamp,
          }),
        });
        if (res.ok) {
          await fetchStats();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to mark anomaly reviewed:', err);
        return false;
      }
    },
    [authHeaders, fetchStats]
  );

  const contextValue = React.useMemo(
    () => ({
      isConnected,
      stats,
      events,
      latestCriticalAlert,
      isTriggeringDemo,
      lastRevokedBeneficiaryId,
      dismissCriticalAlert,
      markAnomalyReviewed,
      refreshStats: fetchStats,
      setLastRevokedBeneficiaryId,
      simulateUnauthorizedAccess,
      simulateRevokedAccess,
      simulateExpiredAccess,
      simulateInconsistentState,
      simulateBehavioralOutlier,
      simulateBulkExfiltration,
      triggerRealComplianceExport,
      triggerRealReviewLatestAnomaly,
      triggerRealProvenanceGenerate,
    }),
    [
      isConnected,
      stats,
      events,
      latestCriticalAlert,
      isTriggeringDemo,
      lastRevokedBeneficiaryId,
      dismissCriticalAlert,
      markAnomalyReviewed,
      fetchStats,
      simulateUnauthorizedAccess,
      simulateRevokedAccess,
      simulateExpiredAccess,
      simulateInconsistentState,
      simulateBehavioralOutlier,
      simulateBulkExfiltration,
      triggerRealComplianceExport,
      triggerRealReviewLatestAnomaly,
      triggerRealProvenanceGenerate,
    ]
  );

  return (
    <LiveDataContext.Provider value={contextValue}>
      {children}
    </LiveDataContext.Provider>
  );
};

export function useLiveData() {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return context;
}

export const useLiveDataContext = useLiveData;
