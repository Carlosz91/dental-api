import { z } from 'zod';

/**
 * Login validation schema
 * - Required email field with email format
 * - Required password field with minimum length
 */
export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido').nonempty('El correo es obligatorio'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').nonempty('La contraseña es obligatoria'),
});

/**
 * Register validation schema
 * - Name, email, phone, password fields
 * - Password confirmation
 * - Name minimum length
 */
export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').nonempty('El nombre es obligatorio'),
  email: z.string().email('Correo electrónico inválido').nonempty('El correo es obligatorio'),
  phone: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres').nonempty('El teléfono es obligatorio'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').nonempty('La contraseña es obligatoria'),
  confirmPassword: z.string().min(6, 'La confirmación debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

/**
 * Booking validation schema
 * - Specialist ID, date, and time selection
 */
export const bookingSchema = z.object({
  specialistId: z.string().nonempty('El especialista es obligatorio'),
  date: z.string().nonempty('La fecha es obligatoria'),
  time: z.string().nonempty('La hora es obligatoria'),
});

/**
 * Password strength check helper
 * Returns strength level and feedback
 */
export const checkPasswordStrength = (password: string): { level: 'weak' | 'medium' | 'strong'; message: string } => {
  if (password.length < 6) return { level: 'weak', message: 'Muy corta' };
  if (password.length < 8) return { level: 'medium', message: 'Suficiente' };
  if (!/[A-Z]/.test(password)) return { level: 'medium', message: 'Sin mayúsculas' };
  if (!/[0-9]/.test(password)) return { level: 'medium', message: 'Sin números' };
  return { level: 'strong', message: 'Fuerte' };
};