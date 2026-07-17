import express from'express';import helmet from'helmet';import cors from'cors';import{rateLimit}from'express-rate-limit';import{z}from'zod';import{q}from'./db.mjs';import pg from'pg';import{hash,verify}from'@node-rs/argon2';import{SignJWT,jwtVerify}from'jose';
const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:(process.env.CORS_ORIGIN||'http://localhost:3001').split(',')}));
app.use(express.json({limit:'25mb'}));
app.use(rateLimit({windowMs:60_000,limit:120}));
const safe=f=>(a,b,c)=>Promise.resolve(f(a,b,c)).catch(c);
const employeeSecret=new TextEncoder().encode(process.env.EMPLOYEE_JWT_SECRET||process.env.JWT_SECRET||'development-employee-secret-change-this');
if(process.env.NODE_ENV==='production'&&employeeSecret.length<32)throw Error('EMPLOYEE_JWT_SECRET inseguro');
const employeeToken=employee=>new SignJWT({sub:employee.id,email:employee.email,name:employee.name,role:employee.role}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('8h').sign(employeeSecret);
const role=(...allowed)=>safe(async(req,res,next)=>{
  try{
    const raw=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!raw)return res.status(401).json({error:'Inicia sesión para continuar'});
    const payload=(await jwtVerify(raw,employeeSecret)).payload;
    const {rows}=await q('SELECT id,email,name,role,active,clock_number FROM employees WHERE id=$1 AND active=true',[payload.sub]);
    if(!rows[0])return res.status(401).json({error:'Sesión no válida'});
    if(!allowed.includes(rows[0].role))return res.status(403).json({error:'No tienes permisos para esta acción'});
    req.employee=rows[0];
    next();
  }catch{return res.status(401).json({error:'Sesión vencida. Inicia sesión nuevamente'})}
});

const clientDatabaseUrl=process.env.CLIENT_DATABASE_URL||(process.env.DATABASE_URL?process.env.DATABASE_URL.replace('/linoem_empleados','/linoem_clientes'):null);
const clientPool=clientDatabaseUrl?new pg.Pool({connectionString:clientDatabaseUrl,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false}):null;
const qc=async(t,v=[])=>{if(!clientPool)throw Error('Client DB pool no disponible');return clientPool.query(t,v)};

// ── AUTENTICACIÓN DE EMPLEADOS ──────────────────────────────────────────────
app.post('/v1/auth/login',safe(async(req,res)=>{
  const data=z.object({email:z.string().email(),password:z.string().min(8).max(128)}).parse(req.body);
  const {rows}=await q('SELECT * FROM employees WHERE email=lower($1) AND active=true',[data.email]);
  if(!rows[0]||!await verify(rows[0].password_hash,data.password))return res.status(401).json({error:'Correo o contraseña incorrectos'});
  const employee={id:rows[0].id,email:rows[0].email,name:rows[0].name,role:rows[0].role,clockNumber:rows[0].clock_number};
  res.json({employee,accessToken:await employeeToken(rows[0])});
}));

app.get('/v1/auth/me',role('SUPER_ADMIN','MANAGER','FINANCE','RECEPTION','HOUSEKEEPING','MAINTENANCE'),safe(async(req,res)=>res.json({id:req.employee.id,email:req.employee.email,name:req.employee.name,role:req.employee.role,clockNumber:req.employee.clock_number})));

const syncUrls=[
  process.env.CLIENT_API_URL,
  process.env.CLIENT_PRIVATE_API_URL,
  'https://api-clientes-production-6b03.up.railway.app',
  'http://api-clientes.railway.internal:4000'
].filter((value,index,list)=>value&&list.indexOf(value)===index).map(value=>value.replace(/\/$/,''));

const propertyPayload=(p,available=true)=>({id:p.id,name:p.name,type:p.type,city:p.city,address:p.address||'',maxGuests:Number(p.max_guests),basePrice:Number(p.base_price),details:p.details||{},media:Array.isArray(p.media)?p.media:[],available,version:Number(p.version)});
const promotionPayload=p=>({id:p.id,title:p.title,subtitle:p.subtitle||'',badge:p.badge||'',imageUrl:p.image_url,mobileImageUrl:p.mobile_image_url||'',ctaLabel:p.cta_label||'Ver alojamientos',ctaUrl:p.cta_url||'#alojamientos',active:Boolean(p.active),startsAt:p.starts_at?new Date(p.starts_at).toISOString():null,endsAt:p.ends_at?new Date(p.ends_at).toISOString():null,sortOrder:Number(p.sort_order||0),version:Number(p.version)});

async function syncThroughHttp(path,payload){
  let lastError='CLIENT_API_URL no disponible';
  for(const baseUrl of syncUrls){
    try{
      const response=await fetch(baseUrl+path,{method:'POST',headers:{'content-type':'application/json','x-sync-secret':process.env.ADMIN_SYNC_SECRET||''},body:JSON.stringify(payload),signal:AbortSignal.timeout(10_000)});
      if(response.ok)return {ok:true,channel:`API ${baseUrl}`};
      lastError=`${baseUrl} respondió HTTP ${response.status}`;
    }catch(error){lastError=`${baseUrl}: ${error.message}`}
  }
  return {ok:false,error:lastError};
}

async function deliverSync(kind,payload){
  let directError=null;
  try{
    if(kind==='PROPERTY'){
      await qc(`INSERT INTO properties(id,name,type,city,address,max_guests,base_price,details,media,available,source_version)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,city=EXCLUDED.city,address=EXCLUDED.address,max_guests=EXCLUDED.max_guests,base_price=EXCLUDED.base_price,details=EXCLUDED.details,media=EXCLUDED.media,available=EXCLUDED.available,source_version=EXCLUDED.source_version,updated_at=now()
        WHERE properties.source_version<=EXCLUDED.source_version`,[payload.id,payload.name,payload.type,payload.city,payload.address,payload.maxGuests,payload.basePrice,JSON.stringify(payload.details||{}),JSON.stringify(payload.media||[]),payload.available,payload.version]);
    }else{
      await qc(`INSERT INTO promotions(id,title,subtitle,badge,image_url,mobile_image_url,cta_label,cta_url,active,starts_at,ends_at,sort_order,source_version)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,subtitle=EXCLUDED.subtitle,badge=EXCLUDED.badge,image_url=EXCLUDED.image_url,mobile_image_url=EXCLUDED.mobile_image_url,cta_label=EXCLUDED.cta_label,cta_url=EXCLUDED.cta_url,active=EXCLUDED.active,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,sort_order=EXCLUDED.sort_order,source_version=EXCLUDED.source_version,updated_at=now()
        WHERE promotions.source_version<=EXCLUDED.source_version`,[payload.id,payload.title,payload.subtitle,payload.badge,payload.imageUrl,payload.mobileImageUrl,payload.ctaLabel,payload.ctaUrl,payload.active,payload.startsAt,payload.endsAt,payload.sortOrder,payload.version]);
    }
    return {ok:true,channel:'base de datos compartida'};
  }catch(error){directError=error.message}
  const viaHttp=await syncThroughHttp(kind==='PROPERTY'?'/internal/catalog':'/internal/promotions',payload);
  if(viaHttp.ok)return viaHttp;
  return {ok:false,error:`BD cliente: ${directError||'no configurada'} · API: ${viaHttp.error}`};
}

