/**
 * Fixed corner logo with "DentalCare" text and tooth icon
 * Fixed in the top-left corner on all screens
 * Animates with subtle pulse
 */
export const CornerLogo = () => {
  return (
    <div
      className="
        fixed top-6 left-6 z-50 w-10 h-10 sm:w-12 sm:h-12
        bg-gradient-to-br from-dental-500 to-dental-600
        rounded-2xl shadow-sm flex items-center justify-center
        text-white animate-pulse-subtle
      "
    >
      🦷
    </div>
  );
};

CornerLogo.displayName = 'CornerLogo';