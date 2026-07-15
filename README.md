# LINOEM Hotel Seguro

Plataforma hotelera en Next.js 16, PostgreSQL y Prisma. Incluye registro de huéspedes, verificación real por correo, inicio de sesión con contraseña cifrada Argon2id, Google OAuth, recuperación de contraseña con enlace de un solo uso, sesiones HTTP-only y portal de reservaciones.

## Instalación local

1. Instala Node.js 22 y PostgreSQL.
2. Copia `.env.example` como `.env` y completa las variables.
3. Ejecuta `npm install`, `npm run db:push` y `npm run dev`.

## Configuración de correo

Para Gmail activa la verificación en dos pasos y crea una **contraseña de aplicación**. Colócala en `SMTP_PASSWORD`. No uses ni publiques tu contraseña normal.

## Configuración de Google

En Google Cloud Console crea credenciales OAuth tipo Web. Registra:

- Local: `http://localhost:3000/api/auth/google/callback`
- Producción: `https://TU-DOMINIO/api/auth/google/callback`

Agrega `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Railway.

## Railway

Crea PostgreSQL y conecta `DATABASE_URL`. Agrega `APP_URL`, las cinco variables SMTP y las dos variables Google. El arranque sincroniza el esquema de una base nueva y abre el puerto asignado por Railway.

## Seguridad incluida

- Correo único y verificado antes del primer acceso.
- Contraseñas Argon2id y política mínima robusta.
- Tokens almacenados solamente como hash, con vencimiento y un solo uso.
- Recuperación invalida sesiones anteriores.
- Cookies seguras, HTTP-only y SameSite.
- OAuth con `state` anti-CSRF y correo verificado por Google.
- Respuestas neutras en recuperación para evitar revelar cuentas.
- Limitación básica de intentos y cabeceras HTTP defensivas.

Para producción con varias réplicas conviene sustituir el limitador en memoria por Redis y agregar CAPTCHA tras intentos fallidos.
