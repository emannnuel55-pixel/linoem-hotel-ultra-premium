import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { q } from './db.mjs';

const app = express();
const prod = process.env.NODE_ENV === 'production';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-this-now');

if (prod && secret.length < 32) throw Error('JWT_SECRET inseguro');

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(x => x.trim()),
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8' }));

const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const token = user => new SignJWT({ sub: user.id, email: user.email, name: user.name })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(secret);

async function auth(req, res, next) {
  try {
    req.user = (await jwtVerify((req.headers.authorization || '').replace('Bearer ', ''), secret)).payload;
    next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}

function requireSyncSecret(req, res, next) {
  const configured = process.env.ADMIN_SYNC_SECRET || '';
  if (!configured || req.headers['x-sync-secret'] !== configured) return res.status(401).end();
  next();
}

app.get('/health', safe(async (_, res) => {
  if (process.env.DATABASE_URL) await q('SELECT 1');
  res.json({ status: 'ok', service: 'api-clientes' });
}));

app.get('/v1/properties', safe(async (_, res) => {
  if (!process.env.DATABASE_URL) return res.json({ items: [] });
  res.set('Cache-Control', 'no-store');
  const { rows } = await q(`
    SELECT id,name,type,city,address,max_guests AS "maxGuests",
      base_price::float AS "basePrice",details,media,updated_at AS "updatedAt"
    FROM properties
    WHERE available=true
    ORDER BY updated_at DESC
    LIMIT 100
  `);
  res.json({ items: rows });
}));

app.get('/v1/promotions', safe(async (_, res) => {
  if (!process.env.DATABASE_URL) return res.json({ items: [] });
  res.set('Cache-Control', 'no-store');
  const { rows } = await q(`
    SELECT id,title,subtitle,badge,image_url AS "imageUrl",
      mobile_image_url AS "mobileImageUrl",cta_label AS "ctaLabel",
      cta_url AS "ctaUrl",sort_order AS "sortOrder",
      starts_at AS "startsAt",ends_at AS "endsAt"
    FROM promotions
    WHERE active=true
      AND (starts_at IS NULL OR starts_at<=now())
      AND (ends_at IS NULL OR ends_at>=now())
    ORDER BY sort_order ASC, updated_at DESC
    LIMIT 20
  `);
  res.json({ items: rows });
}));

app.post('/v1/auth/register', safe(async (req, res) => {
  const data = z.object({
    email: z.string().email(),
    password: z.string().min(12).max(128),
    name: z.string().min(2).max(80)
  }).parse(req.body);
  const { rows } = await q(
    'INSERT INTO users(email,password_hash,name) VALUES(lower($1),$2,$3) RETURNING id,email,name',
    [data.email, await hash(data.password), data.name]
  );
  res.status(201).json({ user: rows[0], accessToken: await token(rows[0]) });
}));

app.post('/v1/auth/login', safe(async (req, res) => {
  const data = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const { rows } = await q('SELECT * FROM users WHERE email=lower($1)', [data.email]);
  if (!rows[0] || !await verify(rows[0].password_hash, data.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  res.json({ user: { id: rows[0].id, email: rows[0].email, name: rows[0].name }, accessToken: await token(rows[0]) });
}));

app.get('/v1/me', auth, safe(async (req, res) => {
  const { rows } = await q('SELECT id,email,name,created_at AS "createdAt" FROM users WHERE id=$1', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
}));

app.get('/v1/me/reservations', auth, safe(async (req, res) => {
  const { rows } = await q(`
    SELECT r.id,r.starts_on AS "startsOn",r.ends_on AS "endsOn",r.guests,r.status,
      r.created_at AS "createdAt",p.id AS "propertyId",p.name AS "propertyName",
      p.city,p.media,p.base_price::float AS "basePrice"
    FROM reservations r
    JOIN properties p ON p.id=r.property_id
    WHERE r.user_id=$1
    ORDER BY r.starts_on DESC
  `, [req.user.sub]);
  res.json({ items: rows });
}));

app.post('/v1/reservations/hold', auth, safe(async (req, res) => {
  const data = z.object({
    propertyId: z.string().uuid(),
    from: z.coerce.date(),
    to: z.coerce.date(),
    guests: z.number().int().positive(),
    idempotencyKey: z.string().min(12)
  }).parse(req.body);
  if (data.to <= data.from) return res.status(400).json({ error: 'La salida debe ser posterior a la llegada' });
  const property = await q('SELECT id,max_guests FROM properties WHERE id=$1 AND available=true', [data.propertyId]);
  if (!property.rowCount) return res.status(404).json({ error: 'Alojamiento no disponible' });
  if (data.guests > property.rows[0].max_guests) return res.status(400).json({ error: 'Número de huéspedes excedido' });
  const conflict = await q(
    "SELECT id FROM reservations WHERE property_id=$1 AND status IN('HOLD','PAID') AND (status='PAID' OR hold_until>now()) AND starts_on<$3 AND ends_on>$2 LIMIT 1",
    [data.propertyId, data.from, data.to]
  );
  if (conflict.rowCount) return res.status(409).json({ error: 'Fechas no disponibles' });
  const { rows } = await q(`
    INSERT INTO reservations(user_id,property_id,starts_on,ends_on,guests,hold_until,idempotency_key)
    VALUES($1,$2,$3,$4,$5,now()+interval '15 minutes',$6)
    ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
    RETURNING *
  `, [req.user.sub, data.propertyId, data.from, data.to, data.guests, data.idempotencyKey]);
  res.status(201).json(rows[0]);
}));

// Solicitudes del huésped: cada categoría se canaliza al departamento indicado.
app.get('/v1/me/service-requests',auth,safe(async(req,res)=>{
  const {rows}=await q(`SELECT sr.id,sr.folio,sr.department,sr.category,sr.subject,sr.description,sr.priority,sr.status,sr.resolution,sr.assigned_name AS "assignedName",sr.created_at AS "createdAt",sr.updated_at AS "updatedAt",p.name AS "propertyName" FROM service_requests sr LEFT JOIN properties p ON p.id=sr.property_id WHERE sr.user_id=$1 ORDER BY sr.created_at DESC`,[req.user.sub]);
  res.json({items:rows});
}));
app.post('/v1/me/service-requests',auth,safe(async(req,res)=>{
  const d=z.object({reservationId:z.string().uuid().nullable().optional(),propertyId:z.string().uuid().nullable().optional(),department:z.enum(['RECEPTION','HOUSEKEEPING','MAINTENANCE','FINANCE']),category:z.string().min(2).max(80),subject:z.string().min(3).max(160),description:z.string().min(5).max(4000),priority:z.enum(['LOW','NORMAL','HIGH','URGENT']).default('NORMAL')}).parse(req.body);
  if(d.reservationId){const owns=(await q('SELECT 1 FROM reservations WHERE id=$1 AND user_id=$2',[d.reservationId,req.user.sub])).rowCount;if(!owns)return res.status(403).json({error:'La reservación no pertenece a tu cuenta'})}
  const {rows}=await q(`INSERT INTO service_requests(user_id,reservation_id,property_id,department,category,subject,description,priority) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.sub,d.reservationId||null,d.propertyId||null,d.department,d.category,d.subject,d.description,d.priority]);res.status(201).json(rows[0]);
}));
app.post('/v1/me/feedback',auth,safe(async(req,res)=>{const d=z.object({kind:z.enum(['COMPLAINT','SUGGESTION','IMPROVEMENT','QUESTION']),subject:z.string().min(3).max(160),message:z.string().min(5).max(5000)}).parse(req.body);res.status(201).json((await q('INSERT INTO guest_feedback(user_id,kind,subject,message) VALUES($1,$2,$3,$4) RETURNING id,created_at',[req.user.sub,d.kind,d.subject,d.message])).rows[0])}));

const catalogSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  city: z.string(),
  address: z.string().optional(),
  maxGuests: z.number().int(),
  basePrice: z.number(),
  details: z.any().optional(),
  media: z.array(z.any()).optional(),
  available: z.boolean().optional().default(true),
  version: z.number().int()
});

app.post('/internal/catalog', requireSyncSecret, safe(async (req, res) => {
  const data = catalogSchema.parse(req.body);
  const media = Array.isArray(data.media) ? data.media : [];
  const details = data.details && typeof data.details === 'object' && !Array.isArray(data.details) ? data.details : {};
  await q(`
    INSERT INTO properties(id,name,type,city,address,max_guests,base_price,details,media,available,source_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)
    ON CONFLICT(id) DO UPDATE SET
      name=EXCLUDED.name,type=EXCLUDED.type,city=EXCLUDED.city,address=EXCLUDED.address,
      max_guests=EXCLUDED.max_guests,base_price=EXCLUDED.base_price,details=EXCLUDED.details,
      media=EXCLUDED.media,available=EXCLUDED.available,source_version=EXCLUDED.source_version,updated_at=now()
    WHERE properties.source_version<=EXCLUDED.source_version
  `, [data.id, data.name, data.type, data.city, data.address || '', data.maxGuests, data.basePrice,
    JSON.stringify(details), JSON.stringify(media), data.available, data.version]);
  res.status(202).json({ accepted: true });
}));

const promotionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().optional().default(''),
  badge: z.string().optional().default(''),
  imageUrl: z.string(),
  mobileImageUrl: z.string().optional().default(''),
  ctaLabel: z.string().optional().default('Ver alojamientos'),
  ctaUrl: z.string().optional().default('#alojamientos'),
  active: z.boolean().optional().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
  version: z.number().int()
});

app.post('/internal/promotions', requireSyncSecret, safe(async (req, res) => {
  const data = promotionSchema.parse(req.body);
  await q(`
    INSERT INTO promotions(id,title,subtitle,badge,image_url,mobile_image_url,cta_label,cta_url,active,starts_at,ends_at,sort_order,source_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT(id) DO UPDATE SET
      title=EXCLUDED.title,subtitle=EXCLUDED.subtitle,badge=EXCLUDED.badge,image_url=EXCLUDED.image_url,
      mobile_image_url=EXCLUDED.mobile_image_url,cta_label=EXCLUDED.cta_label,cta_url=EXCLUDED.cta_url,
      active=EXCLUDED.active,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,
      sort_order=EXCLUDED.sort_order,source_version=EXCLUDED.source_version,updated_at=now()
    WHERE promotions.source_version<=EXCLUDED.source_version
  `, [data.id, data.title, data.subtitle, data.badge, data.imageUrl, data.mobileImageUrl,
    data.ctaLabel, data.ctaUrl, data.active, data.startsAt || null, data.endsAt || null,
    data.sortOrder, data.version]);
  res.status(202).json({ accepted: true });
}));

await q(`CREATE TABLE IF NOT EXISTS service_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),folio bigserial UNIQUE,user_id uuid REFERENCES users(id) ON DELETE SET NULL,reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,property_id uuid REFERENCES properties(id) ON DELETE SET NULL,department text NOT NULL,category text NOT NULL,subject text NOT NULL,description text NOT NULL,priority text NOT NULL DEFAULT 'NORMAL',status text NOT NULL DEFAULT 'OPEN',resolution text,assigned_name text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),closed_at timestamptz);
CREATE TABLE IF NOT EXISTS guest_feedback(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id) ON DELETE SET NULL,kind text NOT NULL,subject text NOT NULL,message text NOT NULL,status text NOT NULL DEFAULT 'NEW',admin_response text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());`);

app.use((error, req, res, _next) => {
  console.error(error.message);
  if (error?.code === '23505') return res.status(409).json({ error: 'Ese registro ya existe' });
  res.status(error.name === 'ZodError' ? 400 : 500).json({
    error: error.name === 'ZodError' ? 'Datos inválidos' : 'Error interno',
    requestId: req.headers['x-request-id']
  });
});

app.listen(process.env.PORT || 4000, () => console.log('API clientes lista v3 — catálogo y promociones sincronizados'));
