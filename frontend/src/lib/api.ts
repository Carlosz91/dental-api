import axios from 'axios';

// Same-origin by default: Vite proxies /api -> http://localhost:3000,
// which keeps session cookies first-party (SameSite works, no CORS needed).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
// Demo mode is OPT-IN now that the real backend exists
export const isDemoMode = import.meta.env.VITE_USE_DEMO_DATA === 'true';

/**
 * SECURITY: the access token lives ONLY in memory (module scope).
 * Nothing session-related touches localStorage.
 * Page reloads restore the session via the httpOnly refresh cookie
 * (silent POST /auth/refresh on boot).
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Subscribers are notified when the session can't be restored/refreshed */
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the httpOnly refresh cookie
  timeout: 15000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Attach whenever we hold a token. Sending an expired one to /auth/login
    // or /auth/refresh is harmless — those routes ignore headers.
    // (Never filter by URL here: /auth/me NEEDS the Bearer!)
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Silent refresh on 401, then retry the original request once.
// SINGLE-FLIGHT: concurrent 401s share ONE refresh call — critical because
// every successful refresh ROTATES the refresh token (parallel rotations fail).
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!inflightRefresh) {
    inflightRefresh = axiosInstance
      // The API reads the httpOnly cookie only; the JSON reply carries just { accessToken }.
      .post('/auth/refresh', {}) // {} avoids FST_ERR_CTP_EMPTY_JSON_BODY
      .then((response) => {
        const token = response.data?.accessToken as string | undefined;
        if (!token) throw new Error('Refresh response without accessToken');
        setAccessToken(token);
        return token;
      })
      .catch((refreshError) => {
        // Session truly expired
        setAccessToken(null);
        sessionExpiredListeners.forEach((listener) => listener());
        throw refreshError;
      })
      .finally(() => {
        inflightRefresh = null;
      });
  }
  try {
    return await inflightRefresh;
  } catch {
    return null;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthUrl = originalRequest?.url?.includes('/auth/');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthUrl) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Best human-readable message from an API error. The API replies with
 * `{ error }` (and `{ message }` on authorization refusals, in Spanish).
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response;
  if (response?.status === 403 && response.data?.message) return response.data.message;
  return response?.data?.error || fallback;
}

export { axiosInstance };
export default axiosInstance;