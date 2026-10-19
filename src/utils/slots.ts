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

export type BookingWindowError =
  | 'INVALID_TIME_RANGE'
  | 'SLOT_IN_PAST'
  | 'OUTSIDE_AVAILABILITY'
  | 'SLOT_BLOCKED'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Server-side booking validation shared by create and reschedule.
 * Throws Error(code) where code is a BookingWindowError:
 *  - INVALID_TIME_RANGE: endsAt must be after startsAt
 *  - SLOT_IN_PAST: startsAt must be in the future
 *  - OUTSIDE_AVAILABILITY: the window must fit inside one AvailabilityRule
 *    (clinic-local weekday, effective dates and start/end time of day)
 *  - SLOT_BLOCKED: the window must not overlap any BlockedSlot
 * Overlap with other appointments is NOT checked here (DB exclusion constraint + service check).
 */
export async function assertBookableWindow(
  prisma: PrismaClient,
  specialistId: string,
  startsAt: Date,
  endsAt: Date,
  now: Date = new Date()
): Promise<void> {
  if (!(endsAt.getTime() > startsAt.getTime())) throw new Error('INVALID_TIME_RANGE')
  if (startsAt.getTime() <= now.getTime()) throw new Error('SLOT_IN_PAST')

  const localStart = dayjs(startsAt).tz(BUSINESS_TZ)
  const localEnd = dayjs(endsAt).tz(BUSINESS_TZ)
  if (!localStart.isSame(localEnd, 'day')) throw new Error('OUTSIDE_AVAILABILITY')

  const rules = await prisma.availabilityRule.findMany({
    where: {
      specialistId,
      weekday: localStart.day(),
      effectiveFrom: { lte: startsAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: startsAt } }],
    },
  })

  const startMin = localStart.hour() * 60 + localStart.minute()
  const endMin = localEnd.hour() * 60 + localEnd.minute()
  const inside = rules.some((r) => startMin >= toMinutes(r.startTime) && endMin <= toMinutes(r.endTime))
  if (!inside) throw new Error('OUTSIDE_AVAILABILITY')

  const block = await prisma.blockedSlot.findFirst({
    where: { specialistId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    select: { id: true },
  })
  if (block) throw new Error('SLOT_BLOCKED')
}
