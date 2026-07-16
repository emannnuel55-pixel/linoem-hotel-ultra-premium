# Despliegue en Railway

## Topología

- Servicio público `clientes` → `api-clientes`
- Servicio privado/público restringido `empleados` → `api-empleados`
- PostgreSQL Clientes → únicamente `api-clientes`
- PostgreSQL Operaciones → únicamente `api-empleados`
- Redis → APIs, usando red privada

Use dominios separados, por ejemplo `reservas.example.com`, `equipo.example.com`, `api-reservas.example.com` y `api-operaciones.example.com`.

## Variables

Copie cada `.env.example`. Use Reference Variables de Railway para `DATABASE_URL` y `REDIS_URL`. Cambie todos los secretos. Restrinja CORS a los dominios reales. Configure credenciales sandbox de Mercado Pago antes de producción.

## Configuración

- Build: `npm ci`
- Start: `npm start`
- Pre-deploy APIs: `npm run db:migrate`
- Healthcheck APIs: `/health`
- Reinicio: ON_FAILURE, máximo 5
- PostgreSQL: backup diario y PITR

## Verificación

Compruebe registro/login, autorización por rol, creación/publicación de alojamiento, sincronización, bloqueo de fechas, pago sandbox, webhook duplicado, cancelación, carga de archivos y restauración de backup antes de liberar producción.
