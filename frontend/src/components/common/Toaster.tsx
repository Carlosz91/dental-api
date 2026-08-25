import { Toaster as SonnerToaster } from 'sonner';

/**
 * Dental-styled sonner Toaster for notifications
 *
 * Uses sonner's Toaster component with custom dental theme
 * All toast containers use the dental color palette
 */
export const Toaster = () => {
  return (
    <SonnerToaster
      className="custom-toaster"
    />
  );
};

Toaster.displayName = 'Toaster';