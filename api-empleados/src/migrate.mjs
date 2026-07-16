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

import{q,pool}from'./db.mjs';await q(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS employees(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE NOT NULL,name text NOT NULL,password_hash text NOT NULL,role text NOT NULL,active boolean DEFAULT true,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS properties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,type text NOT NULL,city text NOT NULL,address text,max_guests int NOT NULL,base_price numeric(12,2) NOT NULL,status text DEFAULT 'AVAILABLE',details jsonb DEFAULT '{}',media jsonb DEFAULT '[]',published boolean DEFAULT false,version bigint DEFAULT 1,updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS expenses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category text NOT NULL,kind text NOT NULL,description text NOT NULL,amount numeric(12,2) NOT NULL,occurred_on date NOT NULL,created_by uuid REFERENCES employees(id),created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS payroll(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid REFERENCES employees(id),period_start date NOT NULL,period_end date NOT NULL,gross numeric(12,2) NOT NULL,deductions jsonb DEFAULT '{}',net numeric(12,2) NOT NULL,status text DEFAULT 'DRAFT',created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log(id bigserial PRIMARY KEY,actor_id uuid,action text NOT NULL,resource text NOT NULL,resource_id text,metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());`);console.log('Migración empleados completa');await pool.end();

