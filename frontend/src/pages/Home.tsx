import { useSpecialists } from '../hooks/useSpecialists';
import type { Specialist } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';

export const Home = () => {
  const { data: specialists = [], isLoading, isError } = useSpecialists();

  const handleBookAppointment = async (specialistId: string) => {
    window.location.href = `/booking?specialist=${specialistId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 py-28 text-dental-500">
          <Loading.Spinner size="large" />
          <span>Preparando tu experiencia...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Hero Section - Limpio y enfocado */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-dental-900 px-5 py-12 text-white shadow-2xl shadow-dental-900/20 sm:px-12 lg:px-16 lg:py-20">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border-[32px] border-cyan-300/15" />
          <div className="absolute bottom-[-7rem] right-40 h-56 w-56 rounded-full border-[24px] border-rose-300/10" />
          <div className="relative max-w-2xl animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-cyan-300/15 px-3 py-1.5 text-sm font-medium text-cyan-200">
              <Sparkles className="h-4 w-4" /> Cuidado dental pensado para ti
            </div>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Sonrisas sanas, <span className="text-cyan-300">vidas completas</span>.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Encuentra especialistas de confianza y reserva tu próxima cita en pocos minutos.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => { window.location.href = '/booking'; }} className="w-auto bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                <CalendarDays className="h-4 w-4" /> Agendar una cita
              </Button>
              <Button variant="ghost" onClick={() => { window.location.href = '/booking'; }} className="w-auto text-white hover:bg-white/10 hover:text-white">
                Elegir tratamiento <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="grid gap-6 py-10 sm:grid-cols-3">
          {[
            ['Atención cercana', 'Profesionales que escuchan tus necesidades', ShieldCheck],
            ['Citas sencillas', 'Elige el momento que mejor te funciona', CalendarDays],
            ['Tu salud primero', 'Seguimiento para cuidar tu sonrisa', Sparkles],
          ].map(([title, description, Icon]) => (
            <div key={title as string} className="group flex gap-4 rounded-2xl bg-white p-5 border border-dental-100 shadow-sm hover:shadow-lg hover:border-dental-200 transition-all duration-300">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100 transition-colors">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{title as string}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{description as string}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Especialistas Section */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Nuestro equipo</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Especialistas para cada sonrisa</h2>
          </div>
          <a href="/specialists" className="hidden items-center gap-2 text-sm font-semibold text-dental-600 hover:text-dental-800 sm:flex">
            Ver todos <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {isError && specialists.length === 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
            <h3 className="font-semibold text-rose-900">No pudimos cargar los especialistas</h3>
            <p className="mt-2 text-sm text-rose-700">Comprueba que el servicio esté activo e inténtalo de nuevo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialists.map((specialist: Specialist) => (
              <Card key={specialist.id} variant="outlined" className="group h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex h-full flex-col p-6">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-dental-50 text-lg font-bold text-cyan-700 group-hover:from-cyan-100 group-hover:to-dental-100 transition-all duration-300">
                      <Stethoscope className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {specialist.name}
                  </h3>
                  <p className="text-dental-500 text-sm mb-4 line-clamp-2">
                    {specialist.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {specialist.specialty &&
                      specialist.specialty !== 'none' && (
                        <Badge specialty={specialist.specialty as 'ortodoncia' | 'cirugia' | 'estetica'} />
                      )}
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => handleBookAppointment(specialist.id)}
                    className="mt-auto w-auto self-start group-hover:bg-dental-200"
                  >
                    Agendar Cita <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CTA Final */}
        <div className="mt-14 relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-50 via-rose-100 to-cyan-50 p-8 ring-1 ring-rose-100 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-from)_0%,transparent_70%)] from-rose-200/50 to-cyan-200/50" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center sm:p-4">
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                ¿Tu primera visita?
              </h3>
              <p className="text-slate-600 max-w-md">
                Reserva tu cita inicial y recibe un <span className="font-semibold text-rose-600">15% de descuento</span> en tu primera limpieza.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => window.location.href = '/booking'} className="gap-2">
                Agendar primera cita <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.location.href = '/specialists'} className="gap-2">
                Ver especialistas <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

Home.displayName = 'Home';