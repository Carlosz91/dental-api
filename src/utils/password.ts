import bcrypt from 'bcrypt'
import { FastifyInstance } from 'fastify'

export async function hashPassword(password: string, fastify: FastifyInstance): Promise<string> {
  const rounds = Number(fastify.config.BCRYPT_ROUNDS) || 12
  return bcrypt.hash(password, rounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}