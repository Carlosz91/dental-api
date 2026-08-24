import dayjs from 'dayjs'
import { PrismaClient, AvailabilityRule, Appointment, BlockedSlot } from '@prisma/client'

export interface TimeSlot {
  startsAt: Date
  endsAt: Date
  available: boolean
  appointmentId?: string
  blocked?: boolean
  blockReason?: string
}

export async function calculateAvailableSlots(
  prisma: PrismaClient,
  specialistId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dayOfWeek = dayjs(date).day() // 0=Dom

  // 1. Reglas de disponibilidad vigentes
  const rules = await prisma.availabilityRule.findMany({
    where: {
      specialistId,
      weekday: dayOfWeek,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    orderBy: { startTime: 'asc' },
  })

  if (rules.length === 0) return []

  // 2. Citas existentes ese día (no canceladas/no asistió)
  const dayStart = dayjs(date).startOf('day').toDate()
  const dayEnd = dayjs(date).endOf('day').toDate()

  const appointments = await prisma.appointment.findMany({
    where: {
      specialistId,
      startsAt: { gte: dayStart, lt: dayEnd },
      status: { notIn: ['CANCELADO', 'NO_ASISTIO'] },
    },
    select: { id: true, startsAt: true, endsAt: true, status: true },
  })

  // 3. Bloqueos manuales
  const blocked = await prisma.blockedSlot.findMany({
    where: {
      specialistId,
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
  })

  // 4. Generar slots
  const slots: TimeSlot[] = []

  for (const rule of rules) {
    const [startH, startM] = rule.startTime.split(':').map(Number)
    const [endH, endM] = rule.endTime.split(':').map(Number)

    let current = dayjs(date).hour(startH).minute(startM)
    const limit = dayjs(date).hour(endH).minute(endM)

    while (current.add(rule.slotMinutes, 'minute').isSameOrBefore(limit)) {
      const slotStart = current.toDate()
      const slotEnd = current.add(rule.slotMinutes, 'minute').toDate()

      // ¿Hay cita en este slot?
      const appointment = appointments.find(
        (a) => a.startsAt.getTime() === slotStart.getTime()
      )

      // ¿Hay bloqueo?
      const block = blocked.find(
        (b) => b.startsAt <= slotStart && b.endsAt >= slotEnd
      )

      slots.push({
        startsAt: slotStart,
        endsAt: slotEnd,
        available: !appointment && !block,
        appointmentId: appointment?.id,
        blocked: !!block,
        blockReason: block?.reason,
      })

      // Avanzar slot + buffer
      current = current.add(rule.slotMinutes + rule.bufferMinutes, 'minute')
    }
  }

  return slots
}