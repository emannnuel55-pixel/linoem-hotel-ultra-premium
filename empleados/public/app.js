if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-theme');
}
const API = window.LINOEM.API_URL;
let currentTab = 'resumen';
let properties = [];
let expenses = [];
let users = [];
let reservations = [];
let employees = [];
let payrolls = [];
let promotions = [];
let cleaningTasks = [];
let passwordResetRequests = [];
let workTickets = [], notifications = [], contacts = [], staffDirectory = [], digitalNotes = [], calendarEvents = [], businessDocuments = [], confidentialMessages = [];
let workspaceSummary = {open:0,urgent:0,unread:0};
let currentEmployee = null;
let dashboard = {
  generatedAt: null, sources: { operations: true, clients: true },
  properties: { total: 0, available: 0, cleaning: 0, maintenance: 0, occupied: 0, published: 0, pending_sync: 0 },
  reservations: { active: 0, arrivalsToday: 0, departuresToday: 0, occupiedToday: 0, guestsToday: 0, estimatedRevenue: 0 },
  expenses: { currentMonth: 0, previousMonth: 0, transactions: 0, variation: null },
  cleaning: { pending: 0, completed_today: 0 }, promotions: { total: 0, active: 0, pending_sync: 0 },
  employees: { active: 0 }, bookingTrend: [], recentReservations: [], recentExpenses: []
};

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + (localStorage.getItem('employeeToken') || '')
});

const money = n => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
}).format(n);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const cleaningTypeLabel = value => ({CHECKOUT:'Salida de huésped',STAYOVER:'Repaso de estancia',DEEP:'Limpieza profunda',INSPECTION:'Inspección de calidad'}[value] || value);
const cleaningPriorityLabel = value => ({LOW:'Baja',NORMAL:'Normal',HIGH:'Alta',URGENT:'Urgente'}[value] || value);
const cleaningStatusLabel = value => ({REQUESTED:'Solicitada',IN_PROGRESS:'En proceso',COMPLETED:'Completada',CANCELLED:'Cancelada'}[value] || value);

async function loadLeaflet() {
  if (window.L) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.append(link);
  await new Promise(r => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = r;
    document.head.append(script);
  });
}

