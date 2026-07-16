const A = window.LINOEM.API_URL;
const demo = [
  { id: '1', name: 'Suite Dorada Centro', type: 'Suite', city: 'Ciudad Juárez', maxGuests: 2, basePrice: 1850, icon: '✦', details: { lat: 31.737, lng: -106.485 } },
  { id: '2', name: 'Departamento Ejecutivo', type: 'Departamento', city: 'Chihuahua', maxGuests: 4, basePrice: 2390, icon: '⌂', details: { lat: 28.635, lng: -106.088 } },
  { id: '3', name: 'Casa Terraza Premium', type: 'Casa', city: 'Ciudad Juárez', maxGuests: 6, basePrice: 3200, icon: '◇', details: { lat: 31.690, lng: -106.420 } }
];
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
let stays = demo;
let mapInstance = null;

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
    const r = await fetch(A + '/v1/properties');
    if (r.ok) {
      const j = await r.json();
      if (j.items?.length) {
        stays = j.items;
      }
    }
  } catch {}
  await loadGoogleMaps();
  render();
}

function render() {
  const gridHtml = stays.map(s => {
    const firstMedia = s.media && s.media.length > 0 ? s.media[0] : null;
    const mediaHtml = firstMedia
      ? (firstMedia.type === 'video'
          ? `<video src="${firstMedia.url}" autoplay muted loop style="width:100%;height:100%;object-fit:cover;"></video>`
          : `<img src="${firstMedia.url}" style="width:100%;height:100%;object-fit:cover;">`
        )
      : `<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#252b3c,#9b7130);color:white;font-size:2.2rem;">${s.icon || '✦'}</div>`;

    return `
      <article class="stay" data-id="${s.id}">
        <div class="photo" style="aspect-ratio:4/3;overflow:hidden;position:relative;background:none;padding:0;">
          ${mediaHtml}
        </div>
        <section>
          <span class="badge">${s.type}</span>
          <h3>${s.name}</h3>
          <div class="meta">${s.city} · Hasta ${s.maxGuests} huéspedes</div>
          <div class="price">
            <span>${money(s.basePrice || s.price)} / noche</span>
            <span>★ 4.9</span>
          </div>
        </section>
      </article>
    `;
  }).join('');

  document.querySelector('#app').innerHTML = `
    <header class="top">
      <div class="brand">
        <img src="/logo.jpg" alt="Logo" class="logo-img">
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
            <input name="city" placeholder="¿A dónde vas?">
          </div>
          <div class="field">
            <label>LLEGADA</label>
            <input type="date" name="from">
          </div>
          <div class="field">
            <label>SALIDA</label>
            <input type="date" name="to">
          </div>
          <button class="primary">Buscar</button>
        </form>
      </div>
      <div class="content">
        <div class="rowtitle">
          <div>
            <h2>Alojamientos destacados</h2>
            <span>Explora ubicaciones en Google Maps</span>
          </div>
        </div>
        
        <div id="client-map" style="height: 300px; border-radius: 24px; margin-top: 18px; margin-bottom: 25px; border: 1px solid var(--line); z-index: 1;"></div>

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
    const q = new FormData(e.target).get('city').toLowerCase();
    stays = demo.concat(stays.filter(x => !demo.some(d => d.id === x.id))).filter(x => x.city.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
    render();
  };

  // Initialize Google Map
  setTimeout(initMap, 100);
}

function initMap() {
  const mapDiv = document.querySelector('#client-map');
  if (!mapDiv || !window.google || !window.google.maps) return;

  // Center map on average coords of stays
  let centerLat = 31.7;
  let centerLng = -106.4;
  let count = 0;

  stays.forEach(s => {
    if (s.details && s.details.lat && s.details.lng) {
      centerLat += parseFloat(s.details.lat);
      centerLng += parseFloat(s.details.lng);
      count++;
    }
  });

  if (count > 0) {
    centerLat /= count;
    centerLng /= count;
  }

  const map = new google.maps.Map(mapDiv, {
    center: { lat: centerLat, lng: centerLng },
    zoom: count > 1 ? 11 : 13
  });

  stays.forEach(s => {
    if (s.details && s.details.lat && s.details.lng) {
      const marker = new google.maps.Marker({
        position: { lat: parseFloat(s.details.lat), lng: parseFloat(s.details.lng) },
        map: map,
        title: s.name
      });

      const infowindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:sans-serif;color:#15171c;">
            <strong style="display:block;margin-bottom:4px;">${s.name}</strong>
            <span>${s.city}</span><br>
            <strong style="color:#d4a84e;display:block;margin-top:6px;">${money(s.basePrice || s.price)} / noche</strong>
            <button style="margin-top:8px;background:#15171c;color:white;border:0;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:0.75rem;" onclick="window.reserveFromMap('${s.id}')">Reservar Ahora</button>
          </div>
        `
      });

      marker.addListener('click', () => {
        infowindow.open(map, marker);
      });
    }
  });
}

window.reserveFromMap = function(id) {
  reserve(id);
};

function login() {
  modal('Iniciar sesión', `
    <input placeholder="Correo electrónico">
    <input type="password" placeholder="Contraseña">
    <button class="primary" style="width:100%;padding:14px">Continuar</button>
    <p class="meta">También puedes configurar acceso con Google en producción.</p>
  `);
}

function reserve(id) {
  const s = stays.find(x => String(x.id) === id) || demo[0];
  modal('Reservar ' + s.name, `
    <p>Selecciona tus fechas y confirma de forma segura.</p>
    <input type="date" value="${new Date().toISOString().split('T')[0]}">
    <input type="date" value="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}">
    <button class="primary" style="width:100%;padding:14px" id="confirmPayBtn">Confirmar y pagar</button>
    <p class="meta">Mercado Pago se activa con tus credenciales sandbox.</p>
  `);

  document.querySelector('#confirmPayBtn').onclick = async () => {
    try {
      const res = await fetch(A + '/v1/reservations/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
        },
        body: JSON.stringify({
          propertyId: s.id,
          from: new Date().toISOString(),
          to: new Date(Date.now() + 86400000).toISOString(),
          guests: 2,
          idempotencyKey: 'idemp-' + Math.random().toString(36).substring(2, 15)
        })
      });
      if (res.ok) {
        alert('Reserva creada con éxito. Pendiente de pago.');
        document.querySelector('.modal').remove();
      } else {
        alert('Inicia sesión en el portal para confirmar tu reserva.');
      }
    } catch {
      alert('Error de conexión al procesar reserva.');
    }
  };
}

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
