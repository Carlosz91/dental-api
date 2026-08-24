import { z } from 'zod'

export const createAppointmentSchema = z.object({
  body: z.object({
    specialistId: z.string().uuid(),
    patientName: z.string().min(2).max(120),
    patientPhone: z.string().min(8).max(30),
    patientEmail: z.string().email().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    specialty: z.enum(['ORTODONCIA', 'CIRUGIA', 'ESTETICA']),
    notes: z.string().max(500).optional(),
    source: z.enum(['WEB', 'PHONE', 'WALKIN', 'ADMIN']).default('WEB'),
  }).refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: 'startsAt debe ser anterior a endsAt',
    path: ['startsAt'],
  }),
})

export const updateAppointmentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['PENDIENTE', 'CONFIRMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO', 'NO_ASISTIO']).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
    cancellationReason: z.string().max(200).optional(),
  }),
})

export const listAppointmentsSchema = z.object({
  query: z.object({
    specialistId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    status: z.enum(['PENDIENTE', 'CONFIRMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO', 'NO_ASISTIO']).optional(),
    specialty: z.enum(['ORTODONCIA', 'CIRUGIA', 'ESTETICA']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
})