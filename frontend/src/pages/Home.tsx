import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, ShieldCheck, Sparkles, Stethoscope, UserSearch } from 'lucide-react';
import { useSpecialists } from '../hooks/useSpecialists';
import type { Specialist } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState, ErrorState } from '../components/common/StateMessage';

const trustSignals = [
  { title: 'Atención cercana', description: 'Profesionales que escuchan tus necesidades', icon: ShieldCheck },
  { title: 'Citas sencillas', description: 'Elige el momento que mejor te funciona', icon: CalendarDays },
  { title: 'Tu salud primero', description: 'Seguimiento para cuidar tu sonrisa', icon: Sparkles },
];

const heroHighlights = ['Reserva en 4 pasos', 'Horarios en tiempo real', 'Cancela cuando lo necesites'];

export const Home = () => {
  const navigate = useNavigate();
  const { data: specialists = [], isLoading, isError, refetch } = useSpecialists();

  return (
    <section className="px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-dental-900 px-5 py-12 text-white shadow-2xl shadow-dental-900/20 sm:px-12 lg:px-16 lg:py-20">
          <div aria-hidden="true" className="absolute -right-24 -top-28 h-80 w-80 rounded-full border-[32px] border-cyan-300/15" />
          <div aria-hidden="true" className="absolute bottom-[-7rem] right-40 hidden h-56 w-56 rounded-full border-[24px] border-rose-300/10 sm:block" />
          <div className="relative max-w-2xl animate-fade-in-up">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-cyan-300/15 px-3 py-1.5 text-sm font-medium text-cyan-100">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Cuidado dental pensado para ti
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Sonrisas sanas, <span className="text-cyan-300">vidas completas</span>.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">
              Encuentra especialistas de confianza y reserva tu próxima cita en pocos minutos.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button variant="accent" size="lg" onClick={() => navigate('/booking')} className="w-full sm:w-auto">
                <CalendarDays className="h-5 w-5" aria-hidden="true" /> Agendar una cita
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate('/specialists')}
                className="w-full border border-white/40 !text-white hover:!bg-white/10 sm:w-auto"
              >
                Conocer al equipo <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <ul className="mt-8 flex flex-col gap-2 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {heroHighlights.map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-300" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust signals */}
        <ul className="grid gap-4 py-10 sm:grid-cols-3 sm:gap-6">
          {trustSignals.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-dental-100 bg-white p-5 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Specialists */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Nuestro equipo</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Especialistas para cada sonrisa</h2>
          </div>
          <Link to="/specialists" className="hidden min-h-[44px] items-center gap-2 text-sm font-semibold text-dental-900 underline-offset-2 hover:underline sm:inline-flex">
            Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <Loading.CardList count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
        ) : isError ? (
          <ErrorState title="No pudimos cargar los especialistas" description="Revisa tu conexión e inténtalo de nuevo en unos segundos." onRetry={() => void refetch()} />
        ) : specialists.length === 0 ? (
          <EmptyState icon={UserSearch} title="Aún no hay especialistas disponibles" description="Vuelve a intentarlo más tarde o contáctanos." />
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {specialists.map((specialist: Specialist) => (
              <li key={specialist.id}>
                <Card variant="outlined" className="h-full">
                  <div className="flex h-full flex-col p-6">
                    <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-dental-50 text-cyan-700">
                      <Stethoscope className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <h3 className="mb-2 text-xl font-semibold text-slate-900">{specialist.name}</h3>
                    <p className="mb-4 line-clamp-2 text-sm text-slate-600">{specialist.description}</p>
                    <div className="mb-5 flex flex-wrap gap-2">
                      {specialist.specialty && <Badge specialty={specialist.specialty} />}
                    </div>
                    <Button variant="secondary" onClick={() => navigate(`/booking?specialist=${specialist.id}`)} className="mt-auto self-start">
                      Agendar cita <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* Closing CTA */}
        <div className="mt-14 overflow-hidden rounded-3xl bg-gradient-to-r from-rose-50 via-rose-100 to-cyan-50 p-8 ring-1 ring-rose-100 sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="text-center sm:text-left">
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">¿Tu primera visita?</h2>
              <p className="max-w-md text-slate-700">
                Reserva tu cita inicial y recibe un <span className="font-semibold text-rose-700">15% de descuento</span> en tu primera limpieza.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" onClick={() => navigate('/booking')} className="w-full sm:w-auto">
                Agendar primera cita <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/specialists')} className="w-full sm:w-auto">
                Ver especialistas
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

Home.displayName = 'Home';
