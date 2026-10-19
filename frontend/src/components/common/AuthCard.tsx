import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Shared shell for login / register screens */
export const AuthCard = ({
  icon: Icon,
  iconClassName = 'bg-cyan-50 text-cyan-700',
  title,
  subtitle,
  children,
  footer,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <div className="px-4 py-10 sm:px-6 sm:py-16">
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8 text-center">
        <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${iconClassName}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      </div>
      {children}
      {footer && <div className="mt-6 grid gap-3 text-center text-sm text-slate-600">{footer}</div>}
    </section>
  </div>
);
