# LINOEM Hotel Control - Ultra Premium Platform

Bienvenido a la plataforma LINOEM Hotel Control. Este es un proyecto Monolítico con Backend en Express/Node.js, Frontend en React (Vite) y Base de Datos PostgreSQL gestionada con Prisma.

## 🌟 Arquitectura y Tecnologías
- **Frontend:** React, Vite, React Router, CSS Vanilla (Temas Blanco/Dorado y Negro/Dorado), Phosphor Icons, Socket.IO Client.
- **Backend:** Node.js, Express, Socket.IO, JWT, bcryptjs.
- **Base de Datos:** PostgreSQL con Prisma ORM.

## 🚀 Comandos de Instalación (Local)

1. **Instalar dependencias del Backend:**
   En la raíz del proyecto, ejecuta:
   ```bash
   npm install
   ```

2. **Instalar dependencias del Frontend:**
   ```bash
   cd src/frontend
   npm install
   cd ../..
   ```

3. **Configurar Variables de Entorno (.env):**
   Copia el archivo de ejemplo y configura la conexión a PostgreSQL:
   ```bash
   cp .env.example .env
   ```
   Abre el archivo `.env` y asegúrate de configurar tu `DATABASE_URL` (Debe ser una URI válida de PostgreSQL).

4. **Migrar la Base de Datos:**
   Sincroniza el esquema de Prisma con PostgreSQL:
   ```bash
   npm run db:push
   ```

5. **Crear Datos Demo (Seed):**
   Genera los usuarios predeterminados (superadmin, empleados, cliente) y las habitaciones:
   ```bash
   npm run db:seed
   ```

## 💻 Comandos para Ejecutar Localmente

Necesitas dos terminales para correr en modo desarrollo (Hot Reload):

**Terminal 1 (Backend con WebSockets):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend React):**
```bash
npm run dev:frontend
```

## 🏗️ Comandos para Build y Deploy a Producción

La aplicación está diseñada como un monolito para facilitar su despliegue en un solo servicio (ej. Railway), sirviendo el React compilado directamente desde Express.

1. **Construir el Frontend (Build):**
   ```bash
   npm run build
   ```

2. **Despliegue a Railway:**
   - Asegúrate de tener tu repositorio en GitHub.
   - En Railway, crea un nuevo **"Project from GitHub Repo"** y selecciona tu repositorio.
   - En Railway, añade un servicio **PostgreSQL** y copia la variable `DATABASE_URL` a las variables de entorno de tu aplicación.
   - Añade el resto de variables (`JWT_SECRET`, `PORT`, etc.).
   - Railway detectará automáticamente el archivo `package.json`, ejecutará `npm run build` y luego el comando de inicio `npm start`.

## 👥 Usuarios Demo Creados por el Seed

Todos los usuarios tienen la contraseña por defecto: `Hotel#2026!` a excepción de los que se especifican:
- **Super Admin / Dirección:** `admin@hotel.com` (Contraseña: `Admin#2026!Hotel`)
- **Recepción:** `recepcion@hotel.com`
- **Limpieza:** `limpieza@hotel.com`
- **Mantenimiento:** `mantenimiento@hotel.com`
- **Gerencia:** `gerencia@hotel.com`
- **Finanzas:** `finanzas@hotel.com`
- **Cliente:** `cliente@hotel.com` (Contraseña: `Cliente123!`)

## 🛡️ Recomendaciones Finales de Producción
1. **JWT Secret:** Cambia el `JWT_SECRET` en tu `.env` de producción por una cadena fuerte y aleatoria.
2. **Correos OTP:** Configura un SMTP real (como Resend o SendGrid) en `src/backend/routes/auth.js` para enviar el PIN del cliente al correo en lugar de imprimirlo en la consola.
3. **Imágenes y Archivos:** Actualmente el código asume carga local. En producción, deberás integrar AWS S3, Cloudinary o usar volúmenes montados en Railway para que las fotos de identificaciones persistan tras cada reinicio del contenedor.
4. **Stripe:** Para activar cobros reales, reemplaza `STRIPE_SECRET_KEY` con tus claves reales.
