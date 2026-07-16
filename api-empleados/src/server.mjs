import express from'express';import helmet from'helmet';import cors from'cors';import{rateLimit}from'express-rate-limit';import{z}from'zod';import{q}from'./db.mjs';import pg from'pg';import{hash}from'@node-rs/argon2';
const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:(process.env.CORS_ORIGIN||'http://localhost:3001').split(',')}));
app.use(express.json({limit:'25mb'}));
app.use(rateLimit({windowMs:60_000,limit:120}));
const safe=f=>(a,b,c)=>Promise.resolve(f(a,b,c)).catch(c);
const role=(...allowed)=>(req,res,next)=>{const r=req.headers['x-demo-role']||'SUPER_ADMIN';if(allowed.includes(r))return next();return res.status(401).json({error:'Configure OIDC/MFA para produccion'})};

const clientPool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL.replace('/linoem_empleados','/linoem_clientes'),ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false}):null;
const qc=async(t,v=[])=>{if(!clientPool)throw Error('Client DB pool no disponible');return clientPool.query(t,v)};

// ── USUARIOS (base clientes) ──────────────────────────────────────────────────
app.get('/v1/users',role('SUPER_ADMIN'),safe(async(_,res)=>res.json({items:(await qc('SELECT id,email,name,created_at FROM users ORDER BY created_at DESC')).rows})));
app.post('/v1/users',role('SUPER_ADMIN'),safe(async(req,res)=>{const d=z.object({email:z.string().email(),password:z.string().min(8),name:z.string().min(2)}).parse(req.body);const hp=await hash(d.password);const{rows}=await qc('INSERT INTO users(email,password_hash,name) VALUES(lower($1),$2,$3) RETURNING id,email,name,created_at',[d.email,hp,d.name]);res.status(201).json(rows[0])}));
app.put('/v1/users/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{const d=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8).optional()}).parse(req.body);if(d.password){const hp=await hash(d.password);const{rows}=await qc('UPDATE users SET name=$1,email=lower($2),password_hash=$3 WHERE id=$4 RETURNING id,email,name',[d.name,d.email,hp,req.params.id]);return res.json(rows[0])}else{const{rows}=await qc('UPDATE users SET name=$1,email=lower($2) WHERE id=$3 RETURNING id,email,name',[d.name,d.email,req.params.id]);return res.json(rows[0])}}));
app.delete('/v1/users/:id',role('SUPER_ADMIN'),safe(async(req,res)=>{await qc('DELETE FROM reservations WHERE user_id=$1',[req.params.id]);await qc('DELETE FROM users WHERE id=$1',[req.params.id]);res.json({success:true})}));

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/health',safe(async(_,r)=>{if(process.env.DATABASE_URL)await q('SELECT 1');r.json({status:'ok',service:'api-empleados'})}));

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get('/v1/dashboard',role('SUPER_ADMIN','MANAGER','FINANCE'),safe(async(_,res)=>{const [p,e]=await Promise.all([q("SELECT count(*)::int total,count(*) FILTER(WHERE status='AVAILABLE')::int available FROM properties"),q("SELECT COALESCE(sum(amount),0)::float expenses FROM expenses WHERE occurred_on>=date_trunc('month',now())")]);res.json({...p.rows[0],...e.rows[0]})}));

// ── PROPIEDADES ───────────────────────────────────────────────────────────────
app.get('/v1/properties',role('SUPER_ADMIN','MANAGER','RECEPTION','HOUSEKEEPING'),safe(async(_,res)=>res.json({items:(await q('SELECT * FROM properties ORDER BY updated_at DESC')).rows})));

app.post('/v1/properties',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const d=z.object({name:z.string().min(3),type:z.enum(['HOTEL','ROOM','HOUSE','APARTMENT','SUITE']),city:z.string().min(1),address:z.string().optional(),maxGuests:z.number().int().positive(),basePrice:z.number().nonnegative(),details:z.any().optional(),media:z.any().optional()}).parse(req.body);
  const mediaArr=Array.isArray(d.media)?d.media:[];
  const detailsObj=d.details&&typeof d.details==='object'&&!Array.isArray(d.details)?d.details:{};
  const {rows}=await q('INSERT INTO properties(name,type,city,address,max_guests,base_price,details,media) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) RETURNING *',[d.name,d.type,d.city,d.address||'',d.maxGuests,d.basePrice,JSON.stringify(detailsObj),JSON.stringify(mediaArr)]);
  await q("INSERT INTO audit_log(action,resource,resource_id) VALUES('CREATE','PROPERTY',$1)",[rows[0].id]);
  res.status(201).json(rows[0]);
}));

