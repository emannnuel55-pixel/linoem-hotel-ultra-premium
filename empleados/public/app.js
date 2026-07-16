const API = window.LINOEM.API_URL;
let currentTab = 'resumen';
let properties = [];
let expenses = [];
let users = [];
let reservations = [];
let employees = [];
let payrolls = [];
let dashboard = { total: 0, available: 0, expenses: 0 };

const headers = () => ({
  'Content-Type': 'application/json',
  'x-demo-role': 'SUPER_ADMIN'
});

const money = n => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
}).format(n);

async function loadGoogleMaps() {
  if (window.google && window.google.maps) return;
  await new Promise(r => {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?libraries=places';
    script.onload = r;
    document.head.append(script);
  });
}

async function load() {
  try {
    const [resDash, resProp, resExp, resUsers, resRes, resEmp, resPay] = await Promise.all([
      fetch(API + '/v1/dashboard', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/properties', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/expenses', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/users', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/reservations', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/employees', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/payroll', { headers: headers() }).then(r => r.json()).catch(() => null)
    ]);

    if (resDash) {
      dashboard = {
        total: resDash.total || 0,
        available: resDash.available || 0,
        expenses: resDash.expenses || 0
      };
    }
    if (resProp && resProp.items) properties = resProp.items;
    if (resExp && resExp.items) expenses = resExp.items;
    if (resUsers && resUsers.items) users = resUsers.items;
    if (resRes && resRes.items) reservations = resRes.items;
    if (resEmp && resEmp.items) employees = resEmp.items;
    if (resPay && resPay.items) payrolls = resPay.items;
  } catch (err) {
    console.error('Error loading data:', err);
  }
  await loadGoogleMaps();
  render();
}

function render() {
  const menuItems = [
    { id: 'resumen', label: '▦ Resumen' },
    { id: 'propiedades', label: '⌂ Propiedades' },
    { id: 'reservaciones', label: '▣ Reservaciones' },
    { id: 'limpieza', label: '✓ Limpieza' },
    { id: 'mantenimiento', label: '⚒ Mantenimiento' },
    { id: 'finanzas', label: '$ Finanzas' },
    { id: 'personal', label: '♙ Personal' },
    { id: 'nomina', label: '◫ Nómina' },
    { id: 'configuracion', label: '⚙ Usuarios / Config' }
  ];

  let mainContent = '';

  if (currentTab === 'resumen') {
    const occupancy = dashboard.total > 0 ? Math.round(((dashboard.total - dashboard.available) / dashboard.total) * 100) : 0;
    mainContent = `
      <header class="head">
        <div>
          <h1>Buenos días, Emanuel</h1>
          <p>Vista general de tus propiedades</p>
        </div>
        <button class="add" id="addBtn">+ Nueva propiedad</button>
      </header>
      <section class="kpis">
        <div class="kpi">
          <span>OCUPACIÓN</span>
          <strong>${occupancy}%</strong>
          <small class="up">↑ 6.2%</small>
        </div>
        <div class="kpi">
          <span>PROPIEDADES</span>
          <strong>${dashboard.total}</strong>
          <small>en catálogo</small>
        </div>
        <div class="kpi">
          <span>DISPONIBLES</span>
          <strong>${dashboard.available}</strong>
          <small>unidades libres</small>
        </div>
        <div class="kpi">
          <span>GASTOS MENSUALES</span>
          <strong>${money(dashboard.expenses)}</strong>
          <small class="down">↓ 4.8%</small>
        </div>
      </section>
      <section class="layout">
        <article class="box">
          <h3>Rendimiento semanal</h3>
          <div class="bars">
            ${[45, 63, 52, 80, 68, 92, 74].map((x, i) => `<div class="bar" style="height:${x}%" title="${['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]} ${x}%"></div>`).join('')}
          </div>
        </article>
        <article class="box">
          <h3>Estado operativo</h3>
          <div class="status"><span><i class="dot"></i>Disponibles</span><b>${dashboard.available}</b></div>
          <div class="status"><span><i class="dot warn"></i>Limpieza</span><b>${properties.filter(p => p.status === 'CLEANING').length}</b></div>
          <div class="status"><span><i class="dot red"></i>Mantenimiento</span><b>${properties.filter(p => p.status === 'MAINTENANCE').length}</b></div>
          <div class="status"><span><i class="dot" style="background:#5271ff"></i>Ocupadas</span><b>${properties.filter(p => p.status === 'OCCUPIED').length}</b></div>
        </article>
      </section>
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
                        <span class="badge ${p.published ? 'badge-published' : 'badge-draft'}">
                          ${p.published ? '● Publicado' : 'Borrador'}
                        </span>
                      </td>
                      <td>
                        <div class="actions-group">
                          <button class="btn-action btn-primary" onclick="openEditPropertyModal('${p.id}')">Editar</button>
                          ${p.published ? '' : `<button class="btn-action" style="background:var(--green);color:#0a3a22" onclick="publishProperty('${p.id}')">Sincronizar</button>`}
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
    mainContent = `
      <header class="head">
        <div>
          <h1>Limpieza / Housekeeping</h1>
          <p>Monitorea y actualiza el estado de aseo de cada habitación y propiedad</p>
        </div>
      </header>
      <section class="properties-list">
        <div class="box">
          <h3>Estado de Limpieza de las Unidades</h3>
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
                      <select onchange="updatePropertyStatus('${p.id}', this.value)" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:var(--panel2);color:white;border-radius:8px;">
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
          <h1>Personal / Empleados</h1>
          <p>Gestiona las cuentas del personal administrativo, limpieza y mantenimiento</p>
        </div>
        <button class="add" id="addEmployeeBtn">+ Crear Empleado</button>
      </header>
      <section class="users-list">
        <div class="box">
          <h3>Listado de Personal</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${employees.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">No hay empleados registrados.</td></tr>' : employees.map(e => `
                  <tr>
                    <td><strong>${e.name}</strong></td>
                    <td><code>${e.email}</code></td>
                    <td><span class="badge badge-type">${e.role}</span></td>
                    <td>
                      <span class="badge ${e.active ? 'badge-published' : 'badge-draft'}">
                        ${e.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div class="actions-group">
                        <button class="btn-action btn-primary" onclick="openEditEmployeeModal('${e.id}', '${e.name}', '${e.email}', '${e.role}', ${e.active})">Editar</button>
                        <button class="btn-action btn-danger" onclick="deleteEmployee('${e.id}')">Eliminar</button>
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
          <h3>Pagos Registrados</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Periodo</th>
                  <th>Sueldo Bruto</th>
                  <th>Neto Recibido</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${payrolls.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No hay recibos de nómina registrados.</td></tr>' : payrolls.map(p => `
                  <tr>
                    <td><strong>${p.employeeName}</strong></td>
                    <td>${new Date(p.periodStart).toLocaleDateString('es-MX')} al ${new Date(p.periodEnd).toLocaleDateString('es-MX')}</td>
                    <td>${money(p.gross)}</td>
                    <td style="font-weight:bold;color:var(--green)">${money(p.net)}</td>
                    <td>
                      <span class="badge ${p.status === 'PAID' ? 'badge-published' : p.status === 'APPROVED' ? 'badge-type' : 'badge-draft'}">
                        ${p.status}
                      </span>
                    </td>
                    <td>
                      <div class="actions-group">
                        ${p.status !== 'PAID' ? `<button class="btn-action btn-primary" onclick="updatePayrollStatus('${p.id}', 'PAID')">Marcar como Pagado</button>` : ''}
                        <button class="btn-action btn-danger" onclick="deletePayroll('${p.id}')">Eliminar</button>
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
          <img src="/logo.jpg" alt="Logo" class="logo-img">
        </div>
        <div class="menu">
          ${menuItems.map(m => `
            <button class="${m.id === currentTab ? 'active' : ''}" onclick="switchTab('${m.id}')">
              ${m.label}
            </button>
          `).join('')}
        </div>
      </aside>
      <main class="main">
        ${mainContent}
      </main>
    </div>
    <nav class="mobilebar">
      ${[
        { id: 'resumen', icon: '▦', label: 'Inicio' },
        { id: 'propiedades', icon: '⌂', label: 'Unidades' },
        { id: 'reservaciones', icon: '▣', label: 'Reservas' },
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

  const addUserBtn = document.querySelector('#addUserBtn');
  if (addUserBtn) addUserBtn.onclick = openUserModal;

  const addEmployeeBtn = document.querySelector('#addEmployeeBtn');
  if (addEmployeeBtn) addEmployeeBtn.onclick = openEmployeeModal;

  const addPayrollBtn = document.querySelector('#addPayrollBtn');
  if (addPayrollBtn) addPayrollBtn.onclick = openPayrollModal;
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

let googleMapInstance = null;
let googleMarkerInstance = null;
let selectedLat = 31.737;
let selectedLng = -106.485;

function reverseGeocode(lat, lng) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const input = document.querySelector('#addressAutocomplete');
      if (input) input.value = results[0].formatted_address;
    }
  });
}

function initModalGoogleMap(lat, lng) {
  const mapDiv = document.querySelector('#google-map-select');
  if (!mapDiv || !window.google || !window.google.maps) return;

  selectedLat = lat || 31.737;
  selectedLng = lng || -106.485;
  document.querySelector('#latInput').value = selectedLat;
  document.querySelector('#lngInput').value = selectedLng;

  const defaultPos = { lat: selectedLat, lng: selectedLng };

  googleMapInstance = new google.maps.Map(mapDiv, {
    center: defaultPos,
    zoom: 14
  });

  googleMarkerInstance = new google.maps.Marker({
    position: defaultPos,
    map: googleMapInstance,
    draggable: true
  });

  // Autocomplete Setup
  const addressInput = document.querySelector('#addressAutocomplete');
  if (addressInput) {
    const autocomplete = new google.maps.places.Autocomplete(addressInput);
    autocomplete.bindTo('bounds', googleMapInstance);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      googleMapInstance.setCenter(place.geometry.location);
      googleMapInstance.setZoom(16);
      googleMarkerInstance.setPosition(place.geometry.location);

      selectedLat = place.geometry.location.lat();
      selectedLng = place.geometry.location.lng();
      document.querySelector('#latInput').value = selectedLat;
      document.querySelector('#lngInput').value = selectedLng;
    });
  }

  const searchBtn = document.querySelector('#searchAddressBtn');
  if (searchBtn && addressInput) {
    searchBtn.onclick = () => {
      const address = addressInput.value;
      if (!address) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          googleMapInstance.setCenter(loc);
          googleMapInstance.setZoom(16);
          googleMarkerInstance.setPosition(loc);

          selectedLat = loc.lat();
          selectedLng = loc.lng();
          document.querySelector('#latInput').value = selectedLat;
          document.querySelector('#lngInput').value = selectedLng;
          addressInput.value = results[0].formatted_address;
        } else {
          alert('No se pudo encontrar esa dirección en Google Maps.');
        }
      });
    };
  }

  // Click Map handler
  googleMapInstance.addListener('click', (e) => {
    const loc = e.latLng;
    googleMarkerInstance.setPosition(loc);
    selectedLat = loc.lat();
    selectedLng = loc.lng();
    document.querySelector('#latInput').value = selectedLat;
    document.querySelector('#lngInput').value = selectedLng;
    reverseGeocode(selectedLat, selectedLng);
  });

  // Drag Marker handler
  googleMarkerInstance.addListener('dragend', () => {
    const loc = googleMarkerInstance.getPosition();
    selectedLat = loc.lat();
    selectedLng = loc.lng();
    document.querySelector('#latInput').value = selectedLat;
    document.querySelector('#lngInput').value = selectedLng;
    reverseGeocode(selectedLat, selectedLng);
  });
}

