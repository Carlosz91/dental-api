import React from 'react';
import { useSpecialists } from '../hooks/useSpecialists';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import type { Specialist } from '../hooks/useSpecialists';

export const Specialists = () => {
  const { data: specialists = [], isLoading } = useSpecialists();
  const [search, setSearch] = React.useState('');
  const [selectedSpecialty, setSelectedSpecialty] = React.useState<'ortodoncia' | 'cirugia' | 'estetica' | ''>( '');

  const filteredSpecialists = specialists.filter((spec: Specialist) => {
    const matchesSearch =
      spec.name.toLowerCase().includes(search.toLowerCase()) ||
      spec.description.toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty =
      !selectedSpecialty || spec.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  const handleBook = (specialistId: string) => {
    window.location.href = `/specialist/${specialistId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dental-500">Cargando especialistas...</div>
      </div>
    );
  }

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Search and Filter Section */}
        <div className="mb-6 animate-fade-in-up">
          <h2 className="text-3xl font-bold text-dental-900 mb-4">
            Nuestros Especialistas
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Buscar especialista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg"
            />
            <div className="relative">
              <select
                onChange={(e) => setSelectedSpecialty(e.target.value as '' | 'ortodoncia' | 'cirugia' | 'estetica')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-dental-500/20 sm:w-auto"
              >
                <option value="">Todas especialidades</option>
                <option value="ortodoncia">Ortodoncia</option>
                <option value="cirugia">Cirugía</option>
                <option value="estetica">Estética</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dental-400"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.247 4.247l-3.5 3.5a.237.237 0 01-0.066.089L2.22 5.75a.145.145 0 01.05-.057h1.853l1.316-1.316a.17.17 0 01.097.167l1.263 1.263a.145.145 0 01-.017.068l-1.263 1.263a.17.17 0 11-.127-.195l3.5-3.5a.237.237 0 01.089-.066l3.466 3.466z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Specialists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpecialists.map((specialist: Specialist) => (
            <Card key={specialist.id} className="h-full">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-dental-700 mb-2">
                  {specialist.name}
                </h3>
                <p className="text-dental-500 text-sm mb-4">
                  {specialist.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {specialist.specialty && (
                      <Badge specialty={specialist.specialty as 'ortodoncia' | 'cirugia' | 'estetica'} />
                    )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => handleBook(specialist.id)}
                  className="mt-auto w-full text-sm"
                >
                  Ver disponibilidad
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* No results message */}
        {filteredSpecialists.length === 0 && (
          <div className="mt-8 text-center text-dental-500">
            <p>No se encontraron especialistas con los criterios de búsqueda.</p>
          </div>
        )}
      </div>
    </section>
  );
};

Specialists.displayName = 'Specialists';