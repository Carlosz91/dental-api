export const CornerLogo = ({ className = '' }: { className?: string }) => {
  return (
    <div
      aria-hidden="true"
      className={`
        flex h-8 w-8 items-center justify-center
        bg-gradient-to-br from-dental-500 to-dental-600
        rounded-xl shadow-sm
        text-white
        ${className}
      `}
    >
      <span className="text-lg">🦷</span>
    </div>
  );
};

CornerLogo.displayName = 'CornerLogo';