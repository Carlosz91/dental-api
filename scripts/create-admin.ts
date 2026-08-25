/**
 * Creates (or upgrades) an ADMIN/STAFF user from the terminal.
 *
 * Usage:
 *   npm run create-admin
 *
 * Interactive prompts ask for email, name and password.
 * If the email exists as PATIENT, pass --upgrade to promote it
 * (keeps its appointments history linked).
 */
import { PrismaClient, UserRole } from '@prisma/client'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { hashPassword } from '../src/utils/password.js'

const prisma = new PrismaClient()
const rl = createInterface({ input: stdin, output: stdout })

async function ask(label: string, secret = false): Promise<string> {
  const answer = await rl.question(secret ? `${label} (se escribe oculto mejor fuera de pantalla): ` : label)
  return answer.trim()
}

async function main() {
  console.log('== Crear usuario administrativo ==\n')

  const roleInput = (await ask('Rol [admin/staff] (enter = admin): ')).toLowerCase()
  const role: UserRole = roleInput === 'staff' ? 'STAFF' : 'ADMIN'

  const email = (await ask('Email: ')).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email inválido')
  }

  const fullName = await ask('Nombre completo: ')
  if (fullName.length < 2) throw new Error('Nombre muy corto')

  const password = await ask('Contraseña (mínimo 8): ')
  if (password.length < 8) throw new Error('La contraseña necesita al menos 8 caracteres')

  const upgradeFlag = process.argv.includes('--upgrade')
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    if (!upgradeFlag) {
      throw new Error(`El email ${email} ya existe. Usá --upgrade para promoverlo a ${role}.`)
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role,
        isActive: true,
        ...(existing.passwordHash === '' || !existing.passwordHash
          ? { passwordHash: await hashPassword(password) }
          : {}),
      },
      select: { id: true, email: true, role: true },
    })
    console.log('\n✅ Usuario promovido:', updated)
  } else {
    const passwordHash = await hashPassword(password)
    const created = await prisma.user.create({
      data: { email, fullName, passwordHash, role, isActive: true },
      select: { id: true, email: true, role: true },
    })
    console.log('\n✅ Admin creado:', created)
  }
}

main()
  .catch((err) => {
    console.error('\n❌', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    rl.close()
    await prisma.$disconnect()
  })