app.put('/v1/properties/:id',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const d=z.object({name:z.string().min(3),type:z.enum(['HOTEL','ROOM','HOUSE','APARTMENT','SUITE']),city:z.string().min(1),address:z.string().optional(),maxGuests:z.number().int().positive(),basePrice:z.number().nonnegative(),status:z.string().optional(),details:z.any().optional(),media:z.any().optional()}).parse(req.body);
  const mediaArr=Array.isArray(d.media)?d.media:[];
  const detailsObj=d.details&&typeof d.details==='object'&&!Array.isArray(d.details)?d.details:{};
  const {rows}=await q('UPDATE properties SET name=$1,type=$2,city=$3,address=$4,max_guests=$5,base_price=$6,status=COALESCE($7,status),details=$8::jsonb,media=$9::jsonb,updated_at=now() WHERE id=$10 RETURNING *',[d.name,d.type,d.city,d.address||'',d.maxGuests,d.basePrice,d.status||null,JSON.stringify(detailsObj),JSON.stringify(mediaArr),req.params.id]);
  if(!rows[0])return res.status(404).end();
  res.json(rows[0]);
}));

app.delete('/v1/properties/:id',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{await q('DELETE FROM properties WHERE id=$1',[req.params.id]);res.json({success:true})}));

app.post('/v1/properties/:id/publish',role('SUPER_ADMIN','MANAGER'),safe(async(req,res)=>{
  const {rows}=await q("UPDATE properties SET published=true,version=version+1,updated_at=now() WHERE id=$1 RETURNING *",[req.params.id]);
  if(!rows[0])return res.status(404).end();
  const p=rows[0],url=process.env.CLIENT_API_URL;
  let synced=false,syncError=null;
  if(url){try{const r=await fetch(url+'/internal/catalog',{method:'POST',headers:{'content-type':'application/json','x-sync-secret':process.env.ADMIN_SYNC_SECRET||''},body:JSON.stringify({id:p.id,name:p.name,type:p.type,city:p.city,maxGuests:p.max_guests,basePrice:Number(p.base_price),details:p.details,media:p.media,version:Number(p.version)}),signal:AbortSignal.timeout(8000)});synced=r.ok;if(!r.ok)syncError='API clientes respondio con error '+r.status;}catch(err){syncError=err.message;}}
  res.json({property:p,synced,syncError,message:synced?'Propiedad publicada y sincronizada correctamente':'Propiedad marcada como publicada. Sincronizacion pendiente.'});
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

// ── GASTOS ────────────────────────────────────────────────────────────────────
app.get('/v1/expenses',role('SUPER_ADMIN','FINANCE'),safe(async(_,res)=>res.json({items:(await q('SELECT * FROM expenses ORDER BY occurred_on DESC')).rows})));
app.post('/v1/expenses',role('SUPER_ADMIN','FINANCE'),safe(async(req,res)=>{const d=z.object({category:z.string(),kind:z.enum(['FIXED','VARIABLE','ASSET']),description:z.string(),amount:z.number().positive(),occurredOn:z.string()}).parse(req.body);res.status(201).json((await q('INSERT INTO expenses(category,kind,description,amount,occurred_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[d.category,d.kind,d.description,d.amount,d.occurredOn])).rows[0])}));

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((e,req,res,next)=>{
  console.error('API Error:',e.message,e.stack);
  res.status(e.name==='ZodError'?400:500).json({error:e.name==='ZodError'?('Datos invalidos: '+e.issues?.map(i=>i.path+': '+i.message).join(', ')):e.message});
});

app.listen(process.env.PORT||4001,()=>console.log('API empleados lista v2'));
