import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, Stethoscope, Users } from 'lucide-react';
import { axiosInstance } from '../lib/api';
import { mapApiAppointment, type ApiAppointment, type Appointment } from '../hooks/useAppointments';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';

/** Only dentists (and admins) can see this panel */
const ALLOWED_ROLES = ['especialista', 'admin'];

function DashboardStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock3 }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-dental-50 text-dental-600">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Route guard: dentists and admins only
  if (!user || !ALLOWED_ROLES.includes(user.role ?? '')) {
    return <Navigate to="/" replace />;
  }

  const specialistId = user.specialistId;

  const appointmentsQuery = useQuery({
    queryKey: ['specialist-appointments', specialistId],
    enabled: !!specialistId,
    queryFn: async () => {
      const response = await axiosInstance.get('/appointments', {
        params: { specialistId },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-appointments', specialistId] });
    },
  });

  if (!specialistId) {
    return (
      <section className="min-h-screen px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900">Tu usuario no está vinculado a un perfil de especialista</h1>
          <p className="mt-2 text-sm text-amber-700">Pedile a administración que vincule tu cuenta.</p>
        </div>
      </section>
    );
  }

  const all: Appointment[] = appointmentsQuery.data ?? [];
  const nowIso = new Date().toISOString();
  const upcoming = all
    .filter((a) => a.status === 'agendada' && a.startsAt >= nowIso)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const stats = {
    today: upcoming.filter((a) => a.date === todayIso).length,
    upcoming: upcoming.length,
    attended: all.filter((a) => a.status === 'finalizada').length,
  };

  const act = (appointment: Appointment, status: 'CONFIRMADO' | 'CANCELADO') =>
    changeStatus.mutate({ id: appointment.id, status });

  return (
    <section className="min-h-screen px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-dental-600">Panel profesional</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Hola, {user.name}</h1>
          <p className="mt-2 text-slate-500">Tu agenda de pacientes en tiempo real.</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <DashboardStat label="Citas hoy" value={stats.today} icon={CalendarDays} />
          <DashboardStat label="Próximas citas" value={stats.upcoming} icon={Clock3} />
          <DashboardStat label="Pacientes atendidos" value={stats.attended} icon={Users} />
        </div>

        <h2 className="mb-4 text-xl font-bold text-slate-900">Agenda próxima</h2>

        {appointmentsQuery.isLoading ? (
          <p className="py-10 text-center text-dental-500">Cargando agenda...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-dental-300" />
            No tenés citas próximas programadas.
          </div>
        ) : (
          <div className="grid gap-3">
            {upcoming.map((appointment) => (
              <div key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 font-bold text-cyan-700">
                    {appointment.time}
                  </span>
                  <div>
                    <p className="font-semibold capitalize text-slate-900">{appointment.date}</p>
                    <p className="text-sm text-slate-500">
                      {appointment.patientName} · <span className="capitalize">{appointment.specialty?.toLowerCase() || 'consulta'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === 'agendada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    Pendiente de confirmar
                  </span>
                  <Button variant="outline" size="sm" disabled={changeStatus.isPending} onClick={() => act(appointment, 'CONFIRMADO')}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                  </Button>
                  <Button variant="ghost" size="sm" disabled={changeStatus.isPending} onClick={() => act(appointment, 'CANCELADO')}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {changeStatus.isError && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            No se pudo actualizar la cita.
          </p>
        )}
      </div>
    </section>
  );
};

Dashboard.displayName = 'Dashboard';