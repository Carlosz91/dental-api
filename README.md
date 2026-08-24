# Dental API

Backend para sistema de agendamiento de turnos odontológicos con 3 especialidades: **Ortodoncia**, **Cirugía** y **Estética**.

## Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Fastify (alto performance, validation built-in)
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: JWT (access 15min + refresh 7d rotativo) + bcrypt (12 rounds)
- **Security**: Helmet, CORS, Rate Limiting (@fastify/rate-limit)
- **Validation**: Zod (schemas en todos los endpoints)
- **Docs**: Swagger/OpenAPI (@fastify/swagger)
- **Tests**: Vitest + Supertest
- **Container**: Docker + Docker Compose

## Arquitectura

```
┌─────────────┐     HTTPS/TLS      ┌─────────────┐
│   Cliente   │ ◄────────────────► │   API GW    │  (nginx/Cloudflare)
│  (PWA/React)│                    │  (Rate LMT) │
└─────────────┘                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
             │  Auth Svc   │         │  Booking    │         │ Specialist  │
             │  (JWT+bcrypt)│        │  Svc (Core) │         │  Svc (CRUD) │
             └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
                    │                       │                       │
                    ▼                       ▼                       ▼
             ┌─────────────────────────────────────────────────────────────┐
             │              PostgreSQL (schemas: auth, booking,            │
             │              specialist, audit)                             │
             └─────────────────────────────────────────────────────────────┘
```

### Esquema de datos clave

- **User**: Pacientes, Staff, Admin, Especialistas
- **Specialist**: Perfil profesional + matrícula + especialidad
- **AvailabilityRule**: Reglas semanales de horarios por especialista
- **BlockedSlot**: Bloqueos puntuales (vacaciones, mantenimiento)
- **Appointment**: Turnos con constraint `EXCLUDE` anti-double-booking a nivel DB
- **AuditEvent**: Trazabilidad inmutable de cambios de estado
- **RefreshToken**: Hash SHA-256 en DB, rotación automática

## Seguridad implementada

| Capa | Medida |
|------|--------|
| **Red** | TLS 1.3, HSTS, CSP via Helmet |
| **Edge** | Rate limit global 100/min/IP, Auth 10/min/IP, Booking 20/min |
| **Auth** | Access token 15m (HS256), Refresh 7d rotativo + hash en DB |
| **Cookies** | `HttpOnly; Secure; SameSite=Lax` para refresh token |
| **Passwords** | bcrypt 12 rounds (configurable) |
| **Validación** | Zod en body/query/params de todos los endpoints |
| **DB** | Constraint `EXCLUDE` evita doble booking sin locks aplicativos |
| **Concurrencia** | Optimistic locking (`version` en appointment) |
| **Auditoría** | Trigger-level en service, append-only |
| **RBAC** | `PATIENT`/`STAFF`/`ADMIN`/`SPECIALIST` + ownership checks |

## Endpoints principales

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Registro paciente |
| POST | `/api/v1/auth/login` | — | Login → cookie + accessToken |
| POST | `/api/v1/auth/refresh` | — | Renovar access token |
| POST | `/api/v1/auth/logout` | ✓ | Cerrar sesión |
| GET | `/api/v1/auth/me` | ✓ | Perfil actual |
| GET | `/api/v1/specialists` | — | Lista pública de especialistas |
| GET | `/api/v1/specialists/:id` | — | Detalle especialista |
| POST | `/api/v1/specialists` | ADMIN | Crear especialista |
| GET | `/api/v1/availability/:specialistId/slots?date=...` | — | Slots disponibles |
| POST | `/api/v1/availability/:specialistId/rules` | ADMIN/STAFF | Crear regla disponibilidad |
| POST | `/api/v1/availability/:specialistId/blocks` | ADMIN/STAFF/SPECIALIST | Bloquear horario |
| POST | `/api/v1/appointments` | — | Crear cita |
| GET | `/api/v1/appointments` | ✓ | Listar con filtros |
| GET | `/api/v1/appointments/:id` | ✓ | Detalle |
| PATCH | `/api/v1/appointments/:id` | ✓ | Cambiar estado/reagendar |
| GET | `/api/v1/appointments/:id/audit` | ADMIN/STAFF | Historial de auditoría |

