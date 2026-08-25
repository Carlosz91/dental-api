import { useEffect, useRef } from 'react';

/**
 * Auto-logout on user inactivity.
 *
 * Arms a timer that resets on any user interaction. When the timer fires,
 * the (stable) callback runs — typically a session logout.
 *
 * @param onTimeout stable callback (wrap yours with useRef if inline)
 * @param timeoutMs inactivity window, default 2 minutes
 */
export function useInactivityTimeout(onTimeout: () => void, timeoutMs = 2 * 60 * 1000): void {
  // Keep the latest callback without re-subscribing listeners on every render
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => timeoutRef.current(), timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [timeoutMs]);
}