async function queueRetry(kind,payload,error){
  await q(`INSERT INTO sync_outbox(kind,resource_id,payload,last_error) VALUES($1,$2,$3::jsonb,$4)
    ON CONFLICT(kind,resource_id) DO UPDATE SET payload=EXCLUDED.payload,last_error=EXCLUDED.last_error,next_attempt_at=now()`,[kind,payload.id,JSON.stringify(payload),error]);
}

async function syncResource(kind,row,payload){
  const result=await deliverSync(kind,payload);
  const table=kind==='PROPERTY'?'properties':'promotions';
  if(result.ok){
    await q(`UPDATE ${table} SET sync_status='SYNCED',sync_error=NULL,synced_at=now() WHERE id=$1`,[row.id]);
    await q('DELETE FROM sync_outbox WHERE kind=$1 AND resource_id=$2',[kind,row.id]);
  }else{
    await q(`UPDATE ${table} SET sync_status='PENDING',sync_error=$2 WHERE id=$1`,[row.id,result.error]);
    await queueRetry(kind,payload,result.error);
  }
  return result;
}

async function processSyncQueue(){
  try{
    const {rows}=await q('SELECT * FROM sync_outbox WHERE next_attempt_at<=now() ORDER BY created_at LIMIT 10');
    for(const item of rows){
      const result=await deliverSync(item.kind,item.payload);
      if(result.ok){
        await q('DELETE FROM sync_outbox WHERE id=$1',[item.id]);
        const table=item.kind==='PROPERTY'?'properties':'promotions';
        await q(`UPDATE ${table} SET sync_status='SYNCED',sync_error=NULL,synced_at=now() WHERE id=$1`,[item.resource_id]);
      }else{
        await q("UPDATE sync_outbox SET attempts=attempts+1,last_error=$2,next_attempt_at=now()+make_interval(secs=>LEAST(300,30*power(2,LEAST(attempts,4)))::int) WHERE id=$1",[item.id,result.error]);
      }
    }
  }catch(error){console.error('Error procesando cola de sincronización:',error.message)}
}

async function reconcilePublishedContent(){
  try{
    const propertyRows=(await q("SELECT * FROM properties WHERE published=true AND (sync_status<>'SYNCED' OR synced_at IS NULL OR synced_at<updated_at) LIMIT 20")).rows;
    for(const property of propertyRows)await syncResource('PROPERTY',property,propertyPayload(property));
    const promotionRows=(await q("SELECT * FROM promotions WHERE published=true AND (sync_status<>'SYNCED' OR synced_at IS NULL OR synced_at<updated_at) LIMIT 20")).rows;
    for(const promotion of promotionRows)await syncResource('PROMOTION',promotion,promotionPayload(promotion));
    await processSyncQueue();
  }catch(error){console.error('Error reconciliando portal de clientes:',error.message)}
}

