import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, ChevronLeft, Clock3, HeartPulse, Scissors, Sparkles, Stethoscope, CheckCircle2, UserSearch } from 'lucide-react';
import { clinicToday, useAppointments } from '../hooks/useAppointments';
import { useAvailability, useSpecialists } from '../hooks/useSpecialists';
import type { Specialist, AvailabilitySlot } from '../hooks/useSpecialists';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../lib/api';
import { toast } from '../lib/toast';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/StateMessage';
import { PageHeader } from '../components/common/PageHeader';

const treatmentOptions = [
  { value: 'estetica', label: 'Estética dental', description: 'Limpieza, blanqueamiento y diseño de sonrisa', icon: Sparkles },
  { value: 'cirugia', label: 'Cirugía', description: 'Tratamientos quirúrgicos y extracciones', icon: Scissors },
  { value: 'ortodoncia', label: 'Ortodoncia', description: 'Alineación y cuidado de tu mordida', icon: HeartPulse },
] as const;

type Treatment = typeof treatmentOptions[number]['value'];
type Step = 1 | 2 | 3 | 4;

const steps = [
  { label: 'Especialidad', short: 'Tratamiento' },
  { label: 'Especialista', short: 'Especialista' },
  { label: 'Fecha y hora', short: 'Fecha y hora' },
  { label: 'Confirmación', short: 'Confirmar' },
];

const optionClasses = (selected: boolean) =>
  `cursor-pointer rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 focus-visible:ring-offset-2 hover:border-dental-800 hover:bg-dental-50 ${
    selected ? 'border-dental-800 bg-dental-50 ring-2 ring-dental-800/20' : 'border-slate-300 bg-white'
  }`;

const backLinkClasses =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-semibold text-dental-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 disabled:opacity-50';

