import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpecialistDetail, useAvailability } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAppointments } from '../hooks/useAppointments';

export const SpecialistDetail = () => {
  const { id = '' } = useParams();
  const { data: specialist, isLoading } = useSpecialistDetail(id);
  const navigate = useNavigate();
  const specialistId = id;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const { appointments = [] } = useAppointments();
  const { data: availability, isLoading: availabilityLoading } = useAvailability(
    specialistId,
    selectedDate || ''
  );
  const availableSlots = availability?.slots || [];

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  if (isLoading || !specialist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dental-500">Cargando perfil del especialista...</div>
      </div>
    );
  }

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Specialist Profile Card */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Avatar/Initials */}
              <div className="w-20 h-20 rounded-2xl bg-dental-100 flex items-center justify-center flex-shrink-0">
                <span className="text-4xl font-bold text-dental-500">
                  {specialist.name.charAt(0)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-dental-900 mb-1">
                  {specialist.name}
                </h2>
                <p className="text-dental-500">
                  {specialist.specialty && (
                      <Badge
                        specialty={specialist.specialty as 'ortodoncia' | 'cirugia' | 'estetica'}
                      />
                    )}
                </p>
                <p className="text-dental-600 text-sm">
                  {specialist.description || 'Especialista dental certificado'}
                </p>
              </div>
            </div>

            {/* Availability Section */}
            {selectedDate && !availabilityLoading && availableSlots.length > 0 && (
              <div className="mt-4 p-4 bg-dental-50 rounded border border-dental-200">
                <h4 className="font-medium text-dental-700 mb-2">
                  Disponibilidad para {selectedDate}
                </h4>
                <p className="text-dental-500 text-sm">
                  {availableSlots.length} horarios disponibles
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Booking Form */}
        <Card>
          <h3 className="text-xl font-bold text-dental-900 mb-4">
            Agendar Cita con Dr. {specialist.name}
          </h3>

          {selectedDate && !availabilityLoading && availableSlots.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedDate && selectedTime) {
                  navigate(`/booking?date=${selectedDate}&time=${selectedTime}&specialist=${specialistId}`);
                }
              }}
            >
              <Input
                id="date"
                type="date"
                label="Fecha"
                value={selectedDate}
                disabled
                onChange={(event) => handleDateChange(event.target.value)}
              />
              <Input
                id="time"
                type="text"
                label="Hora"
                value={selectedTime}
                disabled
              />
              <select
                name="time"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
                className="w-full rounded-2xl border border-dental-200 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-dental-500/20"
              >
                <option value="">Seleccionar hora</option>
                {availableSlots.map((slot) => (
                  <option key={slot.startsAt} value={slot.startsAt}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <Button variant="primary" type="submit" className="mt-4 w-full">
                Confirmar Cita
              </Button>
            </form>
          )}

          {!selectedDate && (
            <p className="mt-4 text-dental-500 text-sm">
              Seleccione una fecha para ver los horarios disponibles
            </p>
          )}

          {!availabilityLoading && !availableSlots.length && (
            <p className="mt-4 text-dental-500 text-sm">
              No hay disponibilidad para la fecha seleccionada
            </p>
          )}
        </Card>

        {/* Appointments History */}
        {appointments.length > 0 && (
          <div className="mt-8">
            <h4 className="text-dental-700 mb-4">Citas Previas</h4>
            <div className="space-y-3">
              {appointments.slice(0, 3).map((appt: import('../hooks/useAppointments').Appointment) => (
                <div key={appt.id} className="p-3 bg-dental-50 rounded border border-dental-200">
                  <p className="font-medium">
                    {appt.date} a las {appt.time}
                  </p>
                  <p className="text-dental-500 text-sm">
                    {appt.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

SpecialistDetail.displayName = 'SpecialistDetail';