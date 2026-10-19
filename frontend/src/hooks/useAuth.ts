import { create } from 'zustand';
import { axiosInstance, setAccessToken } from '../lib/api';

export type UserRole = 'paciente' | 'especialista' | 'admin' | 'staff' | null;

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialistId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean; // true while restoring the session on boot
  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Drops the local session without calling the API (refresh already failed) */
  expireSession: () => void;
}

/** Backend user shape (login/refresh/me responses) */
interface ApiUser {
  id: string;
  email: string;
  fullName?: string | null;
  name?: string | null;
  role?: string;
  specialistId?: string | null;
}

function normalizeUser(apiUser: ApiUser): AuthUser {
  const roleMap: Record<string, Exclude<UserRole, null>> = {
    patient: 'paciente',
    paciente: 'paciente',
    specialist: 'especialista',
    especialista: 'especialista',
    admin: 'admin',
    staff: 'staff',
  };

  return {
    id: String(apiUser?.id ?? ''),
    name: String(apiUser?.fullName || apiUser?.name || apiUser?.email || 'Usuario'),
    email: String(apiUser?.email ?? ''),
    role: typeof apiUser?.role === 'string' ? roleMap[apiUser.role.toLowerCase()] ?? null : null,
    specialistId: apiUser?.specialistId ?? null,
  };
}

// Singleton so React 18 StrictMode double-effects don't double-refresh
let restorePromise: Promise<void> | null = null;

// One-time hygiene: purge legacy localStorage session keys from old builds
['dental-auth', 'token', 'user'].forEach((key) => localStorage.removeItem(key));

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,

  /**
   * Boot-time session restore: the httpOnly refresh cookie is the ONLY
   * persisted credential. No localStorage involved anywhere.
   */
  restoreSession: () => {
    if (restorePromise) return restorePromise;

    restorePromise = (async () => {
      set({ isLoading: true });
      try {
        // Exchange refresh cookie for a fresh in-memory access token.
        // Empty object avoids Fastify's FST_ERR_CTP_EMPTY_JSON_BODY (json CT + no body).
        const refreshed = await axiosInstance.post('/auth/refresh', {});
        setAccessToken(refreshed.data.accessToken);

        const me = await axiosInstance.get('/auth/me');
        set({ user: normalizeUser(me.data.user), isLoading: false });
      } catch {
        setAccessToken(null);
        set({ user: null, isLoading: false });
      }
    })();

    return restorePromise;
  },

  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { accessToken, user } = response.data;

      setAccessToken(accessToken);
      set({ user: normalizeUser(user) });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error en el login';
      throw new Error(message);
    }
  },

  register: async (data) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        email: data.email,
        password: data.password,
        fullName: data.name,
        phone: data.phone || undefined,
      });
      const { accessToken, user } = response.data;
      setAccessToken(accessToken);
      set({ user: normalizeUser(user) });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo crear la cuenta';
      throw new Error(message);
    }
  },

  expireSession: () => {
    setAccessToken(null);
    set({ user: null });
  },

  logout: async () => {
    try {
      // Revoke the refresh token server-side (cookie cleared by API)
      await axiosInstance.post('/auth/logout');
    } catch {
      // Local state is cleared regardless — never trap the user in a session
    } finally {
      setAccessToken(null);
      set({ user: null });
    }
  },
}));