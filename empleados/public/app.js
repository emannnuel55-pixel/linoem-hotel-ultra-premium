const API = window.LINOEM.API_URL;
let currentTab = 'resumen';
let properties = [];
let expenses = [];
let users = [];
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

async function load() {
  try {
    const [resDash, resProp, resExp, resUsers] = await Promise.all([
      fetch(API + '/v1/dashboard', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/properties', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/expenses', { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(API + '/v1/users', { headers: headers() }).then(r => r.json()).catch(() => null)
    ]);

    if (resDash) {
      dashboard = {
        total: resDash.total || 0,
        available: resDash.available || 0,
        expenses: resDash.expenses || 0
      };
    }
    if (resProp && resProp.items) {
      properties = resProp.items;
    }
    if (resExp && resExp.items) {
      expenses = resExp.items;
    }
    if (resUsers && resUsers.items) {
      users = resUsers.items;
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
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
          <div class="status"><span><i class="dot warn"></i>Limpieza</span><b>6</b></div>
          <div class="status"><span><i class="dot red"></i>Mantenimiento</span><b>3</b></div>
          <div class="status"><span><i class="dot"></i>Ocupadas</span><b>${dashboard.total - dashboard.available}</b></div>
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
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${properties.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">No hay propiedades creadas. ¡Crea una nueva!</td></tr>' : properties.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong><br><small style="color:var(--muted)">${p.address || 'Sin dirección'}</small></td>
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
                        ${p.published ? '' : `<button class="btn-action btn-primary" onclick="publishProperty('${p.id}')">Sincronizar / Publicar</button>`}
                        <button class="btn-action btn-danger" onclick="deletePropertyLocal('${p.id}')">Eliminar</button>
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
  } else {
    mainContent = `
      <header class="head">
        <div>
          <h1>${menuItems.find(m => m.id === currentTab).label}</h1>
          <p>Módulo de administración operativa y control</p>
        </div>
      </header>
      <section class="box" style="text-align:center;padding:60px 20px;">
        <span style="font-size:3rem;display:block;margin-bottom:15px;">⚒</span>
        <h2>Módulo en construcción interactiva</h2>
        <p style="color:var(--muted);max-width:500px;margin:auto;">Este módulo operativo se conecta automáticamente con tus flujos de base de datos de producción y OIDC. Puedes seguir parametrizando la interfaz.</p>
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
  if (addBtn) addBtn.onclick = openPropertyModal;

  const addExpenseBtn = document.querySelector('#addExpenseBtn');
  if (addExpenseBtn) addExpenseBtn.onclick = openExpenseModal;

  const addUserBtn = document.querySelector('#addUserBtn');
  if (addUserBtn) addUserBtn.onclick = openUserModal;
}

window.switchTab = function(tabId) {
  currentTab = tabId;
  render();
};

function openPropertyModal() {
  modal('Añadir Nueva Propiedad', `
    <form id="propertyForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Nombre</label>
        <input name="name" required placeholder="Ej: Suite Deluxe HTJ Juarez" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Tipo</label>
        <select name="type" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
          <option value="SUITE">Suite</option>
          <option value="HOTEL">Hotel</option>
          <option value="HOUSE">Casa</option>
          <option value="APARTMENT">Departamento</option>
          <option value="ROOM">Habitación</option>
        </select>
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Ciudad</label>
          <input name="city" required placeholder="Ciudad Juárez" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Huéspedes</label>
          <input name="maxGuests" type="number" required value="2" min="1" style="width:100%;">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Dirección</label>
        <input name="address" required placeholder="Ej: Av. Tecnológico 1500" style="width:100%;">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Precio Base (MXN)</label>
        <input name="basePrice" type="number" required value="1200" min="0" style="width:100%;">
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Guardar Propiedad</button>
    </form>
  `);

  document.querySelector('#propertyForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      type: fd.get('type'),
      city: fd.get('city'),
      address: fd.get('address'),
      maxGuests: parseInt(fd.get('maxGuests')),
      basePrice: parseFloat(fd.get('basePrice'))
    };

    try {
      const res = await fetch(API + '/v1/properties', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al guardar la propiedad.');
      }
    } catch (err) {
      alert('Error de conexión con la API.');
    }
  };
}

function openExpenseModal() {
  modal('Registrar Nuevo Gasto', `
    <form id="expenseForm">
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Descripción / Concepto</label>
        <input name="description" required placeholder="Ej: Compra de sábanas premium" style="width:100%;">
      </div>
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Categoría</label>
          <input name="category" required placeholder="Limpieza, Servicios, etc." style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Tipo</label>
          <select name="kind" required style="width:100%;padding:14px;border:1px solid var(--panel2);background:var(--panel);color:white;border-radius:12px;">
            <option value="VARIABLE">Variable</option>
            <option value="FIXED">Fijo</option>
            <option value="ASSET">Activo</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Monto (MXN)</label>
          <input name="amount" type="number" required placeholder="500" min="1" style="width:100%;">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--muted)">Fecha</label>
          <input name="occurredOn" type="date" required value="${new Date().toISOString().split('T')[0]}" style="width:100%;">
        </div>
      </div>
      <button class="primary" style="width:100%;padding:14px;background:var(--gold);color:#171106;font-weight:bold;">Registrar Gasto</button>
    </form>
  `);

  document.querySelector('#expenseForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      description: fd.get('description'),
      category: fd.get('category'),
      kind: fd.get('kind'),
      amount: parseFloat(fd.get('amount')),
      occurredOn: new Date(fd.get('occurredOn')).toISOString()
    };

    try {
      const res = await fetch(API + '/v1/expenses', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        load();
      } else {
        alert('Error al registrar el gasto.');
      }
    } catch (err) {
      alert('Error de conexión con la API.');
    }
  };
}

function openUserModal() {
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

window.deletePropertyLocal = function(id) {
  alert('Eliminación protegida en producción. Se requiere rol de SUPER_ADMIN.');
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
