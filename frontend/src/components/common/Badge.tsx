import { Ban, CheckCircle2, Clock3, HeartPulse } from 'lucide-react';

type Specialty = 'ortodoncia' | 'cirugia' | 'estetica';

/**
 * Specialty badge (all pairs meet WCAG AA contrast):
 * - ortodoncia: Purple, cirugia: Red, estetica: Pink
 */
const specialtyClasses: Record<Specialty, string> = {
  ortodoncia: 'bg-purple-100 text-purple-700 border border-purple-200',
  cirugia: 'bg-red-100 text-red-700 border border-red-200',
  estetica: 'bg-pink-100 text-pink-700 border border-pink-200',
};

const specialtyLabels: Record<Specialty, string> = {
  ortodoncia: 'Ortodoncia',
  cirugia: 'Cirugía',
  estetica: 'Estética',
};

export const Badge = ({ specialty }: { specialty: Specialty }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold ${specialtyClasses[specialty]}`}>
    {specialtyLabels[specialty] ?? specialty}
  </span>
);

Badge.displayName = 'Badge';

/** Appointment status badge: color + icon + text, never color alone */
const statusStyles: Record<string, { classes: string; icon: typeof Clock3; label: string }> = {
  PENDIENTE: { classes: 'bg-amber-100 text-amber-900 border-amber-300', icon: Clock3, label: 'Pendiente de confirmación' },
  CONFIRMADO: { classes: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: CheckCircle2, label: 'Confirmada' },
  EN_CURSO: { classes: 'bg-dental-100 text-dental-900 border-dental-300', icon: HeartPulse, label: 'En curso' },
  FINALIZADO: { classes: 'bg-slate-100 text-slate-700 border-slate-300', icon: CheckCircle2, label: 'Finalizada' },
  NO_ASISTIO: { classes: 'bg-slate-100 text-slate-700 border-slate-300', icon: Ban, label: 'No asistió' },
  CANCELADO: { classes: 'bg-red-100 text-red-800 border-red-300', icon: Ban, label: 'Cancelada' },
};

export const StatusBadge = ({ rawStatus, className = '' }: { rawStatus: string; className?: string }) => {
  const style = statusStyles[rawStatus] ?? statusStyles.PENDIENTE;
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style.classes} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {style.label}
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';
