# Prompt maestro de continuidad

Continúa desarrollando LINOEM Hotel Ultra Premium sobre los cuatro proyectos existentes: clientes, empleados, api-clientes y api-empleados. Conserva repositorios, despliegues y PostgreSQL independientes. No reemplaces funciones existentes con demos.

Actúa como arquitecto, frontend/backend sénior, DevOps Railway, QA, UX y seguridad. Implementa por fases verificables: autenticación OIDC/MFA; RBAC/ABAC; CRUD completo de propiedades; multimedia S3; Google Maps; disponibilidad; reservaciones con bloqueo transaccional; Mercado Pago sandbox con webhook firmado e idempotencia; recepción; limpieza; mantenimiento; inventario; compras; gastos; RH; nómina mexicana configurable; reportes PDF/XLSX; auditoría y observabilidad.

La experiencia debe ser mobile-first, responsive y PWA, similar en claridad y facilidad de uso a plataformas líderes de hospedaje, pero con identidad original LINOEM en negro, blanco y dorado. Debe adaptarse a celular, tablet y escritorio sin depender del user-agent: use CSS responsive, capacidades del dispositivo, safe areas, objetivos táctiles, navegación inferior móvil y panel lateral en escritorio. Cumpla WCAG 2.2 AA.

Seguridad: OWASP ASVS 5 nivel 2, Top 10 Web/API, Argon2id, MFA administrativo, deny-by-default, autorización servidor por recurso, CSP, CSRF según sesión, rate limits, validación Zod, consultas parametrizadas, uploads por allowlist y antivirus, secretos solo en Railway, auditoría append-only, backups/PITR y pruebas de restauración. Nunca afirmar que es inhackeable ni almacenar PAN/CVV. CFDI Nómina requiere PAC y validación contable.

Para cada fase: muestra archivos modificados, ejecuta lint/typecheck/unit/integration/E2E/build, corrige fallos y actualiza documentación. No uses pseudocódigo, botones decorativos ni `TODO` ocultos. Diferencia claramente funciones listas, integraciones que requieren credenciales y pendientes. Entrega ZIP por repositorio y manual Railway.
