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

export const useSpecialists = () => {
  return useQuery({
    queryKey: ['specialists'],
    queryFn: async () => {
      if (isDemoMode) {
        return exampleSpecialists;
      }
      try {
        const response = await axiosInstance.get('/specialists');
        return response.data as Specialist[];
      } catch {
        return exampleSpecialists;
      }
    },
    initialData: exampleSpecialists,
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

export const useAvailability = (specialistId: string, date: string) => {
  return useQuery({
    queryKey: ['availability', specialistId, date],
    queryFn: async () => {
      if (isDemoMode || specialistId.startsWith('demo-')) {
        return { slots: exampleSlots };
      }
      try {
        const response = await axiosInstance.get(
          `/availability?specialistId=${specialistId}&date=${date}`
        );
        return response.data as { slots: string[] };
      } catch {
        return { slots: exampleSlots };
      }
    },
    placeholderData: { slots: exampleSlots },
    retry: false,
    staleTime: 30000,
    enabled: !!specialistId && !!date,
  });
};