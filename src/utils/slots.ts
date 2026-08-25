import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { PrismaClient, AvailabilityRule, Appointment, BlockedSlot } from '@prisma/client'

dayjs.extend(utc)
dayjs.extend(timezone)

// Business hours are defined in clinic-local time; stored instants are UTC.
export const BUSINESS_TZ = 'America/Argentina/Buenos_Aires'

export interface TimeSlot {
  startsAt: Date
  endsAt: Date
  /** HH:mm label in BUSINESS_TZ, ready for UI display */
  label: string
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
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  const zonedDate = dayjs.tz(dateStr, BUSINESS_TZ)
  const dayOfWeek = zonedDate.day() // 0=Dom

  // 1. Reglas de disponibilidad vigentes
  const rules = await prisma.availabilityRule.findMany({
    where: {
      specialistId,
      weekday: dayOfWeek,
      effectiveFrom: { lte: zonedDate.toDate() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: zonedDate.toDate() } }],
    },
    orderBy: { startTime: 'asc' },
  })

  if (rules.length === 0) return []

  // 2. Citas existentes ese día (no canceladas/no asistió), en instantes absolutos
  const dayStart = zonedDate.startOf('day').toDate()
  const dayEnd = zonedDate.endOf('day').toDate()

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

  // 4. Generar slots en hora de clínica y convertir a instants UTC
  const slots: TimeSlot[] = []

  for (const rule of rules) {
    const [startH, startM] = rule.startTime.split(':').map(Number)
    const [endH, endM] = rule.endTime.split(':').map(Number)

    let current = zonedDate.hour(startH).minute(startM)
    const limit = zonedDate.hour(endH).minute(endM)

    while (true) {
      const slotEnd = current.add(rule.slotMinutes, 'minute')
      if (slotEnd.isAfter(limit)) break

      const slotStart = current.toDate()
      const slotEndDate = slotEnd.toDate()
      const label = current.format('HH:mm')

      // ¿Hay cita que se solape con este slot? (overlap real, no igualdad exacta)
      const appointment = appointments.find(
        (a) => a.startsAt < slotEndDate && a.endsAt > slotStart
      )

      // ¿Hay bloqueo?
      const block = blocked.find(
        (b) => b.startsAt <= slotStart && b.endsAt >= slotEndDate
      )

      slots.push({
        startsAt: slotStart,
        endsAt: slotEndDate,
        label,
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