async function load() {
  const employeeToken = localStorage.getItem('employeeToken');
  if (!employeeToken) return renderEmployeeLogin();
  if (!currentEmployee) {
    try {
      const sessionResponse = await fetch(API + '/v1/auth/me', { headers: headers() });
      if (!sessionResponse.ok) throw new Error('Sesión no válida');
      currentEmployee = await sessionResponse.json();
    } catch {
      localStorage.removeItem('employeeToken');
      return renderEmployeeLogin('Tu sesión venció. Ingresa nuevamente.');
    }
  }
  if (currentEmployee?.mustChangePassword) return renderForcedPasswordChange();
  try {
    const [resDash, resProp, resExp, resUsers, resRes, resEmp, resPay, resPromos, resCleaning, resWorkspace, resTickets, resNotices, resContacts, resNotes, resCalendar, resDocuments, resInbox, resPasswordResets] = await Promise.all([
      fetch(API + '/v1/dashboard', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/properties', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/expenses', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/users', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/reservations', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/employees', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/payroll', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/promotions', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/cleaning-tasks', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/summary', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/tickets', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/notifications', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/contacts', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/notes', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/calendar', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/workspace/documents', { headers: headers() }).then(r => r.json()).catch(() => null),
      currentEmployee?.role==='SUPER_ADMIN' ? fetch(API + '/v1/workspace/confidential', { headers: headers() }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      currentEmployee?.role==='SUPER_ADMIN' ? fetch(API + '/v1/password-resets', { headers: headers() }).then(r => r.json()).catch(() => null) : Promise.resolve(null)
    ]);

    if (resDash && resDash.properties) dashboard = resDash;
    if (resProp && resProp.items) properties = resProp.items;
    if (resExp && resExp.items) expenses = resExp.items;
    if (resUsers && resUsers.items) users = resUsers.items;
    if (resRes && resRes.items) reservations = resRes.items;
    if (resEmp && resEmp.items) employees = resEmp.items;
    if (resPay && resPay.items) payrolls = resPay.items;
    if (resPromos && resPromos.items) promotions = resPromos.items;
    if (resCleaning && resCleaning.items) cleaningTasks = resCleaning.items;
    if (resWorkspace) workspaceSummary = resWorkspace;
    if (resTickets?.items) workTickets = resTickets.items;
    if (resNotices?.items) notifications = resNotices.items;
    if (resContacts) { contacts = resContacts.contacts || []; staffDirectory = resContacts.staff || []; }
    if (resNotes?.items) digitalNotes = resNotes.items;
    if (resCalendar?.items) calendarEvents = resCalendar.items;
    if (resDocuments?.items) businessDocuments = resDocuments.items;
    if (resInbox?.items) confidentialMessages = resInbox.items;
    if (resPasswordResets?.items) passwordResetRequests = resPasswordResets.items;
  } catch (err) {
    console.error('Error loading data:', err);
  }
  await loadLeaflet();
  render();
}

const teamQuotes = [
  ['La excelencia no es un acto aislado: es la forma en que cuidamos cada detalle.', 'Equipo HTJ'],
  ['Cada huésped recuerda cómo lo hicimos sentir. Hoy tenemos una nueva oportunidad para sorprender.', 'Hospitalidad HTJ'],
  ['Un gran equipo convierte tareas sencillas en experiencias extraordinarias.', 'Juntos somos HTJ'],
  ['La calidad empieza mucho antes de que llegue el huésped: empieza con tu compromiso.', 'Cultura de servicio'],
  ['Tu trabajo de hoy puede convertirse en el mejor recuerdo de viaje de alguien.', 'Propósito HTJ'],
  ['La verdadera hospitalidad consiste en hacer sentir a cada persona que llegó al lugar correcto.', 'Servicio con corazón'],
  ['Cuando cuidamos los detalles, los detalles cuidan nuestra reputación.', 'Excelencia diaria'],
  ['Ningún esfuerzo es pequeño cuando forma parte de una experiencia excepcional.', 'Equipo HTJ'],
  ['La confianza se construye habitación por habitación, atención por atención.', 'Compromiso HTJ'],
  ['Hoy no venimos solamente a trabajar: venimos a crear tranquilidad para nuestros huéspedes.', 'Misión HTJ'],
  ['El talento gana momentos; la colaboración construye resultados duraderos.', 'Juntos avanzamos'],
  ['Hazlo con orgullo, porque tu firma invisible está en cada experiencia bien lograda.', 'Orgullo HTJ']
];

function dailyTeamQuote() {
  const now = new Date();
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  return teamQuotes[dayNumber % teamQuotes.length];
}

function renderEmployeeLogin(message = '') {
  const [dailyQuote, quoteAuthor] = dailyTeamQuote();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.querySelector('#app').innerHTML = `
    <main class="employee-login-page">
      <section class="employee-login-visual">
        <div class="login-brand"><img src="/logo-htj.png" alt="HTJ Hotel"><div><b>HTJ</b><span>HOSPEDAJE TAXI JUÁREZ</span></div></div>
        <div class="login-hero-copy">
          <span class="login-eyebrow">OPERACIONES · SERVICIO · EXCELENCIA</span>
          <h1>El corazón de una gran estancia comienza contigo.</h1>
          <p>Un espacio creado para que nuestro equipo coordine, cuide y transforme cada llegada en una experiencia memorable.</p>
          <blockquote><span>“</span><p>${escapeHtml(dailyQuote)}</p><footer>${escapeHtml(quoteAuthor)} · Inspiración del día</footer></blockquote>
        </div>
        <div class="login-visual-footer"><span>● Sistema operativo activo</span><span>${new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</span></div>
      </section>
      <section class="employee-login-panel">
        <form id="employeeLoginForm" class="employee-login-card">
          <div class="employee-login-mark"><img src="/logo-htj.png" alt="HTJ"></div>
          <span class="employee-login-kicker">PORTAL INTERNO SEGURO</span>
          <h2>${greeting}, equipo</h2>
          <p>Inicia sesión para continuar haciendo extraordinario lo cotidiano.</p>
          ${message ? `<div class="employee-login-message">${escapeHtml(message)}</div>` : ''}
          <label>Correo electrónico<div class="login-input-wrap"><span>✉</span><input name="email" type="email" required autocomplete="username" placeholder="empleado@hotel.com"></div></label>
          <label>Contraseña<div class="login-input-wrap"><span>⌑</span><input name="password" type="password" minlength="8" required autocomplete="current-password" placeholder="Tu contraseña"></div></label>
          <button type="submit"><span>Entrar al portal</span><b>→</b></button>
          <button type="button" class="forgot-password-button" id="forgotPasswordButton">Olvidé mi contraseña</button>
          <div class="login-security"><span>✓</span><small>Acceso cifrado y exclusivo para personal autorizado.</small></div>
        </form>
      </section>
    </main>`;
  document.querySelector('#employeeLoginForm').onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    button.textContent = 'Verificando…';
    try {
      const response = await fetch(API + '/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible iniciar sesión');
      localStorage.setItem('employeeToken', data.accessToken);
      currentEmployee = data.employee;
      if (data.employee.mustChangePassword) renderForcedPasswordChange(); else load();
    } catch (error) {
      renderEmployeeLogin(error.message);
    }
  };
  document.querySelector('#forgotPasswordButton').onclick=()=>openForgotPasswordModal();
}

function openForgotPasswordModal(){modal('Recuperar acceso',`<form id="forgotPasswordForm" class="premium-form"><div class="form-intro"><span>⌑</span><div><b>Solicitud segura</b><p>Administración verificará tu identidad y generará una contraseña temporal.</p></div></div><label class="field-block">Correo institucional<input type="email" name="email" required autocomplete="email"></label><div id="forgotResult" class="form-success" hidden></div><button class="primary premium-submit">Enviar solicitud</button></form>`);document.querySelector('#forgotPasswordForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),result=form.querySelector('#forgotResult');button.disabled=true;try{const response=await fetch(API+'/v1/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:new FormData(form).get('email')})});const data=await response.json();result.hidden=false;result.textContent=data.message||'Solicitud enviada.';button.textContent='Solicitud enviada'}catch{result.hidden=false;result.textContent='No fue posible enviar la solicitud.';button.disabled=false}}}

function renderForcedPasswordChange(){document.querySelector('#app').innerHTML=`<main class="password-change-page"><form id="forcedPasswordForm" class="employee-login-card"><div class="employee-login-mark"><img src="/logo-htj.png" alt="HTJ"></div><span class="employee-login-kicker">PROTECCIÓN DE CUENTA</span><h2>Crea tu contraseña personal</h2><p>Ingresaste con una contraseña temporal. Debes reemplazarla antes de acceder al sistema.</p><label>Nueva contraseña<div class="login-input-wrap"><span>⌑</span><input name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></div></label><label>Confirmar contraseña<div class="login-input-wrap"><span>✓</span><input name="confirmation" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></div></label><div id="passwordChangeError" class="form-error" hidden></div><button type="submit"><span>Guardar y entrar</span><b>→</b></button><small class="password-policy">Mínimo 12 caracteres. Usa letras, números y un símbolo.</small></form></main>`;document.querySelector('#forcedPasswordForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),error=e.currentTarget.querySelector('#passwordChangeError'),button=e.currentTarget.querySelector('button');if(f.get('password')!==f.get('confirmation')){error.hidden=false;error.textContent='Las contraseñas no coinciden.';return}button.disabled=true;try{const response=await fetch(API+'/v1/auth/change-password',{method:'POST',headers:headers(),body:JSON.stringify({newPassword:f.get('password')})});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'No fue posible cambiar la contraseña');currentEmployee.mustChangePassword=false;await load()}catch(x){error.hidden=false;error.textContent=x.message;button.disabled=false}}}

function render() {
  const menuItems = [
    { id: 'resumen', label: '▦ Resumen' },
    { id: 'propiedades', label: '⌂ Propiedades' },
    { id: 'promociones', label: '✦ Promociones' },
    { id: 'reservaciones', label: '▣ Reservaciones' },
    { id: 'limpieza', label: '✓ Limpieza' },
    { id: 'mantenimiento', label: '⚒ Mantenimiento' },
    { id: 'centro', label: `◉ Centro de tickets${workspaceSummary.open ? ` (${workspaceSummary.open})` : ''}` },
    ...(currentEmployee?.role === 'SUPER_ADMIN' ? [{ id: 'buzon', label: '✉ Buzón confidencial' }] : []),
    ...(['SUPER_ADMIN','MANAGER','FINANCE'].includes(currentEmployee?.role) ? [{ id: 'documentos', label: '▤ Documentos / Recibos' }] : []),
    { id: 'notas', label: '◆ Post-its' },
    { id: 'directorio', label: '☏ Directorio' },
    { id: 'agenda', label: '▦ Agenda / Calendario' },
    { id: 'finanzas', label: '$ Finanzas' },
    { id: 'personal', label: '♙ Directorio Activo' },
    { id: 'nomina', label: '◫ Nómina' },
    { id: 'configuracion', label: '⚙ Usuarios / Config' }
  ];

  let mainContent = '';

  if (currentTab === 'resumen') {
    const pStats = dashboard.properties || {};
    const rStats = dashboard.reservations || {};
    const eStats = dashboard.expenses || {};
    const totalUnits = Number(pStats.total || 0);
    const occupiedUnits = Number(rStats.occupiedToday || pStats.occupied || 0);
    const occupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const expenseVariation = eStats.variation;
    const trend = dashboard.bookingTrend || [];
    const maxTrend = Math.max(1, ...trend.map(item => Number(item.reservations || 0)));
    const nowHour = new Date().getHours();
    const greeting = nowHour < 12 ? 'Buenos días' : nowHour < 19 ? 'Buenas tardes' : 'Buenas noches';
    const generatedLabel = dashboard.generatedAt ? new Date(dashboard.generatedAt).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}) : 'actualizando';
    mainContent = `
      <header class="head dashboard-head">
        <div class="dashboard-title">
          <span class="section-kicker">CENTRO DE OPERACIONES HTJ</span>
          <h1>${greeting}, ${escapeHtml(currentEmployee?.name?.split(' ')[0] || 'equipo')}</h1>
          <p>Información operativa consolidada en tiempo real · Actualizado ${generatedLabel}</p>
        </div>
        <div class="dashboard-head-actions"><button class="dashboard-refresh" onclick="load()">↻ Actualizar</button><button class="add add-with-label" id="addBtn">+ Nueva propiedad</button></div>
      </header>
      ${dashboard.sources?.clients === false ? '<div class="dashboard-source-warning">⚠ No fue posible consultar temporalmente las reservaciones de clientes. Las métricas operativas sí están actualizadas.</div>' : ''}
      <section class="executive-kpis">
        <article class="executive-kpi accent-blue"><div class="kpi-top"><span>OCUPACIÓN ACTUAL</span><i>▣</i></div><strong>${occupancy}%</strong><div class="kpi-progress"><span style="width:${Math.min(100,occupancy)}%"></span></div><small>${occupiedUnits} de ${totalUnits} unidades con estancia activa</small></article>
        <article class="executive-kpi accent-green"><div class="kpi-top"><span>DISPONIBILIDAD</span><i>⌂</i></div><strong>${Number(pStats.available||0)}</strong><small>de ${totalUnits} propiedades registradas</small><em>${Number(pStats.published||0)} publicadas en clientes</em></article>
        <article class="executive-kpi accent-gold"><div class="kpi-top"><span>RESERVAS ACTIVAS</span><i>◫</i></div><strong>${Number(rStats.active||0)}</strong><small>${Number(rStats.arrivalsToday||0)} llegadas · ${Number(rStats.departuresToday||0)} salidas hoy</small><em>${Number(rStats.guestsToday||0)} huéspedes alojados hoy</em></article>
        <article class="executive-kpi accent-red"><div class="kpi-top"><span>GASTOS DEL MES</span><i>$</i></div><strong>${money(eStats.currentMonth||0)}</strong><small>${Number(eStats.transactions||0)} movimientos registrados</small><em class="${expenseVariation == null ? '' : expenseVariation <= 0 ? 'positive' : 'negative'}">${expenseVariation == null ? 'Sin comparación del mes anterior' : `${expenseVariation > 0 ? '↑' : '↓'} ${Math.abs(expenseVariation).toFixed(1)}% contra el mes anterior`}</em></article>
      </section>
      <section class="dashboard-grid">
        <article class="box dashboard-chart-card">
          <div class="card-heading"><div><span class="section-kicker">DEMANDA</span><h3>Reservaciones creadas</h3><p>Comportamiento real de los últimos 14 días.</p></div><span class="metric-pill">${trend.reduce((sum,item)=>sum+Number(item.reservations||0),0)} nuevas</span></div>
          <div class="real-chart">
            ${trend.length ? trend.map((item,index)=>{const value=Number(item.reservations||0);const date=new Date(item.day+'T12:00:00');return `<div class="real-bar-column" title="${date.toLocaleDateString('es-MX')} · ${value} reservaciones"><b>${value||''}</b><div class="real-bar-track"><span style="height:${value ? Math.max(8,(value/maxTrend)*100) : 3}%"></span></div><small>${index%2===0?date.toLocaleDateString('es-MX',{day:'2-digit',month:'short'}):''}</small></div>`}).join('') : '<div class="chart-empty">No hay información de reservaciones disponible.</div>'}
          </div>
        </article>
        <article class="box operations-card">
          <div class="card-heading"><div><span class="section-kicker">ESTADO ACTUAL</span><h3>Operación del hotel</h3><p>Distribución real de unidades y trabajos.</p></div></div>
          <div class="operation-ring" style="--occupancy:${occupancy * 3.6}deg"><div><strong>${occupancy}%</strong><span>ocupación</span></div></div>
          <div class="operation-list">
            <button onclick="switchTab('propiedades')"><span><i class="dot"></i>Disponibles</span><b>${Number(pStats.available||0)}</b></button>
            <button onclick="switchTab('limpieza')"><span><i class="dot warn"></i>En limpieza</span><b>${Number(pStats.cleaning||0)}</b></button>
            <button onclick="switchTab('mantenimiento')"><span><i class="dot red"></i>Mantenimiento</span><b>${Number(pStats.maintenance||0)}</b></button>
            <button onclick="switchTab('reservaciones')"><span><i class="dot blue"></i>Estancia activa</span><b>${occupiedUnits}</b></button>
          </div>
        </article>
      </section>
      <section class="dashboard-lower-grid">
        <article class="box today-card"><div class="card-heading"><div><span class="section-kicker">HOY</span><h3>Agenda operativa</h3></div></div><div class="today-grid">
          <button onclick="switchTab('reservaciones')"><span>→</span><strong>${Number(rStats.arrivalsToday||0)}</strong><small>Llegadas programadas</small></button>
          <button onclick="switchTab('reservaciones')"><span>←</span><strong>${Number(rStats.departuresToday||0)}</strong><small>Salidas programadas</small></button>
          <button onclick="switchTab('limpieza')"><span>✓</span><strong>${Number(dashboard.cleaning?.pending||0)}</strong><small>Limpiezas pendientes</small></button>
          <button onclick="switchTab('mantenimiento')"><span>⚒</span><strong>${Number(pStats.maintenance||0)}</strong><small>Unidades reportadas</small></button>
        </div></article>
        <article class="box activity-card"><div class="card-heading"><div><span class="section-kicker">ACTIVIDAD</span><h3>Reservaciones recientes</h3></div><button onclick="switchTab('reservaciones')">Ver todas →</button></div><div class="activity-list">
          ${(dashboard.recentReservations||[]).length ? dashboard.recentReservations.map(item=>`<div><span class="activity-avatar">${escapeHtml(item.guestName?.charAt(0)||'H')}</span><div><b>${escapeHtml(item.guestName||'Huésped')}</b><small>${escapeHtml(item.propertyName||'Alojamiento')} · ${new Date(item.startsOn).toLocaleDateString('es-MX')}–${new Date(item.endsOn).toLocaleDateString('es-MX')}</small></div><em class="reservation-${String(item.status).toLowerCase()}">${escapeHtml(item.status)}</em></div>`).join('') : '<div class="activity-empty">Aún no hay reservaciones registradas.</div>'}
        </div></article>
      </section>
      <section class="quick-actions"><button onclick="openPropertyModal()"><i>⌂</i><span><b>Nueva propiedad</b><small>Agregar alojamiento</small></span></button><button onclick="openCleaningRequestModal()"><i>✓</i><span><b>Solicitar limpieza</b><small>Crear orden de trabajo</small></span></button><button onclick="openMaintenanceSelector()"><i>⚒</i><span><b>Reportar mantenimiento</b><small>Registrar desperfecto</small></span></button><button onclick="openExpenseModal()"><i>$</i><span><b>Registrar gasto</b><small>Movimiento financiero</small></span></button></section>
    `;
  } else if (currentTab === 'propiedades') {
    mainContent = `
      <header class="head">
        <div>
          <h1>Propiedades</h1>
          <p>Gestiona el catálogo de alojamientos y sincroniza con el portal de clientes</p>
        </div>
        <button class="add" id="addBtn">+ Nueva propiedad</button>
      </header>
      <section class="properties-list">
        <div class="box">
          <h3>Listado de Alojamientos</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Ciudad</th>
                  <th>Precio</th>
                  <th>Estado Sincronización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${properties.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No hay propiedades creadas. ¡Crea una nueva!</td></tr>' : properties.map(p => {
                  const firstMedia = p.media && p.media.length > 0 ? p.media[0] : null;
                  const mediaThumb = firstMedia
                    ? (firstMedia.type === 'video'
                        ? `<video src="${firstMedia.url}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"></video>`
                        : `<img src="${firstMedia.url}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">`
                      )
                    : `<div style="width:40px;height:40px;border-radius:6px;background:var(--panel2);display:grid;place-items:center;font-size:0.8rem;color:var(--muted)">✦</div>`;

                  return `
                    <tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:12px;">
                          ${mediaThumb}
                          <div>
                            <strong>${p.name}</strong><br>
                            <small style="color:var(--muted)">${p.address || 'Sin dirección'}</small>
                          </div>
                        </div>
                      </td>
                      <td><span class="badge badge-type">${p.type}</span></td>
                      <td>${p.city}</td>
                      <td>${money(p.base_price)} / noche</td>
                      <td>
                        <span class="badge ${p.sync_status === 'SYNCED' ? 'badge-published' : 'badge-draft'}" ${p.sync_error ? `title="${escapeHtml(p.sync_error)}"` : ''}>
                          ${p.sync_status === 'SYNCED' ? '✓ Sincronizado' : p.published ? '↻ Reintentando' : 'Borrador'}
                        </span>
                      </td>
                      <td>
                        <div class="actions-group">
                          <button class="btn-action btn-primary" onclick="openEditPropertyModal('${p.id}')">Editar</button>
                          <button class="btn-action" style="background:var(--green);color:#0a3a22" onclick="publishProperty('${p.id}')">Sincronizar</button>
                          <button class="btn-action btn-danger" onclick="deleteProperty('${p.id}')">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'promociones') {
    mainContent = `
      <header class="head">
        <div>
          <h1>Promociones del portal</h1>
          <p>Crea imágenes destacadas que aparecerán automáticamente en el carrusel de la página de clientes</p>
        </div>
        <button class="add" id="addPromotionBtn">+ Nueva promoción</button>
      </header>
      <section class="promo-admin-summary">
        <div class="kpi"><span>PROMOCIONES</span><strong>${promotions.length}</strong><small>creadas</small></div>
        <div class="kpi"><span>ACTIVAS</span><strong>${promotions.filter(p => p.active).length}</strong><small>visibles para clientes</small></div>
        <div class="kpi"><span>SINCRONIZADAS</span><strong>${promotions.filter(p => p.sync_status === 'SYNCED').length}</strong><small>publicadas correctamente</small></div>
      </section>
      <section class="promotion-admin-grid">
        ${promotions.length === 0 ? `
          <div class="promo-empty box">
            <span>✦</span><h3>Aún no hay promociones</h3>
            <p>Sube una imagen, agrega el mensaje y aparecerá en el portal público.</p>
            <button class="add" onclick="openPromotionModal()">Crear la primera promoción</button>
          </div>` : promotions.map(p => `
          <article class="promotion-admin-card ${p.active ? '' : 'is-inactive'}">
            <div class="promotion-admin-image" style="background-image:linear-gradient(180deg,transparent 25%,rgba(5,8,16,.9)),url('${String(p.image_url || '').replace(/'/g, '%27')}')">
              <div class="promotion-admin-badges">
                <span class="badge ${p.active ? 'badge-published' : 'badge-draft'}">${p.active ? '● Activa' : 'Pausada'}</span>
                <span class="badge ${p.sync_status === 'SYNCED' ? 'badge-published' : 'badge-draft'}">${p.sync_status === 'SYNCED' ? '✓ Sincronizada' : '↻ Pendiente'}</span>
              </div>
              <div class="promotion-admin-copy">
                ${p.badge ? `<small>${escapeHtml(p.badge)}</small>` : ''}
                <h3>${escapeHtml(p.title)}</h3>
                <p>${escapeHtml(p.subtitle || 'Sin subtítulo')}</p>
              </div>
            </div>
            <div class="promotion-admin-meta">
              <span>Orden: <b>${p.sort_order || 0}</b></span>
              <span>${p.starts_at ? new Date(p.starts_at).toLocaleDateString('es-MX') : 'Inicio inmediato'} → ${p.ends_at ? new Date(p.ends_at).toLocaleDateString('es-MX') : 'Sin vencimiento'}</span>
            </div>
            ${p.sync_error ? `<div class="sync-warning" title="${escapeHtml(p.sync_error)}">Pendiente de reintento automático</div>` : ''}
            <div class="actions-group promotion-admin-actions">
              <button class="btn-action btn-primary" onclick="openEditPromotionModal('${p.id}')">Editar</button>
              <button class="btn-action promo-sync-btn" onclick="publishPromotion('${p.id}')">Sincronizar</button>
              <button class="btn-action btn-danger" onclick="deletePromotion('${p.id}')">Eliminar</button>
            </div>
          </article>
        `).join('')}
      </section>
    `;
  } else if (currentTab === 'reservaciones') {
    mainContent = `
      <header class="head">
        <div>
          <h1>Reservaciones</h1>
          <p>Visualiza y administra las reservas hechas por los huéspedes</p>
        </div>
      </header>
      <section class="reservations-list">
        <div class="box">
          <h3>Registro de Reservaciones</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Huésped</th>
                  <th>Alojamiento</th>
                  <th>Fechas</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${reservations.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No hay reservaciones registradas.</td></tr>' : reservations.map(r => `
                  <tr>
                    <td><strong>${r.guestName}</strong><br><small style="color:var(--muted)">${r.guestEmail}</small></td>
                    <td>${r.propertyName}</td>
                    <td>${new Date(r.startsOn).toLocaleDateString('es-MX')} → ${new Date(r.endsOn).toLocaleDateString('es-MX')}</td>
                    <td>${r.guests} huéspedes</td>
                    <td>
                      <span class="badge ${r.status === 'PAID' ? 'badge-published' : r.status === 'CANCELLED' ? 'badge-draft' : 'badge-type'}">
                        ${r.status}
                      </span>
                    </td>
                    <td>
                      <div class="actions-group">
                        <button class="btn-action btn-primary" onclick="openEditReservationModal('${r.id}', '${r.status}', ${r.guests})">Editar</button>
                        <button class="btn-action btn-danger" onclick="deleteReservation('${r.id}')">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'limpieza') {
    const pendingCleaning = cleaningTasks.filter(task => !['COMPLETED','CANCELLED'].includes(task.status));
    mainContent = `
      <header class="head">
        <div>
          <h1>Limpieza / Housekeeping</h1>
          <p>Monitorea y actualiza el estado de aseo de cada habitación y propiedad</p>
        </div>
        <button class="add add-with-label" id="requestCleaningBtn">+ Solicitar limpieza</button>
      </header>
      <section class="workflow-summary">
        <article><span class="workflow-icon">✦</span><div><b>${pendingCleaning.length}</b><small>Solicitudes pendientes</small></div></article>
        <article><span class="workflow-icon">◷</span><div><b>${cleaningTasks.filter(t => t.status === 'IN_PROGRESS').length}</b><small>En proceso</small></div></article>
        <article><span class="workflow-icon">✓</span><div><b>${cleaningTasks.filter(t => t.status === 'COMPLETED').length}</b><small>Limpiezas registradas</small></div></article>
      </section>
      <section class="box module-workflow">
        <div class="section-heading"><div><span class="section-kicker">FLUJO DE HOUSEKEEPING</span><h3>Solicitudes y registro de limpieza</h3><p>Crea una solicitud, inicia el trabajo y registra la lista de verificación al terminar.</p></div></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Unidad</th><th>Servicio</th><th>Prioridad</th><th>Programada</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${cleaningTasks.length ? cleaningTasks.map(task => `
              <tr><td><strong>${escapeHtml(task.propertyName)}</strong><small class="table-subtext">${escapeHtml(task.assignedName || 'Sin asignar')}</small></td>
              <td>${cleaningTypeLabel(task.taskType)}</td><td><span class="priority priority-${task.priority.toLowerCase()}">${cleaningPriorityLabel(task.priority)}</span></td>
              <td>${new Date(task.requestedFor).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</td>
              <td><span class="task-status task-${task.status.toLowerCase()}">${cleaningStatusLabel(task.status)}</span></td>
              <td><div class="actions-group">
                ${task.status === 'REQUESTED' ? `<button class="btn-action btn-primary" onclick="updateCleaningTask('${task.id}','IN_PROGRESS')">Iniciar</button>` : ''}
                ${task.status === 'IN_PROGRESS' ? `<button class="btn-action btn-success" onclick="openCleaningRegisterModal('${task.id}')">Registrar limpieza</button>` : ''}
                ${task.status === 'COMPLETED' ? `<button class="btn-action btn-soft" onclick="openCleaningDetail('${task.id}')">Ver registro</button>` : ''}
              </div></td></tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><span>✓</span><b>No hay solicitudes pendientes</b><small>Usa “Solicitar limpieza” para programar el primer servicio.</small></div></td></tr>'}</tbody>
          </table>
        </div>
      </section>
      <section class="properties-list">
        <div class="box">
          <div class="section-heading"><div><span class="section-kicker">CONTROL RÁPIDO</span><h3>Estado operativo de las unidades</h3></div></div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Ciudad</th>
                  <th>Estado Operativo</th>
                  <th>Cambiar Estado</th>
                </tr>
              </thead>
              <tbody>
                ${properties.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">No hay propiedades registradas.</td></tr>' : properties.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.city}</td>
                    <td>
                      <span class="badge" style="background:${p.status === 'AVAILABLE' ? 'rgba(79,209,149,0.15)' : p.status === 'CLEANING' ? 'rgba(255,184,78,0.15)' : p.status === 'MAINTENANCE' ? 'rgba(255,101,119,0.15)' : 'rgba(82,113,255,0.15)'};color:${p.status === 'AVAILABLE' ? 'var(--green)' : p.status === 'CLEANING' ? '#ffb84e' : p.status === 'MAINTENANCE' ? 'var(--red)' : '#5271ff'}">
                        ● ${p.status}
                      </span>
                    </td>
                    <td>
                      <select class="status-select" onchange="updatePropertyStatus('${p.id}', this.value)">
                        <option value="AVAILABLE" ${p.status === 'AVAILABLE' ? 'selected' : ''}>Disponible / Limpio</option>
                        <option value="CLEANING" ${p.status === 'CLEANING' ? 'selected' : ''}>Limpieza en Proceso</option>
                        <option value="MAINTENANCE" ${p.status === 'MAINTENANCE' ? 'selected' : ''}>Mantenimiento</option>
                        <option value="OCCUPIED" ${p.status === 'OCCUPIED' ? 'selected' : ''}>Ocupado</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'mantenimiento') {
    mainContent = `
      <header class="head">
        <div>
          <h1>Mantenimiento</h1>
          <p>Reporta y gestiona reparaciones y desperfectos en tus propiedades</p>
        </div>
        <button class="add add-with-label" id="addMaintenanceBtn">+ Nuevo reporte</button>
      </header>
      <section class="properties-list">
        <div class="box">
          <h3>Unidades en Mantenimiento o Reportadas</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Detalles del Incidente</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${properties.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">No hay propiedades.</td></tr>' : properties.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.city} · ${p.address || ''}</td>
                    <td>
                      <span class="badge ${p.status === 'MAINTENANCE' ? 'badge-danger' : 'badge-draft'}" style="${p.status === 'MAINTENANCE' ? 'background:rgba(255,101,119,0.15);color:var(--red);' : ''}">
                        ${p.status}
                      </span>
                    </td>
                    <td>
                      <span style="font-size:0.9rem;color:${p.details?.incident ? 'white' : 'var(--muted)'}">
                        ${p.details?.incident || 'Ninguno reportado'}
                      </span>
                    </td>
                    <td>
                      <button class="btn-action btn-primary" onclick="openMaintenanceReportModal('${p.id}', '${p.details?.incident || ''}')">
                        Reportar / Editar Incidente
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'centro') {
    const openTickets=workTickets.filter(t=>!['RESOLVED','CLOSED'].includes(t.status));
    mainContent=`<header class="head"><div><span class="section-kicker">FLUJO INTERDEPARTAMENTAL</span><h1>Centro de tickets</h1><p>Solicitudes de huéspedes y personal, canalizadas al departamento responsable.</p></div><div class="head-actions"><button class="btn-soft" onclick="openConfidentialModal()">🔒 Mensaje privado</button><button class="add add-with-label" onclick="openTicketModal()">+ Nuevo ticket</button></div></header>
    <section class="workspace-summary"><article><span>◉</span><div><strong>${workspaceSummary.open||0}</strong><small>Tickets abiertos</small></div></article><article><span>!</span><div><strong>${workspaceSummary.urgent||0}</strong><small>Prioridad urgente</small></div></article><article><span>✓</span><div><strong>${workTickets.filter(t=>['RESOLVED','CLOSED'].includes(t.status)).length}</strong><small>Resueltos visibles</small></div></article></section>
    <section class="box workspace-board"><div class="section-heading"><div><span class="section-kicker">BANDEJA OPERATIVA</span><h3>Seguimiento de solicitudes</h3><p>Cada departamento solamente puede gestionar los tickets que le corresponden.</p></div></div>
    <div class="ticket-grid">${workTickets.length?workTickets.map(t=>`<article class="ticket-card priority-${String(t.priority).toLowerCase()}"><div class="ticket-top"><span>#${t.folio||'—'} · ${escapeHtml(t.source==='CLIENT'?'Huésped':'Personal')}</span><em>${escapeHtml(t.priority)}</em></div><h3>${escapeHtml(t.subject)}</h3><p>${escapeHtml(t.description)}</p><div class="ticket-meta"><span>${escapeHtml(t.department)}</span><span>${escapeHtml(t.property_name||'General')}</span><span>${new Date(t.created_at).toLocaleString('es-MX')}</span></div><div class="ticket-requester">Solicita: <b>${escapeHtml(t.requester_name||'Huésped HTJ')}</b></div>${t.resolution?`<div class="ticket-resolution"><b>Resolución:</b> ${escapeHtml(t.resolution)}</div>`:''}<div class="ticket-actions"><span class="ticket-status status-${String(t.status).toLowerCase()}">${escapeHtml(t.status)}</span>${!['RESOLVED','CLOSED'].includes(t.status)?`<button onclick="openTicketUpdateModal('${t.source}','${t.id}','${escapeHtml(t.subject).replace(/'/g,'&#39;')}')">Atender / cerrar</button>`:''}</div></article>`).join(''):'<div class="empty-state"><span>✓</span><b>No hay tickets visibles</b><p>Las nuevas solicitudes aparecerán aquí automáticamente.</p></div>'}</div></section>`;
  } else if (currentTab === 'buzon' && currentEmployee?.role==='SUPER_ADMIN') {
    mainContent=`<header class="head"><div><span class="section-kicker">ACCESO EXCLUSIVO DEL ADMINISTRADOR</span><h1>Buzón confidencial</h1><p>Quejas, sugerencias y oportunidades de mejora. Esta sección no se entrega a otros roles.</p></div></header><div class="privacy-banner">🔒 Contenido privado protegido por autenticación y permisos de servidor.</div><section class="confidential-grid">${confidentialMessages.length?confidentialMessages.map(m=>`<article class="box confidential-card"><div><span>${escapeHtml(m.source)} · ${escapeHtml(m.kind)}</span><em>${escapeHtml(m.status)}</em></div><h3>${escapeHtml(m.subject)}</h3><p>${escapeHtml(m.message)}</p><small>${escapeHtml(m.sender_name||'Huésped')} · ${new Date(m.created_at).toLocaleString('es-MX')}</small>${m.admin_response?`<blockquote>${escapeHtml(m.admin_response)}</blockquote>`:''}<button onclick="openConfidentialReply('${m.source}','${m.id}')">Revisar / responder</button></article>`).join(''):'<div class="box empty-state"><span>✉</span><b>Buzón vacío</b></div>'}</section>`;
  } else if (currentTab === 'documentos') {
    mainContent=`<header class="head"><div><span class="section-kicker">ADMINISTRACIÓN HTJ</span><h1>Documentos y comprobantes</h1><p>Genera recibos, tickets de compra y cotizaciones con identidad oficial del hotel.</p></div><button class="add add-with-label" onclick="openDocumentModal()">+ Generar documento</button></header><section class="document-stats"><article><b>${businessDocuments.length}</b><span>Documentos</span></article><article><b>${money(businessDocuments.reduce((s,d)=>s+Number(d.total||0),0))}</b><span>Valor registrado</span></article></section><section class="document-grid">${businessDocuments.length?businessDocuments.map(d=>`<article class="box document-card"><img src="/logo-htj.png" alt="HTJ"><div><span>${escapeHtml(d.document_type)} · #${d.folio}</span><h3>${escapeHtml(d.title)}</h3><p>${escapeHtml(d.recipient_name||'Documento interno')}</p></div><strong>${money(d.total)}</strong><button onclick="downloadBusinessDocument('${d.id}')">Descargar PDF</button></article>`).join(''):'<div class="box empty-state"><span>▤</span><b>Aún no hay documentos</b><p>Crea el primer recibo o ticket de compra.</p></div>'}</section>`;
  } else if (currentTab === 'notas') {
    mainContent=`<header class="head"><div><span class="section-kicker">ESPACIO PERSONAL</span><h1>Post-its digitales</h1><p>Tus notas son privadas y solamente aparecen en tu cuenta.</p></div><button class="add add-with-label" onclick="openNoteModal()">+ Nueva nota</button></header><section class="notes-board">${digitalNotes.length?digitalNotes.map(n=>`<article class="digital-note note-${escapeHtml(n.color)}"><button onclick="deleteNote('${n.id}')">×</button><span>${n.pinned?'◆ FIJADA':'NOTA PERSONAL'}</span><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p>${n.due_at?`<small>Recordatorio: ${new Date(n.due_at).toLocaleString('es-MX')}</small>`:''}</article>`).join(''):'<div class="box empty-state"><span>◆</span><b>Tu tablero está libre</b><p>Agrega recordatorios, pendientes o ideas.</p></div>'}</section>`;
  } else if (currentTab === 'directorio') {
    mainContent=`<header class="head"><div><span class="section-kicker">CONTACTOS HTJ</span><h1>Directorio</h1><p>Personal del hotel, contactos compartidos y tu agenda privada.</p></div><button class="add add-with-label" onclick="openContactModal()">+ Contacto</button></header><section class="directory-section"><h3>Equipo del hotel</h3><div class="directory-grid">${staffDirectory.map(e=>`<article class="contact-card"><span>${escapeHtml(e.name?.charAt(0)||'H')}</span><div><b>${escapeHtml(e.name)}</b><small>${escapeHtml(e.role)} · Reloj #${e.clock_number||'—'}</small><a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a></div></article>`).join('')}</div></section><section class="directory-section"><h3>Contactos guardados</h3><div class="directory-grid">${contacts.length?contacts.map(c=>`<article class="contact-card"><span>☏</span><div><b>${escapeHtml(c.name)}</b><small>${escapeHtml(c.organization||c.scope)}</small><a href="tel:${escapeHtml(c.phone||'')}">${escapeHtml(c.phone||'Sin teléfono')}</a><a href="mailto:${escapeHtml(c.email||'')}">${escapeHtml(c.email||'')}</a></div></article>`).join(''):'<p class="muted">No hay contactos adicionales.</p>'}</div></section>`;
  } else if (currentTab === 'agenda') {
    const sorted=[...calendarEvents].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    mainContent=`<header class="head"><div><span class="section-kicker">ORGANIZACIÓN</span><h1>Agenda y calendario</h1><p>Eventos personales, departamentales y generales en una sola vista.</p></div><button class="add add-with-label" onclick="openCalendarModal()">+ Nuevo evento</button></header><section class="calendar-shell"><div class="calendar-date"><b>${new Date().toLocaleDateString('es-MX',{day:'2-digit'})}</b><span>${new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'})}</span></div><div class="calendar-timeline">${sorted.length?sorted.map(e=>`<article><time>${new Date(e.starts_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}<b>${new Date(e.starts_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</b></time><i></i><div><span>${escapeHtml(e.scope)}${e.department?' · '+escapeHtml(e.department):''}</span><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.description||'')}${e.location?' · '+escapeHtml(e.location):''}</p></div></article>`).join(''):'<div class="box empty-state"><span>▦</span><b>Sin eventos programados</b></div>'}</div></section>`;
  } else if (currentTab === 'finanzas') {
    const totalExpenses = expenses.reduce((a, b) => a + Number(b.amount), 0);
    mainContent = `
      <header class="head">
        <div>
          <h1>Finanzas</h1>
          <p>Control y registro de gastos operativos del hospedaje</p>
        </div>
        <button class="add" id="addExpenseBtn">+ Registrar Gasto</button>
      </header>
      <section class="kpis">
        <div class="kpi">
          <span>EGRESOS TOTALES</span>
          <strong>${money(totalExpenses)}</strong>
          <small>acumulado general</small>
        </div>
        <div class="kpi">
          <span>TRANSACCIONES</span>
          <strong>${expenses.length}</strong>
          <small>gastos registrados</small>
        </div>
        <div class="kpi">
          <span>PROMEDIO POR GASTO</span>
          <strong>${money(expenses.length ? totalExpenses / expenses.length : 0)}</strong>
          <small>monto medio</small>
        </div>
      </section>
      <section class="expenses-list">
        <div class="box">
          <h3>Registro de Gastos</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${expenses.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">No hay gastos registrados.</td></tr>' : expenses.map(e => `
                  <tr>
                    <td><strong>${e.description}</strong></td>
                    <td><span class="badge">${e.category}</span></td>
                    <td>${e.kind}</td>
                    <td style="color:var(--red);font-weight:bold;">-${money(e.amount)}</td>
                    <td>${new Date(e.occurred_on).toLocaleDateString('es-MX')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'personal') {
    mainContent = `
      <header class="head">
        <div>
          <span class="section-kicker">IDENTIDAD Y ACCESO</span><h1>Directorio Activo HTJ</h1>
          <p>Administra cuentas, roles, estados y recuperación segura del personal.</p>
        </div>
        ${currentEmployee?.role==='SUPER_ADMIN'?'<button class="add add-with-label" id="addEmployeeBtn">+ Crear Empleado</button>':''}
      </header>
      <section class="directory-admin-summary"><article><span>●</span><div><b>${employees.filter(e=>e.active).length}</b><small>Cuentas activas</small></div></article><article><span>◌</span><div><b>${employees.filter(e=>!e.active).length}</b><small>Suspendidas</small></div></article><article><span>⌑</span><div><b>${passwordResetRequests.filter(r=>r.status==='PENDING').length}</b><small>Recuperaciones pendientes</small></div></article></section>
      ${currentEmployee?.role==='SUPER_ADMIN'&&passwordResetRequests.some(r=>r.status==='PENDING')?`<section class="box reset-requests"><div class="section-heading"><div><span class="section-kicker">RECUPERACIÓN DE ACCESO</span><h3>Solicitudes pendientes</h3><p>Verifica la identidad del colaborador antes de generar la contraseña temporal.</p></div></div>${passwordResetRequests.filter(r=>r.status==='PENDING').map(r=>`<article><div><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.email)} · #${r.clock_number||'—'}</small></div><time>${new Date(r.requested_at).toLocaleString('es-MX')}</time><button onclick="generateTemporaryPassword('${r.employee_id}')">Generar temporal</button></article>`).join('')}</section>`:''}
      <section class="users-list">
        <div class="box">
          <h3>Listado de Personal</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Reloj</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${employees.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No hay empleados registrados.</td></tr>' : employees.map(e => `
                  <tr>
                    <td><span style="font-family:monospace;background:rgba(212,168,78,0.15);color:var(--gold);padding:3px 8px;border-radius:6px;font-weight:bold;">#${e.clock_number || 'N/A'}</span></td>
                    <td><strong>${e.name}</strong></td>
                    <td><code>${e.email}</code></td>
                    <td><span class="badge badge-type">${e.role}</span></td>
                    <td>
                      <span class="badge ${e.active ? 'badge-published' : 'badge-draft'}">
                        ${e.active ? 'Activo' : 'Inactivo'}
                      </span>
                      ${e.force_password_change?'<small class="password-pending-badge">Cambio de clave pendiente</small>':''}
                    </td>
                    <td>
                      <div class="actions-group">
                        ${currentEmployee?.role==='SUPER_ADMIN'?`<button class="btn-action btn-primary" onclick="openEditEmployeeModal('${e.id}', '${e.name}', '${e.email}', '${e.role}', ${e.active})">Editar</button><button class="btn-action btn-soft" onclick="generateTemporaryPassword('${e.id}')">Restablecer clave</button><button class="btn-action btn-danger" onclick="deleteEmployee('${e.id}')">Eliminar</button>`:'<span class="badge">Solo lectura</span>'}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'nomina') {
    mainContent = `
      <header class="head">
        <div>
          <h1>Nómina / Payroll</h1>
          <p>Administra los pagos periódicos del personal registrado</p>
        </div>
        <button class="add" id="addPayrollBtn">+ Registrar Nómina</button>
      </header>
      <section class="users-list">
        <div class="box">
          <h3>Recibos de Nómina</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Reloj</th>
                  <th>Empleado</th>
                  <th>Periodo</th>
                  <th>Percepciones</th>
                  <th>Deducciones</th>
                  <th>Neto a Pagar</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${payrolls.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted)">No hay recibos de nómina registrados.</td></tr>' : payrolls.map(p => {
                  const totalPercepciones = (p.gross||0) + (p.overtimePay||0) + (p.attendanceBonus||0) + (p.punctualityBonus||0);
                  const totalDeducciones = (p.imssEmployee||0) + (p.infonavit||0) + (p.fonacot||0) + (p.isr||0);
                  return `
                  <tr>
                    <td><span style="font-family:monospace;background:rgba(212,168,78,0.15);color:var(--gold);padding:3px 8px;border-radius:6px;font-weight:bold;">#${p.clockNumber || 'N/A'}</span></td>
                    <td>
                      <strong>${p.employeeName}</strong><br>
                      <small style="color:var(--muted)">${p.employeeRole}</small>
                    </td>
                    <td>${new Date(p.periodStart).toLocaleDateString('es-MX')} al ${new Date(p.periodEnd).toLocaleDateString('es-MX')}</td>
                    <td style="color:var(--green)">${money(totalPercepciones)}</td>
                    <td style="color:var(--red)">${money(totalDeducciones)}</td>
                    <td style="font-weight:bold;font-size:1.05rem;">${money(p.net)}</td>
                    <td>
                      <span class="badge ${p.status === 'PAID' ? 'badge-published' : p.status === 'APPROVED' ? 'badge-type' : 'badge-draft'}">
                        ${p.status === 'PAID' ? '✓ PAGADO' : p.status === 'APPROVED' ? 'APROBADO' : 'BORRADOR'}
                      </span>
                    </td>
                    <td>
                      <div class="actions-group">
                        <button class="btn-action" style="background:#1a3a6e;color:#7eb3ff;" onclick="downloadPayrollPDF('${p.id}')">⬇ PDF</button>
                        ${p.status !== 'PAID' ? `<button class="btn-action btn-primary" onclick="updatePayrollStatus('${p.id}', 'PAID')">✓ Pagar</button>` : ''}
                        <button class="btn-action btn-danger" onclick="deletePayroll('${p.id}')">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  } else if (currentTab === 'configuracion') {
    mainContent = `
      <header class="head">
        <div>
          <h1>Usuarios y Configuración</h1>
          <p>Gestiona los usuarios huéspedes registrados en la plataforma, edita sus datos y restablece contraseñas</p>
        </div>
        <button class="add" id="addUserBtn">+ Crear Usuario</button>
      </header>
      <section class="users-list">
        <div class="box">
          <h3>Huéspedes Registrados</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo Electrónico</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${users.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">No hay usuarios registrados.</td></tr>' : users.map(u => `
                  <tr>
                    <td><strong>${u.name}</strong></td>
                    <td><code>${u.email}</code></td>
                    <td>${new Date(u.created_at).toLocaleDateString('es-MX')}</td>
                    <td>
                      <div class="actions-group">
                        <button class="btn-action btn-primary" onclick="openEditUserModal('${u.id}', '${u.name}', '${u.email}')">Editar / Password</button>
                        <button class="btn-action btn-danger" onclick="deleteUser('${u.id}')">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="side">
        <div class="logo">
          <img src="/logo-htj.png" alt="Logo HTJ" class="logo-img">
        </div>
        <div class="menu">
          ${menuItems.map(m => `
            <button class="${m.id === currentTab ? 'active' : ''}" onclick="switchTab('${m.id}')">
              ${m.label}
            </button>
          `).join('')}
        </div>
        <div class="theme-toggle-wrapper">
          <div class="employee-session"><span>${escapeHtml(currentEmployee?.name?.charAt(0) || 'H')}</span><div><b>${escapeHtml(currentEmployee?.name || '')}</b><small>${escapeHtml(currentEmployee?.role || '')}</small></div><button id="employeeLogout" title="Cerrar sesión">↪</button></div>
          <button id="themeToggleBtn" class="theme-toggle">
            <span class="theme-icon">${document.body.classList.contains('light-theme') ? '☀️' : '🌙'}</span> 
            ${document.body.classList.contains('light-theme') ? 'Tema Claro' : 'Tema Oscuro'}
          </button>
        </div>
      </aside>
      <main class="main">
        <button class="notification-bell" id="notificationBell" aria-label="Notificaciones">♢${workspaceSummary.unread?`<b>${workspaceSummary.unread}</b>`:''}</button>
        <aside class="notification-panel" id="notificationPanel" hidden><div class="notification-panel-head"><div><span class="section-kicker">ACTUALIZACIONES</span><h3>Notificaciones</h3></div><button id="markNoticesRead">Marcar leídas</button></div><div>${notifications.length?notifications.map(n=>`<button class="notice-item ${n.read_at?'':'unread'}" data-notice-tab="${escapeHtml(n.link_tab||'centro')}"><i></i><span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.message)}</small><time>${new Date(n.created_at).toLocaleString('es-MX')}</time></span></button>`).join(''):'<p class="notification-empty">No tienes notificaciones.</p>'}</div></aside>
        ${mainContent}
      </main>
    </div>
    <nav class="mobilebar">
      ${[
        { id: 'resumen', icon: '▦', label: 'Inicio' },
        { id: 'propiedades', icon: '⌂', label: 'Unidades' },
        { id: 'promociones', icon: '✦', label: 'Promos' },
        { id: 'reservaciones', icon: '▣', label: 'Reservas' },
        { id: 'centro', icon: '◉', label: 'Tickets' },
        { id: 'finanzas', icon: '$', label: 'Finanzas' },
        { id: 'configuracion', icon: '⚙', label: 'Usuarios' }
      ].map(m => `
        <button class="${m.id === currentTab ? 'active' : ''}" onclick="switchTab('${m.id}')">
          <b>${m.icon}</b>${m.label}
        </button>
      `).join('')}
    </nav>
  `;

  // Attach event handlers
  const addBtn = document.querySelector('#addBtn');
  if (addBtn) addBtn.onclick = () => openPropertyModal();

  const addExpenseBtn = document.querySelector('#addExpenseBtn');
  if (addExpenseBtn) addExpenseBtn.onclick = openExpenseModal;

  const addPromotionBtn = document.querySelector('#addPromotionBtn');
  if (addPromotionBtn) addPromotionBtn.onclick = openPromotionModal;

  const addUserBtn = document.querySelector('#addUserBtn');
  if (addUserBtn) addUserBtn.onclick = openUserModal;

  const addEmployeeBtn = document.querySelector('#addEmployeeBtn');
  if (addEmployeeBtn) addEmployeeBtn.onclick = openEmployeeModal;

  const addPayrollBtn = document.querySelector('#addPayrollBtn');
  if (addPayrollBtn) addPayrollBtn.onclick = openPayrollModal;

  const requestCleaningBtn = document.querySelector('#requestCleaningBtn');
  if (requestCleaningBtn) requestCleaningBtn.onclick = openCleaningRequestModal;

  const addMaintenanceBtn = document.querySelector('#addMaintenanceBtn');
  if (addMaintenanceBtn) addMaintenanceBtn.onclick = openMaintenanceSelector;

  const themeToggleBtn = document.querySelector('#themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      render();
    };
  }
  const bell=document.querySelector('#notificationBell'),noticePanel=document.querySelector('#notificationPanel');
  if(bell&&noticePanel)bell.onclick=()=>{noticePanel.hidden=!noticePanel.hidden};
  document.querySelector('#markNoticesRead')?.addEventListener('click',async()=>{await fetch(API+'/v1/workspace/notifications/read',{method:'PUT',headers:headers()});await load()});
  document.querySelectorAll('[data-notice-tab]').forEach(button=>button.addEventListener('click',()=>{currentTab=button.dataset.noticeTab;render()}));
  document.querySelector('#employeeLogout')?.addEventListener('click', () => {
    localStorage.removeItem('employeeToken');
    currentEmployee = null;
    renderEmployeeLogin();
  });
}

window.switchTab = function(tabId) {
  currentTab = tabId;
  render();
};

let uploadedMedia = [];
window.handleMediaUpload = function(e) {
  const files = Array.from(e.target.files);
  const preview = document.querySelector('#mediaPreview');
  preview.innerHTML = '';
  uploadedMedia = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const isVideo = file.type.startsWith('video');
      uploadedMedia.push({ type: isVideo ? 'video' : 'image', url: evt.target.result });

      const thumb = document.createElement('div');
      thumb.style = 'width:60px;height:60px;border-radius:8px;overflow:hidden;border:1px solid var(--gold);flex-shrink:0;position:relative;';
      thumb.innerHTML = isVideo
        ? `<video src="${evt.target.result}" style="width:100%;height:100%;object-fit:cover;"></video>`
        : `<img src="${evt.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
      preview.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });
};

let mapSelectInstance = null;
let mapSelectMarker = null;
let selectedLat = 31.737;
let selectedLng = -106.485;
let debounceTimer = null;

function reverseGeocodeOSM(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(r => r.json())
    .then(data => {
      if (data && data.display_name) {
        const input = document.querySelector('#addressAutocomplete');
        if (input) input.value = data.display_name;
      }
    });
}

window.selectOSMSuggestion = function(name, lat, lng) {
  const input = document.querySelector('#addressAutocomplete');
  if (input) input.value = name;

  const box = document.querySelector('#suggestionsBox');
  if (box) box.style.display = 'none';

  selectedLat = parseFloat(lat);
  selectedLng = parseFloat(lng);
  document.querySelector('#latInput').value = selectedLat;
  document.querySelector('#lngInput').value = selectedLng;

  if (mapSelectInstance) {
    mapSelectInstance.setView([selectedLat, selectedLng], 15);
    if (mapSelectMarker) mapSelectInstance.removeLayer(mapSelectMarker);
    mapSelectMarker = L.marker([selectedLat, selectedLng], { draggable: true }).addTo(mapSelectInstance);
    attachMarkerEvents(mapSelectMarker);
  }
};

window.handleOSMInput = function(val) {
  clearTimeout(debounceTimer);
  const box = document.querySelector('#suggestionsBox');
  if (!box) return;
  
  if (!val || val.trim().length < 3) {
    box.style.display = 'none';
    return;
  }

  debounceTimer = setTimeout(() => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          box.innerHTML = data.map(item => `
            <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem;color:white;" onclick="window.selectOSMSuggestion('${item.display_name.replace(/'/g, "\\'")}', ${item.lat}, ${item.lon})">
              ${item.display_name}
            </div>
          `).join('');
          box.style.display = 'block';
        } else {
          box.style.display = 'none';
        }
      }).catch(() => {
        box.style.display = 'none';
      });
  }, 400);
};

window.searchAddressOSM = function() {
  const address = document.querySelector('#addressAutocomplete').value;
  if (!address) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
    .then(r => r.json())
    .then(data => {
      if (data && data.length > 0) {
        window.selectOSMSuggestion(data[0].display_name, data[0].lat, data[0].lon);
      } else {
        alert('No se pudo encontrar esa dirección.');
      }
    }).catch(() => alert('Error al consultar geolocalización.'));
};

function attachMarkerEvents(marker) {
  marker.on('dragend', function() {
    const pos = marker.getLatLng();
    selectedLat = pos.lat;
    selectedLng = pos.lng;
    document.querySelector('#latInput').value = selectedLat;
    document.querySelector('#lngInput').value = selectedLng;
    reverseGeocodeOSM(selectedLat, selectedLng);
  });
}

function initModalMap(lat, lng) {
  const mapDiv = document.querySelector('#map-select');
  if (!mapDiv || !window.L) return;

  selectedLat = lat || 31.737;
  selectedLng = lng || -106.485;
  document.querySelector('#latInput').value = selectedLat;
  document.querySelector('#lngInput').value = selectedLng;

  mapSelectInstance = L.map('map-select', { keyboard: false }).setView([selectedLat, selectedLng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(mapSelectInstance);

  mapSelectMarker = L.marker([selectedLat, selectedLng], { draggable: true }).addTo(mapSelectInstance);
  attachMarkerEvents(mapSelectMarker);

  mapSelectInstance.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    selectedLat = lat;
    selectedLng = lng;
    document.querySelector('#latInput').value = lat;
    document.querySelector('#lngInput').value = lng;
    if (mapSelectMarker) mapSelectInstance.removeLayer(mapSelectMarker);
    mapSelectMarker = L.marker([lat, lng], { draggable: true }).addTo(mapSelectInstance);
    attachMarkerEvents(mapSelectMarker);
    reverseGeocodeOSM(lat, lng);
  });
}

function openPropertyModal() {
  uploadedMedia = [];
  modal('Añadir Nueva Propiedad', `
    <form id="propertyForm" autocomplete="off">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre de la Propiedad</label>
        <input name="name" required placeholder="Ej: Suite Deluxe HTJ Juarez" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Tipo</label>
          <select name="type" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
            <option value="SUITE">Suite</option>
            <option value="HOTEL">Hotel</option>
            <option value="HOUSE">Casa</option>
            <option value="APARTMENT">Departamento</option>
            <option value="ROOM">Habitación</option>
          </select>
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Huéspedes Máximos</label>
          <input name="maxGuests" type="number" required value="2" min="1" style="width:100%;">
        </div>
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ciudad</label>
          <input name="city" required placeholder="Ciudad Juárez" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Precio Base (MXN)</label>
          <input name="basePrice" type="number" required value="1200" min="0" style="width:100%;">
        </div>
      </div>
      
      <div style="margin-bottom:12px;position:relative;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Dirección Física (Buscador Autocomplete)</label>
        <div style="display:flex;gap:6px;">
          <input id="addressAutocomplete" name="address" required placeholder="Empieza a escribir la calle, número o lugar..." style="flex:1;margin:0;" oninput="window.handleOSMInput(this.value)" autocomplete="off">
          <button type="button" class="btn-action" onclick="window.searchAddressOSM()" style="background:var(--gold);color:#171106;padding:0 15px;font-weight:bold;">Buscar</button>
        </div>
        <div id="suggestionsBox" style="position:absolute;top:100%;left:0;right:0;background:var(--panel);border:1px solid rgba(255,255,255,0.1);border-radius:8px;z-index:999;max-height:200px;overflow-y:auto;display:none;margin-top:2px;"></div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ubicación en el Mapa (Haz clic o arrastra el marcador)</label>
        <div id="map-select" style="height: 180px; border-radius: 12px; border:1px solid rgba(255,255,255,0.1); z-index:1;"></div>
        <input type="hidden" name="lat" id="latInput">
        <input type="hidden" name="lng" id="lngInput">
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Fotos y Videos</label>
        <button type="button" class="btn-action" onclick="document.querySelector('#mediaFiles').click()" style="width:100%;padding:10px;background:var(--panel2);border:1px dashed rgba(255,255,255,0.2);color:white;">\uD83D\uDCF7 Subir Multimedia</button>
        <input type="file" id="mediaFiles" accept="image/*,video/*" multiple onchange="window.handleMediaUpload(event)" style="display:none;">
        <div id="mediaPreview" style="display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:5px;"></div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Descripción del Alojamiento</label>
        <textarea name="description" rows="3" placeholder="Describe el espacio, sus características principales, el ambiente..." style="width:100%;padding:12px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;resize:vertical;"></textarea>
      </div>

      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Recámaras</label>
          <input name="bedrooms" type="number" value="1" min="0" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Baños</label>
          <input name="bathrooms" type="number" value="1" min="0" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Tamaño (m²)</label>
          <input name="property_size" type="number" value="" min="0" placeholder="Ej: 45" style="width:100%;">
        </div>
      </div>

      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Check-in</label>
          <input name="check_in_time" type="time" value="15:00" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Check-out</label>
          <input name="check_out_time" type="time" value="12:00" style="width:100%;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:var(--muted)">Amenidades</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${['WiFi','Estacionamiento','Alberca','A/C','TV','Cocina','Lavander\u00eda','Gym','Seguridad','Mascotas','Balc\u00f3n','Jard\u00edn','Calefacci\u00f3n','Jacuzzi'].map(a => `<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;cursor:pointer;padding:6px;background:rgba(255,255,255,0.04);border-radius:8px;"><input type="checkbox" name="amenity_${a.replace(/[^a-z]/gi,'_')}" value="${a}" style="accent-color:var(--gold);">${a}</label>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Reglas de la Propiedad</label>
        <textarea name="rules" rows="2" placeholder="Ej: No fumar, no fiestas, mascotas permitidas con depósito..." style="width:100%;padding:12px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;resize:vertical;"></textarea>
      </div>

      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Propiedad</button>
    </form>
  `, true);

  setTimeout(() => initModalMap(31.737, -106.485), 100);

  document.querySelector('#propertyForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amenities = ['WiFi','Estacionamiento','Alberca','A/C','TV','Cocina','Lavander\u00eda','Gym','Seguridad','Mascotas','Balc\u00f3n','Jard\u00edn','Calefacci\u00f3n','Jacuzzi']
      .filter(a => fd.get('amenity_'+a.replace(/[^a-z]/gi,'_')));
    const body = {
      name: fd.get('name'),
      type: fd.get('type'),
      city: fd.get('city'),
      address: fd.get('address'),
      maxGuests: parseInt(fd.get('maxGuests')),
      basePrice: parseFloat(fd.get('basePrice')),
      media: uploadedMedia,
      details: {
        lat: parseFloat(fd.get('lat') || selectedLat),
        lng: parseFloat(fd.get('lng') || selectedLng),
        description: fd.get('description') || '',
        amenities,
        bedrooms: parseInt(fd.get('bedrooms') || 1),
        bathrooms: parseInt(fd.get('bathrooms') || 1),
        property_size: parseFloat(fd.get('property_size') || 0) || undefined,
        check_in_time: fd.get('check_in_time') || '15:00',
        check_out_time: fd.get('check_out_time') || '12:00',
        rules: fd.get('rules') || ''
      }
    };

    try {
      const res = await fetch(API + '/v1/properties', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al guardar: ' + (data.error || 'Verifica los datos obligatorios.'));
      }
    } catch (err) {
      alert('Error de conexión con la API.');
    }
  };
}

window.openEditPropertyModal = function(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;

  uploadedMedia = p.media || [];
  modal('Editar Propiedad / Alojamiento', `
    <form id="editPropertyForm" autocomplete="off">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre de la Propiedad</label>
        <input name="name" required value="${p.name}" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Tipo</label>
          <select name="type" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
            <option value="SUITE" ${p.type === 'SUITE' ? 'selected' : ''}>Suite</option>
            <option value="HOTEL" ${p.type === 'HOTEL' ? 'selected' : ''}>Hotel</option>
            <option value="HOUSE" ${p.type === 'HOUSE' ? 'selected' : ''}>Casa</option>
            <option value="APARTMENT" ${p.type === 'APARTMENT' ? 'selected' : ''}>Departamento</option>
            <option value="ROOM" ${p.type === 'ROOM' ? 'selected' : ''}>Habitación</option>
          </select>
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Huéspedes Máximos</label>
          <input name="maxGuests" type="number" required value="${p.max_guests}" min="1" style="width:100%;">
        </div>
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ciudad</label>
          <input name="city" required value="${p.city}" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Precio Base (MXN)</label>
          <input name="basePrice" type="number" required value="${p.base_price}" min="0" style="width:100%;">
        </div>
      </div>
      
      <div style="margin-bottom:12px;position:relative;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Dirección Física (Buscador Autocomplete)</label>
        <div style="display:flex;gap:6px;">
          <input id="addressAutocomplete" name="address" required value="${p.address || ''}" style="flex:1;margin:0;" oninput="window.handleOSMInput(this.value)" autocomplete="off">
          <button type="button" class="btn-action" onclick="window.searchAddressOSM()" style="background:var(--gold);color:#171106;padding:0 15px;font-weight:bold;">Buscar</button>
        </div>
        <div id="suggestionsBox" style="position:absolute;top:100%;left:0;right:0;background:var(--panel);border:1px solid rgba(255,255,255,0.1);border-radius:8px;z-index:999;max-height:200px;overflow-y:auto;display:none;margin-top:2px;"></div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ubicación en el Mapa (Haz clic o arrastra el marcador)</label>
        <div id="map-select" style="height: 180px; border-radius: 12px; border:1px solid rgba(255,255,255,0.1); z-index:1;"></div>
        <input type="hidden" name="lat" id="latInput">
        <input type="hidden" name="lng" id="lngInput">
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Fotos y Videos</label>
        <button type="button" class="btn-action" onclick="document.querySelector('#mediaFiles').click()" style="width:100%;padding:10px;background:var(--panel2);border:1px dashed rgba(255,255,255,0.2);color:white;">📷 Subir Multimedia</button>
        <input type="file" id="mediaFiles" accept="image/*,video/*" multiple onchange="window.handleMediaUpload(event)" style="display:none;">
        <div id="mediaPreview" style="display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:5px;">
          ${uploadedMedia.map(m => `
            <div style="width:60px;height:60px;border-radius:8px;overflow:hidden;border:1px solid var(--gold);flex-shrink:0;position:relative;">
              ${m.type === 'video'
                ? `<video src="${m.url}" style="width:100%;height:100%;object-fit:cover;"></video>`
                : `<img src="${m.url}" style="width:100%;height:100%;object-fit:cover;">`
              }
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Descripción del Alojamiento</label>
        <textarea name="description" rows="3" placeholder="Describe el espacio..." style="width:100%;padding:12px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;resize:vertical;">${p.details?.description || ''}</textarea>
      </div>

      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Recámaras</label>
          <input name="bedrooms" type="number" value="${p.details?.bedrooms || 1}" min="0" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Baños</label>
          <input name="bathrooms" type="number" value="${p.details?.bathrooms || 1}" min="0" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Tamaño (m²)</label>
          <input name="property_size" type="number" value="${p.details?.property_size || ''}" min="0" placeholder="Ej: 45" style="width:100%;">
        </div>
      </div>

      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Check-in</label>
          <input name="check_in_time" type="time" value="${p.details?.check_in_time || '15:00'}" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Check-out</label>
          <input name="check_out_time" type="time" value="${p.details?.check_out_time || '12:00'}" style="width:100%;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:var(--muted)">Amenidades</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${['WiFi','Estacionamiento','Alberca','A/C','TV','Cocina','Lavandería','Gym','Seguridad','Mascotas','Balcón','Jardín','Calefacción','Jacuzzi'].map(a => {
            const checked = (p.details?.amenities || []).includes(a) ? 'checked' : '';
            return `<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;cursor:pointer;padding:6px;background:rgba(255,255,255,0.04);border-radius:8px;"><input type="checkbox" name="amenity_${a.replace(/[^a-z]/gi,'_')}" value="${a}" ${checked} style="accent-color:var(--gold);">${a}</label>`;
          }).join('')}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Reglas de la Propiedad</label>
        <textarea name="rules" rows="2" placeholder="Ej: No fumar..." style="width:100%;padding:12px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;resize:vertical;">${p.details?.rules || ''}</textarea>
      </div>

      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Cambios</button>
    </form>
  `, true);

  const initialLat = p.details?.lat || 31.737;
  const initialLng = p.details?.lng || -106.485;
  setTimeout(() => initModalMap(initialLat, initialLng), 100);

  document.querySelector('#editPropertyForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amenities = ['WiFi','Estacionamiento','Alberca','A/C','TV','Cocina','Lavandería','Gym','Seguridad','Mascotas','Balcón','Jardín','Calefacción','Jacuzzi']
      .filter(a => fd.get('amenity_'+a.replace(/[^a-z]/gi,'_')));
    const body = {
      name: fd.get('name'),
      type: fd.get('type'),
      city: fd.get('city'),
      address: fd.get('address'),
      maxGuests: parseInt(fd.get('maxGuests')),
      basePrice: parseFloat(fd.get('basePrice')),
      media: uploadedMedia,
      details: {
        ...p.details,
        lat: parseFloat(fd.get('lat') || selectedLat),
        lng: parseFloat(fd.get('lng') || selectedLng),
        description: fd.get('description') || '',
        amenities,
        bedrooms: parseInt(fd.get('bedrooms') || 1),
        bathrooms: parseInt(fd.get('bathrooms') || 1),
        property_size: parseFloat(fd.get('property_size') || 0) || undefined,
        check_in_time: fd.get('check_in_time') || '15:00',
        check_out_time: fd.get('check_out_time') || '12:00',
        rules: fd.get('rules') || ''
      }
    };

    try {
      const res = await fetch(API + '/v1/properties/' + id, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al guardar: ' + (data.error || 'Verifica los datos.'));
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
}

window.deleteProperty = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta propiedad?')) return;
  try {
    const res = await fetch(API + '/v1/properties/' + id, {
      method: 'DELETE',
      headers: headers()
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al eliminar la propiedad.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};

window.updatePropertyStatus = async function(id, newStatus) {
  const prop = properties.find(p => p.id === id);
  if (!prop) return;
  const body = {
    name: prop.name,
    type: prop.type,
    city: prop.city,
    address: prop.address || '',
    maxGuests: prop.max_guests,
    basePrice: parseFloat(prop.base_price),
    status: newStatus,
    media: prop.media || [],
    details: prop.details || {}
  };

  try {
    const res = await fetch(API + '/v1/properties/' + id, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body)
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al actualizar el estado.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};

window.openCleaningRequestModal = function() {
  if (!properties.length) return alert('Primero registra una propiedad o habitación.');
  const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
  modal('Solicitar servicio de limpieza', `
    <form id="cleaningRequestForm" class="premium-form">
      <div class="form-intro"><span>✦</span><div><b>Nueva orden de housekeeping</b><p>Programa el servicio con toda la información que necesita el equipo.</p></div></div>
      <div class="form-grid-premium">
        <label class="full">Propiedad o habitación<select name="propertyId" required>${properties.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${escapeHtml(p.city)}</option>`).join('')}</select></label>
        <label>Tipo de servicio<select name="taskType" required><option value="CHECKOUT">Salida de huésped</option><option value="STAYOVER">Repaso de estancia</option><option value="DEEP">Limpieza profunda</option><option value="INSPECTION">Inspección de calidad</option></select></label>
        <label>Prioridad<select name="priority" required><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option><option value="LOW">Baja</option></select></label>
        <label class="full">Fecha y hora solicitada<input name="requestedFor" type="datetime-local" required value="${localDate}"></label>
        <label class="full">Indicaciones para el equipo<textarea name="notes" rows="4" maxlength="1000" placeholder="Ej. Revisar blancos, preparar cama adicional y reportar cualquier desperfecto..."></textarea></label>
      </div>
      <button class="primary premium-submit">Crear solicitud de limpieza</button>
    </form>`);
  document.querySelector('#cleaningRequestForm').onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {propertyId:form.get('propertyId'),taskType:form.get('taskType'),priority:form.get('priority'),requestedFor:new Date(form.get('requestedFor')).toISOString(),notes:form.get('notes')||''};
    try {
      const response = await fetch(API + '/v1/cleaning-tasks',{method:'POST',headers:headers(),body:JSON.stringify(body)});
      const data = await response.json();
      if(!response.ok)throw new Error(data.error||'No se pudo crear la solicitud');
      document.querySelector('.modal')?.remove(); await load();
    } catch(error){ alert(error.message); }
  };
};

window.updateCleaningTask = async function(id,status,extra={}) {
  try {
    const response=await fetch(API+`/v1/cleaning-tasks/${id}`,{method:'PUT',headers:headers(),body:JSON.stringify({status,...extra})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'No se pudo actualizar la limpieza');
    await load();
  } catch(error){alert(error.message);}
};

window.openCleaningRegisterModal = function(id) {
  const task=cleaningTasks.find(item=>item.id===id);
  if(!task)return;
  const checks=['Cama y blancos renovados','Baño desinfectado','Pisos y superficies limpios','Amenidades repuestas','Basura retirada','Ventanas y accesos revisados','Fotografía o inspección final'];
  modal('Registrar limpieza terminada', `
    <form id="cleaningRegisterForm" class="premium-form">
      <div class="form-intro success"><span>✓</span><div><b>${escapeHtml(task.propertyName)}</b><p>Confirma cada punto antes de liberar la unidad.</p></div></div>
      <div class="checklist-premium">${checks.map((item,index)=>`<label><input type="checkbox" name="check_${index}" value="${escapeHtml(item)}" required><span>✓</span>${escapeHtml(item)}</label>`).join('')}</div>
      <label class="field-block">Notas del registro<textarea name="notes" rows="4" maxlength="1000" placeholder="Observaciones, objetos encontrados, insumos faltantes o desperfectos...">${escapeHtml(task.notes||'')}</textarea></label>
      <button class="primary premium-submit">Finalizar y liberar unidad</button>
    </form>`);
  document.querySelector('#cleaningRegisterForm').onsubmit=async event=>{
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const checklist=checks.filter((_,index)=>form.get(`check_${index}`));
    if(checklist.length!==checks.length)return alert('Confirma todos los puntos de la lista de limpieza.');
    document.querySelector('.modal')?.remove();
    await updateCleaningTask(id,'COMPLETED',{notes:form.get('notes')||'',checklist});
  };
};

window.openCleaningDetail = function(id) {
  const task=cleaningTasks.find(item=>item.id===id); if(!task)return;
  modal('Registro de limpieza',`<div class="record-detail"><div class="record-hero"><span>✓</span><div><b>${escapeHtml(task.propertyName)}</b><small>Completada ${task.completedAt?new Date(task.completedAt).toLocaleString('es-MX'):''}</small></div></div><h4>Lista verificada</h4><ul>${(task.checklist||[]).map(item=>`<li>✓ ${escapeHtml(item)}</li>`).join('')||'<li>Sin lista registrada</li>'}</ul><h4>Observaciones</h4><p>${escapeHtml(task.notes||'Sin observaciones.')}</p></div>`);
};

window.openMaintenanceSelector = function() {
  if(!properties.length)return alert('Primero registra una propiedad o habitación.');
  modal('Nuevo reporte de mantenimiento',`<form id="maintenanceSelectorForm" class="premium-form"><div class="form-intro"><span>⚒</span><div><b>Selecciona la unidad</b><p>Después podrás registrar el incidente y cambiar su estado operativo.</p></div></div><label class="field-block">Propiedad o habitación<select name="propertyId">${properties.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${escapeHtml(p.city)}</option>`).join('')}</select></label><button class="primary premium-submit">Continuar con el reporte</button></form>`);
  document.querySelector('#maintenanceSelectorForm').onsubmit=event=>{event.preventDefault();const id=new FormData(event.currentTarget).get('propertyId');const property=properties.find(p=>p.id===id);document.querySelector('.modal')?.remove();openMaintenanceReportModal(id,property?.details?.incident||'');};
};

window.openMaintenanceReportModal = function(id, currentIncident) {
  modal('Reportar / Editar Incidente de Mantenimiento', `
    <form id="maintenanceForm" class="premium-form">
      <div class="form-intro"><span>⚒</span><div><b>Orden de trabajo</b><p>Describe el problema con claridad para acelerar la solución.</p></div></div>
      <div class="form-grid-premium">
        <label>Categoría<select name="category"><option>Plomería</option><option>Electricidad</option><option>Climatización</option><option>Mobiliario</option><option>Seguridad</option><option>Otro</option></select></label>
        <label>Prioridad<select name="maintenancePriority"><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></label>
        <label class="full">Desperfecto o trabajo requerido<textarea name="incident" rows="4" required placeholder="Ej: Fuga de agua en baño o aire acondicionado fallando">${escapeHtml(currentIncident)}</textarea></label>
        <label class="full">Estado operativo<select name="status">
          <option value="MAINTENANCE">Sí, colocar en Mantenimiento</option>
          <option value="AVAILABLE">No, mantener Disponible</option>
        </select>
        </label>
      </div>
      <button class="primary premium-submit">Guardar reporte de mantenimiento</button>
    </form>
  `);

  document.querySelector('#maintenanceForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const prop = properties.find(p => p.id === id);
    const newStatus = fd.get('status');
    const incidentText = fd.get('incident');

    const body = {
      name: prop.name,
      type: prop.type,
      city: prop.city,
      address: prop.address || '',
      maxGuests: prop.max_guests,
      basePrice: parseFloat(prop.base_price),
      status: newStatus,
      media: prop.media || [],
      details: { ...prop.details, incident: incidentText, maintenance: { category: fd.get('category'), priority: fd.get('maintenancePriority'), reportedAt: new Date().toISOString(), reportedBy: currentEmployee?.name || '' } }
    };

    try {
      const res = await fetch(API + '/v1/properties/' + id, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al guardar el reporte.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
};

window.openEditReservationModal = function(id, currentStatus, currentGuests) {
  modal('Editar Estado de Reservación', `
    <form id="editResForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Estado de Pago / Reserva</label>
        <select name="status" style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="HOLD" ${currentStatus === 'HOLD' ? 'selected' : ''}>HOLD (Esperando pago)</option>
          <option value="PAID" ${currentStatus === 'PAID' ? 'selected' : ''}>PAID (Pagado y Confirmado)</option>
          <option value="CANCELLED" ${currentStatus === 'CANCELLED' ? 'selected' : ''}>CANCELLED (Cancelado)</option>
        </select>
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Huéspedes</label>
        <input name="guests" type="number" required value="${currentGuests}" min="1" style="width:100%;">
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Cambios</button>
    </form>
  `);

  document.querySelector('#editResForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      status: fd.get('status'),
      guests: parseInt(fd.get('guests'))
    };

    try {
      const res = await fetch(API + '/v1/reservations/' + id, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al actualizar la reservación.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
};

window.deleteReservation = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta reservación?')) return;
  try {
    const res = await fetch(API + '/v1/reservations/' + id, {
      method: 'DELETE',
      headers: headers()
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al eliminar la reservación.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};

function openEmployeeModal() {
  modal('Crear Nuevo Colaborador / Empleado', `
    <form id="employeeForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre Completo</label>
        <input name="name" required placeholder="Ej: Carlos Gómez" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Correo Electrónico</label>
        <input name="email" type="email" required placeholder="carlos@htj.com" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Rol Operativo</label>
        <select name="role" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="RECEPTION">Recepcionista</option>
          <option value="HOUSEKEEPING">Personal de Limpieza</option>
          <option value="MAINTENANCE">Personal de Mantenimiento</option>
          <option value="FINANCE">Finanzas / Administración</option>
          <option value="MANAGER">Gerente</option>
          <option value="SUPER_ADMIN">Administrador General</option>
        </select>
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Contraseña inicial (mínimo 12 caracteres)</label>
        <input name="password" type="password" minlength="12" required placeholder="Temporal segura" style="width:100%;">
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Crear Empleado</button>
    </form>
  `);

  document.querySelector('#employeeForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      role: fd.get('role'),
      password: fd.get('password')
    };

    try {
      const res = await fetch(API + '/v1/employees', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        const data=await res.json().catch(()=>({}));alert(data.error||'Error al registrar el empleado.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
}

window.openEditEmployeeModal = function(id, name, email, role, active) {
  modal('Editar Colaborador / Datos de Empleado', `
    <form id="editEmployeeForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre Completo</label>
        <input name="name" required value="${name}" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Correo Electrónico</label>
        <input name="email" type="email" required value="${email}" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Rol Operativo</label>
        <select name="role" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="RECEPTION" ${role === 'RECEPTION' ? 'selected' : ''}>Recepcionista</option>
          <option value="HOUSEKEEPING" ${role === 'HOUSEKEEPING' ? 'selected' : ''}>Personal de Limpieza</option>
          <option value="MAINTENANCE" ${role === 'MAINTENANCE' ? 'selected' : ''}>Personal de Mantenimiento</option>
          <option value="FINANCE" ${role === 'FINANCE' ? 'selected' : ''}>Finanzas / Administración</option>
          <option value="MANAGER" ${role === 'MANAGER' ? 'selected' : ''}>Gerente</option>
          <option value="SUPER_ADMIN" ${role === 'SUPER_ADMIN' ? 'selected' : ''}>Administrador General</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Estado de la Cuenta</label>
        <select name="active" style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="true" ${active ? 'selected' : ''}>Activa</option>
          <option value="false" ${!active ? 'selected' : ''}>Suspendida / Inactiva</option>
        </select>
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nueva Contraseña (Dejar en blanco para no cambiar)</label>
        <input name="password" type="password" minlength="12" placeholder="Mínimo 12 caracteres" style="width:100%;">
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Cambios</button>
    </form>
  `);

  document.querySelector('#editEmployeeForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      role: fd.get('role'),
      active: fd.get('active') === 'true'
    };
    const password = fd.get('password');
    if (password && password.trim().length >= 12) {
      body.password = password;
    }

    try {
      const res = await fetch(API + '/v1/employees/' + id, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al guardar los cambios.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
};

window.generateTemporaryPassword=async function(id){if(!confirm('Verifica primero la identidad del empleado. ¿Generar una contraseña temporal nueva?'))return;try{const response=await fetch(API+'/v1/employees/'+id+'/temporary-password',{method:'POST',headers:headers()});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'No fue posible restablecer la contraseña');modal('Contraseña temporal generada',`<div class="temporary-password-result"><img src="/logo-htj.png" alt="HTJ"><span>SE MUESTRA UNA SOLA VEZ</span><h3>${escapeHtml(data.employee.name)}</h3><code id="temporaryPasswordValue">${escapeHtml(data.temporaryPassword)}</code><button id="copyTemporaryPassword">Copiar contraseña</button><p>Entrégala directamente al empleado. Al iniciar sesión, el sistema le exigirá crear una contraseña personal.</p></div>`);document.querySelector('#copyTemporaryPassword').onclick=async()=>{await navigator.clipboard.writeText(data.temporaryPassword);document.querySelector('#copyTemporaryPassword').textContent='✓ Copiada'};await load()}catch(error){alert(error.message)}};

function openExpenseModal() {
  const today = new Date().toISOString().slice(0, 10);
  modal('Registrar gasto operativo', `
    <form id="expenseForm" class="premium-form">
      <div class="form-intro"><span>$</span><div><b>Nuevo movimiento financiero</b><p>El gasto quedará registrado con tu usuario, fecha y hora.</p></div></div>
      <div class="form-grid-premium">
        <label class="full">Descripción del gasto<input name="description" required minlength="3" maxlength="500" placeholder="Ej. Compra de productos de limpieza"></label>
        <label>Categoría<select name="category" required><option value="Limpieza">Limpieza</option><option value="Mantenimiento">Mantenimiento</option><option value="Servicios">Servicios</option><option value="Insumos">Insumos</option><option value="Transporte">Transporte</option><option value="Nómina">Nómina</option><option value="Marketing">Marketing</option><option value="Impuestos">Impuestos</option><option value="Otro">Otro</option></select></label>
        <label>Tipo<select name="kind" required><option value="VARIABLE">Gasto variable</option><option value="FIXED">Gasto fijo</option><option value="ASSET">Activo / inversión</option></select></label>
        <label>Monto (MXN)<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required placeholder="0.00"></label>
        <label>Fecha del gasto<input name="occurredOn" type="date" value="${today}" required></label>
      </div>
      <div id="expenseFormError" class="form-error" hidden></div>
      <button class="primary premium-submit" type="submit">Guardar gasto</button>
    </form>`);
  document.querySelector('#expenseForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget, fd = new FormData(form), button = form.querySelector('button[type="submit"]'), errorBox = form.querySelector('#expenseFormError');
    const amount = Number(fd.get('amount'));
    if (!Number.isFinite(amount) || amount <= 0) { errorBox.hidden=false; errorBox.textContent='Escribe un monto mayor a cero.'; return; }
    button.disabled = true; button.textContent = 'Guardando…'; errorBox.hidden = true;
    try {
      const response = await fetch(API + '/v1/expenses', {method:'POST',headers:headers(),body:JSON.stringify({description:String(fd.get('description')).trim(),category:fd.get('category'),kind:fd.get('kind'),amount,occurredOn:fd.get('occurredOn')})});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw Error(data.error || `No fue posible registrar el gasto (HTTP ${response.status})`);
      document.querySelector('.modal')?.remove();
      await load();
    } catch (error) {
      errorBox.hidden=false; errorBox.textContent=error.message; button.disabled=false; button.textContent='Guardar gasto';
    }
  };
}
window.openExpenseModal = openExpenseModal;

window.deleteEmployee = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este empleado?')) return;
  try {
    const res = await fetch(API + '/v1/employees/' + id, {
      method: 'DELETE',
      headers: headers()
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al eliminar el empleado.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};


function openPayrollModal_OLD() {
  if (employees.length === 0) {
    alert('Primero debes registrar empleados en la sección de Personal.');
    return;
  }

  modal('Registrar Recibo de Nómina', `
    <form id="payrollForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Colaborador / Empleado</label>
        <select name="employeeId" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          ${employees.map(e => `<option value="${e.id}">${e.name} (${e.role})</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Inicio Periodo</label>
          <input name="periodStart" type="date" required value="${new Date().toISOString().split('T')[0]}" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Fin Periodo</label>
          <input name="periodEnd" type="date" required value="${new Date().toISOString().split('T')[0]}" style="width:100%;">
        </div>
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Sueldo Bruto (MXN)</label>
          <input name="gross" type="number" required value="8000" min="0" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Deducciones / Retención</label>
          <input name="deductions" type="number" required value="800" min="0" style="width:100%;">
        </div>
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Estado de Pago</label>
        <select name="status" style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="DRAFT">Draft (Borrador)</option>
          <option value="APPROVED">Approved (Aprobado)</option>
          <option value="PAID">Paid (Pagado)</option>
        </select>
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Recibo</button>
    </form>
  `);

  document.querySelector('#payrollForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const grossVal = parseFloat(fd.get('gross'));
    const deductVal = parseFloat(fd.get('deductions'));
    const body = {
      employeeId: fd.get('employeeId'),
      periodStart: fd.get('periodStart'),
      periodEnd: fd.get('periodEnd'),
      gross: grossVal,
      deductions: { tax: deductVal },
      net: grossVal - deductVal,
      status: fd.get('status')
    };

    try {
      const res = await fetch(API + '/v1/payroll', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al registrar la nómina.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
}

window.updatePayrollStatus = async function(id, newStatus) {
  try {
    const res = await fetch(API + '/v1/payroll/' + id, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al actualizar el estado de nómina.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};

window.deletePayroll = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este recibo?')) return;
  try {
    const res = await fetch(API + '/v1/payroll/' + id, {
      method: 'DELETE',
      headers: headers()
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al eliminar la nómina.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};

window.openUserModal = function() {
  modal('Crear Nuevo Huésped / Usuario', `
    <form id="userForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre Completo</label>
        <input name="name" required placeholder="Ej: Juan Pérez" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Correo Electrónico</label>
        <input name="email" type="email" required placeholder="juan@gmail.com" style="width:100%;">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Contraseña (Min. 8 caracteres)</label>
        <input name="password" type="password" required placeholder="••••••••" style="width:100%;">
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Crear Usuario</button>
    </form>
  `);

  document.querySelector('#userForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      password: fd.get('password')
    };

    try {
      const res = await fetch(API + '/v1/users', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al registrar el usuario.');
      }
    } catch (err) {
      alert('Error de conexión con la API.');
    }
  };
}

window.openEditUserModal = function(id, name, email) {
  modal('Editar Huésped / Cambiar Contraseña', `
    <form id="editUserForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre Completo</label>
        <input name="name" required value="${name}" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Correo Electrónico</label>
        <input name="email" type="email" required value="${email}" style="width:100%;">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nueva Contraseña (Dejar en blanco para no cambiar)</label>
        <input name="password" type="password" placeholder="••••••••" style="width:100%;">
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Cambios</button>
    </form>
  `);

  document.querySelector('#editUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      email: fd.get('email')
    };
    const password = fd.get('password');
    if (password && password.trim().length >= 8) {
      body.password = password;
    }

    try {
      const res = await fetch(API + '/v1/users/' + id, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al actualizar el usuario.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };
};

window.deleteUser = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Se eliminarán también sus reservas asociadas.')) return;
  try {
    const res = await fetch(API + '/v1/users/' + id, {
      method: 'DELETE',
      headers: headers()
    });
    if (res.ok) {
      load();
    } else {
      alert('Error al eliminar el usuario.');
    }
  } catch (err) {
    alert('Error de conexión.');
  }
};

let promotionImage = '';

window.handlePromotionImage = function(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('Selecciona una imagen válida.');
  if (file.size > 12 * 1024 * 1024) return alert('La imagen debe pesar menos de 12 MB.');
  const reader = new FileReader();
  reader.onload = e => {
    promotionImage = e.target.result;
    const preview = document.querySelector('#promotionImagePreview');
    if (preview) {
      preview.style.backgroundImage = `linear-gradient(180deg,transparent,rgba(5,8,16,.75)),url("${promotionImage}")`;
      preview.classList.add('has-image');
      preview.querySelector('span').textContent = 'Cambiar imagen';
    }
  };
  reader.readAsDataURL(file);
};

function promotionDateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function openPromotionEditor(promotion = null) {
  promotionImage = promotion?.image_url || '';
  modal(promotion ? 'Editar promoción' : 'Nueva promoción', `
    <form id="promotionForm" autocomplete="off">
      <button type="button" id="promotionImagePreview" class="promotion-upload ${promotionImage ? 'has-image' : ''}"
        style="${promotionImage ? `background-image:linear-gradient(180deg,transparent,rgba(5,8,16,.72)),url('${String(promotionImage).replace(/'/g, '%27')}')` : ''}"
        onclick="document.querySelector('#promotionImageFile').click()">
        <span>${promotionImage ? 'Cambiar imagen' : 'Subir imagen de portada'}</span>
        <small>Recomendado 1920 × 900 px · JPG, PNG o WEBP</small>
      </button>
      <input id="promotionImageFile" type="file" accept="image/*" onchange="handlePromotionImage(event)" hidden>
      <div class="promotion-form-grid">
        <label class="full">Título principal<input name="title" maxlength="120" required value="${escapeHtml(promotion?.title || '')}" placeholder="Escápate este fin de semana"></label>
        <label class="full">Descripción<textarea name="subtitle" maxlength="320" rows="3" placeholder="Una experiencia especial en Ciudad Juárez">${escapeHtml(promotion?.subtitle || '')}</textarea></label>
        <label>Etiqueta<input name="badge" maxlength="40" value="${escapeHtml(promotion?.badge || '')}" placeholder="Oferta especial"></label>
        <label>Orden<input name="sortOrder" type="number" min="0" max="1000" value="${promotion?.sort_order ?? 0}"></label>
        <label>Texto del botón<input name="ctaLabel" maxlength="50" value="${escapeHtml(promotion?.cta_label || 'Ver alojamientos')}"></label>
        <label>Enlace del botón<input name="ctaUrl" maxlength="500" value="${escapeHtml(promotion?.cta_url || '#alojamientos')}" placeholder="#alojamientos"></label>
        <label>Mostrar desde<input name="startsAt" type="datetime-local" value="${promotionDateValue(promotion?.starts_at)}"></label>
        <label>Mostrar hasta<input name="endsAt" type="datetime-local" value="${promotionDateValue(promotion?.ends_at)}"></label>
        <label class="promotion-active full"><input name="active" type="checkbox" ${promotion?.active === false ? '' : 'checked'}> Publicar y mostrar esta promoción en la página de clientes</label>
      </div>
      <div class="promotion-form-note">Al guardar se sincroniza automáticamente. Si Railway está reiniciando, el sistema continuará intentando en segundo plano.</div>
      <button class="primary promotion-save">${promotion ? 'Guardar y sincronizar cambios' : 'Publicar promoción'}</button>
    </form>
  `, true);

  document.querySelector('#promotionForm').onsubmit = async event => {
    event.preventDefault();
    if (!promotionImage) return alert('Sube una imagen para la promoción.');
    const form = new FormData(event.target);
    const startsAt = form.get('startsAt');
    const endsAt = form.get('endsAt');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return alert('La fecha final debe ser posterior a la fecha inicial.');
    const body = {
      title: form.get('title').trim(),
      subtitle: form.get('subtitle').trim(),
      badge: form.get('badge').trim(),
      imageUrl: promotionImage,
      mobileImageUrl: '',
      ctaLabel: form.get('ctaLabel').trim() || 'Ver alojamientos',
      ctaUrl: form.get('ctaUrl').trim() || '#alojamientos',
      active: form.get('active') === 'on',
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      sortOrder: parseInt(form.get('sortOrder') || '0', 10)
    };
    try {
      const response = await fetch(API + '/v1/promotions' + (promotion ? `/${promotion.id}` : ''), {
        method: promotion ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) return alert('No se pudo guardar: ' + (data.error || 'Revisa los datos.'));
      document.querySelector('.modal').remove();
      await load();
      if (data.sync && !data.sync.ok) alert('La promoción quedó guardada y el reintento automático está activo.');
    } catch (error) { alert('Error de conexión: ' + error.message); }
  };
}

window.openPromotionModal = function() { openPromotionEditor(); };
window.openEditPromotionModal = function(id) {
  const promotion = promotions.find(item => item.id === id);
  if (promotion) openPromotionEditor(promotion);
};

window.publishPromotion = async function(id) {
  try {
    const response = await fetch(API + `/v1/promotions/${id}/publish`, { method: 'POST', headers: headers() });
    const data = await response.json();
    if (!response.ok) return alert('No se pudo sincronizar la promoción.');
    alert(data.synced ? '✅ Promoción sincronizada con la página de clientes.' : '↻ Guardada. Railway la sincronizará automáticamente en el siguiente reintento.');
    load();
  } catch (error) { alert('Error de conexión: ' + error.message); }
};

window.deletePromotion = async function(id) {
  if (!confirm('¿Eliminar esta promoción del portal de clientes?')) return;
  try {
    const response = await fetch(API + `/v1/promotions/${id}`, { method: 'DELETE', headers: headers() });
    if (!response.ok) return alert('No se pudo eliminar la promoción.');
    load();
  } catch (error) { alert('Error de conexión: ' + error.message); }
};

window.publishProperty = async function(id) {
  try {
    const res = await fetch(API + `/v1/properties/${id}/publish`, {
      method: 'POST',
      headers: headers()
    });
    const data = await res.json();
    if (res.ok) {
      if (data.synced) {
        alert('✅ ¡Propiedad publicada y sincronizada exitosamente con el portal de huéspedes!');
      } else {
        alert('↻ La propiedad quedó publicada. Railway la sincronizará automáticamente en segundo plano.\n\nDetalle temporal: ' + (data.syncError || 'Servicio de clientes no disponible.'));
      }
      load();
    } else {
      alert('Error al publicar: ' + (data.error || 'Intenta de nuevo.'));
    }
  } catch (err) {
    alert('Error de red al publicar: ' + err.message);
  }
};

async function workspaceRequest(path,method='POST',body){const response=await fetch(API+path,{method,headers:headers(),body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'No fue posible guardar');return data}

window.openTicketModal=function(){modal('Nuevo ticket departamental',`<form id="workspaceTicketForm" class="premium-form"><div class="form-intro"><span>◉</span><div><b>Canalización automática</b><p>El ticket será visible para el departamento seleccionado.</p></div></div><div class="form-grid-premium"><label>Departamento<select name="department"><option value="RECEPTION">Recepción</option><option value="HOUSEKEEPING">Limpieza</option><option value="MAINTENANCE">Mantenimiento</option><option value="FINANCE">Finanzas / pagos</option><option value="MANAGEMENT">Gerencia</option></select></label><label>Prioridad<select name="priority"><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option><option value="LOW">Baja</option></select></label><label>Categoría<input name="category" required placeholder="Ej. solicitud, compra, incidente"></label><label>Propiedad<select name="propertyId"><option value="">General</option>${properties.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></label><label class="full">Asunto<input name="subject" required maxlength="160"></label><label class="full">Descripción<textarea name="description" required rows="5"></textarea></label></div><button class="primary premium-submit">Crear y enviar ticket</button></form>`);document.querySelector('#workspaceTicketForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await workspaceRequest('/v1/workspace/tickets','POST',{department:f.get('department'),priority:f.get('priority'),category:f.get('category'),propertyId:f.get('propertyId')||null,subject:f.get('subject'),description:f.get('description')});document.querySelector('.modal')?.remove();await load()}catch(x){alert(x.message)}}};
window.openTicketUpdateModal=function(source,id,title){modal('Atender ticket',`<form id="ticketUpdateForm" class="premium-form"><div class="form-intro success"><span>✓</span><div><b>${title}</b><p>Registra el avance o la resolución antes de cerrar.</p></div></div><label class="field-block">Estado<select name="status"><option value="IN_PROGRESS">En proceso</option><option value="WAITING">En espera</option><option value="RESOLVED">Resuelto</option><option value="CLOSED">Cerrado</option></select></label><label class="field-block">Resolución / seguimiento<textarea name="resolution" rows="5"></textarea></label><button class="primary premium-submit">Guardar actualización</button></form>`);document.querySelector('#ticketUpdateForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await workspaceRequest(`/v1/workspace/tickets/${source}/${id}`,'PUT',{status:f.get('status'),resolution:f.get('resolution')});document.querySelector('.modal')?.remove();await load()}catch(x){alert(x.message)}}};
window.openConfidentialModal=function(){modal('Mensaje privado al administrador',`<form id="privateInboxForm" class="premium-form"><div class="privacy-form-note">🔒 El contenido únicamente puede ser consultado por una cuenta SUPER_ADMIN.</div><label class="field-block">Tipo<select name="kind"><option value="SUGGESTION">Sugerencia</option><option value="IMPROVEMENT">Mejora</option><option value="COMPLAINT">Queja</option><option value="PRIVATE">Asunto privado</option></select></label><label class="field-block">Asunto<input name="subject" required></label><label class="field-block">Mensaje<textarea name="message" rows="7" required></textarea></label><button class="primary premium-submit">Enviar de forma confidencial</button></form>`);document.querySelector('#privateInboxForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await workspaceRequest('/v1/workspace/confidential','POST',{kind:f.get('kind'),subject:f.get('subject'),message:f.get('message')});document.querySelector('.modal')?.remove();alert('Mensaje entregado de forma privada al administrador.')}catch(x){alert(x.message)}}};
window.openConfidentialReply=function(source,id){modal('Revisión confidencial',`<form id="confidentialReplyForm" class="premium-form"><label class="field-block">Estado<select name="status"><option value="REVIEWED">Revisado</option><option value="CLOSED">Cerrado</option><option value="NEW">Nuevo</option></select></label><label class="field-block">Respuesta administrativa<textarea name="response" rows="6"></textarea></label><button class="primary premium-submit">Guardar revisión</button></form>`);document.querySelector('#confidentialReplyForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await workspaceRequest(`/v1/workspace/confidential/${source}/${id}`,'PUT',{status:f.get('status'),response:f.get('response')});document.querySelector('.modal')?.remove();await load()}catch(x){alert(x.message)}}};

window.openNoteModal=function(){modal('Nuevo post-it',`<form id="noteForm" class="premium-form"><label class="field-block">Título<input name="title" required></label><label class="field-block">Nota<textarea name="body" rows="6"></textarea></label><div class="form-grid-premium"><label>Color<select name="color"><option value="gold">Dorado</option><option value="blue">Azul</option><option value="green">Verde</option><option value="rose">Rosa</option></select></label><label>Recordatorio<input type="datetime-local" name="dueAt"></label><label class="full"><span><input type="checkbox" name="pinned" style="width:auto"> Fijar nota</span></label></div><button class="primary premium-submit">Guardar nota privada</button></form>`);document.querySelector('#noteForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);await workspaceRequest('/v1/workspace/notes','POST',{title:f.get('title'),body:f.get('body'),color:f.get('color'),dueAt:f.get('dueAt')||null,pinned:f.has('pinned')});document.querySelector('.modal')?.remove();await load()}};
window.deleteNote=async id=>{if(confirm('¿Eliminar esta nota?')){await workspaceRequest('/v1/workspace/notes/'+id,'DELETE');await load()}};
window.openContactModal=function(){modal('Agregar contacto',`<form id="contactForm" class="premium-form"><div class="form-grid-premium"><label>Visibilidad<select name="scope"><option value="PERSONAL">Solo para mí</option>${['SUPER_ADMIN','MANAGER'].includes(currentEmployee?.role)?'<option value="SHARED">Compartido con el equipo</option>':''}</select></label><label>Nombre<input name="name" required></label><label>Empresa / relación<input name="organization"></label><label>Teléfono<input name="phone" type="tel"></label><label>Correo<input name="email" type="email"></label><label>Dirección<input name="address"></label><label class="full">Notas<textarea name="notes"></textarea></label></div><button class="primary premium-submit">Guardar contacto</button></form>`);document.querySelector('#contactForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));await workspaceRequest('/v1/workspace/contacts','POST',f);document.querySelector('.modal')?.remove();await load()}};
window.openCalendarModal=function(){modal('Nuevo evento',`<form id="calendarForm" class="premium-form"><div class="form-grid-premium"><label>Visibilidad<select name="scope"><option value="PERSONAL">Personal</option><option value="DEPARTMENT">Mi departamento</option>${['SUPER_ADMIN','MANAGER'].includes(currentEmployee?.role)?'<option value="SHARED">Todo el hotel</option>':''}</select></label><label>Título<input name="title" required></label><label>Inicio<input type="datetime-local" name="startsAt" required></label><label>Fin<input type="datetime-local" name="endsAt"></label><label class="full">Lugar<input name="location"></label><label class="full">Descripción<textarea name="description"></textarea></label></div><button class="primary premium-submit">Agregar a la agenda</button></form>`);document.querySelector('#calendarForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.endsAt=f.endsAt||null;await workspaceRequest('/v1/workspace/calendar','POST',f);document.querySelector('.modal')?.remove();await load()}};

window.openDocumentModal=function(){modal('Generar documento HTJ',`<form id="documentForm" class="premium-form"><div class="form-intro"><span>▤</span><div><b>Documento corporativo</b><p>Se asignará un folio y podrá descargarse con el logo oficial.</p></div></div><div class="form-grid-premium"><label>Tipo<select name="documentType"><option value="PURCHASE_TICKET">Ticket de compra</option><option value="RECEIPT">Recibo</option><option value="QUOTE">Cotización</option><option value="INTERNAL">Documento interno</option></select></label><label>Título<input name="title" required></label><label>Destinatario<input name="recipientName"></label><label>Correo<input type="email" name="recipientEmail"></label><label class="full">Concepto<input name="description" required></label><label>Cantidad<input type="number" name="quantity" min="0.01" step="0.01" value="1" required></label><label>Precio unitario<input type="number" name="unitPrice" min="0" step="0.01" required></label><label>IVA<select name="taxRate"><option value="0">0%</option><option value="0.08">8%</option><option value="0.16">16%</option></select></label><label>Adjunto privado<input type="file" id="documentAttachment" accept="image/*,.pdf"></label><label class="full">Notas<textarea name="notes"></textarea></label></div><button class="primary premium-submit">Generar documento</button></form>`,true);document.querySelector('#documentForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),file=document.querySelector('#documentAttachment')?.files?.[0];let attachment=null;if(file){if(file.size>3_000_000)return alert('El adjunto debe pesar menos de 3 MB.');attachment={name:file.name,type:file.type,data:await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result);reader.readAsDataURL(file)})}}await workspaceRequest('/v1/workspace/documents','POST',{documentType:f.get('documentType'),title:f.get('title'),recipientName:f.get('recipientName'),recipientEmail:f.get('recipientEmail'),concepts:[{description:f.get('description'),quantity:Number(f.get('quantity')),unitPrice:Number(f.get('unitPrice'))}],taxRate:Number(f.get('taxRate')),notes:f.get('notes'),attachment});document.querySelector('.modal')?.remove();await load()}};
window.downloadBusinessDocument=async function(id){const d=businessDocuments.find(x=>x.id===id);if(!d)return;await loadJsPDF();const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'letter'});doc.setFillColor(12,15,22);doc.rect(0,0,216,38,'F');try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='/logo-htj.png'});doc.addImage(img,'PNG',14,5,28,28)}catch{}doc.setTextColor(212,168,78);doc.setFontSize(20);doc.text('HOSPEDAJE TAXI JUÁREZ',50,17);doc.setFontSize(9);doc.text(`${String(d.document_type).replaceAll('_',' ')} · FOLIO ${d.folio}`,50,25);doc.setTextColor(25,30,40);doc.setFontSize(16);doc.text(d.title,14,52);doc.setFontSize(10);doc.text(`Destinatario: ${d.recipient_name||'Documento interno'}`,14,61);let y=76;doc.setFillColor(232,190,98);doc.rect(14,y-7,188,9,'F');doc.text('CANT.',17,y-1);doc.text('DESCRIPCIÓN',40,y-1);doc.text('PRECIO',160,y-1);y+=8;(d.concepts||[]).forEach(c=>{doc.text(String(c.quantity),17,y);doc.text(String(c.description).slice(0,65),40,y);doc.text(money(c.unitPrice),160,y);y+=9});y+=8;doc.text(`Subtotal: ${money(d.subtotal)}`,145,y);doc.text(`Impuestos: ${money(d.tax)}`,145,y+7);doc.setFontSize(14);doc.text(`TOTAL: ${money(d.total)}`,145,y+17);doc.setFontSize(9);doc.text(d.notes||'Documento generado por el sistema administrativo HTJ.',14,250,{maxWidth:185});doc.save(`HTJ-${d.document_type}-${d.folio}.pdf`)};

function modal(title, body, isWide = false) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="sheet ${isWide ? 'wide' : ''}"><button class="close">×</button><h2>${title}</h2>${body}</div>`;
  m.querySelector('.close').onclick = () => m.remove();
  m.onclick = e => {
    if (e.target === m) m.remove();
  };
  document.body.append(m);
}

load();

// ============================================================
// NOMINA PDF — Sistema HTJ OPS (estilo Sistema Tress / IMSS)
// ============================================================
function openPayrollModal() {
  if (employees.length === 0) {
    alert('Primero debes registrar empleados en la sección de Personal.');
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.substring(0, 8) + '01';
  modal('\uD83D\uDDD2\uFE0F Registrar N\u00f3mina — Sistema HTJ', `
    <style>
      .pay-section{background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:14px;}
      .pay-section h4{margin:0 0 10px;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--gold);}
      .pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .pay-grid .full{grid-column:1/-1;}
      .pay-label{display:block;margin-bottom:3px;font-size:0.75rem;color:var(--muted);}
      .pay-input{width:100%;padding:9px 11px;border:1px solid var(--border);background:var(--panel);color:white;border-radius:9px;font-size:0.85rem;box-sizing:border-box;}
      .pay-input:focus{outline:none;border-color:var(--gold);}
      .checadas-row{display:flex;gap:6px;margin-bottom:6px;align-items:center;}
    </style>
    <form id="payrollFormNew">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Columna 1 -->
        <div>
          <div class="pay-section">
            <h4>\uD83D\uDC64 Empleado y Periodo</h4>
            <div style="margin-bottom:8px;">
              <label class="pay-label">Colaborador</label>
              <select name="employeeId" required class="pay-input">${employees.map(e => `<option value="${e.id}">${e.name} — #${e.clock_number||'N/A'} (${e.role})</option>`).join('')}</select>
            </div>
            <div class="pay-grid">
              <div><label class="pay-label">Inicio Periodo</label><input name="periodStart" type="date" required value="${firstOfMonth}" class="pay-input"></div>
              <div><label class="pay-label">Fin Periodo</label><input name="periodEnd" type="date" required value="${today}" class="pay-input"></div>
              <div><label class="pay-label">D\u00edas Trabajados</label><input name="diasTrab" type="number" value="15" min="0" class="pay-input"></div>
              <div><label class="pay-label">D\u00edas Festivos</label><input name="diasFest" type="number" value="0" min="0" class="pay-input"></div>
            </div>
          </div>
          <div class="pay-section">
            <h4>\uD83D\uDFE2 Percepciones</h4>
            <div class="pay-grid">
              <div><label class="pay-label">Salario Base (MXN)</label><input name="gross" type="number" required value="8000" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">Horas Extras (cant.)</label><input name="overtimeHours" type="number" value="0" min="0" step="0.5" class="pay-input"></div>
              <div><label class="pay-label">Pago Hrs Extras (MXN)</label><input name="overtimePay" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">Bono Asistencia (MXN)</label><input name="attendanceBonus" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">Bono Puntualidad (MXN)</label><input name="punctualityBonus" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">Otros Ingresos (MXN)</label><input name="otroIngreso" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
            </div>
            <div style="margin-top:8px;padding:8px 12px;background:rgba(79,209,149,0.1);border-radius:8px;display:flex;justify-content:space-between;">
              <span style="color:#4fd195;font-size:0.82rem;">TOTAL PERCEPCIONES:</span><strong id="payTP" style="color:#4fd195;">$0.00</strong>
            </div>
          </div>
        </div>
        <!-- Columna 2 -->
        <div>
          <div class="pay-section">
            <h4>\uD83D\uDD34 Deducciones (IMSS / ISR / INFONAVIT / FONACOT)</h4>
            <div class="pay-grid">
              <div><label class="pay-label">IMSS Trabajador (MXN)</label><input name="imssEmployee" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">IMSS Patr\u00f3n (MXN)</label><input name="imssEmployer" type="number" value="0" min="0" class="pay-input"></div>
              <div><label class="pay-label">ISR Retenido (MXN)</label><input name="isr" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">INFONAVIT (MXN)</label><input name="infonavit" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">FONACOT (MXN)</label><input name="fonacot" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
              <div><label class="pay-label">Otras Deducciones (MXN)</label><input name="otraDeduccion" type="number" value="0" min="0" class="pay-input" oninput="calcNomina()"></div>
            </div>
            <div style="margin-top:8px;padding:8px 12px;background:rgba(255,101,119,0.1);border-radius:8px;display:flex;justify-content:space-between;">
              <span style="color:#ff6577;font-size:0.82rem;">TOTAL DEDUCCIONES:</span><strong id="payTD" style="color:#ff6577;">$0.00</strong>
            </div>
          </div>
          <div class="pay-section">
            <h4>\uD83D\uDD50 Checadas de Reloj</h4>
            <div id="checadasBox">
              <div class="checadas-row"><input type="datetime-local" name="ch_0" class="pay-input" style="flex:1;"><select name="ch_0_t" class="pay-input" style="width:110px;"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option></select></div>
            </div>
            <button type="button" onclick="addPayChecada()" style="margin-top:6px;background:rgba(255,255,255,0.05);color:var(--muted);border:1px dashed rgba(255,255,255,0.2);padding:7px 14px;border-radius:8px;cursor:pointer;width:100%;font-size:0.82rem;">+ Agregar Checada</button>
          </div>
        </div>
      </div>
      
      <!-- Resumen y Notas inferior a lo ancho -->
      <div class="pay-section">
        <h4>\uD83D\uDCCB Resumen Final</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="padding:14px;background:rgba(212,168,78,0.1);border-radius:10px;border:1px solid rgba(212,168,78,0.3);margin-bottom:0;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--muted);">Percepciones:</span><strong id="payTP2" style="color:#4fd195;">$0.00</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--muted);">Deducciones:</span><strong id="payTD2" style="color:#ff6577;">$0.00</strong></div>
              <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(212,168,78,0.3);padding-top:8px;"><span style="font-weight:bold;">NETO A PAGAR:</span><strong id="payNeto" style="color:var(--gold);font-size:1.1rem;">$0.00</strong></div>
            </div>
          </div>
          <div>
            <div style="margin-bottom:8px;"><label class="pay-label">Notas / Observaciones</label><textarea name="notes" rows="2" placeholder="Vacaciones, bonos especiales, etc." class="pay-input" style="resize:vertical;margin:0;"></textarea></div>
            <div><label class="pay-label">Estado de Pago</label><select name="status" class="pay-input" style="margin:0;"><option value="DRAFT">Borrador (DRAFT)</option><option value="APPROVED">Aprobado (APPROVED)</option><option value="PAID">Pagado (PAID)</option></select></div>
          </div>
        </div>
      </div>
      <button class="primary" style="width:100%;padding:13px;background:var(--gold);color:#171106;font-weight:bold;font-size:0.95rem;">\uD83D\uDCBE Guardar Recibo de N\u00f3mina</button>
    </form>
  `, true);

  window.calcNomina = function() {
    const g = n => parseFloat(document.querySelector(`[name="${n}"]`)?.value || 0);
    const tp = g('gross') + g('overtimePay') + g('attendanceBonus') + g('punctualityBonus') + g('otroIngreso');
    const td = g('imssEmployee') + g('isr') + g('infonavit') + g('fonacot') + g('otraDeduccion');
    const neto = tp - td;
    const fmt = n => '$' + n.toLocaleString('es-MX', {minimumFractionDigits:2,maximumFractionDigits:2});
    ['payTP','payTP2'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=fmt(tp); });
    ['payTD','payTD2'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=fmt(td); });
    const ne = document.getElementById('payNeto'); if(ne) ne.textContent=fmt(neto);
  };
  calcNomina();

  let chCount = 1;
  window.addPayChecada = function() {
    const box = document.getElementById('checadasBox');
    const row = document.createElement('div');
    row.className = 'checadas-row';
    row.innerHTML = `<input type="datetime-local" name="ch_${chCount}" class="pay-input" style="flex:1;"><select name="ch_${chCount}_t" class="pay-input" style="width:110px;"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option></select><button type="button" onclick="this.parentElement.remove()" style="background:rgba(255,101,119,0.15);color:#ff6577;border:none;padding:7px 11px;border-radius:8px;cursor:pointer;">✕</button>`;
    box.append(row); chCount++;
  };

  document.getElementById('payrollFormNew').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const g = name => parseFloat(fd.get(name) || 0);
    const gross = g('gross'), overtimePay = g('overtimePay'), attendanceBonus = g('attendanceBonus'),
          punctualityBonus = g('punctualityBonus'), otroIngreso = g('otroIngreso'),
          imssEmployee = g('imssEmployee'), imssEmployer = g('imssEmployer'), isr = g('isr'),
          infonavit = g('infonavit'), fonacot = g('fonacot'), otraDeduccion = g('otraDeduccion');
    const tp = gross + overtimePay + attendanceBonus + punctualityBonus + otroIngreso;
    const td = imssEmployee + isr + infonavit + fonacot + otraDeduccion;
    const net = tp - td;
    const timeEntries = [];
    for(let i=0;i<chCount+2;i++){const v=fd.get(`ch_${i}`);const t=fd.get(`ch_${i}_t`);if(v)timeEntries.push({timestamp:v,type:t||'ENTRADA'});}
    const body = {
      employeeId:fd.get('employeeId'), periodStart:fd.get('periodStart'), periodEnd:fd.get('periodEnd'),
      gross, net, status:fd.get('status'), overtimeHours:g('overtimeHours'), overtimePay,
      attendanceBonus, punctualityBonus, imssEmployee, imssEmployer, isr, infonavit, fonacot,
      otherDeductions:{otros:otraDeduccion}, timeEntries, notes:fd.get('notes')||''
    };
    try {
      const res = await fetch(API+'/v1/payroll',{method:'POST',headers:headers(),body:JSON.stringify(body)});
      if(res.ok){document.querySelector('.modal').remove();load();}
      else{const d=await res.json();alert('Error: '+(d.error||'Intenta de nuevo.'));}
    } catch(err){alert('Error de conexión: '+err.message);}
  };
}

async function loadJsPDF() {
  if (window.jspdf) return;
  await new Promise(r => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = r; document.head.append(s);
  });
}

window.downloadPayrollPDF = async function(id) {
  const p = payrolls.find(x => x.id === id);
  if (!p) { alert('Recibo no encontrado.'); return; }
  await loadJsPDF();
  
  // Load the official HTJ logo dynamically
  const img = new Image();
  img.src = '/logo-htj.png';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const logoDataUrl = canvas.toDataURL('image/jpeg');
      generatePDF(p, logoDataUrl);
    } catch (err) {
      console.warn('Fallo al renderizar logo de imagen en Canvas, usando vectores fallback:', err);
      generatePDF(p, null);
    }
  };
  img.onerror = () => {
    generatePDF(p, null);
  };
};

function generatePDF(p, logoDataUrl) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'letter' });
  const W = 216, H = 279, M = 12;
  const fmt = n => '$' + Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});

  // Colores corporativos HTJ (Oscuro y Oro)
  const cDark = [15, 17, 22];
  const cGold = [212, 168, 78];
  const cGreen = [39, 174, 96];
  const cRed = [200, 50, 50];

  // Header background
  doc.setFillColor(...cDark); doc.rect(0,0,W,52,'F');
  doc.setFillColor(...cGold); doc.rect(0,0,4,52,'F');

  // Draw logo image
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', M + 1, 8, 36, 36);
    } catch (e) {
      console.error(e);
    }
  } else {
    // Vector fallback logo
    doc.setFillColor(...cGold); doc.circle(M + 19, 26, 14, 'F');
    doc.setFillColor(...cDark); doc.circle(M + 19, 26, 12, 'F');
    doc.setTextColor(...cGold); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('HTJ', M + 19, 23, {align:'center'}); doc.setFontSize(5); doc.text('HOTEL', M + 19, 27, {align:'center'});
  }

  // Company text (shifted right of logo)
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text('HTJ HOSPEDAJE TAXI JU\u00c1REZ', M + 42, 16);
  doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(170,170,170);
  doc.text('Recibo de N\u00f3mina Oficial - Sistema de Operaciones HTJ', M + 42, 22);
  doc.text('RFC: HTJ-081026-XX9 | Direcci\u00f3n: Av. Tecnol\u00f3gico, Cd. Ju\u00e1rez, Chih.', M + 42, 27);
  doc.text('Contacto: +52 656 322 4787 | Soportado por Sistema Tress v3', M + 42, 32);

  // Folio box
  doc.setFillColor(25,27,36); doc.roundedRect(138,8,66,36,3,3,'F');
  doc.setTextColor(...cGold); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  doc.text('RECIBO DE N\u00d3MINA', 171, 14, {align:'center'});
  doc.setFontSize(8.5); doc.setTextColor(255,255,255);
  doc.text('No. '+p.id.substring(0,8).toUpperCase(), 171, 21, {align:'center'});
  doc.setFontSize(7); doc.setTextColor(160,160,160); doc.setFont('helvetica','normal');
  doc.text('Estado: '+(p.status==='PAID'?'\u2713 PAGADO':p.status==='APPROVED'?'APROBADO':'BORRADOR'), 171, 27, {align:'center'});
  doc.text('Periodo: ' + new Date(p.periodStart).toLocaleDateString('es-MX') + ' al ' + new Date(p.periodEnd).toLocaleDateString('es-MX'), 171, 33, {align:'center'});

  // Section: Datos Empleado
  let y = 57;
  doc.setFillColor(...cGold); doc.rect(M,y,W-M*2,7,'F');
  doc.setTextColor(...cDark); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('DATOS DEL EMPLEADO', M+3, y+5); y+=8;
  doc.setFillColor(244,244,248); doc.rect(M,y,W-M*2,30,'F');
  const c1=M+3,c2=80,c3=140,lh=7;
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(120,120,120);
  doc.text('NOMBRE COMPLETO:',c1,y+lh); doc.text('N\u00b0 DE RELOJ:',c2,y+lh); doc.text('PUESTO / ROL:',c3,y+lh);
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...cDark);
  doc.text((p.employeeName||'').toUpperCase(),c1,y+lh*2);
  doc.setTextColor(...cGold); doc.text('#'+(p.clockNumber||'----'),c2,y+lh*2);
  doc.setTextColor(...cDark); doc.text(p.employeeRole||'',c3,y+lh*2);
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(120,120,120);
  doc.text('CORREO:',c1,y+lh*3); doc.text('PERIODO INICIO:',c2,y+lh*3); doc.text('PERIODO FIN:',c3,y+lh*3);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...cDark);
  doc.text(p.employeeEmail||'',c1,y+lh*3.7);
  doc.text(new Date(p.periodStart).toLocaleDateString('es-MX'),c2,y+lh*3.7);
  doc.text(new Date(p.periodEnd).toLocaleDateString('es-MX'),c3,y+lh*3.7); y+=33;

  // Percepciones & Deducciones side by side
  const hw=(W-M*2-5)/2;
  doc.setFillColor(...cGreen); doc.rect(M,y,hw,7,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('PERCEPCIONES',M+3,y+5);
  doc.setFillColor(...cRed); doc.rect(M+hw+5,y,hw,7,'F');
  doc.text('DEDUCCIONES',M+hw+8,y+5); y+=8;

  // Read actual details
  const PR=[
    ['Salario Base',fmt(p.gross)],
    ['Horas Extras ('+(p.overtime_hours||p.overtimeHours||0)+' hrs)',fmt(p.overtime_pay||p.overtimePay)],
    ['Bono de Asistencia',fmt(p.attendance_bonus||p.attendanceBonus)],
    ['Bono de Puntualidad',fmt(p.punctuality_bonus||p.punctualityBonus)],
    ['Otros Ingresos',fmt((p.other_deductions||{}).otrosIngresos||0)]
  ];
  const DR=[
    ['IMSS (Cuota Trabajador)',fmt(p.imss_employee||p.imssEmployee)],
    ['ISR Retenido',fmt(p.isr)],
    ['INFONAVIT',fmt(p.infonavit)],
    ['FONACOT',fmt(p.fonacot)],
    ['Otras Deducciones',fmt((p.other_deductions||{}).otros||0)]
  ];
  const maxR=Math.max(PR.length,DR.length), rh=7;
  for(let i=0;i<maxR;i++){
    doc.setFillColor(i%2===0?245:255,i%2===0?250:255,i%2===0?247:255); doc.rect(M,y+i*rh,hw,rh,'F');
    doc.setFillColor(i%2===0?250:255,i%2===0?245:255,i%2===0?245:255); doc.rect(M+hw+5,y+i*rh,hw,rh,'F');
    if(PR[i]){doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...cDark);doc.text(PR[i][0],M+3,y+i*rh+5);doc.setFont('helvetica','bold');doc.setTextColor(...cGreen);doc.text(PR[i][1],M+hw-3,y+i*rh+5,{align:'right'});}
    if(DR[i]){doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...cDark);doc.text(DR[i][0],M+hw+8,y+i*rh+5);doc.setFont('helvetica','bold');doc.setTextColor(...cRed);doc.text(DR[i][1],W-M-3,y+i*rh+5,{align:'right'});}
  }
  y+=maxR*rh;
  const tP=(p.gross||0)+(p.overtime_pay||p.overtimePay||0)+(p.attendance_bonus||p.attendanceBonus||0)+(p.punctuality_bonus||p.punctualityBonus||0)+parseFloat((p.other_deductions||{}).otrosIngresos||0);
  const tD=(p.imss_employee||p.imssEmployee||0)+(p.isr||0)+(p.infonavit||0)+(p.fonacot||0)+parseFloat((p.other_deductions||{}).otros||0);
  doc.setFillColor(...cGreen); doc.rect(M,y,hw,8,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  doc.text('TOTAL PERCEPCIONES:',M+3,y+5.5); doc.text(fmt(tP),M+hw-3,y+5.5,{align:'right'});
  doc.setFillColor(...cRed); doc.rect(M+hw+5,y,hw,8,'F');
  doc.text('TOTAL DEDUCCIONES:',M+hw+8,y+5.5); doc.text(fmt(tD),W-M-3,y+5.5,{align:'right'}); y+=12;

  // NETO
  doc.setFillColor(...cDark); doc.roundedRect(M,y,W-M*2,16,3,3,'F');
  doc.setFillColor(...cGold); doc.roundedRect(M+0.8,y+0.8,W-M*2-1.6,14.4,2,2,'F');
  doc.setTextColor(...cDark); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('NETO A PAGAR:',M+5,y+9.5);
  doc.setFontSize(14.5); doc.text(fmt(p.net),W-M-5,y+10.5,{align:'right'}); y+=20;

  // Checadas
  const entries=Array.isArray(p.time_entries)?p.time_entries:[];
  if(entries.length>0){
    doc.setFillColor(50,80,140); doc.rect(M,y,W-M*2,7,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
    doc.text('REGISTRO DE CHECADAS DE HORA (ENTRADAS / SALIDAS)',M+3,y+5); y+=8;
    doc.setFillColor(235,235,242); doc.rect(M,y,W-M*2,6,'F');
    doc.setTextColor(100,100,100); doc.setFont('helvetica','bold'); doc.setFontSize(7);
    doc.text('#',M+3,y+4.2); doc.text('FECHA Y HORA DE REGISTRO',M+12,y+4.2); doc.text('TIPO',M+90,y+4.2); y+=6;
    entries.forEach((entry,i)=>{
      const bg=i%2===0?[248,248,252]:[255,255,255];
      doc.setFillColor(...bg); doc.rect(M,y,W-M*2,6,'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...cDark);
      doc.text(String(i+1),M+3,y+4);
      doc.text(entry.timestamp?new Date(entry.timestamp).toLocaleString('es-MX'):'-',M+12,y+4);
      if(entry.type==='ENTRADA')doc.setTextColor(...cGreen); else doc.setTextColor(...cRed);
      doc.setFont('helvetica','bold'); doc.text(entry.type||'-',M+90,y+4); y+=6;
    }); y+=4;
  }

  // Notas
  if(p.notes){
    doc.setFillColor(244,244,248); doc.rect(M,y,W-M*2,16,'F');
    doc.setTextColor(100,100,100); doc.setFont('helvetica','bold'); doc.setFontSize(7);
    doc.text('NOTAS / OBSERVACIONES:',M+3,y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...cDark);
    doc.text(doc.splitTextToSize(p.notes,W-M*2-8),M+3,y+10); y+=20;
  }

  // Firmas
  y=Math.max(y,228);
  doc.setDrawColor(180,180,180);
  [M,M+74,M+148].forEach(x=>doc.line(x,y,x+56,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(130,130,130);
  doc.text('FIRMA EMPLEADO',M+28,y+4,{align:'center'});
  doc.text('FIRMA PATR\u00d3N / GERENTE',M+102,y+4,{align:'center'});
  doc.text('SELLO EMPRESA',M+176,y+4,{align:'center'});

  // Footer
  doc.setFillColor(...cDark); doc.rect(0,H-10,W,10,'F');
  doc.setTextColor(...cGold); doc.setFont('helvetica','bold'); doc.setFontSize(6);
  doc.text('HTJ HOSPEDAJE TAXI JU\u00c1REZ — Documento oficial generado por Sistema HTJ OPS v2 — Ciudad Ju\u00e1rez, Chih.',W/2,H-4,{align:'center'});

  doc.save(`Nomina_${(p.employeeName||'empleado').replace(/ /g,'_')}_${p.periodStart}.pdf`);
}