// ── USUARIOS (base clientes) ──────────────────────────────────────────────────
app.get('/v1/users',role('SUPER_ADMIN'),safe(async(_,res)=>res.json({items:(await qc('SELECT id,email,name,created_at FROM users ORDER BY created_at DESC')).rows})));
app.post('/v1/users',role('SUPER_ADMIN'),safe(async(req,res)=>{const d=z.object({email:z.string().email(),password:z.string().min(8),name:z.string().min(2)}).parse(req.body);const hp=await hash(d.password);const{rows}=await qc('INSERT INTO users(email,password_hash,name) VALUES(lower($1),$2,$3) RETURNING id,email,name,created_at',[d.email,hp,d.name]);res.status(201).json(rows[0])}));
app.put('/v1/users/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{const d=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8).optional()}).parse(req.body);if(d.password){const hp=await hash(d.password);const{rows}=await qc('UPDATE users SET name=$1,email=lower($2),password_hash=$3 WHERE id=$4 RETURNING id,email,name',[d.name,d.email,hp,req.params.id]);return res.json(rows[0])}else{const{rows}=await qc('UPDATE users SET name=$1,email=lower($2) WHERE id=$3 RETURNING id,email,name',[d.name,d.email,req.params.id]);return res.json(rows[0])}}));
app.delete('/v1/users/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{await qc('DELETE FROM reservations WHERE user_id=$1',[req.params.id]);await qc('DELETE FROM users WHERE id=$1',[req.params.id]);res.json({success:true})}));

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/health',safe(async(_,r)=>{if(process.env.DATABASE_URL)await q('SELECT 1');r.json({status:'ok',service:'api-empleados'})}));

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get('/v1/dashboard',role('SUPER_ADMIN','MANAGER','FINANCE'),safe(async(_,res)=>{
  const employeeQueries=await Promise.all([
    q(`SELECT count(*)::int total,
      count(*) FILTER(WHERE status='AVAILABLE')::int available,
      count(*) FILTER(WHERE status='CLEANING')::int cleaning,
      count(*) FILTER(WHERE status='MAINTENANCE')::int maintenance,
      count(*) FILTER(WHERE status='OCCUPIED')::int occupied,
      count(*) FILTER(WHERE published=true)::int published,
      count(*) FILTER(WHERE sync_status='PENDING')::int pending_sync FROM properties`),
    q(`SELECT COALESCE(sum(amount) FILTER(WHERE occurred_on>=date_trunc('month',current_date)),0)::float current_month,
      COALESCE(sum(amount) FILTER(WHERE occurred_on>=date_trunc('month',current_date)-interval '1 month' AND occurred_on<date_trunc('month',current_date)),0)::float previous_month,
      count(*) FILTER(WHERE occurred_on>=date_trunc('month',current_date))::int transactions FROM expenses`),
    q(`SELECT count(*) FILTER(WHERE status IN('REQUESTED','IN_PROGRESS'))::int pending,
      count(*) FILTER(WHERE status='COMPLETED' AND completed_at::date=current_date)::int completed_today FROM cleaning_tasks`),
    q(`SELECT count(*)::int total,count(*) FILTER(WHERE active=true)::int active,
      count(*) FILTER(WHERE sync_status='PENDING')::int pending_sync FROM promotions`),
    q(`SELECT count(*) FILTER(WHERE active=true)::int active FROM employees`),
    q(`SELECT description,category,amount::float,occurred_on AS date FROM expenses ORDER BY occurred_on DESC,created_at DESC LIMIT 5`)
  ]);
  let reservationStats={active:0,arrivalsToday:0,departuresToday:0,occupiedToday:0,guestsToday:0,estimatedRevenue:0};
  let bookingTrend=[];
  let recentReservations=[];
  let clientAvailable=true;
  try{
    const [stats,trend,recent]=await Promise.all([
      qc(`SELECT
        count(*) FILTER(WHERE status IN('HOLD','PAID') AND (status='PAID' OR hold_until>now()))::int active,
        count(*) FILTER(WHERE starts_on=current_date AND status IN('HOLD','PAID') AND (status='PAID' OR hold_until>now()))::int arrivals,
        count(*) FILTER(WHERE ends_on=current_date AND status='PAID')::int departures,
        count(DISTINCT property_id) FILTER(WHERE starts_on<=current_date AND ends_on>current_date AND status IN('HOLD','PAID') AND (status='PAID' OR hold_until>now()))::int occupied,
        COALESCE(sum(guests) FILTER(WHERE starts_on<=current_date AND ends_on>current_date AND status IN('HOLD','PAID') AND (status='PAID' OR hold_until>now())),0)::int guests,
        COALESCE(sum((ends_on-starts_on)*p.base_price) FILTER(WHERE r.status='PAID' AND r.created_at>=date_trunc('month',now())),0)::float revenue
        FROM reservations r JOIN properties p ON p.id=r.property_id`),
      qc(`WITH days AS (SELECT generate_series(current_date-interval '13 days',current_date,interval '1 day')::date day)
        SELECT to_char(days.day,'YYYY-MM-DD') day,count(r.id)::int reservations
        FROM days LEFT JOIN reservations r ON r.created_at::date=days.day GROUP BY days.day ORDER BY days.day`),
      qc(`SELECT r.id,r.starts_on AS "startsOn",r.ends_on AS "endsOn",r.guests,r.status,r.created_at AS "createdAt",
        p.name AS "propertyName",u.name AS "guestName" FROM reservations r
        JOIN properties p ON p.id=r.property_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 6`)
    ]);
    const row=stats.rows[0]||{};
    reservationStats={active:row.active||0,arrivalsToday:row.arrivals||0,departuresToday:row.departures||0,occupiedToday:row.occupied||0,guestsToday:row.guests||0,estimatedRevenue:row.revenue||0};
    bookingTrend=trend.rows;
    recentReservations=recent.rows;
  }catch(error){clientAvailable=false;console.error('Dashboard: métricas de clientes no disponibles:',error.message)}
  const properties=employeeQueries[0].rows[0];
  const expenses=employeeQueries[1].rows[0];
  const previous=Number(expenses.previous_month||0),current=Number(expenses.current_month||0);
  res.json({
    generatedAt:new Date().toISOString(),sources:{operations:true,clients:clientAvailable},
    properties,reservations:reservationStats,
    expenses:{currentMonth:current,previousMonth:previous,transactions:expenses.transactions||0,variation:previous?((current-previous)/previous)*100:null},
    cleaning:employeeQueries[2].rows[0],promotions:employeeQueries[3].rows[0],employees:employeeQueries[4].rows[0],
    bookingTrend,recentReservations,recentExpenses:employeeQueries[5].rows
  });
}));

// ── PROPIEDADES ───────────────────────────────────────────────────────────────
app.get('/v1/properties',role('SUPER_ADMIN','MANAGER','RECEPTION','HOUSEKEEPING','MAINTENANCE'),safe(async(_,res)=>res.json({items:(await q('SELECT * FROM properties ORDER BY updated_at DESC')).rows})));

app.post('/v1/properties',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const d=z.object({name:z.string().min(3),type:z.enum(['HOTEL','ROOM','HOUSE','APARTMENT','SUITE']),city:z.string().min(1),address:z.string().optional(),maxGuests:z.number().int().positive(),basePrice:z.number().nonnegative(),details:z.any().optional(),media:z.any().optional()}).parse(req.body);
  const mediaArr=Array.isArray(d.media)?d.media:[];
  const detailsObj=d.details&&typeof d.details==='object'&&!Array.isArray(d.details)?d.details:{};
  const {rows}=await q("INSERT INTO properties(name,type,city,address,max_guests,base_price,details,media,published,sync_status) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,true,'PENDING') RETURNING *",[d.name,d.type,d.city,d.address||'',d.maxGuests,d.basePrice,JSON.stringify(detailsObj),JSON.stringify(mediaArr)]);
  await q("INSERT INTO audit_log(action,resource,resource_id) VALUES('CREATE','PROPERTY',$1)",[rows[0].id]);
  const sync=await syncResource('PROPERTY',rows[0],propertyPayload(rows[0]));
  res.status(201).json({...rows[0],sync});
}));

app.put('/v1/properties/:id',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const d=z.object({name:z.string().min(3),type:z.enum(['HOTEL','ROOM','HOUSE','APARTMENT','SUITE']),city:z.string().min(1),address:z.string().optional(),maxGuests:z.number().int().positive(),basePrice:z.number().nonnegative(),status:z.string().optional(),details:z.any().optional(),media:z.any().optional()}).parse(req.body);
  const mediaArr=Array.isArray(d.media)?d.media:[];
  const detailsObj=d.details&&typeof d.details==='object'&&!Array.isArray(d.details)?d.details:{};
  const {rows}=await q("UPDATE properties SET name=$1,type=$2,city=$3,address=$4,max_guests=$5,base_price=$6,status=COALESCE($7,status),details=$8::jsonb,media=$9::jsonb,published=true,version=version+1,sync_status='PENDING',updated_at=now() WHERE id=$10 RETURNING *",[d.name,d.type,d.city,d.address||'',d.maxGuests,d.basePrice,d.status||null,JSON.stringify(detailsObj),JSON.stringify(mediaArr),req.params.id]);
  if(!rows[0])return res.status(404).end();
  const sync=await syncResource('PROPERTY',rows[0],propertyPayload(rows[0]));
  res.json({...rows[0],sync});
}));

app.delete('/v1/properties/:id',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const {rows}=await q('SELECT * FROM properties WHERE id=$1',[req.params.id]);
  if(!rows[0])return res.status(404).end();
  const payload=propertyPayload({...rows[0],version:Number(rows[0].version)+1},false);
  const result=await deliverSync('PROPERTY',payload);
  if(!result.ok)await queueRetry('PROPERTY',payload,result.error);
  await q('DELETE FROM properties WHERE id=$1',[req.params.id]);
  res.json({success:true,synced:result.ok,syncError:result.error||null});
}));

