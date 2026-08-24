import { PrismaClient, Specialty, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up (only in development)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.auditEvent.deleteMany()
    await prisma.appointment.deleteMany()
    await prisma.blockedSlot.deleteMany()
    await prisma.availabilityRule.deleteMany()
    await prisma.specialist.deleteMany()
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()
  }

  const passwordHash = await bcrypt.hash('Test1234!', 12)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dental.com' },
    update: {},
    create: {
      email: 'admin@dental.com',
      passwordHash,
      fullName: 'Administrador',
      role: UserRole.ADMIN,
      isActive: true,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // Create staff user
  const staff = await prisma.user.upsert({
    where: { email: 'staff@dental.com' },
    update: {},
    create: {
      email: 'staff@dental.com',
      passwordHash,
      fullName: 'Recepcionista',
      role: UserRole.STAFF,
      isActive: true,
    },
  })
  console.log('✅ Staff created:', staff.email)

  // Create specialists
  const specialistsData = [
    {
      email: 'ortodoncia@dental.com',
      fullName: 'Dra. María González',
      licenseNumber: 'MN-12345',
      specialty: Specialty.ORTODONCIA,
      bio: 'Especialista en ortodoncia con 15 años de experiencia. Invisalign, brackets autoligables y ortopedia maxilar.',
    },
    {
      email: 'cirugia@dental.com',
      fullName: 'Dr. Carlos Rodríguez',
      licenseNumber: 'MN-67890',
      specialty: Specialty.CIRUGIA,
      bio: 'Cirujano maxilofacial. Extracciones complejas, implantes, cirugía ortognática y patología oral.',
    },
    {
      email: 'estetica@dental.com',
      fullName: 'Dra. Ana Martínez',
      licenseNumber: 'MN-54321',
      specialty: Specialty.ESTETICA,
      bio: 'Odontología estética y cosmética. Carillas, blanqueamiento, diseños de sonrisa y rehabilitación estética.',
    },
  ]

  const specialists = []
  for (const data of specialistsData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: UserRole.SPECIALIST,
        isActive: true,
      },
    })

    const specialist = await prisma.specialist.upsert({
      where: { licenseNumber: data.licenseNumber },
      update: {},
      create: {
        userId: user.id,
        licenseNumber: data.licenseNumber,
        specialty: data.specialty,
        bio: data.bio,
        isActive: true,
      },
      include: { user: true },
    })
    specialists.push(specialist)
    console.log(`✅ Specialist created: ${specialist.user.fullName} (${specialist.specialty})`)
  }

  // Create availability rules for each specialist
  // Lunes a Viernes: Ortodoncia 08-14, Cirugía 09-13, Estética 10-18
  const rules = [
    // Ortodoncia: Lunes, Miércoles, Viernes 08:00-14:00 (slots 40min)
    { specialistId: specialists[0].id, weekday: 1, startTime: '08:00', endTime: '14:00', slotMinutes: 40, bufferMinutes: 5 },
    { specialistId: specialists[0].id, weekday: 3, startTime: '08:00', endTime: '14:00', slotMinutes: 40, bufferMinutes: 5 },
    { specialistId: specialists[0].id, weekday: 5, startTime: '08:00', endTime: '14:00', slotMinutes: 40, bufferMinutes: 5 },
    // Cirugía: Martes, Jueves 09:00-13:00 (slots 60min)
    { specialistId: specialists[1].id, weekday: 2, startTime: '09:00', endTime: '13:00', slotMinutes: 60, bufferMinutes: 10 },
    { specialistId: specialists[1].id, weekday: 4, startTime: '09:00', endTime: '13:00', slotMinutes: 60, bufferMinutes: 10 },
    // Estética: Lunes a Viernes 10:00-18:00 (slots 30min)
    { specialistId: specialists[2].id, weekday: 1, startTime: '10:00', endTime: '18:00', slotMinutes: 30, bufferMinutes: 5 },
    { specialistId: specialists[2].id, weekday: 2, startTime: '10:00', endTime: '18:00', slotMinutes: 30, bufferMinutes: 5 },
    { specialistId: specialists[2].id, weekday: 3, startTime: '10:00', endTime: '18:00', slotMinutes: 30, bufferMinutes: 5 },
    { specialistId: specialists[2].id, weekday: 4, startTime: '10:00', endTime: '18:00', slotMinutes: 30, bufferMinutes: 5 },
    { specialistId: specialists[2].id, weekday: 5, startTime: '10:00', endTime: '18:00', slotMinutes: 30, bufferMinutes: 5 },
  ]

  for (const rule of rules) {
    await prisma.availabilityRule.upsert({
      where: {
        specialistId_weekday_effectiveFrom: {
          specialistId: rule.specialistId,
          weekday: rule.weekday,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: {},
      create: {
        ...rule,
        effectiveFrom: new Date('2026-01-01'),
      },
    })
  }
  console.log('✅ Availability rules created')

  // Create a test patient
  const patient = await prisma.user.upsert({
    where: { email: 'paciente@test.com' },
    update: {},
    create: {
      email: 'paciente@test.com',
      passwordHash,
      fullName: 'Juan Pérez',
      phone: '11-5555-1234',
      role: UserRole.PATIENT,
      isActive: true,
    },
  })
  console.log('✅ Test patient created:', patient.email)

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })