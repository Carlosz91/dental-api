import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, SearchX, Stethoscope } from 'lucide-react';
import { useSpecialists } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState, ErrorState } from '../components/common/StateMessage';
import { PageHeader } from '../components/common/PageHeader';
import type { Specialist } from '../hooks/useSpecialists';

type SpecialtyFilter = '' | 'ortodoncia' | 'cirugia' | 'estetica';

export const Specialists = () => {
  const navigate = useNavigate();
  const { data: specialists = [], isLoading, isError, refetch } = useSpecialists();
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyFilter>('');

  const term = search.trim().toLowerCase();
  const filteredSpecialists = specialists.filter((spec: Specialist) => {
    const matchesSearch = !term || spec.name.toLowerCase().includes(term) || spec.description.toLowerCase().includes(term);
    const matchesSpecialty = !selectedSpecialty || spec.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <section className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Nuestro equipo"
          title="Especialistas"
          description="Conoce a los profesionales y elige a quien mejor se adapte a tu tratamiento."
        />

        <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label="Buscar especialista"
            type="search"
            placeholder="Nombre o descripción"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />
          <div>
            <label htmlFor="specialty-filter" className="mb-1.5 block text-sm font-semibold text-slate-700">Especialidad</label>
            <select
              id="specialty-filter"
              value={selectedSpecialty}
              onChange={(event) => setSelectedSpecialty(event.target.value as SpecialtyFilter)}
              className="min-h-[44px] w-full rounded-xl border border-slate-500 bg-white px-4 py-2.5 text-base text-slate-900 hover:border-dental-900 focus:border-dental-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-dental-800/30 sm:w-auto"
            >
              <option value="">Todas las especialidades</option>
              <option value="ortodoncia">Ortodoncia</option>
              <option value="cirugia">Cirugía</option>
              <option value="estetica">Estética</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <Loading.CardList count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
        ) : isError ? (
          <ErrorState title="No pudimos cargar los especialistas" onRetry={() => void refetch()} />
        ) : filteredSpecialists.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No encontramos especialistas"
            description="Prueba con otro nombre o cambia la especialidad seleccionada."
            action={<Button variant="outline" onClick={() => { setSearch(''); setSelectedSpecialty(''); }}>Limpiar filtros</Button>}
          />
        ) : (
          <>
            <p className="sr-only" role="status">{filteredSpecialists.length} especialistas encontrados</p>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSpecialists.map((specialist: Specialist) => (
                <li key={specialist.id}>
                  <Card className="h-full">
                    <div className="flex h-full flex-col p-6">
                      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-dental-50 text-dental-900">
                        <Stethoscope className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <h2 className="mb-2 text-xl font-semibold text-slate-900">{specialist.name}</h2>
                      <p className="mb-4 text-sm text-slate-600">{specialist.description}</p>
                      <div className="mb-5 flex flex-wrap gap-2">
                        {specialist.specialty && <Badge specialty={specialist.specialty} />}
                      </div>
                      <div className="mt-auto grid gap-2 sm:grid-cols-2">
                        <Button variant="secondary" onClick={() => navigate(`/specialist/${specialist.id}`)}>Ver perfil</Button>
                        <Button onClick={() => navigate(`/booking?specialist=${specialist.id}`)}>Agendar <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-10 text-center text-sm text-slate-600">
          ¿Prefieres que te guiemos? <Link to="/booking" className="font-semibold text-dental-900 underline underline-offset-2">Agenda paso a paso</Link>
        </p>
      </div>
    </section>
  );
};

Specialists.displayName = 'Specialists';
