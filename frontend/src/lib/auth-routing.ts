import type { UserRole } from '../hooks/useAuth';

/** Roles that use the professional panel (/dashboard) */
export const STAFF_ROLES: ReadonlyArray<Exclude<UserRole, null>> = ['especialista', 'staff', 'admin'];

export function isStaffRole(role: UserRole | undefined): boolean {
  return !!role && (STAFF_ROLES as ReadonlyArray<string>).includes(role);
}

/** Default landing page after authenticating, by role */
export function homePathFor(role: UserRole | undefined): string {
  return isStaffRole(role) ? '/dashboard' : '/myappointments';
}

/** Login page that matches the audience of a protected route */
export function loginPathFor(roles?: ReadonlyArray<string>): string {
  if (roles && roles.length > 0 && roles.every((role) => (STAFF_ROLES as ReadonlyArray<string>).includes(role))) {
    return '/staff/login';
  }
  return '/login';
}

/** Path the user was trying to reach before being sent to a login page */
export function getRedirectFrom(state: unknown): string | null {
  const from = (state as { from?: { pathname?: string; search?: string } } | null)?.from;
  if (!from?.pathname || !from.pathname.startsWith('/') || from.pathname.startsWith('//')) return null;
  return `${from.pathname}${from.search ?? ''}`;
}
