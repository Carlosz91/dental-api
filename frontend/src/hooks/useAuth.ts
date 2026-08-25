import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosInstance } from '../lib/api';

export type UserRole = 'paciente' | 'admin' | null;

interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: NonNullable<AuthState['user']>) => void;
}

export const useAuth = create(
  persist<AuthState>(
    (set, get) => ({
      user: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          const response = await axiosInstance.post('/auth/login', {
            email,
            password,
          });

          const { user, token } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));

          set({ user });
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Error en el login');
        }
      },

      register: async (name: string, email: string, phone: string, password: string) => {
        try {
          const response = await axiosInstance.post('/auth/register', {
            name,
            email,
            phone,
            password,
          });
          const { user, token } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          set({ user, isLoading: false });
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Error en el registro');
        }
      },

      logout: async () => {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          await axiosInstance.post('/auth/logout');
          set({ user: null });
        } catch (error: any) {
          // Even if API fails, clear local state
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ user: null });
          throw error;
        }
      },

      refreshToken: async () => {
        try {
          const response = await axiosInstance.post('/auth/refresh');
          const { token } = response.data;
          localStorage.setItem('token', token);
        } catch (error: any) {
          // Token refresh failed, logout
          await get().logout();
          throw error;
        }
      },

      setUser: (user: NonNullable<AuthState['user']>) => set({ user, isLoading: false }),
    }),
    {
      name: 'dental-auth',
      // Customize how state is persisted
    }
  )
);