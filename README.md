# 🦷 DentalCare — Sistema de gestión odontológica

**Monorepo** con la API y la web del sistema de turnos: los pacientes agendan online y cada odontólogo cuenta con su panel profesional de agenda.

- **Ortodoncia · Cirugía · Estética**
- Turnos con control anti-solapamiento a nivel de base de datos
- Sesiones seguras: access token en memoria + refresh rotativo en cookie httpOnly

---

## 📁 Estructura del repo

```
dental-api/
├── src/                  ← Backend (Fastify + TypeScript + Prisma)
│   ├── modules/          ← auth · specialists · availability · appointments
│   ├── plugins/          ← prisma, jwt, rate-limit, swagger
│   ├── middleware/       ← authenticate, requireRole, error-handler
│   └── utils/            ← slots (agenda), parse-request, password
├── prisma/               ← schema + migraciones + seed
├── tests/                ← suite Vitest
├── frontend/             ← Web (React 19 + Vite + Tailwind)
│   └── src/
│       ├── pages/        ← Home, Booking, MyAppointments, Dashboard...
│       ├── components/   ← UI compartida (Button, Card, Header...)
│       └── hooks/        ← useAuth, useAppointments, useSpecialists...
├── scripts/create-admin.ts
└── docker-compose.yml    ← postgres + api
```

## 🧰 Stack

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Node.js 20, Fastify, TypeScript, Prisma ORM |
| **Base de datos** | PostgreSQL 16 (Docker) |
| **Auth** | JWT access 15 min + refresh rotativo 7 días (SHA-256 en DB), bcrypt(12) |
| **Validación** | Zod en todos los endpoints (400 con detalle de campo) |
| **Seguridad** | Helmet, CORS, Rate Limiting por capa, guardas de rol re-verificadas contra DB |
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v6, TanStack Query, Zustand, Axios |
| **Docs** | Swagger/OpenAPI en `/docs` (solo fuera de producción) |

---

## 🚀 Inicio rápido

### 1) Backend + Base de datos (Docker)

```bash
cp .env.example .env         # completar JWT_ACCESS_SECRET y JWT_REFRESH_SECRET (≥32 chars)
docker compose up -d --build # levanta postgres + api en :3000
docker compose exec api npx prisma migrate deploy
docker compose exec api npx tsx prisma/seed.ts
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs` (solo `NODE_ENV=development`)

### 2) Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

El proxy de Vite redirige `/api/*` → `http://localhost:3000` (cookies first-party, sin CORS).

> Para exponer el front en tu red local: `npm run dev -- --host 0.0.0.0 --port 3002`

### 👤 Usuarios sembrados

| Usuario | Email | Rol |
|---------|-------|-----|
| Administrador | `admin@dental.com` | ADMIN |
| Recepción | `staff@dental.com` | STAFF |
| Dra. María González | `ortodoncia@dental.com` | SPECIALIST |
| Dr. Carlos Rodríguez | `cirugia@dental.com` | SPECIALIST |
| Dra. Ana Martínez | `estetica@dental.com` | SPECIALIST |
| Juan Pérez | `paciente@test.com` | PATIENT |

Contraseña de todos: **`Test1234!`** — ⚠️ solo para desarrollo.

Días de atención (hora Argentina): Ortodoncia lun/mié/vie 8–14 · Cirugía mar/jue 9–13 · Estética lun–vie 10–18.

---

## 📜 Scripts

### Raíz / backend

| Comando | Qué hace |
|---------|----------|
| `npm run create-admin` | Asistente interactivo para crear/promover ADMIN o STAFF |
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run build` / `start` | Compila a `dist/` y sirve producción |
| `npm test` | Suite Vitest (40 tests) |
| `npm run prisma:migrate` | Migraciones en desarrollo |

### `frontend/`

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Vite con HMR |
| `npm run build` / `preview` | Build de producción y previsualización |
| `npm run lint` | Oxlint |

---

## 🔐 Roles

| Acción | PATIENT | SPECIALIST | STAFF | ADMIN |
|--------|:--:|:--:|:--:|:--:|
| Ver especialistas / disponibilidad | ✅ | ✅ | ✅ | ✅ |
| Agendar cita | ✅ (a su nombre) | ✅ | ✅ | ✅ |
| Ver / confirmar / cancelar citas | ✅ propias | ✅ su agenda | ✅ todas | ✅ todas |
| Crear/editar especialistas | ❌ | ❌ | ❌ | ✅ |
| Reglas de horarios / bloqueos | ❌ | ✅ propios | ✅ | ✅ |
| Auditoría de citas | ❌ | ❌ | ✅ | ✅ |

La sesión vive **solo en memoria** del navegador: se restaura vía cookie httpOnly (`/auth/refresh`) y expira tras **2 minutos de inactividad**.

---

## 🔒 Seguridad implementada

- bcrypt(12) · access token 15 min · refresh rotativo hasheado con revocación
- Validación **real** con Zod en cada endpoint (rechaza y strippea campos desconocidos → sin mass assignment)
- Anti-IDOR: ownership checks en lectura/escritura + roles re-verificados contra DB en cada request protegida
- Rate limiting por capa (auth 10/min, registro 5/min, global configurable)
- Secretos exigidos al boot (JWT ≥ 32 caracteres, `COOKIE_SECRET` obligatorio en producción)
- Helmet activo en producción · Swagger oculto en producción · errores internos nunca viajan al cliente

---

## 🗺️ API v1 (resumen)

```
POST /api/v1/auth/register|login|refresh|logout     GET /api/v1/auth/me
GET  /api/v1/specialists            (público)
POST/PATCH/DELETE /api/v1/specialists/:id           (ADMIN)
GET  /api/v1/availability/:specialistId/slots?date= (público)
CRUD /api/v1/availability/...rules|blocks           (STAFF/ADMIN/SPECIALIST*)
POST /api/v1/appointments                           (público con auth opcional)
GET/PATCH /api/v1/appointments/:id                  (dueño o staff)
GET  /api/v1/appointments/:id/audit                 (ADMIN/STAFF)
```

Anti doble-turno garantizado por constraint `EXCLUDE` en PostgreSQL + respuesta `409` amigable.

---

## 📦 Deploy (notas)

- `NODE_ENV=production` exige `COOKIE_SECRET` y activa CSP estricta; oculta `/docs`
- Detrás de proxy: `TRUST_PROXY=true`
- Aplicar migraciones con `npx prisma migrate deploy` en cada release