function openPropertyModal() {
  uploadedMedia = [];
  modal('Añadir Nueva Propiedad', `
    <form id="propertyForm">
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
      
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Dirección Física (Autocomplete de Google Maps)</label>
        <div style="display:flex;gap:6px;">
          <input id="addressAutocomplete" name="address" required placeholder="Empieza a escribir la calle, número o lugar..." style="flex:1;margin:0;" autocomplete="off">
          <button type="button" class="btn-action" id="searchAddressBtn" style="background:var(--gold);color:#171106;padding:0 15px;font-weight:bold;">Buscar</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ubicación en Google Maps (Haz clic o arrastra el marcador)</label>
        <div id="google-map-select" style="height: 180px; border-radius: 12px; border:1px solid rgba(255,255,255,0.1); z-index:1;"></div>
        <input type="hidden" name="lat" id="latInput">
        <input type="hidden" name="lng" id="lngInput">
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Fotos y Videos</label>
        <button type="button" class="btn-action" onclick="document.querySelector('#mediaFiles').click()" style="width:100%;padding:10px;background:var(--panel2);border:1px dashed rgba(255,255,255,0.2);color:white;">📷 Subir Multimedia</button>
        <input type="file" id="mediaFiles" accept="image/*,video/*" multiple onchange="window.handleMediaUpload(event)" style="display:none;">
        <div id="mediaPreview" style="display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:5px;"></div>
      </div>

      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Propiedad</button>
    </form>
  `);

  setTimeout(() => initModalGoogleMap(31.737, -106.485), 100);

  document.querySelector('#propertyForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
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
        lng: parseFloat(fd.get('lng') || selectedLng)
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

function openEditPropertyModal(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;

  uploadedMedia = p.media || [];
  modal('Editar Propiedad / Alojamiento', `
    <form id="editPropertyForm">
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
      
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Dirección Física (Autocomplete de Google Maps)</label>
        <div style="display:flex;gap:6px;">
          <input id="addressAutocomplete" name="address" required value="${p.address || ''}" style="flex:1;margin:0;" autocomplete="off">
          <button type="button" class="btn-action" id="searchAddressBtn" style="background:var(--gold);color:#171106;padding:0 15px;font-weight:bold;">Buscar</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ubicación en Google Maps (Haz clic o arrastra el marcador)</label>
        <div id="google-map-select" style="height: 180px; border-radius: 12px; border:1px solid rgba(255,255,255,0.1); z-index:1;"></div>
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

      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Cambios</button>
    </form>
  `);

  const initialLat = p.details?.lat || 31.737;
  const initialLng = p.details?.lng || -106.485;
  setTimeout(() => initModalGoogleMap(initialLat, initialLng), 100);

  document.querySelector('#editPropertyForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
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
        lng: parseFloat(fd.get('lng') || selectedLng)
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

window.openMaintenanceReportModal = function(id, currentIncident) {
  modal('Reportar / Editar Incidente de Mantenimiento', `
    <form id="maintenanceForm">
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:8px;font-size:0.85rem;color:var(--muted)">Describa el desperfecto o trabajo requerido</label>
        <input name="incident" required value="${currentIncident}" placeholder="Ej: Fuga de agua en baño o aire acondicionado fallando" style="width:100%;">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:8px;font-size:0.85rem;color:var(--muted)">¿Poner unidad fuera de servicio en Mantenimiento?</label>
        <select name="status" style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="MAINTENANCE">Sí, colocar en Mantenimiento</option>
          <option value="AVAILABLE">No, mantener Disponible</option>
        </select>
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Reporte</button>
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
      details: { ...prop.details, incident: incidentText }
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
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Contraseña (Min. 8 caracteres)</label>
        <input name="password" type="password" required placeholder="••••••••" style="width:100%;">
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
        alert('Error al registrar el empleado.');
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
        <input name="password" type="password" placeholder="••••••••" style="width:100%;">
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
    if (password && password.trim().length >= 8) {
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

function openPayrollModal() {
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

window.publishProperty = async function(id) {
  try {
    const res = await fetch(API + `/v1/properties/${id}/publish`, {
      method: 'POST',
      headers: headers()
    });
    if (res.ok) {
      alert('¡Propiedad publicada y sincronizada con éxito al portal de huéspedes!');
      load();
    } else {
      const data = await res.json();
      alert('Error al publicar: ' + (data.error || 'Intenta de nuevo.'));
    }
  } catch (err) {
    alert('Error de red al sincronizar.');
  }
};

function modal(title, body) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="sheet"><button class="close">×</button><h2>${title}</h2>${body}</div>`;
  m.querySelector('.close').onclick = () => m.remove();
  m.onclick = e => {
    if (e.target === m) m.remove();
  };
  document.body.append(m);
}

load();
