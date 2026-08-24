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
  // Use dayjs to get the day of week from the date string to avoid timezone issues
  const dateStr = date.toISOString().split('T')[0]
  const dayOfWeek = dayjs(dateStr).day() // 0=Dom

  // Create a Date at start of day UTC for consistent Prisma comparisons
  const queryDate = dayjs(dateStr).startOf('day').toDate()

  // 1. Reglas de disponibilidad vigentes
  const rules = await prisma.availabilityRule.findMany({
    where: {
      specialistId,
      weekday: dayOfWeek,
      effectiveFrom: { lte: queryDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: queryDate } }],
    },
    orderBy: { startTime: 'asc' },
  })

  if (rules.length === 0) return []

  // 2. Citas existentes ese día (no canceladas/no asistió)
  const dayStart = dayjs(dateStr).startOf('day').toDate()
  const dayEnd = dayjs(dateStr).endOf('day').toDate()

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

    let current = dayjs(dateStr).hour(startH).minute(startM)
    const limit = dayjs(dateStr).hour(endH).minute(endM)

    // Check if slot END time is <= limit (original logic was: current.add(slotMinutes).isSameOrBefore(limit))
    while (true) {
      const slotEnd = current.add(rule.slotMinutes, 'minute')
      if (slotEnd.isAfter(limit)) break

      const slotStart = current.toDate()
      const slotEndDate = slotEnd.toDate()

      // ¿Hay cita en este slot?
      const appointment = appointments.find(
        (a) => a.startsAt.getTime() === slotStart.getTime()
      )

      // ¿Hay bloqueo?
      const block = blocked.find(
        (b) => b.startsAt <= slotStart && b.endsAt >= slotEndDate
      )

      slots.push({
        startsAt: slotStart,
        endsAt: slotEndDate,
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