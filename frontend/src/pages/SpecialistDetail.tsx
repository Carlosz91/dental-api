import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, Clock3 } from 'lucide-react';
import { useSpecialistDetail, useAvailability } from '../hooks/useSpecialists';
import { clinicToday } from '../hooks/useAppointments';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';

export const SpecialistDetail = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: specialist, isLoading } = useSpecialistDetail(id);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const { data: availability, isLoading: availabilityLoading } = useAvailability(id, selectedDate);
  const slots = availability?.slots ?? [];

  if (isLoading || !specialist) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" role="status">
        <span className="sr-only">Cargando perfil del especialista...</span>
        <Loading.Skeleton className="h-40 w-full" />
        <Loading.Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  // The booking flow re-confirms the exact time; here we only carry specialist and date
  const goToBooking = () => {
    navigate(`/booking?specialist=${id}&date=${selectedDate}`);
  };

  return (
    <section className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <Link to="/specialists" className="mb-6 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-dental-900 underline-offset-2 hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Volver a especialistas
        </Link>

        <Card className="mb-8 p-6">
          <div className="flex items-start gap-4">
            <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-dental-100 text-3xl font-bold text-dental-900 sm:h-20 sm:w-20">
              {specialist.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{specialist.name}</h1>
              {specialist.specialty && <div className="mt-2"><Badge specialty={specialist.specialty} /></div>}
              <p className="mt-3 text-slate-600">{specialist.description || 'Especialista dental certificado'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CalendarDays className="h-5 w-5 text-dental-900" aria-hidden="true" /> Consulta la disponibilidad
          </h2>

          <label htmlFor="detail-date" className="mt-5 block text-sm font-semibold text-slate-700">Fecha</label>
          <input
            id="detail-date"
            type="date"
            min={clinicToday()}
            value={selectedDate}
            onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlot(''); }}
            className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-500 bg-white px-4 text-base text-slate-900 hover:border-dental-900 focus:border-dental-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-dental-800/30 sm:max-w-xs"
          />

          {!selectedDate && <p className="mt-4 text-sm text-slate-600">Elige una fecha para ver los horarios disponibles.</p>}

          {selectedDate && (
            <div className="mt-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-dental-900" aria-hidden="true" /> Horarios disponibles</p>
              {availabilityLoading ? (
                <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <span className="sr-only">Buscando horarios...</span>
                  {Array.from({ length: 4 }, (_, index) => <Loading.Skeleton key={index} className="h-11" />)}
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">No hay horarios para esa fecha. Prueba con otro día.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      aria-pressed={selectedSlot === slot.startsAt}
                      onClick={() => setSelectedSlot(slot.startsAt)}
                      className={`min-h-[44px] cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 focus-visible:ring-offset-2 ${selectedSlot === slot.startsAt ? 'border-dental-800 bg-dental-800 text-white' : 'border-slate-400 bg-white text-slate-800 hover:border-dental-800 hover:bg-dental-50'}`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button className="w-full sm:w-auto" disabled={!selectedSlot} onClick={goToBooking}>Continuar con la reserva</Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

SpecialistDetail.displayName = 'SpecialistDetail';
