
/**
 * Footer with contact information, quick links, and social icons
 * Three-column layout on desktop, single column on mobile
 */
export const Footer = () => {
  return (
    <footer className="border-t border-dental-200 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column - DentalCare */}
        <div>
          <h4 className="font-semibold text-dental-700 mb-4">DentalCare</h4>
          <p className="text-dental-400 text-sm">
            Tu clínica dental de confianza para toda la familia. Agenda tu cita hoy mismo.
          </p>
        </div>

        {/* Center column - Quick links */}
        <div>
          <h5 className="font-medium text-dental-700 mb-4">Enlaces rápidos</h5>
          <ul className="space-y-2 text-dental-400 text-sm">
            <li>
              <a href="/booking" className="hover:text-dental-500 transition-colors">
                Agendar cita
              </a>
            </li>
            <li>
              <a href="/myappointments" className="hover:text-dental-500 transition-colors">
                Mis citas
              </a>
            </li>
          </ul>
        </div>

        {/* Right column - Social links */}
        <div>
          <h5 className="font-medium text-dental-700 mb-4">Síguenos</h5>
          <div className="flex gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-500 transition-colors"
            >
              <span aria-label="Instagram">IG</span>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500 transition-colors"
            >
              <span aria-label="Facebook">FB</span>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              <span aria-label="Twitter">X</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom section - Copyright */}
      <div className="mt-8 pt-8 border-t border-dental-200 flex flex-col md:flex-row justify-between items-center text-dental-400 text-sm">
        <p>2026 DentalCare. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-dental-500 transition-colors"
          >
            Política de privacidad
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-dental-500 transition-colors"
          >
            Términos de servicio
          </a>
        </div>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';