import { useCallback, useEffect, useRef, useState } from 'react';

/** Session ends after this long without interaction */
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
/** A warning with a countdown is shown this long before the session ends */
export const INACTIVITY_WARNING_MS = 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

interface InactivityOptions {
  /** Called when the inactivity window elapses (stable or not, latest is used) */
  onTimeout: () => void;
  /** Only arm the timers while true (e.g. while a user is signed in) */
  enabled?: boolean;
  timeoutMs?: number;
  warningMs?: number;
}

/**
 * Auto-logout on user inactivity with a warning phase.
 *
 * Any user interaction resets the timers. During the last `warningMs` the hook
 * exposes `secondsLeft` so the UI can show a countdown; `stayActive` lets the
 * user dismiss the warning explicitly.
 */
export function useInactivityTimeout({
  onTimeout,
  enabled = true,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  warningMs = INACTIVITY_WARNING_MS,
}: InactivityOptions): { secondsLeft: number | null; stayActive: () => void } {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timeoutRef = useRef(onTimeout);
  const resetRef = useRef<() => void>(() => {});

  // Always call the latest callback without re-arming the timers
  useEffect(() => {
    timeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;

    let warnTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let tick: ReturnType<typeof setInterval> | undefined;

    const clearAll = () => {
      clearTimeout(warnTimer);
      clearTimeout(endTimer);
      clearInterval(tick);
    };

    const reset = () => {
      clearAll();
      setSecondsLeft((current) => (current === null ? current : null));

      warnTimer = setTimeout(() => {
        const deadline = Date.now() + warningMs;
        setSecondsLeft(Math.ceil(warningMs / 1000));
        tick = setInterval(() => {
          setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        }, 1000);
      }, Math.max(timeoutMs - warningMs, 0));

      endTimer = setTimeout(() => {
        clearAll();
        setSecondsLeft(null);
        timeoutRef.current();
      }, timeoutMs);
    };

    resetRef.current = reset;
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();

    return () => {
      clearAll();
      setSecondsLeft(null);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [enabled, timeoutMs, warningMs]);

  const stayActive = useCallback(() => resetRef.current(), []);

  return { secondsLeft, stayActive };
}