export const Booking = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(search);

  const [step, setStep] = useState<Step>(1);
  const [treatment, setTreatment] = useState<Treatment | ''>('');
  const [specialistId, setSpecialistId] = useState(params.get('specialist') || '');
  const [selectedDate, setSelectedDate] = useState(params.get('date') || '');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(() => localStorage.getItem('dentalcare-phone') || '');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  const { data: specialists = [], isLoading: specialistsLoading } = useSpecialists();
  const { data: availability, isLoading: availabilityLoading, refetch: refetchAvailability } = useAvailability(specialistId, selectedDate);
  const { createAppointment, isCreating } = useAppointments(user?.id);

  const filteredSpecialists = specialists.filter((specialist: Specialist) => !treatment || specialist.specialty === treatment);
  const selectedSpecialist = specialists.find((specialist: Specialist) => specialist.id === specialistId);
  const slots = availability?.slots ?? [];

  // Coming from a specialist card (?specialist=...): skip straight to date and time.
  // Adjusting state during render (instead of an effect) avoids a cascading re-render.
  if (!prefilled && specialistId && specialists.length > 0) {
    setPrefilled(true);
    const preselected = specialists.find((specialist: Specialist) => specialist.id === specialistId);
    if (preselected) {
      setTreatment(preselected.specialty);
      setStep(3);
    } else {
      setSpecialistId('');
    }
  }

  // Move focus to the new step heading so keyboard and screen reader users follow along
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  const selectTreatment = (value: Treatment) => {
    setTreatment(value);
    setSpecialistId('');
    setSelectedDate('');
    setSelectedSlot(null);
  };

  const submitAppointment = async () => {
    setMessage('');
    if (!specialistId || !selectedDate || !selectedSlot) {
      setMessage('Completa especialista, fecha y hora antes de confirmar.');
      return;
    }
    const errors: { name?: string; phone?: string } = {};
    if (!patientName.trim()) errors.name = 'Ingresa tu nombre completo.';
    if (patientPhone.trim().length < 8) errors.phone = 'Ingresa un teléfono de contacto (mínimo 8 caracteres).';
    setFieldErrors(errors);
    if (errors.name || errors.phone) {
      document.getElementById(errors.name ? 'booking-name' : 'booking-phone')?.focus();
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
        patientEmail: user?.email,
      });
      setSuccess(true);
      toast.success('¡Tu cita quedó registrada!');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'No se pudo reservar la cita. Inténtalo de nuevo.'));
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // El horario se ocupó mientras completabas los datos: refrescar agenda
        setSelectedSlot(null);
        void refetchAvailability();
        setStep(3);
      }
    }
  };

  if (success) {
    return (
      <section className="px-4 py-10 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-xl">
          <Card className="p-6 text-center sm:p-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h1 ref={stepHeadingRef} className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" role="status">
              ¡Cita registrada con éxito!
            </h1>
            <p className="mt-3 text-slate-600">
              {selectedSpecialist?.name ? `${selectedSpecialist.name} te espera` : 'Te esperamos'} el{' '}
              <strong className="text-slate-900">
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </strong>{' '}
              a las <strong className="text-slate-900">{selectedSlot?.label}</strong>.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate('/myappointments')}>Ver mis citas</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Volver al inicio</Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Tu próxima visita"
          title="Agenda tu cita"
          description="Elige el tratamiento, el especialista y el horario que mejor te convenga."
        />

        {/* Step indicator */}
        <nav aria-label="Progreso de la reserva" className="mb-8">
          <p className="mb-3 text-sm font-semibold text-slate-700 sm:hidden">
            Paso {step} de {steps.length}: {steps[step - 1].label}
          </p>
          <ol className="grid grid-cols-4 gap-2 sm:gap-4">
            {steps.map((item, index) => {
              const active = step === index + 1;
              const complete = step > index + 1;
              return (
                <li
                  key={item.label}
                  aria-current={active ? 'step' : undefined}
                  className={`min-w-0 border-t-4 pt-2 text-xs font-semibold leading-4 sm:text-sm ${
                    active ? 'border-dental-800 text-dental-900' : complete ? 'border-emerald-600 text-emerald-800' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        active ? 'bg-dental-800 text-white' : complete ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="hidden truncate sm:inline">{item.label}</span>
                  </span>
                  <span className="sr-only">
                    {complete ? ' (completado)' : active ? ' (paso actual)' : ''}
                    <span className="sm:hidden">{item.short}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="p-5 sm:p-8">
          {/* Paso 1: tratamiento */}
          {step === 1 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Stethoscope className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">¿Qué tratamiento necesitas?</h2>
                  <p className="mt-1 text-sm text-slate-600">Te mostraremos el equipo adecuado.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {treatmentOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button key={option.value} type="button" aria-pressed={treatment === option.value} onClick={() => selectTreatment(option.value)} className={optionClasses(treatment === option.value)}>
                      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="font-semibold text-slate-900">{option.label}</span>
                      <span className="mt-2 block text-sm leading-5 text-slate-600">{option.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <Button className="w-full sm:w-auto" disabled={!treatment} onClick={() => setStep(2)}>Siguiente <CalendarDays className="h-4 w-4" aria-hidden="true" /></Button>
              </div>
              {!treatment && <p className="mt-2 text-right text-sm text-slate-600">Elige un tratamiento para continuar.</p>}
            </div>
          )}

          {/* Paso 2: especialista */}
          {step === 2 && (
            <div>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">Elige tu especialista</h2>
              <p className="mt-2 text-sm text-slate-600">Selecciona el profesional que atenderá tu cita.</p>
              {specialistsLoading ? (
                <Loading.CardList count={2} className="mt-6 sm:grid-cols-2" />
              ) : filteredSpecialists.length === 0 ? (
                <div className="mt-6">
                  <EmptyState icon={UserSearch} title="No hay especialistas para esta especialidad" description="Prueba con otro tratamiento." />
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {filteredSpecialists.map((specialist: Specialist) => (
                    <button
                      key={specialist.id}
                      type="button"
                      onClick={() => { setSpecialistId(specialist.id); setSelectedDate(''); setSelectedSlot(null); setStep(3); }}
                      className={optionClasses(specialistId === specialist.id)}
                    >
                      <span className="font-semibold text-slate-900">{specialist.name}</span>
                      <span className="mt-1 block text-sm text-slate-600">{specialist.description}</span>
                      <span className="mt-4 block text-xs font-bold uppercase tracking-wide text-dental-900">Elegir especialista</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setStep(1)} className={`mt-6 ${backLinkClasses}`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Cambiar especialidad</button>
            </div>
          )}

          {/* Paso 3: fecha y hora */}
          {step === 3 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">Selecciona fecha y hora</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedSpecialist ? `Horarios de ${selectedSpecialist.name}.` : 'Consulta los horarios disponibles.'}
                  </p>
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-700" htmlFor="appointment-date">Fecha de tu cita</label>
              <input
                id="appointment-date"
                type="date"
                min={clinicToday()}
                value={selectedDate}
                onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlot(null); }}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-500 bg-white px-4 text-base font-medium text-slate-900 hover:border-dental-900 focus:border-dental-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-dental-800/30 sm:max-w-md"
              />

              {selectedDate && (
                <div className="mt-8">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-dental-900" aria-hidden="true" /> Horarios disponibles</div>
                  {availabilityLoading ? (
                    <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <span className="sr-only">Buscando horarios...</span>
                      {Array.from({ length: 8 }, (_, index) => <Loading.Skeleton key={index} className="h-11" />)}
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {slots.map((slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                          onClick={() => setSelectedSlot(slot)}
                          className={`min-h-[44px] cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 focus-visible:ring-offset-2 ${selectedSlot?.startsAt === slot.startsAt ? 'border-dental-800 bg-dental-800 text-white shadow-sm' : 'border-slate-400 bg-white text-slate-800 hover:border-dental-800 hover:bg-dental-50'}`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                      No hay horarios para esa fecha. Prueba con otro día: este especialista atiende días específicos.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setStep(2)} className={backLinkClasses}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Cambiar especialista</button>
                <Button className="w-full sm:w-auto" disabled={!selectedSlot} onClick={() => setStep(4)}>Siguiente</Button>
              </div>
            </div>
          )}

          {/* Paso 4: confirmación */}
          {step === 4 && (
            <div>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">Confirma tu cita</h2>

              <dl className="mt-6 grid gap-3 rounded-2xl bg-dental-50 p-5 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-700">Tratamiento</dt><dd className="text-slate-900">{treatmentOptions.find((option) => option.value === treatment)?.label}</dd></div>
                <div><dt className="font-semibold text-slate-700">Especialista</dt><dd className="text-slate-900">{selectedSpecialist?.name}</dd></div>
                <div><dt className="font-semibold text-slate-700">Fecha</dt><dd className="capitalize text-slate-900">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</dd></div>
                <div><dt className="font-semibold text-slate-700">Hora</dt><dd className="text-slate-900">{selectedSlot?.label}</dd></div>
              </dl>

              {/* Datos del paciente que exige el backend */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input
                  id="booking-name"
                  type="text"
                  label="Tu nombre completo"
                  value={patientName}
                  onChange={(event) => { setPatientName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); }}
                  autoComplete="name"
                  required
                  error={fieldErrors.name}
                />
                <Input
                  id="booking-phone"
                  type="tel"
                  inputMode="tel"
                  label="Teléfono de contacto"
                  value={patientPhone}
                  onChange={(event) => { setPatientPhone(event.target.value); setFieldErrors((current) => ({ ...current, phone: undefined })); }}
                  placeholder="+54 9 11 ..."
                  autoComplete="tel"
                  required
                  error={fieldErrors.phone}
                />
              </div>

              {message && (
                <p className="mt-4 rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-medium text-red-800" role="alert">
                  {message}
                </p>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setStep(3)} className={backLinkClasses}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Editar horario</button>
                <Button className="w-full sm:w-auto" disabled={isCreating} onClick={() => void submitAppointment()}>
                  {isCreating ? 'Reservando...' : 'Confirmar cita'} <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

Booking.displayName = 'Booking';
