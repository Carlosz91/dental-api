import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, HeartPulse, CalendarClock, Ban, CalendarDays, CalendarPlus } from 'lucide-react';
import { clinicToday, useAppointments } from '../hooks/useAppointments';
import type { Appointment } from '../hooks/useAppointments';
import { useAvailability } from '../hooks/useSpecialists';
import type { AvailabilitySlot } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { Loading } from '../components/common/Loading';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState, ErrorState } from '../components/common/StateMessage';
import { PageHeader } from '../components/common/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../lib/api';
import { toast } from '../lib/toast';

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

/** Inline editor to move an appointment to another slot, using real availability */
function RescheduleEditor({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [message, setMessage] = useState('');
  const { data, isLoading } = useAvailability(appointment.specialistId, date);
  // Same user id as the list so the mutation invalidates the visible query
  const { user } = useAuth();
  const { rescheduleAppointment, isRescheduling } = useAppointments(user?.id);

  const slots = data?.slots ?? [];
  // Keep the original visit duration when moving it
  const durationMs = Math.max(
    new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime(),
    15 * 60000
  );

  const confirmReschedule = async () => {
    setMessage('');
    if (!slot) {
      setMessage('Elige una fecha y un horario nuevos.');
      return;
    }
    try {
      await rescheduleAppointment({
        appointmentId: appointment.id,
        startsAt: slot.startsAt,
        endsAt: new Date(new Date(slot.startsAt).getTime() + durationMs).toISOString(),
      });
      toast.success('Tu cita se reprogramó correctamente.');
      onDone();
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'No se pudo reprogramar la cita.'));
      setSlot(null);
    }
  };

  const dateId = `reschedule-date-${appointment.id}`;

  return (
    <div className="mt-4 rounded-xl border border-dental-300 bg-dental-50/60 p-4">
      <label htmlFor={dateId} className="mb-1.5 block text-sm font-semibold text-slate-700">Nueva fecha</label>
      <input
        id={dateId}
        type="date"
        min={clinicToday()}
        value={date}
        onChange={(event) => { setDate(event.target.value); setSlot(null); }}
        className="min-h-[48px] w-full rounded-lg border border-slate-500 bg-white px-3 text-base font-medium text-slate-900 focus:border-dental-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-dental-800/30 sm:max-w-xs"
      />

      {date && (
        <div className="mt-4">
          {isLoading ? (
            <div role="status" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <span className="sr-only">Buscando horarios...</span>
              {Array.from({ length: 5 }, (_, index) => <Loading.Skeleton key={index} className="h-11" />)}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-amber-900">No hay horarios ese día. Prueba con otra fecha.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((option) => (
                <button
                  key={option.startsAt}
                  type="button"
                  aria-pressed={slot?.startsAt === option.startsAt}
                  onClick={() => setSlot(option)}
                  className={`min-h-[44px] cursor-pointer rounded-lg border px-2 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 focus-visible:ring-offset-2 ${slot?.startsAt === option.startsAt ? 'border-dental-800 bg-dental-800 text-white' : 'border-slate-400 bg-white text-slate-800 hover:border-dental-800'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{message}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button size="sm" disabled={isRescheduling || !slot} onClick={() => void confirmReschedule()}>
          <CalendarClock className="h-4 w-4" aria-hidden="true" /> {isRescheduling ? 'Guardando...' : 'Confirmar cambio'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>Descartar cambios</Button>
      </div>
    </div>
  );
}

export const MyAppointments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const {
    appointments,
    isLoading,
    isLoadError,
    refetch,
    cancelAppointment,
    isCancelling,
    isRescheduling,
  } = useAppointments(user?.id);

  const visibleAppointments = appointments.filter(
    (appointment: Appointment) => !filterDate || appointment.date.includes(filterDate)
  );
  const upcomingAppointments = visibleAppointments.filter((appointment) => appointment.status === 'agendada');
  const historyAppointments = visibleAppointments.filter((appointment) => appointment.status !== 'agendada');
  const nextAppointment = upcomingAppointments[0];

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment(cancelTarget.id);
      toast.success('Tu cita fue cancelada.');
      setCancelTarget(null);
    } catch (cancelError) {
      toast.error(getApiErrorMessage(cancelError, 'No se pudo cancelar la cita. Inténtalo de nuevo.'));
      setCancelTarget(null);
    }
  };

  return (
    <section className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Tu agenda"
          title="Mis citas"
          description="Consulta los detalles de tus visitas y prepárate con tranquilidad."
        />

        {isLoading ? (
          <Loading.CardList count={3} />
        ) : isLoadError ? (
          <ErrorState title="No pudimos cargar tus citas" onRetry={() => void refetch()} />
        ) : (
          <>
            {nextAppointment && (
              <div className="mb-8 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg">
                <div className="border-b border-white/10 px-5 py-4 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Próxima cita</p></div>
                <div className="grid gap-6 px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
                  <div>
                    <h2 className="text-2xl font-bold capitalize">{formatDate(nextAppointment.date)}</h2>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-200">
                      <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-300" aria-hidden="true" /> {nextAppointment.time}</span>
                      <span className="inline-flex items-center gap-2"><HeartPulse className="h-4 w-4 text-cyan-300" aria-hidden="true" /> {nextAppointment.specialistName || 'Especialista dental'}</span>
                    </div>
                  </div>
                  <StatusBadge rawStatus={nextAppointment.rawStatus} className="self-start" />
                </div>
              </div>
            )}

            {appointments.length > 0 && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label htmlFor="appointments-filter-date" className="block text-sm font-semibold text-slate-700">Filtrar por fecha</label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="appointments-filter-date"
                    type="date"
                    value={filterDate}
                    onChange={(event) => setFilterDate(event.target.value)}
                    className="min-h-[48px] w-full rounded-lg border border-slate-500 bg-white px-3 text-base font-medium text-slate-900 focus:border-dental-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-dental-800/30 sm:max-w-xs"
                  />
                  {filterDate && <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>Quitar filtro</Button>}
                </div>
              </div>
            )}

            {appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Aún no tienes citas"
                description="Agenda tu primera visita en pocos pasos y la verás aquí."
                action={<Button onClick={() => navigate('/booking')}><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Agendar una cita</Button>}
              />
            ) : visibleAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No hay citas para esa fecha"
                description="Prueba con otra fecha o quita el filtro."
                action={<Button variant="outline" onClick={() => setFilterDate('')}>Quitar filtro</Button>}
              />
            ) : (
              <>
                <h2 className="mb-4 text-xl font-bold text-slate-900">Próximas citas</h2>
                {upcomingAppointments.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No tienes citas próximas.</p>
                ) : (
                  <ul className="grid gap-4">
                    {upcomingAppointments.map((appointment: Appointment) => {
                      const isEditing = editingId === appointment.id;
                      return (
                        <li key={appointment.id}>
                          <Card variant="outlined" className="p-5 sm:p-6">
                            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><HeartPulse className="h-5 w-5" aria-hidden="true" /></div>
                                  <div>
                                    <p className="font-semibold capitalize text-slate-900">{formatDate(appointment.date)}</p>
                                    <p className="mt-1 text-sm text-slate-600">{appointment.time} · {appointment.specialistName || 'Especialista dental'}</p>
                                  </div>
                                </div>
                                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
                                  <p><span className="font-semibold text-slate-800">Tratamiento:</span> <span className="capitalize">{appointment.specialty?.toLowerCase() || 'Consulta dental'}</span></p>
                                  <StatusBadge rawStatus={appointment.rawStatus} />
                                </div>
                                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900"><strong>Recomendación:</strong> Llega 10 minutos antes y lleva tus estudios o indicaciones previas.</p>
                              </div>

                              <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={isCancelling} onClick={() => setCancelTarget(appointment)}>
                                  <Ban className="h-4 w-4" aria-hidden="true" /> Cancelar
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto" aria-expanded={isEditing} disabled={isRescheduling} onClick={() => setEditingId(isEditing ? null : appointment.id)}>
                                  <CalendarClock className="h-4 w-4" aria-hidden="true" /> {isEditing ? 'Cerrar' : 'Reprogramar'}
                                </Button>
                              </div>
                            </div>

                            {isEditing && <RescheduleEditor appointment={appointment} onDone={() => setEditingId(null)} />}
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {historyAppointments.length > 0 && (
                  <div className="mt-10">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                      <h2 className="text-xl font-bold text-slate-900">Historial de citas</h2>
                      <span className="text-sm text-slate-600">{historyAppointments.length} registrada{historyAppointments.length === 1 ? '' : 's'}</span>
                    </div>
                    <ul className="grid gap-3">
                      {historyAppointments.map((appointment: Appointment) => (
                        <li key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><HeartPulse className="h-4 w-4" aria-hidden="true" /></div>
                            <div>
                              <p className="font-semibold capitalize text-slate-800">{formatDate(appointment.date)}</p>
                              <p className="text-sm text-slate-600">{appointment.time} · {appointment.specialistName || 'Especialista dental'}</p>
                            </div>
                          </div>
                          <StatusBadge rawStatus={appointment.rawStatus} className="self-start sm:self-auto" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="¿Cancelar esta cita?"
        confirmLabel="Sí, cancelar cita"
        cancelLabel="Mantener cita"
        destructive
        loading={isCancelling}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      >
        {cancelTarget && (
          <p>
            Vas a cancelar tu cita del <strong className="capitalize text-slate-900">{formatDate(cancelTarget.date)}</strong> a las{' '}
            <strong className="text-slate-900">{cancelTarget.time}</strong>
            {cancelTarget.specialistName ? <> con {cancelTarget.specialistName}</> : null}. Esta acción no se puede deshacer.
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
};

MyAppointments.displayName = 'MyAppointments';
