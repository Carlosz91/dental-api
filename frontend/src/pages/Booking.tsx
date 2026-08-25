import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, ChevronLeft, Clock3, HeartPulse, Scissors, Sparkles, Stethoscope, CheckCircle2 } from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import { useAvailability, useSpecialists } from '../hooks/useSpecialists';
import type { Specialist, AvailabilitySlot } from '../hooks/useSpecialists';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';

const treatmentOptions = [
  { value: 'estetica', label: 'Estética dental', description: 'Limpieza, blanqueamiento y diseño de sonrisa', icon: Sparkles },
  { value: 'cirugia', label: 'Cirugía', description: 'Tratamientos quirúrgicos y extracciones', icon: Scissors },
  { value: 'ortodoncia', label: 'Ortodoncia', description: 'Alineación y cuidado de tu mordida', icon: HeartPulse },
] as const;

type Treatment = typeof treatmentOptions[number]['value'];

function apiErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as { response?: { data?: { error?: string }; status?: number } };
  return anyErr?.response?.data?.error || fallback;
}

export const Booking = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(search);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [treatment, setTreatment] = useState<Treatment | ''>('');
  const [specialistId, setSpecialistId] = useState(params.get('specialist') || '');
  const [selectedDate, setSelectedDate] = useState(params.get('date') || '');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(() => localStorage.getItem('dentalcare-phone') || '');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: specialists = [], isLoading: specialistsLoading } = useSpecialists();
  const { data: availability, isLoading: availabilityLoading, refetch: refetchAvailability } = useAvailability(specialistId, selectedDate);
  const { createAppointment, isCreating } = useAppointments(user?.id);

  const filteredSpecialists = specialists.filter((specialist: Specialist) => !treatment || specialist.specialty === treatment);
  const selectedSpecialist = specialists.find((specialist: Specialist) => specialist.id === specialistId);
  const slots = availability?.slots ?? [];

  const selectTreatment = (value: Treatment) => {
    setTreatment(value);
    setSpecialistId('');
    setSelectedDate('');
    setSelectedSlot(null);
  };

  const submitAppointment = async () => {
    setMessage('');
    // TEMP DEBUG
    console.log('[booking] submit ->', {
      specialistId,
      selectedDate,
      slot: selectedSlot?.startsAt,
      nombreLen: patientName.trim().length,
      phoneLen: patientPhone.trim().length,
      specialty: selectedSpecialist?.specialty,
    });
    if (!specialistId || !selectedDate || !selectedSlot) {
      setMessage('Completa especialista, fecha y hora antes de confirmar.');
      return;
    }
    if (!patientName.trim() || patientPhone.trim().length < 8) {
      setMessage('Ingresá tu nombre y un teléfono de contacto (mínimo 8 caracteres).');
      return;
    }

    localStorage.setItem('dentalcare-phone', patientPhone.trim());

    try {
      await createAppointment({
        specialistId,
        specialty: (selectedSpecialist?.specialty || treatment || 'estetica').toUpperCase(),
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
      });
      setSuccess(true);
      // Dejamos ver la confirmación antes de ir al inicio
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage(apiErrorMessage(err, 'No se pudo reservar la cita.'));
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // El horario se ocupó mientras completabas los datos: refrescar agenda
        setSelectedSlot(null);
        void refetchAvailability();
        setStep(3);
      }
    }
  };

  const steps = ['Especialidad', 'Especialista', 'Fecha y hora', 'Confirmación'];

  return (
    <section className="min-h-screen px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Tu próxima visita</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Agenda tu cita</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Elige el tratamiento, el especialista y el horario que mejor te convenga.</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-4">
          {steps.map((label, index) => {
            const active = step === index + 1;
            const complete = step > index + 1;
            return (
              <div key={label} className={`min-w-0 border-t-2 pt-2 text-xs font-semibold leading-4 sm:pt-3 sm:text-sm ${active ? 'border-dental-500 text-dental-700' : complete ? 'border-cyan-400 text-cyan-700' : 'border-slate-200 text-slate-400'}`}>
                <span className="mr-1">{complete ? <Check className="inline h-4 w-4" /> : index + 1}</span>
                <span className="sm:hidden">{index === 0 ? 'Tratamiento' : index === 1 ? 'Especialista' : index === 2 ? 'Fecha y hora' : 'Confirmar'}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>

        <Card className="p-5 sm:p-8">
          {/* Paso 1: tratamiento */}
          {step === 1 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Stethoscope className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">¿Qué tratamiento necesitas?</h2>
                  <p className="mt-1 text-sm text-slate-500">Te mostraremos el equipo adecuado.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {treatmentOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button key={option.value} type="button" onClick={() => selectTreatment(option.value)} className={`cursor-pointer rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-dental-400 hover:bg-dental-50 ${treatment === option.value ? 'border-dental-500 bg-dental-50 ring-2 ring-dental-500/10' : 'border-slate-200'}`}>
                      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><Icon className="h-5 w-5" /></span>
                      <span className="font-semibold text-slate-900">{option.label}</span>
                      <span className="mt-2 block text-sm leading-5 text-slate-500">{option.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col items-stretch justify-end gap-2 sm:items-end">
                <Button className="w-full sm:w-auto" disabled={!treatment} onClick={() => setStep(2)}>Siguiente <CalendarDays className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Paso 2: especialista */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900">Elige tu especialista</h2>
              <p className="mt-2 text-sm text-slate-500">Selecciona el profesional que atenderá tu cita.</p>
              {specialistsLoading ? (
                <div className="flex justify-center py-10"><Loading.Spinner size="large" /></div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {filteredSpecialists.map((specialist: Specialist) => (
                    <button key={specialist.id} type="button" onClick={() => { setSpecialistId(specialist.id); setSelectedDate(''); setSelectedSlot(null); setStep(3); }} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-dental-400 hover:bg-dental-50">
                      <span className="font-semibold text-slate-900">{specialist.name}</span>
                      <span className="mt-1 block text-sm text-slate-500">{specialist.description}</span>
                      <span className="mt-4 block text-xs font-bold uppercase tracking-wide text-dental-600">Elegir especialista</span>
                    </button>
                  ))}
                </div>
              )}
              {!specialistsLoading && filteredSpecialists.length === 0 && (
                <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">No hay especialistas disponibles para esta especialidad.</p>
              )}
              <button type="button" onClick={() => setStep(1)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-dental-600"><ChevronLeft className="h-4 w-4" /> Cambiar especialidad</button>
            </div>
          )}

          {/* Paso 3: fecha y hora */}
          {step === 3 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><CalendarDays className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Selecciona fecha y hora</h2>
                  <p className="mt-2 text-sm text-slate-500">Consulta los horarios disponibles.</p>
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-700" htmlFor="appointment-date">Fecha de tu cita</label>
              <input
                id="appointment-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlot(null); }}
                className="mt-2 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-900 shadow-sm focus:border-dental-500 focus:outline-none focus:ring-2 focus:ring-dental-500/20 sm:max-w-md"
              />

              {selectedDate && (
                <div className="mt-8">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-dental-500" /> Horarios disponibles</div>
                  {availabilityLoading ? (
                    <Loading.Spinner size="medium" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {slots.map((slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`cursor-pointer rounded-xl border px-3 py-3 text-sm font-semibold transition ${selectedSlot?.startsAt === slot.startsAt ? 'border-dental-500 bg-dental-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-dental-400 hover:bg-dental-50'}`}
                          aria-label={`Elegir la hora ${slot.label}`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {!availabilityLoading && slots.length === 0 && (
                    <p className="mt-3 text-sm text-rose-600">No hay horarios para esa fecha. Probá otro día (este especialista atiende días específicos).</p>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-end sm:justify-between">
                <button type="button" onClick={() => setStep(2)} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-dental-600"><ChevronLeft className="h-4 w-4" /> Cambiar especialista</button>
                <Button className="w-full sm:w-auto" disabled={!selectedSlot} onClick={() => setStep(4)}>Siguiente</Button>
              </div>
            </div>
          )}

          {/* Paso 4: confirmación */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900">Confirma tu cita</h2>

              <div className="mt-6 grid gap-3 rounded-2xl bg-dental-50 p-5 text-sm text-slate-700">
                <p><strong>Tratamiento:</strong> {treatmentOptions.find((option) => option.value === treatment)?.label}</p>
                <p><strong>Especialista:</strong> {selectedSpecialist?.name}</p>
                <p><strong>Fecha:</strong> {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p><strong>Hora:</strong> {selectedSlot?.label}</p>
              </div>

              {/* Datos del paciente que exige el backend */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input id="booking-name" type="text" label="Tu nombre completo" value={patientName} onChange={(event) => setPatientName(event.target.value)} autoComplete="name" />
                <Input id="booking-phone" type="tel" label="Teléfono de contacto" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} placeholder="+54 9 11 ..." autoComplete="tel" />
              </div>

              {success ? (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
                  ✅ ¡Cita registrada con éxito! Te llevamos al inicio...
                </p>
              ) : message ? (
                <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                  {message}
                </p>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
                <button type="button" onClick={() => setStep(3)} disabled={success} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-dental-600"><ChevronLeft className="h-4 w-4" /> Editar horario</button>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <Button className="w-full sm:w-auto" disabled={isCreating || success} onClick={() => void submitAppointment()}>
                    {isCreating ? 'Reservando...' : success ? 'Registrada' : 'Confirmar'} <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

Booking.displayName = 'Booking';