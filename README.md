# LINOEM Hotel Ultra Premium

Suite hotelera responsive con cuatro servicios independientes, preparada para Railway.

Esta versión incluye portal público premium, tema claro/oscuro, carrusel de promociones administrado por empleados, favoritos, viajes, perfil, galería, mapa y sincronización automática recuperable del catálogo.

## Servicios

| Carpeta | Puerto local | Base de datos |
|---|---:|---|
| `clientes` | 3000 | Consume API Clientes |
| `empleados` | 3001 | Consume API Empleados |
| `api-clientes` | 4000 | PostgreSQL clientes/reservas |
| `api-empleados` | 4001 | PostgreSQL operaciones |

## Arranque rápido (demo)

Requiere Node.js 22+. En cada carpeta ejecute `npm install` y `npm start`. Las interfaces tienen datos de demostración si las API no están configuradas.

## Producción

1. Conecte los cuatro servicios de Railway a este mismo repositorio y asigne el directorio raíz correspondiente.
2. Configure PostgreSQL para ambas API.
3. Configure las variables indicadas en `GUIA_ACTUALIZACION.md`.
5. Configure `/health` como Healthcheck Path en ambas API.
6. Ejecute `npm run db:migrate` como pre-deploy command en las API.

No se almacenan datos de tarjeta. Mercado Pago se integra por Checkout Pro y webhook validado del lado servidor. Para producción se requieren credenciales propias, dominio, almacenamiento S3 y proveedor SMTP.

## Seguridad

- Helmet/CSP, CORS explícito, rate limit y validación Zod.
- Sesiones JWT de corta duración y contraseñas Argon2.
- RBAC en API administrativa y auditoría.
- UUID, consultas parametrizadas e idempotencia para reservas.
- Las claves incluidas son ejemplos y la aplicación rechaza secretos inseguros en producción.

Consulte `GUIA_ACTUALIZACION.md`, `DEPLOY_RAILWAY.md`, `SECURITY.md` y `PROMPT_MAESTRO.md`.
