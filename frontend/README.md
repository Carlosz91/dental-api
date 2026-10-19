# 🦷 DentalCare — Frontend

Web del sistema: los pacientes agendan turnos y los odontólogos gestionan su agenda desde el Panel profesional.

> Estructura, setup completo y usuarios de prueba: **ver el [README raíz](../README.md)**.

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173  (proxy /api -> localhost:3000)
npm run build      # build producción
npm run lint       # oxlint
```

## Accesos rápidos

| Ruta | Qué es |
|------|--------|
| `/` | Home pública + especialistas destacados |
| `/specialists` | Listado y filtros |
| `/booking` | Wizard de agendado (4 pasos) |
| `/myappointments` | Citas del paciente: reprogramar / cancelar |
| `/dashboard` | 🔒 Panel profesional (rol especialista/admin) |
| `/login` · `/register` | Acceso y registro de pacientes |

## Sesión

- El access token vive **solo en memoria** (nunca localStorage).
- Al recargar la página la sesión se restaura con la cookie httpOnly (`/auth/refresh`).
- Auto-cierre tras **15 minutos** de inactividad, con aviso y cuenta regresiva durante el último minuto (constantes `INACTIVITY_TIMEOUT_MS` / `INACTIVITY_WARNING_MS` en `src/hooks/useInactivityTimeout.ts`).
