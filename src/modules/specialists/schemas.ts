import { z } from 'zod'

export const createSpecialistSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    fullName: z.string().min(2).max(120),
    licenseNumber: z.string().min(5).max(40),
    specialty: z.enum(['ORTODONCIA', 'CIRUGIA', 'ESTETICA']),
    phone: z.string().max(30).optional(),
    bio: z.string().max(500).optional(),
  }),
})

export const updateSpecialistSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    licenseNumber: z.string().min(5).max(40).optional(),
    specialty: z.enum(['ORTODONCIA', 'CIRUGIA', 'ESTETICA']).optional(),
    phone: z.string().max(30).optional(),
    bio: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
    avatarUrl: z.string().url().optional(),
  }),
})

export const specialistParamsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
})