import { useState } from 'react';
import { CheckCircle2, Clock3, HeartPulse, CalendarClock, Ban, CalendarDays } from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import type { Appointment } from '../hooks/useAppointments';
import { useAvailability } from '../hooks/useSpecialists';
import type { AvailabilitySlot } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

/** Inline editor to move an appointment to another slot, using real availability */
function RescheduleEditor({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [message, setMessage] = useState('');
  const { data, isLoading } = useAvailability(appointment.specialistId, date);
  const { rescheduleAppointment, isRescheduling } = useAppointments();

  const slots = data?.slots ?? [];
  // Keep the original visit duration when moving it
  const durationMs = Math.max(
    new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime(),
    15 * 60000
  );

  const confirmReschedule = async () => {
    setMessage('');
    if (!slot) {
      setMessage('Elegí fecha y horario nuevos.');
      return;
    }
    try {
      await rescheduleAppointment({
        appointmentId: appointment.id,
        startsAt: slot.startsAt,
        endsAt: new Date(new Date(slot.startsAt).getTime() + durationMs).toISOString(),
      });
      onDone();
    } catch (err) {
      const apiMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setMessage(apiMessage || 'No se pudo reprogramar la cita.');
      setSlot(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-dental-200 bg-dental-50/60 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-700">Nuevo horario</p>
      <input
        type="date"
        min={new Date().toISOString().split('T')[0]}
        value={date}
        onChange={(event) => { setDate(event.target.value); setSlot(null); }}
        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-dental-500 focus:outline-none sm:max-w-xs"
        aria-label="Nueva fecha"
      />

      {date && (
        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Buscando horarios...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-rose-600">No hay horarios ese día.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((option) => (
                <button
                  key={option.startsAt}
                  type="button"
                  onClick={() => setSlot(option)}
                  className={`cursor-pointer rounded-lg border px-2 py-2 text-sm font-semibold transition ${slot?.startsAt === option.startsAt ? 'border-dental-500 bg-dental-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-dental-400'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-sm text-rose-600" role="alert">{message}</p>}

      <div className="mt-4 flex gap-2">
        <Button size="sm" disabled={isRescheduling || !slot} onClick={() => void confirmReschedule()}>
          <CalendarClock className="h-3.5 w-3.5" /> {isRescheduling ? 'Guardando...' : 'Confirmar cambio'}
        </Button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
          Cancelar edición
        </button>
      </div>
    </div>
  );
}

export const MyAppointments = () => {
  const [filterDate, setFilterDate] = useState('');
  const [actionError, setActionError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    appointments,
    isLoading,
    error,
    cancelAppointment,
    isCancelling,
    isRescheduling,
  } = useAppointments();

  const visibleAppointments = appointments.filter(
    (appointment: Appointment) => !filterDate || appointment.date.includes(filterDate)
  );
  const upcomingAppointments = visibleAppointments.filter((appointment) => appointment.status === 'agendada');
  const historyAppointments = visibleAppointments.filter((appointment) => appointment.status !== 'agendada');
  const nextAppointment = visibleAppointments.find(
    (appointment) => appointment.status === 'agendada'
  );

  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const handleCancel = async (appointmentId: string) => {
    setActionError('');
    try {
      await cancelAppointment(appointmentId);
    } catch (cancelError) {
      const apiMessage = (cancelError as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(apiMessage || 'No se pudo cancelar la cita.');
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-dental-500">Cargando tus citas...</div>;
  }

  return (
    <section className="min-h-screen px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Tu agenda</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Mis citas</h1>
          <p className="mt-2 text-slate-500">Consulta los detalles de tus visitas y prepárate con tranquilidad.</p>
        </div>

        {(error || actionError) && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError || 'No pudimos sincronizar tus citas. Mostramos la información disponible.'}</p>}

        {nextAppointment && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg">
            <div className="border-b border-white/10 px-5 py-4 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Próxima cita</p></div>
            <div className="grid gap-6 px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
              <div>
                <h2 className="text-2xl font-bold capitalize">{formatDate(nextAppointment.date)}</h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-300" /> {nextAppointment.time}</span>
                  <span className="inline-flex items-center gap-2"><HeartPulse className="h-4 w-4 text-cyan-300" /> {nextAppointment.specialistName || 'Especialista dental'}</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-sm font-semibold text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Confirmada</span>
            </div>
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="appointment-date" className="block text-sm font-semibold text-slate-700">Filtrar por fecha</label>
          <input
            id="appointment-date"
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            className="mt-2 h-12 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-dental-500 focus:outline-none"
          />
        </div>

        <h2 className="mb-4 text-xl font-bold text-slate-900">Próximas citas</h2>
        <div className="grid gap-4">
          {upcomingAppointments.map((appointment: Appointment) => {
            const isEditing = editingId === appointment.id;
            return (
              <Card key={appointment.id} variant="outlined" className="p-5 sm:p-6">
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><HeartPulse className="h-5 w-5" /></div>
                      <div>
                        <p className="font-semibold capitalize text-slate-900">{formatDate(appointment.date)}</p>
                        <p className="mt-1 text-sm text-slate-500">{appointment.time} · {appointment.specialistName || 'Especialista dental'}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-800">Tratamiento:</span> <span className="capitalize">{appointment.specialty?.toLowerCase() || 'Consulta dental'}</span></p>
                      <p><span className="font-semibold text-slate-800">Estado:</span> <span className="capitalize">{appointment.status}</span></p>
                    </div>
                    <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"><strong>Recomendación:</strong> Llega 10 minutos antes y lleva tus estudios o indicaciones previas.</p>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto justify-start gap-1.5" aria-label="Cancelar" title="Cancelar" disabled={isCancelling} onClick={() => void handleCancel(appointment.id)}>
                      <Ban className="h-3.5 w-3.5" /> <span>Cancelar</span>
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto justify-start gap-1.5" aria-label="Actualizar" title="Actualizar" disabled={isRescheduling} onClick={() => setEditingId(isEditing ? null : appointment.id)}>
                      <CalendarClock className="h-3.5 w-3.5" /> <span>{isEditing ? 'Cerrar' : 'Actualizar'}</span>
                    </Button>
                  </div>
                </div>

                {isEditing && <RescheduleEditor appointment={appointment} onDone={() => setEditingId(null)} />}
              </Card>
            );
          })}
        </div>

        {historyAppointments.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Historial de citas</h2>
              <span className="text-sm text-slate-500">{historyAppointments.length} registrada{historyAppointments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid gap-3">
              {historyAppointments.map((appointment: Appointment) => (
                <div key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-400"><HeartPulse className="h-4 w-4" /></div>
                    <div>
                      <p className="font-semibold capitalize text-slate-700">{formatDate(appointment.date)}</p>
                      <p className="text-sm text-slate-500">{appointment.time} · {appointment.specialistName || 'Especialista dental'}</p>
                    </div>
                  </div>
                  <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-500 sm:self-auto">{appointment.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {visibleAppointments.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-dental-400" />
            <p>{appointments.length === 0 ? 'No tienes citas programadas' : 'No hay citas para esa fecha'}</p>
          </div>
        )}
      </div>
    </section>
  );
};

MyAppointments.displayName = 'MyAppointments';