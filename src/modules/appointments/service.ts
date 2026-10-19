import { PrismaClient, AppointmentStatus, Prisma } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { assertBookableWindow } from '../../utils/slots.js'

const TERMINAL_STATUSES: AppointmentStatus[] = ['CANCELADO', 'FINALIZADO', 'NO_ASISTIO']

/** True when the error is the DB exclusion-constraint (double booking) violation */
function isSlotConflictError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2003/P2000 kept from the original create() mapping; 23P01 = exclusion violation
    return err.code === 'P2003' || err.code === 'P2000' || err.code === '23P01' || (err.message ?? '').includes('23P01')
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const m = err.message || ''
    return m.includes('23P01') || m.includes('exclusion constraint')
  }
  return false
}

export class AppointmentService {
  constructor(private prisma: PrismaClient, private fastify: FastifyInstance) {}

  async create(data: {
    specialistId: string
    patientName: string
    patientPhone: string
    patientEmail?: string
    startsAt: Date
    endsAt: Date
    specialty: string
    notes?: string
    source: string
    createdById?: string
    /** When a PATIENT is logged in, the appointment belongs to THIS account */
    authUserId?: string
  }) {
    // Verificar especialista activo
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: data.specialistId, isActive: true },
    })
    if (!specialist) throw new Error('SPECIALIST_NOT_FOUND')

    // Validar que la especialidad coincida con la del especialista
    if (specialist.specialty !== data.specialty) {
      throw new Error('SPECIALTY_MISMATCH')
    }

    // Server-side validation: future, ordered, inside availability, not blocked
    await assertBookableWindow(this.prisma, data.specialistId, data.startsAt, data.endsAt)

    // Resolver paciente:
    // - Autenticado -> SIEMPRE su propia cuenta (el teléfono es solo contacto)
    // - Anónimo (web pública) -> buscar/crear por teléfono
    let patient
    if (data.authUserId) {
      patient = await this.prisma.user.findUnique({ where: { id: data.authUserId } })
      if (!patient || patient.role !== 'PATIENT' || !patient.isActive) {
        throw new Error('PATIENT_NOT_FOUND')
      }
    } else {
      // SECURITY: anonymous input never modifies an existing user (no email overwrite)
      patient = await this.prisma.user.findFirst({
        where: { phone: data.patientPhone, role: 'PATIENT' },
      })

      if (!patient) {
        const placeholder = `patient-${data.patientPhone}@dental.local`
        const emailTaken = data.patientEmail
          ? await this.prisma.user.findUnique({ where: { email: data.patientEmail }, select: { id: true } })
          : null
        patient = await this.prisma.user.create({
          data: {
            email: data.patientEmail && !emailTaken ? data.patientEmail : placeholder,
            passwordHash: '',
            fullName: data.patientName,
            phone: data.patientPhone,
            role: 'PATIENT',
            isActive: true,
          },
        })
      }
    }

    // Crear cita (la constraint EXCLUDE en DB evita doble booking)
    try {
      const appointment = await this.prisma.appointment.create({
        data: {
          specialistId: data.specialistId,
          patientId: patient.id,
          createdById: data.createdById,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          specialty: data.specialty as any,
          notes: data.notes,
          source: data.source as any,
          status: 'PENDIENTE',
        },
        include: {
          specialist: { include: { user: { select: { fullName: true } } } },
          patient: { select: { fullName: true, phone: true, email: true } },
        },
      })

      await this.logAudit(appointment.id, 'CREATED', null, 'PENDIENTE', data.createdById, { source: data.source })
      return appointment
    } catch (err) {
      if (isSlotConflictError(err)) throw new Error('SLOT_CONFLICT')
      throw err
    }
  }

  async update(id: string, data: {
    status?: AppointmentStatus
    startsAt?: Date
    endsAt?: Date
    notes?: string
    cancellationReason?: string
  }, changedById: string) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } })
    if (!existing) throw new Error('NOT_FOUND')

    // Validar transición de estado
    if (data.status && !this.validTransition(existing.status, data.status)) {
      throw new Error('INVALID_STATUS_TRANSITION')
    }

    // Si se mueve la cita, verificar disponibilidad (excluyendo la propia cita)
    if (data.startsAt || data.endsAt) {
      if (TERMINAL_STATUSES.includes(existing.status)) throw new Error('APPOINTMENT_NOT_RESCHEDULABLE')
      await assertBookableWindow(
        this.prisma,
        existing.specialistId,
        data.startsAt ?? existing.startsAt,
        data.endsAt ?? existing.endsAt
      )
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          specialistId: existing.specialistId,
          id: { not: id },
          status: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
          AND: [
            { startsAt: { lt: data.endsAt || existing.endsAt } },
            { endsAt: { gt: data.startsAt || existing.startsAt } },
          ],
        },
      })
      if (conflict) throw new Error('SLOT_CONFLICT')
    }

    let updated
    try {
      updated = await this.prisma.appointment.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
        include: {
          specialist: { include: { user: { select: { fullName: true } } } },
          patient: { select: { fullName: true, phone: true, email: true } },
        },
      })
    } catch (err) {
      if (isSlotConflictError(err)) throw new Error('SLOT_CONFLICT')
      throw err
    }

    if (data.status && data.status !== existing.status) {
      await this.logAudit(id, 'STATUS_CHANGED', existing.status, data.status, changedById, {
        reason: data.cancellationReason,
      })
    }

    return updated
  }

  async findById(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        specialist: { include: { user: { select: { fullName: true, email: true } } } },
        patient: { select: { fullName: true, phone: true, email: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
    })
  }

  async list(filters: {
    specialistId?: string
    patientId?: string
    status?: AppointmentStatus
    specialty?: string
    from?: Date
    to?: Date
    page?: number
    limit?: number
  }) {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const where: Prisma.AppointmentWhereInput = {}

    if (filters.specialistId) where.specialistId = filters.specialistId
    if (filters.patientId) where.patientId = filters.patientId
    if (filters.status) where.status = filters.status
    if (filters.specialty) where.specialty = filters.specialty as any
    if (filters.from || filters.to) {
      where.startsAt = {}
      if (filters.from) where.startsAt.gte = filters.from
      if (filters.to) where.startsAt.lte = filters.to
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          specialist: { include: { user: { select: { fullName: true } } } },
          patient: { select: { fullName: true, phone: true } },
        },
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ])

    return { appointments, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getAuditEvents(appointmentId: string) {
    return this.prisma.auditEvent.findMany({
      where: { appointmentId },
      include: { changedBy: { select: { fullName: true, email: true, role: true } } },
      orderBy: { changedAt: 'asc' },
    })
  }

  private validTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
    const valid: Record<AppointmentStatus, AppointmentStatus[]> = {
      PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
      CONFIRMADO: ['EN_CURSO', 'CANCELADO', 'NO_ASISTIO'],
      EN_CURSO: ['FINALIZADO', 'CANCELADO'],
      FINALIZADO: [],
      CANCELADO: [],
      NO_ASISTIO: [],
    }
    return valid[from]?.includes(to) ?? false
  }

  private async logAudit(
    appointmentId: string,
    eventType: string,
    oldStatus: AppointmentStatus | null,
    newStatus: AppointmentStatus | null,
    changedById: string | undefined,
    payload: Record<string, any>
  ) {
    await this.prisma.auditEvent.create({
      data: { appointmentId, eventType, oldStatus, newStatus, changedById, payload },
    })
  }
}