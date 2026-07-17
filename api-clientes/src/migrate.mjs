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
    console.error('Error al inicializar base de datos linoem_clientes:', err.message);
  }
}

await bootstrap();

import{q,pool}from'./db.mjs';const sql=`CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE NOT NULL,password_hash text NOT NULL,name text NOT NULL,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS properties(id uuid PRIMARY KEY,name text NOT NULL,type text NOT NULL,city text NOT NULL,address text,lat numeric,lng numeric,max_guests int NOT NULL,base_price numeric(12,2) NOT NULL,details jsonb DEFAULT '{}',media jsonb DEFAULT '[]',available boolean DEFAULT true,source_version bigint DEFAULT 1,updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS promotions(id uuid PRIMARY KEY,title text NOT NULL,subtitle text DEFAULT '',badge text DEFAULT '',image_url text NOT NULL,mobile_image_url text DEFAULT '',cta_label text DEFAULT 'Ver alojamientos',cta_url text DEFAULT '#alojamientos',active boolean DEFAULT true,starts_at timestamptz,ends_at timestamptz,sort_order int DEFAULT 0,source_version bigint DEFAULT 1,updated_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS active_promotions_idx ON promotions(active, sort_order, updated_at);
CREATE TABLE IF NOT EXISTS reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),property_id uuid REFERENCES properties(id),starts_on date NOT NULL,ends_on date NOT NULL,guests int NOT NULL,status text NOT NULL DEFAULT 'HOLD',hold_until timestamptz NOT NULL,payment_ref text,idempotency_key text UNIQUE NOT NULL,created_at timestamptz DEFAULT now(),CHECK(ends_on>starts_on));
CREATE INDEX IF NOT EXISTS reservation_lookup ON reservations(property_id,starts_on,ends_on,status);
CREATE TABLE IF NOT EXISTS webhook_events(id text PRIMARY KEY,type text NOT NULL,payload jsonb NOT NULL,processed_at timestamptz,created_at timestamptz DEFAULT now());`;await q(sql);console.log('Migración clientes completa');await pool.end();