app.post('/v1/properties/:id/publish',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const {rows}=await q("UPDATE properties SET published=true,version=version+1,sync_status='PENDING',updated_at=now() WHERE id=$1 RETURNING *",[req.params.id]);
  if(!rows[0])return res.status(404).end();
  const result=await syncResource('PROPERTY',rows[0],propertyPayload(rows[0]));
  res.json({
    property: rows[0],
    synced: result.ok,
    syncError: result.error||null,
    channel: result.channel||null,
    message: result.ok ? 'Propiedad publicada y sincronizada correctamente' : 'Propiedad publicada. El reintento automático quedó programado.'
  });
}));

// ── PROMOCIONES DEL PORTAL DE CLIENTES ──────────────────────────────────────
const promotionInput=z.object({title:z.string().min(3).max(120),subtitle:z.string().max(320).optional().default(''),badge:z.string().max(40).optional().default(''),imageUrl:z.string().min(10),mobileImageUrl:z.string().optional().default(''),ctaLabel:z.string().max(50).optional().default('Ver alojamientos'),ctaUrl:z.string().max(500).optional().default('#alojamientos'),active:z.boolean().optional().default(true),startsAt:z.string().nullable().optional(),endsAt:z.string().nullable().optional(),sortOrder:z.number().int().min(0).max(1000).optional().default(0)});

app.get('/v1/promotions',role('SUPER_ADMIN','MANAGER','RECEPTION'),safe(async(_,res)=>res.json({items:(await q('SELECT * FROM promotions ORDER BY sort_order ASC,updated_at DESC')).rows})));

app.post('/v1/promotions',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const d=promotionInput.parse(req.body);
  const {rows}=await q("INSERT INTO promotions(title,subtitle,badge,image_url,mobile_image_url,cta_label,cta_url,active,starts_at,ends_at,sort_order,published,sync_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,'PENDING') RETURNING *",[d.title,d.subtitle,d.badge,d.imageUrl,d.mobileImageUrl,d.ctaLabel,d.ctaUrl,d.active,d.startsAt||null,d.endsAt||null,d.sortOrder]);
  const sync=await syncResource('PROMOTION',rows[0],promotionPayload(rows[0]));
  res.status(201).json({...rows[0],sync});
}));

app.put('/v1/promotions/:id',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const d=promotionInput.parse(req.body);
  const {rows}=await q("UPDATE promotions SET title=$1,subtitle=$2,badge=$3,image_url=$4,mobile_image_url=$5,cta_label=$6,cta_url=$7,active=$8,starts_at=$9,ends_at=$10,sort_order=$11,published=true,version=version+1,sync_status='PENDING',updated_at=now() WHERE id=$12 RETURNING *",[d.title,d.subtitle,d.badge,d.imageUrl,d.mobileImageUrl,d.ctaLabel,d.ctaUrl,d.active,d.startsAt||null,d.endsAt||null,d.sortOrder,req.params.id]);
  if(!rows[0])return res.status(404).end();
  const sync=await syncResource('PROMOTION',rows[0],promotionPayload(rows[0]));
  res.json({...rows[0],sync});
}));

app.post('/v1/promotions/:id/publish',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const {rows}=await q("UPDATE promotions SET published=true,version=version+1,sync_status='PENDING',updated_at=now() WHERE id=$1 RETURNING *",[req.params.id]);
  if(!rows[0])return res.status(404).end();
  const result=await syncResource('PROMOTION',rows[0],promotionPayload(rows[0]));
  res.json({promotion:rows[0],synced:result.ok,syncError:result.error||null,channel:result.channel||null});
}));

app.delete('/v1/promotions/:id',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const {rows}=await q('SELECT * FROM promotions WHERE id=$1',[req.params.id]);
  if(!rows[0])return res.status(404).end();
  const payload=promotionPayload({...rows[0],active:false,version:Number(rows[0].version)+1});
  const result=await deliverSync('PROMOTION',payload);
  if(!result.ok)await queueRetry('PROMOTION',payload,result.error);
  await q('DELETE FROM promotions WHERE id=$1',[req.params.id]);
  res.json({success:true,synced:result.ok,syncError:result.error||null});
}));

// ── RESERVACIONES ─────────────────────────────────────────────────────────────
app.get('/v1/reservations',role('SUPER_ADMIN','MANAGER','RECEPTION'),safe(async(_,res)=>{const {rows}=await qc('SELECT r.id,r.starts_on AS "startsOn",r.ends_on AS "endsOn",r.guests,r.status,r.created_at AS "createdAt",p.name AS "propertyName",u.name AS "guestName",u.email AS "guestEmail" FROM reservations r JOIN properties p ON r.property_id=p.id JOIN users u ON r.user_id=u.id ORDER BY r.created_at DESC');res.json({items:rows})}));
app.put('/v1/reservations/:id',role('SUPER_ADMIN','MANAGER','RECEPTION'),safe(async(req,res)=>{const d=z.object({status:z.string(),guests:z.number().int().positive()}).parse(req.body);const {rows}=await qc('UPDATE reservations SET status=$1,guests=$2 WHERE id=$3 RETURNING *',[d.status,d.guests,req.params.id]);if(!rows[0])return res.status(404).end();res.json(rows[0])}));
app.delete('/v1/reservations/:id',role('SUPER_ADMIN','MANAGER','RECEPTION'),safe(async(req,res)=>{await qc('DELETE FROM reservations WHERE id=$1',[req.params.id]);res.json({success:true})}));

// ── EMPLEADOS ─────────────────────────────────────────────────────────────────
app.get('/v1/employees',role('SUPER_ADMIN','MANAGER'),safe(async(_,res)=>{res.json({items:(await q('SELECT id,email,name,role,active,clock_number,created_at FROM employees ORDER BY clock_number ASC NULLS LAST, created_at DESC')).rows})}));

app.post('/v1/employees',role('SUPER_ADMIN'),safe(async(req,res)=>{
  const d=z.object({email:z.string().email(),password:z.string().min(8),name:z.string().min(2),role:z.string()}).parse(req.body);
  const hp=await hash(d.password);
  const {rows}=await q("INSERT INTO employees(email,name,password_hash,role,clock_number) VALUES(lower($1),$2,$3,$4,nextval('employee_clock_seq')) RETURNING id,email,name,role,active,clock_number,created_at",[d.email,d.name,hp,d.role]);
  res.status(201).json(rows[0]);
}));

app.put('/v1/employees/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{
  const d=z.object({name:z.string().min(2),email:z.string().email(),role:z.string(),active:z.boolean().optional(),password:z.string().min(8).optional()}).parse(req.body);
  if(d.password){const hp=await hash(d.password);const {rows}=await q('UPDATE employees SET name=$1,email=lower($2),role=$3,active=COALESCE($4,active),password_hash=$5 WHERE id=$6 RETURNING id,email,name,role,active,clock_number',[d.name,d.email,d.role,d.active,hp,req.params.id]);return res.json(rows[0])}
  else{const {rows}=await q('UPDATE employees SET name=$1,email=lower($2),role=$3,active=COALESCE($4,active) WHERE id=$5 RETURNING id,email,name,role,active,clock_number',[d.name,d.email,d.role,d.active,req.params.id]);return res.json(rows[0])}
}));

