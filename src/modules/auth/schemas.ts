import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
    fullName: z.string().min(2).max(120),
    phone: z.string().max(30).optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
})

export const refreshSchema = z.object({
  // Body optional: browsers rely on the httpOnly cookie alone
  body: z.object({
    refreshToken: z.string().optional(),
  }).optional(),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    password: z.string().min(8).max(128),
  }),
})