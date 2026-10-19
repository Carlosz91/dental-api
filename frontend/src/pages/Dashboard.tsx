import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock3, Stethoscope, Users } from 'lucide-react';
import { axiosInstance, getApiErrorMessage } from '../lib/api';
import { clinicToday, mapApiAppointment, type ApiAppointment, type Appointment } from '../hooks/useAppointments';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../lib/toast';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { Loading } from '../components/common/Loading';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState, ErrorState } from '../components/common/StateMessage';
import { PageHeader } from '../components/common/PageHeader';

function DashboardStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock3 }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-dental-50 text-dental-900">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

/** Access control lives in the router (RequireRole); this page only renders the agenda. */
export const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const specialistId = user?.specialistId;
  const isCentralUser = user?.role === 'admin' || user?.role === 'staff';

  const appointmentsQuery = useQuery({
    queryKey: ['specialist-appointments', specialistId],
    enabled: isCentralUser || !!specialistId,
    queryFn: async () => {
      const response = await axiosInstance.get('/appointments', {
        params: isCentralUser ? undefined : { specialistId },
      });
      const raw: ApiAppointment[] = response.data?.appointments ?? [];
      return raw.map(mapApiAppointment);
    },
    refetchInterval: 30000,
    retry: false,
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'CONFIRMADO' | 'CANCELADO' }) => {
      await axiosInstance.patch(`/appointments/${id}`, {
        status,
        ...(status === 'CANCELADO' ? { cancellationReason: 'Reprogramación de agenda' } : {}),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['specialist-appointments', specialistId] });
      toast.success(variables.status === 'CONFIRMADO' ? 'Cita confirmada.' : 'Cita cancelada.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar la cita.'));
    },
  });

  if (!specialistId && !isCentralUser) {
    return (
      <section className="px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-8 text-center">
          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-amber-700" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-900">Tu usuario no está vinculado a un perfil de especialista</h1>
          <p className="mt-2 text-sm text-amber-900">Pide a administración que vincule tu cuenta.</p>
        </div>
      </section>
    );
  }

  const all: Appointment[] = appointmentsQuery.data ?? [];
  const nowIso = new Date().toISOString();
  const upcoming = all
    .filter((a) => a.status === 'agendada' && a.startsAt >= nowIso)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todayIso = clinicToday();
  const stats = {
    today: upcoming.filter((a) => a.date === todayIso).length,
    upcoming: upcoming.length,
    attended: all.filter((a) => a.status === 'finalizada').length,
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    changeStatus.mutate({ id: cancelTarget.id, status: 'CANCELADO' }, { onSettled: () => setCancelTarget(null) });
  };

  return (
    <section className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Panel profesional"
          title={`Hola, ${user?.name ?? ''}`}
          eyebrowClassName="text-dental-900"
          description={isCentralUser ? 'Todas las citas de la clínica en tiempo real.' : 'Tu agenda de pacientes en tiempo real.'}
        />

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <DashboardStat label="Citas hoy" value={stats.today} icon={CalendarDays} />
          <DashboardStat label="Próximas citas" value={stats.upcoming} icon={Clock3} />
          <DashboardStat label="Pacientes atendidos" value={stats.attended} icon={Users} />
        </div>

        <h2 className="mb-4 text-xl font-bold text-slate-900">Agenda próxima</h2>

        {appointmentsQuery.isLoading ? (
          <Loading.CardList count={3} />
        ) : appointmentsQuery.isError ? (
          <ErrorState title="No pudimos cargar la agenda" onRetry={() => void appointmentsQuery.refetch()} />
        ) : upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No tienes citas próximas" description="Cuando un paciente agende, la cita aparecerá aquí automáticamente." />
        ) : (
          <ul className="grid gap-3">
            {upcoming.map((appointment) => (
              <li key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-xl bg-cyan-50 px-2 text-sm font-bold text-cyan-700">
                    {appointment.time}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{appointment.date}</p>
                    <p className="text-sm text-slate-600">
                      {appointment.patientName} · <span className="capitalize">{appointment.specialty?.toLowerCase() || 'consulta'}</span>
                    </p>
                    {isCentralUser && <p className="mt-1 text-sm font-semibold text-dental-900">Especialista: {appointment.specialistName || 'Sin asignar'}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge rawStatus={appointment.rawStatus} />
                  {appointment.rawStatus === 'PENDIENTE' && (
                    <Button variant="outline" size="sm" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate({ id: appointment.id, status: 'CONFIRMADO' })}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" disabled={changeStatus.isPending} onClick={() => setCancelTarget(appointment)}>
                    Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="¿Cancelar esta cita?"
        confirmLabel="Sí, cancelar cita"
        cancelLabel="Mantener cita"
        destructive
        loading={changeStatus.isPending}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      >
        {cancelTarget && (
          <p>
            Cancelarás la cita de <strong className="text-slate-900">{cancelTarget.patientName}</strong> del {cancelTarget.date} a las {cancelTarget.time}. Esta acción no se puede deshacer.
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
};

Dashboard.displayName = 'Dashboard';