app.delete('/v1/employees/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{await q('DELETE FROM employees WHERE id=$1',[req.params.id]);res.json({success:true})}));

// ── NÓMINA ────────────────────────────────────────────────────────────────────
app.get('/v1/payroll',role('SUPER_ADMIN','MANAGER','FINANCE'),safe(async(_,res)=>{
  const {rows}=await q(`
    SELECT py.id, py.employee_id AS "employeeId",
      py.period_start AS "periodStart", py.period_end AS "periodEnd",
      py.gross::float, py.deductions, py.net::float, py.status,
      py.overtime_hours::float, py.overtime_pay::float,
      py.attendance_bonus::float, py.punctuality_bonus::float,
      py.imss_employee::float, py.imss_employer::float,
      py.infonavit::float, py.fonacot::float, py.isr::float,
      py.other_deductions, py.time_entries, py.notes,
      py.created_at AS "createdAt",
      e.name AS "employeeName", e.email AS "employeeEmail",
      e.role AS "employeeRole", e.clock_number AS "clockNumber"
    FROM payroll py
    JOIN employees e ON py.employee_id = e.id
    ORDER BY py.created_at DESC
  `);
  res.json({items:rows});
}));

app.post('/v1/payroll',role('SUPER_ADMIN','FINANCE'),safe(async(req,res)=>{
  const d=z.object({
    employeeId:z.string().uuid(),
    periodStart:z.string(),
    periodEnd:z.string(),
    gross:z.number(),
    net:z.number(),
    status:z.string().optional(),
    overtimeHours:z.number().optional().default(0),
    overtimePay:z.number().optional().default(0),
    attendanceBonus:z.number().optional().default(0),
    punctualityBonus:z.number().optional().default(0),
    imssEmployee:z.number().optional().default(0),
    imssEmployer:z.number().optional().default(0),
    infonavit:z.number().optional().default(0),
    fonacot:z.number().optional().default(0),
    isr:z.number().optional().default(0),
    otherDeductions:z.any().optional(),
    timeEntries:z.any().optional(),
    notes:z.string().optional()
  }).parse(req.body);

  const {rows}=await q(`
    INSERT INTO payroll(
      employee_id,period_start,period_end,gross,net,status,
      overtime_hours,overtime_pay,attendance_bonus,punctuality_bonus,
      imss_employee,imss_employer,infonavit,fonacot,isr,
      other_deductions,time_entries,notes
    ) VALUES($1,$2,$3,$4,$5,COALESCE($6,'DRAFT'),$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18)
    RETURNING *
  `,[
    d.employeeId,d.periodStart,d.periodEnd,d.gross,d.net,d.status,
    d.overtimeHours,d.overtimePay,d.attendanceBonus,d.punctualityBonus,
    d.imssEmployee,d.imssEmployer,d.infonavit,d.fonacot,d.isr,
    JSON.stringify(d.otherDeductions||{}),
    JSON.stringify(d.timeEntries||[]),
    d.notes||''
  ]);
  res.status(201).json(rows[0]);
}));

app.put('/v1/payroll/:id',role('SUPER_ADMIN','FINANCE'),safe(async(req,res)=>{
  const d=z.object({status:z.string()}).parse(req.body);
  const {rows}=await q('UPDATE payroll SET status=$1 WHERE id=$2 RETURNING *',[d.status,req.params.id]);
  res.json(rows[0]);
}));

app.delete('/v1/payroll/:id',role('SUPER_ADMIN','FINANCE'),safe(async(req,res)=>{await q('DELETE FROM payroll WHERE id=$1',[req.params.id]);res.json({success:true})}));

// ── LIMPIEZA / HOUSEKEEPING ──────────────────────────────────────────────────
app.get('/v1/cleaning-tasks',role('SUPER_ADMIN','MANAGER','RECEPTION','HOUSEKEEPING'),safe(async(_,res)=>{
  const {rows}=await q(`SELECT ct.id,ct.property_id AS "propertyId",ct.task_type AS "taskType",ct.priority,ct.status,
    ct.requested_for AS "requestedFor",ct.notes,ct.checklist,ct.completed_at AS "completedAt",ct.created_at AS "createdAt",
    p.name AS "propertyName",e.name AS "assignedName"
    FROM cleaning_tasks ct JOIN properties p ON p.id=ct.property_id
    LEFT JOIN employees e ON e.id=ct.assigned_to ORDER BY
    CASE ct.status WHEN 'REQUESTED' THEN 1 WHEN 'IN_PROGRESS' THEN 2 ELSE 3 END,ct.requested_for ASC`);
  res.json({items:rows});
}));

app.post('/v1/cleaning-tasks',role('SUPER_ADMIN','MANAGER','RECEPTION','HOUSEKEEPING'),safe(async(req,res)=>{
  const d=z.object({propertyId:z.string().uuid(),taskType:z.enum(['CHECKOUT','STAYOVER','DEEP','INSPECTION']),priority:z.enum(['LOW','NORMAL','HIGH','URGENT']),requestedFor:z.string(),notes:z.string().max(1000).optional()}).parse(req.body);
  const {rows}=await q(`INSERT INTO cleaning_tasks(property_id,task_type,priority,requested_for,notes,created_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[d.propertyId,d.taskType,d.priority,d.requestedFor,d.notes||'',req.employee.id]);
  await q("UPDATE properties SET status='CLEANING',updated_at=now() WHERE id=$1 AND status='AVAILABLE'",[d.propertyId]);
  res.status(201).json(rows[0]);
}));

app.put('/v1/cleaning-tasks/:id',role('SUPER_ADMIN','MANAGER','HOUSEKEEPING'),safe(async(req,res)=>{
  const d=z.object({status:z.enum(['REQUESTED','IN_PROGRESS','COMPLETED','CANCELLED']),notes:z.string().max(1000).optional(),checklist:z.array(z.string()).optional()}).parse(req.body);
  const {rows}=await q(`UPDATE cleaning_tasks SET status=$1,notes=COALESCE($2,notes),checklist=COALESCE($3::jsonb,checklist),
    assigned_to=CASE WHEN $1='IN_PROGRESS' THEN $4 ELSE assigned_to END,
    completed_at=CASE WHEN $1='COMPLETED' THEN now() ELSE completed_at END,updated_at=now() WHERE id=$5 RETURNING *`,
    [d.status,d.notes,JSON.stringify(d.checklist||[]),req.employee.id,req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Solicitud de limpieza no encontrada'});
  if(d.status==='COMPLETED')await q("UPDATE properties SET status='AVAILABLE',updated_at=now() WHERE id=$1",[rows[0].property_id]);
  res.json(rows[0]);
}));

// ── CENTRO DE TRABAJO, TICKETS Y PRIVACIDAD ─────────────────────────────────
const allStaff=['SUPER_ADMIN','MANAGER','FINANCE','RECEPTION','HOUSEKEEPING','MAINTENANCE'];
const departmentForRole={FINANCE:'FINANCE',RECEPTION:'RECEPTION',HOUSEKEEPING:'HOUSEKEEPING',MAINTENANCE:'MAINTENANCE'};
const canManageDepartment=(employee,department)=>['SUPER_ADMIN','MANAGER'].includes(employee.role)||departmentForRole[employee.role]===department;
const ticketInput=z.object({department:z.enum(['RECEPTION','HOUSEKEEPING','MAINTENANCE','FINANCE','MANAGEMENT']),category:z.string().min(2).max(80),subject:z.string().min(3).max(160),description:z.string().min(5).max(4000),priority:z.enum(['LOW','NORMAL','HIGH','URGENT']).default('NORMAL'),propertyId:z.string().uuid().nullable().optional()});
async function importGuestAlerts(){
  try{
    const tickets=(await qc(`SELECT id,folio,department,subject FROM service_requests WHERE created_at>now()-interval '30 days'`)).rows;
    for(const item of tickets)await q(`INSERT INTO notifications(role_target,title,message,link_tab,resource_key) VALUES($1,$2,$3,'centro',$4) ON CONFLICT(resource_key) DO NOTHING`,[item.department,`Solicitud de huésped #${item.folio}`,item.subject,`client-ticket:${item.id}`]);
    const feedback=(await qc(`SELECT id,subject FROM guest_feedback WHERE created_at>now()-interval '30 days'`)).rows;
    for(const item of feedback)await q(`INSERT INTO notifications(role_target,title,message,link_tab,resource_key) VALUES('SUPER_ADMIN','Nuevo mensaje privado de huésped',$1,'buzon',$2) ON CONFLICT(resource_key) DO NOTHING`,[item.subject,`guest-feedback:${item.id}`]);
    const reservations=(await qc(`SELECT r.id,p.name AS property_name,u.name AS guest_name FROM reservations r JOIN properties p ON p.id=r.property_id JOIN users u ON u.id=r.user_id WHERE r.created_at>now()-interval '30 days'`)).rows;
    for(const item of reservations)await q(`INSERT INTO notifications(role_target,title,message,link_tab,resource_key) VALUES('RECEPTION','Nueva reservación',$1,'reservaciones',$2) ON CONFLICT(resource_key) DO NOTHING`,[`${item.guest_name} · ${item.property_name}`,`reservation:${item.id}`]);
  }catch(error){console.error('Alertas de huéspedes pendientes:',error.message)}
}

app.get('/v1/workspace/summary',role(...allStaff),safe(async(req,res)=>{
  await importGuestAlerts();
  const ownDepartment=departmentForRole[req.employee.role];
  const params=['SUPER_ADMIN','MANAGER'].includes(req.employee.role)?[]:[req.employee.id,ownDepartment||'NONE'];
  const filter=params.length?'WHERE (created_by=$1 OR department=$2)':'';
  const internal=(await q(`SELECT count(*) FILTER(WHERE status NOT IN('RESOLVED','CLOSED'))::int open,count(*) FILTER(WHERE priority='URGENT' AND status NOT IN('RESOLVED','CLOSED'))::int urgent FROM work_tickets ${filter}`,params)).rows[0];
  let client={open:0,urgent:0};
  try{client=(await qc(`SELECT count(*) FILTER(WHERE status NOT IN('RESOLVED','CLOSED'))::int open,count(*) FILTER(WHERE priority='URGENT' AND status NOT IN('RESOLVED','CLOSED'))::int urgent FROM service_requests ${['SUPER_ADMIN','MANAGER'].includes(req.employee.role)?'':'WHERE department=$1'}`,['SUPER_ADMIN','MANAGER'].includes(req.employee.role)?[]:[ownDepartment||'NONE'])).rows[0]}catch{}
  const unread=(await q(`SELECT count(*)::int FROM notifications WHERE ${req.employee.role==='SUPER_ADMIN'?'true':'(employee_id=$1 OR role_target=$2 OR role_target=\'ALL\')'} AND read_at IS NULL`,req.employee.role==='SUPER_ADMIN'?[]:[req.employee.id,req.employee.role])).rows[0].count;
  res.json({open:Number(internal.open||0)+Number(client.open||0),urgent:Number(internal.urgent||0)+Number(client.urgent||0),unread});
}));

app.get('/v1/workspace/tickets',role(...allStaff),safe(async(req,res)=>{
  const admin=['SUPER_ADMIN','MANAGER'].includes(req.employee.role),dept=departmentForRole[req.employee.role]||'NONE';
  const internal=(await q(`SELECT wt.*,p.name AS property_name,e.name AS assigned_name FROM work_tickets wt LEFT JOIN properties p ON p.id=wt.property_id LEFT JOIN employees e ON e.id=wt.assigned_to ${admin?'':'WHERE wt.created_by=$1 OR wt.department=$2'} ORDER BY wt.created_at DESC LIMIT 150`,admin?[]:[req.employee.id,dept])).rows.map(x=>({...x,source:'EMPLOYEE'}));
  let client=[];try{client=(await qc(`SELECT sr.*,p.name AS property_name,u.name AS requester_name,u.email AS requester_email FROM service_requests sr LEFT JOIN properties p ON p.id=sr.property_id LEFT JOIN users u ON u.id=sr.user_id ${admin?'':'WHERE sr.department=$1'} ORDER BY sr.created_at DESC LIMIT 150`,admin?[]:[dept])).rows.map(x=>({...x,source:'CLIENT'}))}catch{}
  res.json({items:[...internal,...client].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))});
}));

app.post('/v1/workspace/tickets',role(...allStaff),safe(async(req,res)=>{
  const d=ticketInput.parse(req.body);
  const {rows}=await q(`INSERT INTO work_tickets(requester_id,requester_name,requester_email,department,category,subject,description,priority,property_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$1) RETURNING *`,[req.employee.id,req.employee.name,req.employee.email,d.department,d.category,d.subject,d.description,d.priority,d.propertyId||null]);
  await q(`INSERT INTO notifications(role_target,title,message,link_tab) VALUES($1,$2,$3,'centro')`,[d.department==='MANAGEMENT'?'SUPER_ADMIN':d.department,`Nuevo ticket #${rows[0].folio}`,d.subject]);
  res.status(201).json(rows[0]);
}));

app.put('/v1/workspace/tickets/:source/:id',role(...allStaff),safe(async(req,res)=>{
  const d=z.object({status:z.enum(['OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED']),resolution:z.string().max(4000).optional()}).parse(req.body);
  const source=req.params.source.toUpperCase();
  if(source==='CLIENT'){
    const existing=(await qc('SELECT department FROM service_requests WHERE id=$1',[req.params.id])).rows[0];
    if(!existing)return res.status(404).json({error:'Ticket no encontrado'});
    if(!canManageDepartment(req.employee,existing.department))return res.status(403).json({error:'Este ticket pertenece a otro departamento'});
    const {rows}=await qc(`UPDATE service_requests SET status=$1,resolution=COALESCE($2,resolution),assigned_name=$3,closed_at=CASE WHEN $1 IN('RESOLVED','CLOSED') THEN now() ELSE NULL END,updated_at=now() WHERE id=$4 RETURNING *`,[d.status,d.resolution,req.employee.name,req.params.id]);return res.json(rows[0]);
  }
  const existing=(await q('SELECT department,created_by FROM work_tickets WHERE id=$1',[req.params.id])).rows[0];
  if(!existing)return res.status(404).json({error:'Ticket no encontrado'});
  if(!canManageDepartment(req.employee,existing.department))return res.status(403).json({error:'Este ticket pertenece a otro departamento'});
  const {rows}=await q(`UPDATE work_tickets SET status=$1,resolution=COALESCE($2,resolution),assigned_to=$3,closed_at=CASE WHEN $1 IN('RESOLVED','CLOSED') THEN now() ELSE NULL END,updated_at=now() WHERE id=$4 RETURNING *`,[d.status,d.resolution,req.employee.id,req.params.id]);
  await q(`INSERT INTO notifications(employee_id,title,message,link_tab) VALUES($1,$2,$3,'centro')`,[existing.created_by,`Ticket #${rows[0].folio} actualizado`,`Estado: ${d.status}`]);res.json(rows[0]);
}));

app.post('/v1/workspace/confidential',role(...allStaff),safe(async(req,res)=>{const d=z.object({kind:z.enum(['COMPLAINT','SUGGESTION','IMPROVEMENT','PRIVATE']),subject:z.string().min(3).max(160),message:z.string().min(5).max(5000)}).parse(req.body);const {rows}=await q('INSERT INTO confidential_inbox(sender_id,sender_name,kind,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING id,created_at',[req.employee.id,req.employee.name,d.kind,d.subject,d.message]);await q(`INSERT INTO notifications(role_target,title,message,link_tab) VALUES('SUPER_ADMIN','Nuevo mensaje confidencial',$1,'buzon')`,[d.subject]);res.status(201).json(rows[0])}));
app.get('/v1/workspace/confidential',role('SUPER_ADMIN'),safe(async(_,res)=>{const employee=(await q('SELECT *,\'EMPLOYEE\' AS source FROM confidential_inbox')).rows;let guest=[];try{guest=(await qc(`SELECT gf.*,u.name AS sender_name,u.email AS sender_email,'CLIENT' AS source FROM guest_feedback gf LEFT JOIN users u ON u.id=gf.user_id`)).rows}catch{}res.json({items:[...employee,...guest].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))})}));
app.put('/v1/workspace/confidential/:source/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{const d=z.object({status:z.enum(['NEW','REVIEWED','CLOSED']),response:z.string().max(4000).optional()}).parse(req.body);const db=req.params.source.toUpperCase()==='CLIENT'?qc:q;const table=req.params.source.toUpperCase()==='CLIENT'?'guest_feedback':'confidential_inbox';res.json((await db(`UPDATE ${table} SET status=$1,admin_response=$2,updated_at=now() WHERE id=$3 RETURNING *`,[d.status,d.response||null,req.params.id])).rows[0])}));

app.get('/v1/workspace/notifications',role(...allStaff),safe(async(req,res)=>{await importGuestAlerts();res.json({items:(await q(`SELECT * FROM notifications ${req.employee.role==='SUPER_ADMIN'?'':'WHERE employee_id=$1 OR role_target=$2 OR role_target=\'ALL\''} ORDER BY created_at DESC LIMIT 50`,req.employee.role==='SUPER_ADMIN'?[]:[req.employee.id,req.employee.role])).rows})}));
app.put('/v1/workspace/notifications/read',role(...allStaff),safe(async(req,res)=>{await q(`UPDATE notifications SET read_at=now() WHERE read_at IS NULL ${req.employee.role==='SUPER_ADMIN'?'':'AND (employee_id=$1 OR role_target=$2 OR role_target=\'ALL\')'}`,req.employee.role==='SUPER_ADMIN'?[]:[req.employee.id,req.employee.role]);res.json({success:true})}));

app.get('/v1/workspace/contacts',role(...allStaff),safe(async(req,res)=>{const contacts=(await q(`SELECT * FROM contacts WHERE scope='SHARED' OR owner_id=$1 ORDER BY name`,[req.employee.id])).rows;const staff=(await q(`SELECT id,name,email,role,clock_number FROM employees WHERE active=true ORDER BY name`)).rows;res.json({contacts,staff})}));
app.post('/v1/workspace/contacts',role(...allStaff),safe(async(req,res)=>{const d=z.object({scope:z.enum(['PERSONAL','SHARED']),name:z.string().min(2),organization:z.string().optional(),phone:z.string().optional(),email:z.string().optional(),address:z.string().optional(),notes:z.string().optional()}).parse(req.body);if(d.scope==='SHARED'&&!['SUPER_ADMIN','MANAGER'].includes(req.employee.role))return res.status(403).json({error:'Solo gerencia puede crear contactos compartidos'});res.status(201).json((await q('INSERT INTO contacts(owner_id,scope,name,organization,phone,email,address,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.employee.id,d.scope,d.name,d.organization||'',d.phone||'',d.email||'',d.address||'',d.notes||''])).rows[0])}));

app.get('/v1/workspace/notes',role(...allStaff),safe(async(req,res)=>res.json({items:(await q('SELECT * FROM digital_notes WHERE owner_id=$1 ORDER BY pinned DESC,updated_at DESC',[req.employee.id])).rows})));
app.post('/v1/workspace/notes',role(...allStaff),safe(async(req,res)=>{const d=z.object({title:z.string().min(1).max(120),body:z.string().max(2000).optional(),color:z.string().max(20).optional(),pinned:z.boolean().optional(),dueAt:z.string().nullable().optional()}).parse(req.body);res.status(201).json((await q('INSERT INTO digital_notes(owner_id,title,body,color,pinned,due_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[req.employee.id,d.title,d.body||'',d.color||'gold',d.pinned||false,d.dueAt||null])).rows[0])}));
app.delete('/v1/workspace/notes/:id',role(...allStaff),safe(async(req,res)=>{await q('DELETE FROM digital_notes WHERE id=$1 AND owner_id=$2',[req.params.id,req.employee.id]);res.json({success:true})}));

app.get('/v1/workspace/calendar',role(...allStaff),safe(async(req,res)=>res.json({items:(await q(`SELECT * FROM calendar_events WHERE owner_id=$1 OR scope='SHARED' OR (scope='DEPARTMENT' AND department=$2) ORDER BY starts_at`,[req.employee.id,departmentForRole[req.employee.role]||'NONE'])).rows})));
app.post('/v1/workspace/calendar',role(...allStaff),safe(async(req,res)=>{const d=z.object({scope:z.enum(['PERSONAL','DEPARTMENT','SHARED']),title:z.string().min(2),description:z.string().optional(),startsAt:z.string(),endsAt:z.string().nullable().optional(),department:z.string().nullable().optional(),location:z.string().optional()}).parse(req.body);if(d.scope==='SHARED'&&!['SUPER_ADMIN','MANAGER'].includes(req.employee.role))return res.status(403).json({error:'Solo gerencia puede publicar eventos generales'});res.status(201).json((await q('INSERT INTO calendar_events(owner_id,scope,title,description,starts_at,ends_at,department,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.employee.id,d.scope,d.title,d.description||'',d.startsAt,d.endsAt||null,d.department||departmentForRole[req.employee.role]||null,d.location||''])).rows[0])}));

app.get('/v1/workspace/documents',role('SUPER_ADMIN','MANAGER','FINANCE'),safe(async(_,res)=>res.json({items:(await q('SELECT d.*,e.name AS created_by_name FROM business_documents d LEFT JOIN employees e ON e.id=d.created_by ORDER BY d.created_at DESC')).rows})));
app.post('/v1/workspace/documents',role('SUPER_ADMIN','MANAGER','FINANCE'),safe(async(req,res)=>{const d=z.object({documentType:z.enum(['PURCHASE_TICKET','RECEIPT','QUOTE','INTERNAL']),title:z.string().min(2),recipientName:z.string().optional(),recipientEmail:z.string().optional(),concepts:z.array(z.object({description:z.string(),quantity:z.number().positive(),unitPrice:z.number().nonnegative()})).min(1),taxRate:z.number().min(0).max(1).default(0),notes:z.string().optional(),attachment:z.any().optional()}).parse(req.body);const subtotal=d.concepts.reduce((s,x)=>s+x.quantity*x.unitPrice,0),tax=subtotal*d.taxRate;res.status(201).json((await q('INSERT INTO business_documents(document_type,title,recipient_name,recipient_email,concepts,subtotal,tax,total,notes,attachment,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11) RETURNING *',[d.documentType,d.title,d.recipientName||'',d.recipientEmail||'',JSON.stringify(d.concepts),subtotal,tax,subtotal+tax,d.notes||'',JSON.stringify(d.attachment||null),req.employee.id])).rows[0])}));

// ── GASTOS ────────────────────────────────────────────────────────────────────
app.get('/v1/expenses',role('SUPER_ADMIN','FINANCE'),safe(async(_,res)=>res.json({items:(await q('SELECT * FROM expenses ORDER BY occurred_on DESC')).rows})));
app.post('/v1/expenses',role('SUPER_ADMIN','FINANCE'),safe(async(req,res)=>{const d=z.object({category:z.string(),kind:z.enum(['FIXED','VARIABLE','ASSET']),description:z.string(),amount:z.number().positive(),occurredOn:z.string()}).parse(req.body);res.status(201).json((await q('INSERT INTO expenses(category,kind,description,amount,occurred_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[d.category,d.kind,d.description,d.amount,d.occurredOn])).rows[0])}));

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((e,req,res,next)=>{
  console.error('API Error:',e.message,e.stack);
  res.status(e.name==='ZodError'?400:500).json({error:e.name==='ZodError'?('Datos invalidos: '+e.issues?.map(i=>i.path+': '+i.message).join(', ')):e.message});
});

// Migración operativa idempotente: garantiza que el flujo de limpieza esté
// disponible incluso cuando Railway no tenga configurado un pre-deploy command.
await q(`CREATE TABLE IF NOT EXISTS cleaning_tasks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT 'CHECKOUT',priority text NOT NULL DEFAULT 'NORMAL',
  status text NOT NULL DEFAULT 'REQUESTED',requested_for timestamptz NOT NULL DEFAULT now(),
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,notes text DEFAULT '',
  checklist jsonb DEFAULT '[]',completed_at timestamptz,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cleaning_tasks_status_idx ON cleaning_tasks(status,requested_for);`);

// Migración idempotente del Centro de Trabajo (también funciona sin pre-deploy).
await q(`
CREATE TABLE IF NOT EXISTS work_tickets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),folio bigserial UNIQUE,source text NOT NULL DEFAULT 'EMPLOYEE',requester_id uuid,requester_name text NOT NULL,requester_email text,department text NOT NULL,category text NOT NULL,subject text NOT NULL,description text NOT NULL,priority text NOT NULL DEFAULT 'NORMAL',status text NOT NULL DEFAULT 'OPEN',property_id uuid REFERENCES properties(id) ON DELETE SET NULL,assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,created_by uuid REFERENCES employees(id) ON DELETE SET NULL,resolution text,closed_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS confidential_inbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sender_id uuid REFERENCES employees(id) ON DELETE SET NULL,sender_name text NOT NULL,kind text NOT NULL,subject text NOT NULL,message text NOT NULL,status text NOT NULL DEFAULT 'NEW',admin_response text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,role_target text,title text NOT NULL,message text NOT NULL,link_tab text DEFAULT 'centro',read_at timestamptz,created_at timestamptz DEFAULT now());
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_key text UNIQUE;
CREATE TABLE IF NOT EXISTS contacts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid REFERENCES employees(id) ON DELETE CASCADE,scope text NOT NULL DEFAULT 'PERSONAL',name text NOT NULL,organization text,phone text,email text,address text,notes text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS digital_notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,title text NOT NULL,body text DEFAULT '',color text DEFAULT 'gold',pinned boolean DEFAULT false,due_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS calendar_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid REFERENCES employees(id) ON DELETE CASCADE,scope text NOT NULL DEFAULT 'PERSONAL',title text NOT NULL,description text DEFAULT '',starts_at timestamptz NOT NULL,ends_at timestamptz,department text,location text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS business_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),folio bigserial UNIQUE,document_type text NOT NULL,title text NOT NULL,recipient_name text,recipient_email text,concepts jsonb NOT NULL DEFAULT '[]',subtotal numeric(12,2) DEFAULT 0,tax numeric(12,2) DEFAULT 0,total numeric(12,2) DEFAULT 0,notes text,attachment jsonb,created_by uuid REFERENCES employees(id) ON DELETE SET NULL,created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS work_tickets_department_status_idx ON work_tickets(department,status,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_employee_idx ON notifications(employee_id,read_at,created_at DESC);`);

app.listen(process.env.PORT||4001,()=>{
  console.log('API empleados lista v3 — sincronización automática activa');
  setTimeout(reconcilePublishedContent,3_000);
  setInterval(reconcilePublishedContent,60_000).unref();
});
