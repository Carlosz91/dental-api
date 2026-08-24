import { PrismaClient, UserRole, Specialty, AppointmentStatus } from '@prisma/client'
import { hashPassword } from '../../src/utils/password.js'
import dayjs from 'dayjs'

export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{
    email: string
    password: string
    fullName: string
    phone: string
    role: UserRole
    isActive: boolean
  }> = {}
) {
  const password = overrides.password || 'Test1234!'
  const passwordHash = await hashPassword(password)

  return prisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}-${Math.random()}@example.com`,
      passwordHash,
      fullName: overrides.fullName || 'Test User',
      phone: overrides.phone,
      role: overrides.role || UserRole.PATIENT,
      isActive: overrides.isActive ?? true,
    },
  })
}

export async function createTestSpecialist(
  prisma: PrismaClient,
  overrides: Partial<{
    userId: string
    licenseNumber: string
    specialty: Specialty
    isActive: boolean
  }> = {}
) {
  const user = await createTestUser(prisma, {
    email: `doc-${Date.now()}@example.com`,
    role: UserRole.SPECIALIST,
    fullName: 'Dr. Test',
  })

  return prisma.specialist.create({
    data: {
      userId: user.id,
      licenseNumber: overrides.licenseNumber || `LIC-${Date.now()}`,
      specialty: overrides.specialty || Specialty.ORTODONCIA,
      isActive: overrides.isActive ?? true,
    },
    include: { user: true },
  })
}

export async function createAvailabilityRule(
  prisma: PrismaClient,
  specialistId: string,
  overrides: Partial<{
    weekday: number
    startTime: string
    endTime: string
    slotMinutes: number
    bufferMinutes: number
  }> = {}
) {
  return prisma.availabilityRule.create({
    data: {
      specialistId,
      weekday: overrides.weekday ?? 1, // Lunes
      startTime: overrides.startTime || '08:00',
      endTime: overrides.endTime || '14:00',
      slotMinutes: overrides.slotMinutes ?? 30,
      bufferMinutes: overrides.bufferMinutes ?? 5,
      effectiveFrom: dayjs().startOf('day').toDate(),
    },
  })
}

export async function createAppointment(
  prisma: PrismaClient,
  overrides: Partial<{
    specialistId: string
    patientId: string
    startsAt: Date
    endsAt: Date
    status: AppointmentStatus
    specialty: Specialty
  }> = {}
) {
  const specialist = overrides.specialistId
    ? await prisma.specialist.findUnique({ where: { id: overrides.specialistId } })
    : await createTestSpecialist(prisma)

  const patient = overrides.patientId
    ? await prisma.user.findUnique({ where: { id: overrides.patientId } })
    : await createTestUser(prisma)

  return prisma.appointment.create({
    data: {
      specialistId: specialist!.id,
      patientId: patient!.id,
      startsAt: overrides.startsAt || new Date('2026-08-24T08:00:00-03:00'),
      endsAt: overrides.endsAt || new Date('2026-08-24T08:30:00-03:00'),
      status: overrides.status || AppointmentStatus.PENDIENTE,
      specialty: overrides.specialty || specialist!.specialty,
      source: 'WEB',
    },
  })
}