## Flujo de estados de cita

```
PENDIENTE → CONFIRMADO → EN_CURSO → FINALIZADO
    │           │           │
    └───────────┴───────────┴──→ CANCELADO
    │
    └─────────────────────────→ NO_ASISTIO
```

## Inicio rápido

### 1. Clonar y configurar
```bash
git clone https://github.com/Carlosz91/dental-api.git
cd dental-api
cp .env.example .env
# Editar .env con tus secrets reales (JWT secrets, etc.)
```

### 2. Levantar base de datos
```bash
docker compose up -d postgres
```

### 3. Instalar dependencias y migrar
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 4. (Opcional) Seed de datos de prueba
```bash
npm run db:seed
```
Crea: 1 admin, 1 staff, 3 especialistas (uno por especialidad), reglas de disponibilidad, 1 paciente de prueba.

### 5. Desarrollo
```bash
npm run dev
```
- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Health: http://localhost:3000/health

## Testing

```bash
# Levantar Postgres de test (puerto 5433)
docker run -d --name postgres-test \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dental_test \
  -p 5433:5432 postgres:16-alpine

# Correr tests
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/dental_test?schema=public" npm test

# Con cobertura
npm run test:coverage

# Watch mode
npm run test:watch
```

### Cobertura de tests

| Módulo | Tests | Qué cubre |
|--------|-------|-----------|
| **Auth** | 8 | Register, login, refresh rotation, reuse detection, me, validation |
| **Specialists** | 6 | List, create (admin), update (own/admin), forbid, inactive filter |
| **Availability** | 7 | Slots generation, appointments block, blockedSlots, CRUD rules/blocks, authz |
| **Appointments** | 10 | Book, race condition, list (own/all), status transitions, reschedule, audit |
| **Rate Limit** | 2 | Login limit, headers |
| **Concurrency** | 1 | 20 concurrent requests → solo 1 éxito (DB EXCLUDE constraint) |
| **Integration** | 2 | Flujo completo book→confirm→start→finish + cancel→audit→slot libre |

**Total: ~36 tests** que validan seguridad, reglas de negocio, concurrencia y flujos reales.

## Docker Production

```bash
# Build multi-stage
docker build -t dental-api .

# Run con docker-compose (incluye postgres)
docker compose up -d
```

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | Conexión PostgreSQL |
| `JWT_ACCESS_SECRET` | ✅ | — | Secreto access token (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | Secreto refresh token (distinto al anterior) |
| `JWT_ACCESS_TTL` | ❌ | `15m` | Expiración access token |
| `JWT_REFRESH_TTL` | ❌ | `7d` | Expiración refresh token |
| `BCRYPT_ROUNDS` | ❌ | `12` | Rounds de bcrypt |
| `PORT` | ❌ | `3000` | Puerto del servidor |
| `NODE_ENV` | ❌ | `development` | Entorno |
| `FRONTEND_URL` | ❌ | `http://localhost:5173` | Origen CORS |
| `RATE_LIMIT_MAX` | ❌ | `100` | Requests por ventana global |
| `RATE_LIMIT_WINDOW_MS` | ❌ | `60000` | Ventana en ms |

## Próximos pasos sugeridos

- [ ] Notificaciones: Email (Resend) + WhatsApp (Twilio) para recordatorios
- [ ] PWA Frontend: React + Vite + TanStack Query + shadcn/ui
- [ ] Sync CalDAV con Google/Outlook/Apple Calendar
- [ ] Lista de espera automática
- [ ] Pagos online (MercadoPago/Stripe)
- [ ] Multi-clínica (RLS en PostgreSQL)
- [ ] Métricas: Prometheus + Grafana + OpenTelemetry

## Licencia

MIT