import { Link } from 'react-router-dom';

const linkClass =
  'inline-flex min-h-[44px] items-center rounded-md text-slate-600 transition-colors hover:text-dental-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800';

const socialLinks = [
  { label: 'Instagram', short: 'IG', href: 'https://instagram.com' },
  { label: 'Facebook', short: 'FB', href: 'https://facebook.com' },
  { label: 'X (Twitter)', short: 'X', href: 'https://twitter.com' },
];

/**
 * Footer with contact information, quick links, and social icons
 * Three-column layout on desktop, single column on mobile
 */
export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-dental-200 py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 md:grid-cols-3">
        <div>
          <p className="mb-3 font-semibold text-dental-900">DentalCare</p>
          <p className="max-w-xs text-sm text-slate-600">
            Tu clínica dental de confianza para toda la familia. Agenda tu cita hoy mismo.
          </p>
        </div>

        <nav aria-label="Enlaces rápidos">
          <p className="mb-2 font-semibold text-dental-900">Enlaces rápidos</p>
          <ul className="text-sm">
            <li><Link to="/booking" className={linkClass}>Agendar cita</Link></li>
            <li><Link to="/specialists" className={linkClass}>Especialistas</Link></li>
            <li><Link to="/myappointments" className={linkClass}>Mis citas</Link></li>
          </ul>
        </nav>

        <div>
          <p className="mb-2 font-semibold text-dental-900">Síguenos</p>
          <ul className="flex gap-2">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${social.label} (se abre en una pestaña nueva)`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:border-dental-800 hover:text-dental-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800"
                >
                  {social.short}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-dental-200 px-4 pt-6 text-sm text-slate-600 sm:px-6">
        <p>© 2026 DentalCare. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';
