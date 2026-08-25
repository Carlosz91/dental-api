import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-dental-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-in-right">
        <h2 className="text-4xl font-bold text-dental-900 mb-4">404 - Página no encontrada</h2>
        <p className="text-dental-500 mb-6">
          La página que estás buscando no existe o ha sido movida.
        </p>
        <div className="flex gap-3">
          <Link to="/" className="btn-dental-primary flex-1">
            Ir a Inicio
          </Link>
          <Link to="/specialists" className="btn-dental-secondary flex-1">
            Ver Especialistas
          </Link>
        </div>
      </div>
    </section>
  );
};

NotFound.displayName = 'NotFound';