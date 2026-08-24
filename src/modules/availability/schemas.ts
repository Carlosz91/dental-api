import { z } from 'zod'

export const createAvailabilitySchema = z.object({
  params: z.object({ specialistId: z.string().uuid() }),
  body: z.object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    slotMinutes: z.number().int().min(15).max(120).default(30),
    bufferMinutes: z.number().int().min(0).max(30).default(5),
    effectiveFrom: z.string().datetime().optional(),
    effectiveTo: z.string().datetime().optional(),
  }).refine((data) => data.startTime < data.endTime, {
    message: 'startTime debe ser anterior a endTime',
    path: ['startTime'],
  }),
})

export const updateAvailabilitySchema = z.object({
  params: z.object({ specialistId: z.string().uuid(), id: z.string().uuid() }),
  body: z.object({
    weekday: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    slotMinutes: z.number().int().min(15).max(120).optional(),
    bufferMinutes: z.number().int().min(0).max(30).optional(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveTo: z.string().datetime().nullable().optional(),
  }).refine((data) => {
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime
    }
    return true
  }, {
    message: 'startTime debe ser anterior a endTime',
    path: ['startTime'],
  }),
})

export const blockedSlotSchema = z.object({
  params: z.object({ specialistId: z.string().uuid() }),
  body: z.object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    reason: z.string().min(3).max(200),
  }).refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: 'startsAt debe ser anterior a endsAt',
    path: ['startsAt'],
  }),
})