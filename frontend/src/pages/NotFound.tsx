import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Página no encontrada</h1>
        <p className="mt-3 text-slate-600">La página que buscas no existe o fue movida.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button className="w-full" onClick={() => navigate('/')}>Ir al inicio</Button>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/specialists')}>Ver especialistas</Button>
        </div>
      </div>
    </section>
  );
};

NotFound.displayName = 'NotFound';
