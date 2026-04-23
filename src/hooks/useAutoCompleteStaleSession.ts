import { useEffect, useRef } from 'react';
import { useActiveSession, useCompleteSession } from '@/api/sessions';

/**
 * Auto-completes any active session that was started on a previous day.
 * Runs once when the active session data is fetched — no cron needed.
 * Partial logs are preserved; the session is simply marked as completed.
 */
export function useAutoCompleteStaleSession() {
  const { data: activeSession, isLoading: activeLoading } = useActiveSession();
  const completeSession = useCompleteSession();
  const completingRef = useRef(false);

  // True while we still may (or already are) auto-completing a stale session.
  // Consumers use this to keep UI in a skeleton/disabled state and avoid
  // accidental clicks on "Start Session" while the previous day's session is
  // being cleaned up.
  const needsAutoComplete = (() => {
    if (!activeSession) return false;
    if (activeSession.status !== 'in_progress') return false;
    const startedDate = new Date(activeSession.startedAt);
    const now = new Date();
    const startedDay = new Date(startedDate.getFullYear(), startedDate.getMonth(), startedDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startedDay < today;
  })();

  useEffect(() => {
    if (!activeSession || completingRef.current) return;
    if (activeSession.status !== 'in_progress') return;

    const startedDate = new Date(activeSession.startedAt);
    const now = new Date();

    // Compare calendar dates (not just 24h difference)
    const startedDay = new Date(startedDate.getFullYear(), startedDate.getMonth(), startedDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (startedDay >= today) return; // Same day — do nothing

    // Session is from a previous day — auto-complete it
    completingRef.current = true;
    completeSession.mutate(
      { id: activeSession.id, notes: 'Auto-completed (session from previous day)' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  return {
    isAutoCompleting:
      activeLoading || completeSession.isPending || needsAutoComplete,
  };
}
