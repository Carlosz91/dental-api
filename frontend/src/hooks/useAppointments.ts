import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance, isDemoMode } from '../lib/api';

// Clinic timezone used by the backend for all business-hour labels
const CLINIC_TZ = 'America/Argentina/Buenos_Aires';

const artDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const artTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: CLINIC_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Today's date (YYYY-MM-DD) in the clinic timezone, for `min` on date inputs */
export function clinicToday(): string {
  return artDate.format(new Date());
}

/** Buckets the backend statuses into the three UI states */
function mapStatus(status: string): Appointment['status'] {
  if (status === 'CANCELADO') return 'cancelada';
  if (status === 'FINALIZADO' || status === 'NO_ASISTIO') return 'finalizada';
  return 'agendada'; // PENDIENTE / CONFIRMADO / EN_CURSO
}

export interface Appointment {
  id: string;
  patientName: string;
  specialistId: string;
  specialistName?: string;
  specialty?: string;
  startsAt: string; // ISO instant
  endsAt: string;   // ISO instant
  /** YYYY-MM-DD in clinic tz */
  date: string;
  /** HH:mm in clinic tz */
  time: string;
  status: 'agendada' | 'cancelada' | 'finalizada';
  /** Backend status (PENDIENTE, CONFIRMADO, EN_CURSO, ...) for precise labels */
  rawStatus: string;
}

interface ApiAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  specialty?: string;
  patient?: { fullName?: string };
  specialist?: { id?: string; user?: { fullName?: string } };
}

function mapApiAppointment(raw: ApiAppointment): Appointment {
  const start = new Date(raw.startsAt);
  return {
    id: raw.id,
    patientName: raw.patient?.fullName || 'Paciente',
    specialistId: raw.specialist?.id ?? '',
    specialistName: raw.specialist?.user?.fullName,
    specialty: raw.specialty,
    startsAt: raw.startsAt,
    endsAt: raw.endsAt,
    date: artDate.format(start),
    time: artTime.format(start),
    status: mapStatus(raw.status),
    rawStatus: raw.status,
  };
}

/** Reusable by staff-facing views (e.g. specialist dashboard) */
export { mapApiAppointment };
export type { ApiAppointment };

export interface CreateAppointmentInput {
  specialistId: string;
  /** Uppercase enum expected by the API: ORTODONCIA | CIRUGIA | ESTETICA */
  specialty: string;
  startsAt: string; // ISO datetime
  endsAt: string;   // ISO datetime
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  notes?: string;
}

const exampleAppointments: Appointment[] = [
  { id: 'demo-appointment-1', patientName: 'Paciente demo', specialistId: 'demo-estetica', startsAt: '', endsAt: '', date: '2026-09-05', time: '10:30', status: 'agendada', rawStatus: 'CONFIRMADO' },
  { id: 'demo-appointment-2', patientName: 'Paciente demo', specialistId: 'demo-ortodoncia', startsAt: '', endsAt: '', date: '2026-08-18', time: '16:00', status: 'cancelada', rawStatus: 'CANCELADO' },
];

export const useAppointments = (_userId?: string) => {
  const queryClient = useQueryClient();
  const key = ['appointments', _userId ?? 'anonymous'];

  const { data: appointments = [], isLoading, isError: isLoadError, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (isDemoMode) {
        return exampleAppointments;
      }
      // The API scopes the list by auth token (patients see their own).
      const response = await axiosInstance.get('/appointments');
      const raw: ApiAppointment[] = response.data?.appointments ?? [];
      return raw.map(mapApiAppointment);
    },
    enabled: !!_userId,
    retry: false,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAppointmentInput) => {
      if (isDemoMode || data.specialistId.startsWith('demo-')) {
        return {
          appointment: {
            id: `demo-appointment-${Date.now()}`,
            ...data,
            status: 'PENDIENTE',
          },
        };
      }
      const response = await axiosInstance.post('/appointments', {
        ...data,
        source: 'WEB',
      });
      return response.data as { appointment: ApiAppointment & { id: string } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (isDemoMode || appointmentId.startsWith('demo-')) {
        return { id: appointmentId, status: 'CANCELADO' };
      }
      const response = await axiosInstance.patch(`/appointments/${appointmentId}`, {
        status: 'CANCELADO',
        cancellationReason: 'Cancelada por el paciente desde la web',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (data: {
      appointmentId: string;
      startsAt: string; // ISO
      endsAt: string;   // ISO
    }) => {
      if (isDemoMode || data.appointmentId.startsWith('demo-')) {
        return { id: data.appointmentId, startsAt: data.startsAt };
      }
      const response = await axiosInstance.patch(`/appointments/${data.appointmentId}`, {
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    appointments,
    isLoading,
    isLoadError,
    refetch,
    createAppointment: createMutation.mutateAsync,
    cancelAppointment: cancelMutation.mutateAsync,
    rescheduleAppointment: rescheduleMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isRescheduling: rescheduleMutation.isPending,
    error: createMutation.error || cancelMutation.error || rescheduleMutation.error,
  };
};
