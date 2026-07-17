import pg from 'pg';

async function bootstrap() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) return;
  try {
    const urlObj = new URL(targetUrl);
    const targetDb = urlObj.pathname.slice(1);
    if (targetDb && targetDb !== 'railway' && targetDb !== 'postgres') {
      urlObj.pathname = '/railway';
      const client = new pg.Client({
        connectionString: urlObj.toString(),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      await client.connect();
      const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
      if (res.rowCount === 0) {
        console.log(`Creando base de datos ${targetDb} automáticamente...`);
        await client.query(`CREATE DATABASE ${targetDb}`);
      }
      await client.end();
    }
  } catch (err) {
    console.error('Error al inicializar base de datos linoem_empleados:', err.message);
  }
}

await bootstrap();

import{q,pool}from'./db.mjs';

// Base tables
await q(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS employees(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE NOT NULL,name text NOT NULL,password_hash text NOT NULL,role text NOT NULL,active boolean DEFAULT true,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS properties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,type text NOT NULL,city text NOT NULL,address text,max_guests int NOT NULL,base_price numeric(12,2) NOT NULL,status text DEFAULT 'AVAILABLE',details jsonb DEFAULT '{}',media jsonb DEFAULT '[]',published boolean DEFAULT false,version bigint DEFAULT 1,updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS promotions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,subtitle text DEFAULT '',badge text DEFAULT '',image_url text NOT NULL,mobile_image_url text DEFAULT '',cta_label text DEFAULT 'Ver alojamientos',cta_url text DEFAULT '#alojamientos',active boolean DEFAULT true,starts_at timestamptz,ends_at timestamptz,sort_order int DEFAULT 0,published boolean DEFAULT true,version bigint DEFAULT 1,sync_status text DEFAULT 'PENDING',sync_error text,synced_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS sync_outbox(id bigserial PRIMARY KEY,kind text NOT NULL,resource_id uuid NOT NULL,payload jsonb NOT NULL,attempts int DEFAULT 0,next_attempt_at timestamptz DEFAULT now(),last_error text,created_at timestamptz DEFAULT now(),UNIQUE(kind,resource_id));
CREATE TABLE IF NOT EXISTS expenses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category text NOT NULL,kind text NOT NULL,description text NOT NULL,amount numeric(12,2) NOT NULL,occurred_on date NOT NULL,created_by uuid REFERENCES employees(id),created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS cleaning_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,task_type text NOT NULL DEFAULT 'CHECKOUT',priority text NOT NULL DEFAULT 'NORMAL',status text NOT NULL DEFAULT 'REQUESTED',requested_for timestamptz NOT NULL DEFAULT now(),assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,notes text DEFAULT '',checklist jsonb DEFAULT '[]',completed_at timestamptz,created_by uuid REFERENCES employees(id) ON DELETE SET NULL,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS payroll(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid REFERENCES employees(id),period_start date NOT NULL,period_end date NOT NULL,gross numeric(12,2) NOT NULL,deductions jsonb DEFAULT '{}',net numeric(12,2) NOT NULL,status text DEFAULT 'DRAFT',created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log(id bigserial PRIMARY KEY,actor_id uuid,action text NOT NULL,resource text NOT NULL,resource_id text,metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());`);

// Alteraciones para nuevas columnas (idempotentes)
await q(`
  CREATE SEQUENCE IF NOT EXISTS employee_clock_seq START WITH 1001 INCREMENT BY 1;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS clock_number int;
  UPDATE employees SET clock_number = nextval('employee_clock_seq') WHERE clock_number IS NULL;

  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS overtime_hours numeric(6,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS overtime_pay numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS attendance_bonus numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS punctuality_bonus numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS imss_employee numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS imss_employer numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS infonavit numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS fonacot numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS isr numeric(12,2) DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS other_deductions jsonb DEFAULT '{}';
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS time_entries jsonb DEFAULT '[]';
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

  ALTER TABLE properties ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'PENDING';
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS sync_error text;
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS synced_at timestamptz;
  CREATE INDEX IF NOT EXISTS properties_sync_pending_idx ON properties(published, sync_status, updated_at);
  CREATE INDEX IF NOT EXISTS promotions_sync_pending_idx ON promotions(published, sync_status, updated_at);
  CREATE INDEX IF NOT EXISTS sync_outbox_retry_idx ON sync_outbox(next_attempt_at, attempts);
  CREATE INDEX IF NOT EXISTS cleaning_tasks_status_idx ON cleaning_tasks(status, requested_for);
`);

// ── SEED SEGURO: Administrador inicial (solo si Railway proporciona variables)
import{hash}from'@node-rs/argon2';
const adminEmail=process.env.ADMIN_EMAIL;
const adminInitialPassword=process.env.ADMIN_INITIAL_PASSWORD;
if(adminEmail&&adminInitialPassword){
  try {
    if(adminInitialPassword.length<12)throw Error('ADMIN_INITIAL_PASSWORD debe tener al menos 12 caracteres');
    const adminPass=await hash(adminInitialPassword);
    await q(`
      INSERT INTO employees(email,name,password_hash,role,active,clock_number)
      VALUES(lower($1),'Administrador General HTJ',$2,'SUPER_ADMIN',true,1000)
      ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,role='SUPER_ADMIN',active=true
    `,[adminEmail,adminPass]);
    console.log('Seed: administrador inicial verificado sin sobrescribir su contraseña actual');
  } catch (err) { console.error('Error en seed admin:',err.message); }
}else{
  console.log('Seed admin omitido: usa ADMIN_EMAIL y ADMIN_INITIAL_PASSWORD solo en la primera instalación');
}

console.log('Migracion empleados completa (v2 con nomina expandida y numero de reloj)');
await pool.end();
