/**
 * Dental specialty badges with distinct colors:
 * - ortodoncia: Purple
 * - cirugia: Red
 * - estetica: Pink
 *
 * Used to tag specialist specialties throughout the UI
 */
export const Badge = ({
  specialty,
  ...props
}: {
  specialty: 'ortodoncia' | 'cirugia' | 'estetica';
  [key: string]: any;
}) => {
  const specialtyClasses: Record<
    'ortodoncia' | 'cirugia' | 'estetica',
    `bg-${string} text-${string} border border-${string}`
  > = {
    ortodoncia: 'bg-purple-100 text-purple-700 border border-purple-200',
    cirugia: 'bg-red-100 text-red-700 border border-red-200',
    estetica: 'bg-pink-100 text-pink-700 border border-pink-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium ${specialtyClasses[specialty]}`} {...props}>
      {specialty}
    </span>
  );
};

Badge.displayName = 'Badge';