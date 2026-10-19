import type { ReactNode, Ref } from 'react';

/** Consistent page heading: eyebrow, h1 and lead text */
export const PageHeader = ({
  eyebrow,
  title,
  description,
  eyebrowClassName = 'text-rose-700',
  headingRef,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  eyebrowClassName?: string;
  /** When given, the heading is programmatically focusable (used on step changes) */
  headingRef?: Ref<HTMLHeadingElement>;
}) => (
  <div className="mb-8">
    <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${eyebrowClassName}`}>{eyebrow}</p>
    <h1
      ref={headingRef}
      tabIndex={headingRef ? -1 : undefined}
      className="mt-2 text-3xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-4xl"
    >
      {title}
    </h1>
    {description && <p className="mt-3 max-w-2xl text-base text-slate-600">{description}</p>}
  </div>
);
