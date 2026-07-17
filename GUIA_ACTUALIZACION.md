# Guía de actualización HTJ Hotel

## Repositorio

`https://github.com/emannnuel55-pixel/linoem-hotel-ultra-premium`

La rama que despliega Railway es `main`.

## Actualización con doble clic

1. Descomprime la entrega completa.
2. Ejecuta `ACTUALIZAR_GITHUB_RAILWAY.bat`.
3. Si la carpeta no contiene `.git`, el actualizador clonará automáticamente el repositorio en una carpeta hermana llamada `linoem-hotel-ultra-premium-GITHUB`, copiará los cambios, creará el commit y lo subirá.
4. Si Railway ya está conectado al repositorio, sus cuatro servicios comenzarán a desplegarse automáticamente.

El script no usa `push --force` y no borra el repositorio.

## Variables de Railway

En `api-empleados` configura:

- `CLIENT_API_URL=https://api-clientes-production-6b03.up.railway.app`
- `ADMIN_SYNC_SECRET`: debe tener exactamente el mismo valor en `api-empleados` y `api-clientes`.
- `EMPLOYEE_JWT_SECRET`: una cadena aleatoria de al menos 32 caracteres para proteger las sesiones del personal.
- `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD`: se usan únicamente para crear el primer administrador en una instalación nueva. La contraseña inicial debe tener al menos 12 caracteres. Después del primer despliegue puedes retirar `ADMIN_INITIAL_PASSWORD`; la migración nunca sobrescribe la contraseña de una cuenta existente.
- `CLIENT_DATABASE_URL`: opcional, pero recomendado. Debe ser la URL PostgreSQL de la base usada por `api-clientes`; permite sincronización directa aun cuando la red HTTP interna esté reiniciando.

En `api-clientes` conserva:

- `ADMIN_SYNC_SECRET`: mismo valor que en `api-empleados`.
- `JWT_SECRET`: mínimo 32 caracteres.
- `CORS_ORIGIN`: URL pública del portal de clientes.

En `clientes`:

- `API_URL=https://api-clientes-production-6b03.up.railway.app`

En `empleados`:

- `API_URL`: URL pública del servicio `api-empleados`.

## Qué se sincroniza

- Propiedades nuevas: se publican al guardarlas.
- Ediciones, precio, dirección, descripción, ubicación, fotos y videos: se actualizan al guardar.
- Eliminaciones: se retiran del catálogo público.
- Promociones: imagen, mensaje, botón, vigencia, orden y estado activo.
- Si el portal de clientes no responde, el panel registra el cambio y reintenta automáticamente cada minuto.

## Orden de despliegue recomendado

1. `api-clientes`
2. `api-empleados`
3. `clientes`
4. `empleados`

Las migraciones se ejecutan automáticamente antes de iniciar cada API mediante `preDeployCommand`.
