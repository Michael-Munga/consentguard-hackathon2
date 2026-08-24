import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { DashboardStats, StreamEvent, Anomaly, Beneficiary } from '../../types/index.js';

interface LiveDataContextType {
  isConnected: boolean;
  stats: DashboardStats | null;
  events: StreamEvent[];
  latestCriticalAlert: {
    event: StreamEvent;
    timestamp: number;
  } | null;
  isSimulating: boolean;
  isTriggeringDemo: boolean;
  dismissCriticalAlert: () => void;
  triggerInvalidAccessDemo: (actorName?: string) => Promise<any>;
  toggleSimulation: (running: boolean) => Promise<void>;
  markAnomalyReviewed: (id: string, notes?: string, reviewer?: string) => Promise<boolean>;
  refreshStats: () => Promise<void>;
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
  const [isSimulating, setIsSimulating] = useState(true);
  const [isTriggeringDemo, setIsTriggeringDemo] = useState(false);

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

  const fetchSimStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/simulation/status');
      if (res.ok) {
        const data = await res.json();
        setIsSimulating(data.isRunning);
      }
    } catch (err) {
      console.error('Failed to fetch simulation status:', err);
    }
  }, []);

  // Initialize data and SSE stream
  useEffect(() => {
    fetchStats();
    fetchSimStatus();

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

          // Trigger high-priority alert banner ONLY on unauthorized access intercepts (on-demand demo moment)
          if (streamEvent.type === 'UNAUTHORIZED_ACCESS_BLOCKED') {
            setLatestCriticalAlert({
              event: streamEvent,
              timestamp: Date.now(),
            });
          }

          if (streamEvent.type === 'ETL_PIPELINE_COMPLETED') {
            fetchStats();
          }

          // Debounce stats fetch to prevent jarring double re-renders on every event
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
  }, [fetchStats, fetchSimStatus]);

  const dismissCriticalAlert = useCallback(() => {
    setLatestCriticalAlert(null);
  }, []);

  // Trigger the manual demo moment on demand
  const triggerInvalidAccessDemo = useCallback(
    async (actorName = 'unauthorized_donor_auditor@external.org') => {
      setIsTriggeringDemo(true);
      try {
        const res = await fetch('/api/simulation/trigger-invalid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor: actorName }),
        });
        const data = await res.json();
        await fetchStats();
        return data;
      } catch (err) {
        console.error('Failed to trigger invalid access demo:', err);
        throw err;
      } finally {
        setIsTriggeringDemo(false);
      }
    },
    [fetchStats]
  );

  const toggleSimulation = useCallback(
    async (running: boolean) => {
      try {
        const res = await fetch('/api/simulation/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ running }),
        });
        const data = await res.json();
        setIsSimulating(data.isRunning);
      } catch (err) {
        console.error('Failed to toggle simulation:', err);
      }
    },
    []
  );

  const markAnomalyReviewed = useCallback(
    async (id: string, notes?: string, reviewer?: string) => {
      const reviewerName = reviewer || 'Inuka Data Protection Officer';
      const resolutionNotes = notes || '';
      const timestamp = new Date().toISOString();

      try {
        const res = await fetch(`/api/anomalies/${id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    [fetchStats]
  );

  const contextValue = React.useMemo(
    () => ({
      isConnected,
      stats,
      events,
      latestCriticalAlert,
      isSimulating,
      isTriggeringDemo,
      dismissCriticalAlert,
      triggerInvalidAccessDemo,
      toggleSimulation,
      markAnomalyReviewed,
      refreshStats: fetchStats,
    }),
    [
      isConnected,
      stats,
      events,
      latestCriticalAlert,
      isSimulating,
      isTriggeringDemo,
      dismissCriticalAlert,
      triggerInvalidAccessDemo,
      toggleSimulation,
      markAnomalyReviewed,
      fetchStats,
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
