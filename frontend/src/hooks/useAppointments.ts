import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance, isDemoMode } from '../lib/api';

export interface Appointment {
  id: string;
  patientName: string;
  specialistId: string;
  date: string;
  time: string;
  status: 'agendada' | 'cancelada' | 'reprogramada';
  createdAt: string;
}

export interface CreateAppointmentData {
  specialistId: string;
  date: string;
  time: string;
}

const exampleAppointments: Appointment[] = [
  { id: 'demo-appointment-1', patientName: 'Paciente demo', specialistId: 'demo-estetica', date: '2026-09-05', time: '10:30', status: 'agendada', createdAt: '2026-08-24' },
  { id: 'demo-appointment-2', patientName: 'Paciente demo', specialistId: 'demo-ortodoncia', date: '2026-08-18', time: '16:00', status: 'cancelada', createdAt: '2026-08-10' },
];

export const useAppointments = (userId?: string) => {
  const queryClient = useQueryClient();
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', userId],
    queryFn: async () => {
      if (isDemoMode) {
        return exampleAppointments;
      }
      try {
        const url = userId
          ? `/appointments?userId=${userId}`
          : '/appointments';
        const response = await axiosInstance.get(url);
        return response.data as Appointment[];
      } catch {
        return exampleAppointments;
      }
    },
    initialData: exampleAppointments,
    retry: false,
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      if (isDemoMode || data.specialistId.startsWith('demo-')) {
        return {
          id: `demo-appointment-${Date.now()}`,
          patientName: 'Paciente demo',
          ...data,
          status: 'agendada' as const,
          createdAt: new Date().toISOString().slice(0, 10),
        };
      }
      const response = await axiosInstance.post('/appointments', data);
      return response.data;
    },
    onSuccess: (appointment) => {
      if (appointment?.id?.startsWith('demo-')) {
        queryClient.setQueryData<Appointment[]>(['appointments', userId], (current = []) => [appointment, ...current]);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (isDemoMode || appointmentId.startsWith('demo-')) {
        return { id: appointmentId, status: 'cancelada' as const };
      }
      const response = await axiosInstance.delete(`/appointments/${appointmentId}`);
      return response.data;
    },
    onSuccess: (result) => {
      if (result?.id?.startsWith('demo-')) {
        queryClient.setQueryData<Appointment[]>(['appointments', userId], (current = []) => current.map((appointment) => appointment.id === result.id ? { ...appointment, status: 'cancelada' } : appointment));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (data: {
      appointmentId: string;
      newDate: string;
      newTime: string;
    }) => {
      if (isDemoMode || data.appointmentId.startsWith('demo-')) {
        return { id: data.appointmentId, date: data.newDate, time: data.newTime, status: 'reprogramada' as const };
      }
      const response = await axiosInstance.put(
        `/appointments/${data.appointmentId}/reschedule`,
        data
      );
      return response.data;
    },
    onSuccess: (result) => {
      if (result?.id?.startsWith('demo-')) {
        queryClient.setQueryData<Appointment[]>(['appointments', userId], (current = []) => current.map((appointment) => appointment.id === result.id ? { ...appointment, date: result.date, time: result.time, status: 'reprogramada' } : appointment));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  return {
    appointments,
    isLoading,
    createAppointment: createMutation.mutateAsync,
    cancelAppointment: cancelMutation.mutateAsync,
    rescheduleAppointment: rescheduleMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isRescheduling: rescheduleMutation.isPending,
    error: createMutation.error || cancelMutation.error || rescheduleMutation.error,
  };
};