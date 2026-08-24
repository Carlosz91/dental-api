import { PrismaClient, AppointmentStatus, Prisma } from '@prisma/client'
import { FastifyInstance } from 'fastify'

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
  }) {
    // Verificar especialista activo
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: data.specialistId, isActive: true },
    })
    if (!specialist) throw new Error('SPECIALIST_NOT_FOUND')

    // Buscar o crear paciente por teléfono
    let patient = await this.prisma.user.findFirst({
      where: { phone: data.patientPhone, role: 'PATIENT' },
    })

    if (!patient) {
      patient = await this.prisma.user.create({
        data: {
          email: data.patientEmail || `patient-${data.patientPhone}@dental.local`,
          passwordHash: '',
          fullName: data.patientName,
          phone: data.patientPhone,
          role: 'PATIENT',
          isActive: true,
        },
      })
    } else if (data.patientEmail && patient.email !== data.patientEmail) {
      await this.prisma.user.update({ where: { id: patient.id }, data: { email: data.patientEmail } })
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
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new Error('SLOT_CONFLICT')
      }
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

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
      include: {
        specialist: { include: { user: { select: { fullName: true } } } },
        patient: { select: { fullName: true, phone: true, email: true } },
      },
    })

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
    page: number
    limit: number
  }) {
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
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.appointment.count({ where }),
    ])

    return { appointments, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) }
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