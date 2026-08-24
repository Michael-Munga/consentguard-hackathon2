import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext.js';
import { formatDateTime } from '../../lib/utils.js';

export const AnomalyAlertBanner: React.FC<{ onNavigateToAnomalies?: () => void }> = ({
  onNavigateToAnomalies,
}) => {
  const { latestCriticalAlert, dismissCriticalAlert } = useLiveData();

  useEffect(() => {
    if (!latestCriticalAlert) return;
    const timer = setTimeout(() => {
      dismissCriticalAlert();
    }, 5000);
    return () => clearTimeout(timer);
  }, [latestCriticalAlert, dismissCriticalAlert]);

  if (!latestCriticalAlert) return null;

  const { event } = latestCriticalAlert;
  const benName = event.data?.beneficiary?.name || event.data?.beneficiary_name || 'Beneficiary';
  const pillar = event.data?.beneficiary?.pillar || event.data?.beneficiary_pillar || 'Inuka Pillar';
  const actor = event.data?.access_event?.accessed_by || 'Unauthorized Actor';
  const purpose = event.data?.access_event?.purpose || 'Beneficiary Data';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl rounded-lg p-4 bg-[#bb0013] text-white shadow-[0px_8px_24px_rgba(187,0,19,0.3)] border border-[#ff4d4d] flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm tracking-wide uppercase">
              CRITICAL BREACH INTERCEPTED
            </h3>
            <span className="text-[11px] font-mono opacity-80">
              {formatDateTime(event.timestamp)}
            </span>
          </div>
          <p className="text-xs font-medium opacity-95 mt-1 leading-relaxed">
            Unauthorized access attempt detected: Actor <span className="font-mono bg-white/20 px-1 py-0.5 rounded">{actor}</span> was blocked from accessing <span className="font-mono bg-white/20 px-1 py-0.5 rounded">{benName}</span> ({pillar} Pillar). Reason: KDPA 2019 Digital Consent Not Granted.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-center">
          {onNavigateToAnomalies && (
            <button
              onClick={() => {
                onNavigateToAnomalies();
                dismissCriticalAlert();
              }}
              className="bg-[#1e1b1c] hover:bg-black text-white px-4 py-2 rounded text-xs font-mono font-bold tracking-wider transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              REVIEW DETAILS
            </button>
          )}

          <button
            onClick={dismissCriticalAlert}
            className="p-1.5 text-white/70 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
