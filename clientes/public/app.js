const API = window.LINOEM.API_URL;
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
let stays = [];
let mapInstance = null;

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
  try {
    const r = await fetch(API + '/v1/properties');
    if (r.ok) {
      const j = await r.json();
      if (j.items) stays = j.items;
    }
  } catch (e) {
    console.error('Error cargando propiedades:', e);
  }
  await loadLeaflet();
  render();
}

function getAmenityIcons(amenities) {
  if (!amenities || !amenities.length) return '';
  const iconMap = {
    'WiFi': '📶', 'Estacionamiento': '🅿️', 'Alberca': '🏊', 'A/C': '❄️',
    'TV': '📺', 'Cocina': '🍳', 'Lavandería': '🧺', 'Gym': '💪',
    'Seguridad': '🔒', 'Mascotas': '🐾', 'Balcón': '🌅', 'Jardín': '🌿'
  };
  return amenities.slice(0, 4).map(a => `<span title="${a}" style="font-size:1rem;">${iconMap[a] || '✓'}</span>`).join(' ');
}

function render() {
  const gridHtml = stays.length === 0
    ? `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#777;">
        <div style="font-size:3rem;margin-bottom:16px;">🏨</div>
        <h3 style="color:#333;margin:0 0 8px;">No hay alojamientos disponibles</h3>
        <p style="margin:0;color:#999;">Pronto tendremos nuevas opciones para ti.</p>
      </div>`
    : stays.map(s => {
        const details = s.details || {};
        const amenities = details.amenities || [];
        const desc = details.description || '';
        const beds = details.bedrooms ? `${details.bedrooms} rec.` : '';
        const baths = details.bathrooms ? `${details.bathrooms} baños` : '';
        const meta = [s.city, beds, baths].filter(Boolean).join(' · ');

        const firstMedia = s.media && s.media.length > 0 ? s.media[0] : null;
        const mediaHtml = firstMedia
          ? (firstMedia.type === 'video'
              ? `<video src="${firstMedia.url}" autoplay muted loop style="width:100%;height:100%;object-fit:cover;"></video>`
              : `<img src="${firstMedia.url}" alt="${s.name}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`)
          : `<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#1a1a2e,#16213e);color:var(--gold);font-size:2.5rem;">🏨</div>`;

        return `
          <article class="stay" data-id="${s.id}">
            <div class="photo" style="aspect-ratio:4/3;overflow:hidden;border-radius:18px 18px 0 0;background:#111;">
              ${mediaHtml}
            </div>
            <section style="padding:18px;flex:1;display:flex;flex-direction:column;">
              <span class="badge">${s.type}</span>
              <h3 style="margin:8px 0 4px;font-size:1.1rem;font-weight:700;">${s.name}</h3>
              <div class="meta" style="font-size:0.85rem;color:#888;margin-bottom:8px;">${meta}</div>
              ${desc ? `<p style="font-size:0.82rem;color:#666;margin:0 0 8px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${desc}</p>` : ''}
              ${amenities.length ? `<div style="margin-bottom:8px;display:flex;gap:4px;flex-wrap:wrap;">${getAmenityIcons(amenities)}</div>` : ''}
              <div class="price" style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;color:#d4a84e;">${money(s.basePrice || s.base_price || 0)} <small style="font-weight:400;color:#888;">/ noche</small></span>
                <span style="color:#888;font-size:0.85rem;">★ 4.9</span>
              </div>
            </section>
          </article>
        `;
      }).join('');

  document.querySelector('#app').innerHTML = `
    <header class="top">
      <div class="brand">
        <img src="/logo.jpg" alt="HTJ Hotel" class="logo-img" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--gold);object-fit:cover;">
        HTJ <b>HOTEL</b>
      </div>
      <button class="avatar" id="login">◎</button>
    </header>
    <main>
      <div class="hero">
        <h1>Estancias que se sienten <em>extraordinarias.</em></h1>
        <p>Hoteles, casas y departamentos seleccionados para ti.</p>
        <form class="search" id="search">
          <div class="field">
            <label>DESTINO</label>
            <input name="city" placeholder="¿A dónde vas?" id="citySearch">
          </div>
          <div class="field">
            <label>LLEGADA</label>
            <input type="date" name="from">
          </div>
          <div class="field">
            <label>SALIDA</label>
            <input type="date" name="to">
          </div>
          <button class="primary" type="submit">Buscar</button>
        </form>
      </div>
      <div class="content">
        <div class="rowtitle">
          <div>
            <h2>Alojamientos destacados</h2>
            <span style="color:#888;font-size:0.9rem;">Explora ubicaciones en el mapa interactivo</span>
          </div>
        </div>
        
        <div id="client-map" style="height:300px;border-radius:20px;margin-top:18px;margin-bottom:28px;border:1px solid #e5e7eb;overflow:hidden;"></div>

        <div class="grid">
          ${gridHtml}
        </div>
      </div>
    </main>
    <nav class="nav">
      <button class="active">⌂<br>Explorar</button>
      <button>♡<br>Favoritos</button>
      <button>▣<br>Viajes</button>
      <button>◎<br>Perfil</button>
    </nav>
  `;

  document.querySelector('#login').onclick = login;
  document.querySelectorAll('.stay').forEach(x => {
    x.onclick = () => reserve(x.dataset.id);
  });

  document.querySelector('#search').onsubmit = e => {
    e.preventDefault();
    const q = new FormData(e.target).get('city').toLowerCase().trim();
    if (!q) { load(); return; }
    const filtered = stays.filter(x => x.city.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
    stays = filtered;
    render();
  };

  setTimeout(initMap, 150);
}

function initMap() {
  const mapDiv = document.querySelector('#client-map');
  if (!mapDiv || !window.L) return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  // Filter properties that have valid coordinates
  const withCoords = stays.filter(s => {
    const d = s.details || {};
    return d.lat && d.lng && !isNaN(parseFloat(d.lat)) && !isNaN(parseFloat(d.lng));
  });

  let centerLat = 31.737;
  let centerLng = -106.485;
  let zoom = 11;

  if (withCoords.length > 0) {
    centerLat = withCoords.reduce((sum, s) => sum + parseFloat(s.details.lat), 0) / withCoords.length;
    centerLng = withCoords.reduce((sum, s) => sum + parseFloat(s.details.lng), 0) / withCoords.length;
    zoom = withCoords.length === 1 ? 14 : 11;
  }

  mapInstance = L.map('client-map', { keyboard: false, zoomControl: true }).setView([centerLat, centerLng], zoom);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapInstance);

  if (withCoords.length === 0) {
    const noDataDiv = document.createElement('div');
    noDataDiv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,0.9);padding:12px 20px;border-radius:12px;font-size:0.85rem;color:#666;z-index:1000;pointer-events:none;';
    noDataDiv.textContent = 'Sin alojamientos con ubicación disponible aún';
    mapDiv.style.position = 'relative';
    mapDiv.appendChild(noDataDiv);
  }

  withCoords.forEach(s => {
    const lat = parseFloat(s.details.lat);
    const lng = parseFloat(s.details.lng);
    const price = money(s.basePrice || s.base_price || 0);

    const priceIcon = L.divIcon({
      className: '',
      html: `<div style="background:#d4a84e;color:#fff;padding:5px 10px;border-radius:20px;font-weight:700;font-size:0.8rem;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">${price}</div>`,
      iconAnchor: [30, 15]
    });

    const marker = L.marker([lat, lng], { icon: priceIcon }).addTo(mapInstance);
    marker.bindPopup(`
      <div style="font-family:sans-serif;min-width:180px;">
        <strong style="display:block;margin-bottom:4px;font-size:0.95rem;">${s.name}</strong>
        <span style="color:#888;font-size:0.82rem;">${s.city} · ${s.type}</span><br>
        <strong style="color:#d4a84e;display:block;margin:8px 0 6px;font-size:1rem;">${price} / noche</strong>
        <button style="width:100%;background:#15171c;color:white;border:0;padding:8px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:0.8rem;" onclick="window.reserveFromMap('${s.id}')">Reservar Ahora</button>
      </div>
    `);
  });
}

window.reserveFromMap = function(id) { reserve(id); };

function login() {
  modal('Iniciar sesión', `
    <p style="color:#888;margin:0 0 16px;">Accede con tu cuenta para gestionar tus reservas.</p>
    <input id="loginEmail" placeholder="Correo electrónico" type="email" style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:10px;font-size:1rem;margin-bottom:10px;box-sizing:border-box;">
    <input id="loginPass" type="password" placeholder="Contraseña" style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:10px;font-size:1rem;margin-bottom:16px;box-sizing:border-box;">
    <button id="loginBtn" class="primary" style="width:100%;padding:14px;background:#15171c;color:white;border:0;border-radius:12px;font-weight:bold;font-size:1rem;cursor:pointer;">Iniciar sesión</button>
    <hr style="margin:16px 0;border:none;border-top:1px solid #f0f0f0;">
    <button id="regBtn" style="width:100%;padding:12px;background:transparent;border:2px solid #d4a84e;color:#d4a84e;border-radius:12px;font-weight:bold;cursor:pointer;">Crear cuenta nueva</button>
  `);

  document.querySelector('#loginBtn').onclick = async () => {
    const email = document.querySelector('#loginEmail').value;
    const pass = document.querySelector('#loginPass').value;
    try {
      const r = await fetch(API + '/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await r.json();
      if (r.ok) {
        localStorage.setItem('token', data.accessToken);
        document.querySelector('.modal').remove();
        alert('✅ Sesión iniciada correctamente. ¡Ahora puedes reservar!');
      } else {
        alert('Error: ' + (data.error || 'Credenciales incorrectas'));
      }
    } catch { alert('Error de conexión.'); }
  };

  document.querySelector('#regBtn').onclick = register;
}

function register() {
  document.querySelectorAll('.modal').forEach(m => m.remove());
  modal('Crear cuenta', `
    <input id="regName" placeholder="Nombre completo" style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:10px;font-size:1rem;margin-bottom:10px;box-sizing:border-box;">
    <input id="regEmail" placeholder="Correo electrónico" type="email" style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:10px;font-size:1rem;margin-bottom:10px;box-sizing:border-box;">
    <input id="regPass" type="password" placeholder="Contraseña (mín. 12 caracteres)" style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:10px;font-size:1rem;margin-bottom:16px;box-sizing:border-box;">
    <button id="regSubmit" class="primary" style="width:100%;padding:14px;background:#d4a84e;color:white;border:0;border-radius:12px;font-weight:bold;font-size:1rem;cursor:pointer;">Registrarme</button>
  `);

  document.querySelector('#regSubmit').onclick = async () => {
    const name = document.querySelector('#regName').value;
    const email = document.querySelector('#regEmail').value;
    const pass = document.querySelector('#regPass').value;
    try {
      const r = await fetch(API + '/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass })
      });
      const data = await r.json();
      if (r.ok) {
        localStorage.setItem('token', data.accessToken);
        document.querySelector('.modal').remove();
        alert('✅ ¡Cuenta creada! Ya puedes hacer reservaciones.');
      } else {
        alert('Error: ' + (data.error || 'Verifica los datos'));
      }
    } catch { alert('Error de conexión.'); }
  };
}

function reserve(id) {
  const s = stays.find(x => String(x.id) === id);
  if (!s) return;
  const details = s.details || {};
  const amenities = details.amenities || [];
  const desc = details.description || '';
  const checkIn = details.check_in_time || '15:00';
  const checkOut = details.check_out_time || '12:00';
  const beds = details.bedrooms ? `${details.bedrooms} recámara(s)` : '';
  const baths = details.bathrooms ? `${details.bathrooms} baño(s)` : '';
  const size = details.property_size ? `${details.property_size} m²` : '';

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  modal(`${s.name}`, `
    <div style="margin-bottom:16px;">
      <span style="background:#d4a84e22;color:#d4a84e;padding:4px 10px;border-radius:20px;font-size:0.8rem;font-weight:bold;">${s.type}</span>
      <span style="margin-left:8px;color:#888;font-size:0.85rem;">${s.city}</span>
    </div>
    ${desc ? `<p style="color:#666;font-size:0.9rem;line-height:1.5;margin:0 0 16px;">${desc}</p>` : ''}
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
      ${beds ? `<span style="color:#555;font-size:0.85rem;">🛏 ${beds}</span>` : ''}
      ${baths ? `<span style="color:#555;font-size:0.85rem;">🚿 ${baths}</span>` : ''}
      ${size ? `<span style="color:#555;font-size:0.85rem;">📐 ${size}</span>` : ''}
      <span style="color:#555;font-size:0.85rem;">👥 Hasta ${s.maxGuests || s.max_guests} huéspedes</span>
    </div>
    ${amenities.length ? `
      <div style="margin-bottom:16px;">
        <p style="margin:0 0 8px;font-weight:bold;font-size:0.85rem;color:#555;">AMENIDADES</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${amenities.map(a => `<span style="background:#f5f5f5;padding:4px 10px;border-radius:20px;font-size:0.78rem;color:#555;">${a}</span>`).join('')}
        </div>
      </div>
    ` : ''}
    <div style="display:flex;gap:12px;margin-bottom:16px;font-size:0.82rem;color:#888;">
      <span>⏰ Check-in: ${checkIn}</span>
      <span>⏰ Check-out: ${checkOut}</span>
    </div>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 16px;">
    <p style="font-weight:bold;margin:0 0 12px;">Selecciona tus fechas:</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div>
        <label style="font-size:0.8rem;color:#888;display:block;margin-bottom:4px;">LLEGADA</label>
        <input type="date" id="reserveFrom" value="${today}" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.9rem;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:0.8rem;color:#888;display:block;margin-bottom:4px;">SALIDA</label>
        <input type="date" id="reserveTo" value="${tomorrow}" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.9rem;box-sizing:border-box;">
      </div>
    </div>
    <div style="background:#f9f9f9;padding:14px;border-radius:12px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="color:#555;">${money(s.basePrice || s.base_price || 0)} × 1 noche</span>
        <span style="font-weight:bold;">${money(s.basePrice || s.base_price || 0)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px;">
        <span style="font-weight:bold;">Total</span>
        <span style="font-weight:bold;color:#d4a84e;">${money(s.basePrice || s.base_price || 0)}</span>
      </div>
    </div>
    <button class="primary" id="confirmPayBtn" style="width:100%;padding:14px;background:#d4a84e;color:white;border:0;border-radius:12px;font-weight:bold;font-size:1rem;cursor:pointer;">Confirmar y Reservar</button>
    <p style="text-align:center;color:#999;font-size:0.78rem;margin:12px 0 0;">Pago seguro · Cancelación gratuita</p>
  `);

  document.querySelector('#confirmPayBtn').onclick = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Inicia sesión primero para poder reservar.');
      return;
    }
    try {
      const res = await fetch(API + '/v1/reservations/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          propertyId: s.id,
          from: document.querySelector('#reserveFrom').value,
          to: document.querySelector('#reserveTo').value,
          guests: 2,
          idempotencyKey: 'htj-' + Math.random().toString(36).substring(2, 18)
        })
      });
      if (res.ok) {
        document.querySelector('.modal').remove();
        alert('✅ ¡Reserva creada exitosamente! Recibirás confirmación por correo.');
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'No se pudo completar la reserva.'));
      }
    } catch { alert('Error de conexión.'); }
  };
}

function modal(title, body) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `
    <div class="sheet" style="max-height:90vh;overflow-y:auto;">
      <button class="close">×</button>
      <h2 style="margin:0 0 16px;font-size:1.4rem;padding-right:30px;">${title}</h2>
      ${body}
    </div>`;
  m.querySelector('.close').onclick = () => m.remove();
  m.onclick = e => { if (e.target === m) m.remove(); };
  document.body.append(m);
}

load();
