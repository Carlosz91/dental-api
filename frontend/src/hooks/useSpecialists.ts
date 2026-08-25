import { useQuery } from '@tanstack/react-query';
import { axiosInstance, isDemoMode } from '../lib/api';

export interface Specialist {
  id: string;
  name: string;
  description: string;
  specialty: 'ortodoncia' | 'cirugia' | 'estetica';
  availability: Record<string, string[]>; // date -> slots
  avatar?: string;
}

export const exampleSpecialists: Specialist[] = [
  { id: 'demo-estetica', name: 'Dra. Ana Morales', description: 'Especialista en estética dental y diseño de sonrisa.', specialty: 'estetica', availability: {} },
  { id: 'demo-cirugia', name: 'Dr. Carlos Ruiz', description: 'Cirujano dentista con experiencia en tratamientos quirúrgicos.', specialty: 'cirugia', availability: {} },
  { id: 'demo-ortodoncia', name: 'Dra. Laura Gómez', description: 'Especialista en ortodoncia para niños y adultos.', specialty: 'ortodoncia', availability: {} },
];

const exampleSlots = ['09:00', '10:30', '12:00', '16:00', '17:30'];

// Normaliza la respuesta del backend (/specialists devuelve { specialists: [...] })
// al formato que espera la UI ({ id, name, description, specialty })
interface ApiSpecialist {
  id: string;
  bio?: string;
  description?: string;
  specialty?: string;
  isActive?: boolean;
  user?: { fullName?: string };
}

function mapApiSpecialist(raw: ApiSpecialist): Specialist {
  return {
    id: raw.id,
    name: raw.user?.fullName || 'Especialista',
    description: raw.bio || raw.description || '',
    specialty: ((raw.specialty || 'estetica') as string).toLowerCase() as Specialist['specialty'],
    availability: {},
  };
}

export const useSpecialists = () => {
  return useQuery({
    queryKey: ['specialists'],
    queryFn: async () => {
      if (isDemoMode) {
        return exampleSpecialists;
      }
      // NO silent fallback: if the API fails we show the error state,
      // never fake doctors that can't be booked.
      const response = await axiosInstance.get('/specialists');
      const list: ApiSpecialist[] = response.data?.specialists ?? response.data;
      return list.filter((s) => s.isActive !== false).map(mapApiSpecialist);
    },
    retry: false,
    staleTime: 60000,
    refetchInterval: 30000,
  });
};

export const useSpecialistDetail = (specialistId: string) => {
  return useQuery({
    queryKey: ['specialist', specialistId],
    queryFn: async () => {
      if (isDemoMode) {
        return exampleSpecialists.find((item) => item.id === specialistId) || exampleSpecialists[0];
      }
      try {
        const response = await axiosInstance.get(`/specialists/${specialistId}`);
        return response.data as Specialist;
      } catch {
        return exampleSpecialists.find((item) => item.id === specialistId) || exampleSpecialists[0];
      }
    },
    placeholderData: exampleSpecialists[0],
    retry: false,
    staleTime: 60000,
    enabled: !!specialistId,
  });
};

export interface AvailabilitySlot {
  /** ISO instant (UTC) — send this back when booking */
  startsAt: string;
  endsAt: string;
  /** HH:mm in clinic timezone for display */
  label: string;
}

export const useAvailability = (specialistId: string, date: string) => {
  return useQuery({
    queryKey: ['availability', specialistId, date],
    queryFn: async () => {
      if (isDemoMode || specialistId.startsWith('demo-')) {
        return {
          slots: exampleSlots.map((label) => ({
            startsAt: `${date}T${label}:00-03:00`,
            endsAt: `${date}T${label}:30-03:00`,
            label,
          })),
        };
      }
      try {
        // Real backend endpoint: GET /availability/:specialistId/slots?date=YYYY-MM-DD
        const response = await axiosInstance.get(
          `/availability/${specialistId}/slots?date=${date}`
        );
        const rawSlots: Array<{
          startsAt: string;
          endsAt?: string;
          label?: string;
          available?: boolean;
        }> = response.data?.slots ?? [];

        const slots = rawSlots
          .filter((slot) => slot.available !== false)
          .map((slot) => ({
            startsAt: slot.startsAt,
            endsAt: slot.endsAt || new Date(new Date(slot.startsAt).getTime() + 30 * 60000).toISOString(),
            label: slot.label || slot.startsAt.slice(11, 16),
          }));

        return { slots };
      } catch {
        // If the API fails show an empty agenda rather than invented hours
        return { slots: [] as AvailabilitySlot[] };
      }
    },
    placeholderData: { slots: [] as AvailabilitySlot[] },
    retry: false,
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: !!specialistId && !!date,
  });
};