const API = window.LINOEM.API_URL;
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(value || 0));
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const safeMedia = value => {
  const url = String(value || '');
  return /^(data:(image|video)\/(jpeg|jpg|png|webp|gif|avif|mp4|webm);base64,|https?:\/\/)/i.test(url) ? url : '';
};
const safeLink = value => {
  const url = String(value || '#alojamientos').trim();
  return /^(https?:\/\/|\/|#)/i.test(url) ? url : '#alojamientos';
};

const state = {
  properties: [],
  promotions: [],
  filtered: [],
  favorites: new Set(JSON.parse(localStorage.getItem('htj-favorites') || '[]')),
  activeTab: 'explore',
  carousel: 0,
  search: { city: '', from: '', to: '', guests: 2, type: 'ALL' },
  user: null,
  trips: [],
  serviceRequests: [],
  loading: true,
  error: ''
};

let mapInstance = null;
let carouselTimer = null;
let leafletPromise = null;

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
state.search.from = today;
state.search.to = tomorrow;

function applyTheme(theme = localStorage.getItem('htj-theme') || 'light') {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('htj-theme', theme);
}
applyTheme();

async function fetchJson(path, options = {}) {
  const response = await fetch(API + path, { cache: 'no-store', ...options });
  let data = {};
  try { data = await response.json(); } catch { /* empty response */ }
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

async function loadLeaflet() {
  if (window.L) return window.L;
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.leaflet = 'true';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.append(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.append(script);
  });
  return leafletPromise;
}

async function load() {
  state.loading = true;
  render();
  try {
    const [properties, promotions] = await Promise.all([
      fetchJson('/v1/properties').catch(error => ({ items: [], error })),
      fetchJson('/v1/promotions').catch(() => ({ items: [] }))
    ]);
    state.properties = Array.isArray(properties.items) ? properties.items : [];
    state.promotions = Array.isArray(promotions.items) ? promotions.items : [];
    state.filtered = [...state.properties];
    state.error = properties.error ? 'No pudimos actualizar los alojamientos. Intenta nuevamente.' : '';
    await restoreSession();
  } finally {
    state.loading = false;
    render();
  }
}

async function restoreSession() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    state.user = await fetchJson('/v1/me', { headers: { Authorization: 'Bearer ' + token } });
  } catch {
    localStorage.removeItem('token');
    state.user = null;
  }
}

function mediaMarkup(property, className = '') {
  const media = Array.isArray(property.media) ? property.media : [];
  const first = media.find(item => safeMedia(item?.url));
  if (!first) return `<div class="media-fallback ${className}"><img src="/logo-htj.png" alt="HTJ Hotel"></div>`;
  const url = safeMedia(first.url);
  return first.type === 'video'
    ? `<video class="${className}" src="${url}" autoplay muted loop playsinline preload="metadata"></video>`
    : `<img class="${className}" src="${url}" alt="${escapeHtml(property.name)}" loading="lazy">`;
}

function getAmenities(property) {
  return Array.isArray(property.details?.amenities) ? property.details.amenities : [];
}

function getMeta(property) {
  const details = property.details || {};
  return [
    details.bedrooms ? `${details.bedrooms} rec.` : '',
    details.bathrooms ? `${details.bathrooms} baños` : '',
    `${property.maxGuests || 1} huéspedes`
  ].filter(Boolean).join(' · ');
}

function propertyCard(property) {
  const favorite = state.favorites.has(String(property.id));
  const amenities = getAmenities(property).slice(0, 3);
  return `
    <article class="stay-card" data-property="${property.id}" tabindex="0" aria-label="Ver ${escapeHtml(property.name)}">
      <div class="stay-media">
        ${mediaMarkup(property, 'stay-cover')}
        <button class="favorite ${favorite ? 'is-favorite' : ''}" data-favorite="${property.id}" aria-label="${favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}">${favorite ? '♥' : '♡'}</button>
        <span class="stay-type">${escapeHtml(property.type)}</span>
        ${Array.isArray(property.media) && property.media.length > 1 ? `<span class="media-count">▧ ${property.media.length}</span>` : ''}
      </div>
      <div class="stay-body">
        <div class="stay-heading">
          <div><span class="stay-city">${escapeHtml(property.city)}</span><h3>${escapeHtml(property.name)}</h3></div>
          <span class="rating">★ 4.9</span>
        </div>
        <p class="stay-meta">${escapeHtml(getMeta(property))}</p>
        ${amenities.length ? `<div class="amenity-list">${amenities.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
        <div class="stay-price"><strong>${money(property.basePrice)}</strong><span>/ noche</span><button>Ver estancia</button></div>
      </div>
    </article>`;
}

function heroSlides() {
  const slides = state.promotions.length ? state.promotions : [{
    id: 'welcome', badge: 'HTJ HOSPEDAJE TAXI JUÁREZ',
    title: 'Estancias memorables, atención excepcional.',
    subtitle: 'Descubre alojamientos cuidadosamente seleccionados para descansar, trabajar y disfrutar Ciudad Juárez.',
    imageUrl: safeMedia(state.properties[0]?.media?.[0]?.url), ctaLabel: 'Explorar alojamientos', ctaUrl: '#alojamientos'
  }];
  return slides.map((promo, index) => {
    const image = safeMedia(promo.imageUrl || promo.image_url);
    return `
      <article class="hero-slide ${index === state.carousel ? 'is-active' : ''}" data-slide="${index}" ${image ? `style="--hero-image:url('${image.replace(/'/g, '%27')}')"` : ''}>
        <div class="hero-overlay"></div>
        <div class="hero-copy container">
          ${promo.badge ? `<span class="eyebrow">${escapeHtml(promo.badge)}</span>` : ''}
          <h1>${escapeHtml(promo.title)}</h1>
          <p>${escapeHtml(promo.subtitle || '')}</p>
          <div class="hero-actions">
            <a class="hero-cta" href="${safeLink(promo.ctaLabel ? promo.ctaUrl : '#alojamientos')}">${escapeHtml(promo.ctaLabel || 'Ver alojamientos')} <span>→</span></a>
            <button class="hero-secondary" data-scroll-stays>Conocer el hotel</button>
          </div>
        </div>
      </article>`;
  }).join('');
}

function heroSection() {
  const count = state.promotions.length || 1;
  return `
    <section class="hero" aria-label="Promociones del hotel">
      <div class="hero-slides">${heroSlides()}</div>
      ${count > 1 ? `
        <button class="carousel-arrow prev" data-carousel="prev" aria-label="Promoción anterior">‹</button>
        <button class="carousel-arrow next" data-carousel="next" aria-label="Promoción siguiente">›</button>
        <div class="carousel-dots">${Array.from({ length: count }, (_, index) => `<button class="${index === state.carousel ? 'is-active' : ''}" data-dot="${index}" aria-label="Ir a promoción ${index + 1}"></button>`).join('')}</div>
      ` : ''}
    </section>`;
}

function searchBar() {
  const cities = [...new Set(state.properties.map(item => item.city).filter(Boolean))];
  return `
    <form class="booking-search container" id="bookingSearch">
      <label class="search-field destination"><span>Destino</span><div><i>⌖</i><input name="city" list="cities" value="${escapeHtml(state.search.city)}" placeholder="¿A dónde quieres ir?"></div></label>
      <datalist id="cities">${cities.map(city => `<option value="${escapeHtml(city)}">`).join('')}</datalist>
      <label class="search-field"><span>Llegada</span><input name="from" type="date" min="${today}" value="${state.search.from}"></label>
      <label class="search-field"><span>Salida</span><input name="to" type="date" min="${tomorrow}" value="${state.search.to}"></label>
      <label class="search-field guests"><span>Huéspedes</span><select name="guests">${[1,2,3,4,5,6,7,8].map(value => `<option value="${value}" ${value === state.search.guests ? 'selected' : ''}>${value} ${value === 1 ? 'huésped' : 'huéspedes'}</option>`).join('')}</select></label>
      <button class="search-submit" type="submit"><span>Buscar</span>⌕</button>
    </form>`;
}

function benefitsSection() {
  return `
    <section class="benefits container" aria-label="Beneficios HTJ">
      <article><i>◇</i><div><strong>Selección premium</strong><span>Alojamientos verificados por nuestro equipo</span></div></article>
      <article><i>✓</i><div><strong>Reserva confiable</strong><span>Fechas y disponibilidad en un solo lugar</span></div></article>
      <article><i>◷</i><div><strong>Atención cercana</strong><span>Estamos para ayudarte durante tu estancia</span></div></article>
    </section>`;
}

function exploreContent() {
  const items = state.activeTab === 'favorites'
    ? state.properties.filter(property => state.favorites.has(String(property.id)))
    : state.filtered;
  const emptyTitle = state.activeTab === 'favorites' ? 'Tu lista de favoritos está esperando' : 'No encontramos estancias con esos filtros';
  const emptyText = state.activeTab === 'favorites' ? 'Toca el corazón de una propiedad para guardarla aquí.' : 'Prueba otro destino, tipo de alojamiento o número de huéspedes.';
  return `
    <main id="alojamientos">
      <section class="catalog container">
        <div class="section-heading">
          <div><span class="section-kicker">${state.activeTab === 'favorites' ? 'TU COLECCIÓN' : 'DESCUBRE HTJ'}</span><h2>${state.activeTab === 'favorites' ? 'Tus alojamientos favoritos' : 'Estancias destacadas'}</h2><p>${items.length} ${items.length === 1 ? 'opción disponible' : 'opciones disponibles'} para tu próxima visita.</p></div>
          <div class="catalog-actions">
            <label>Tipo<select id="typeFilter"><option value="ALL">Todos</option>${['HOTEL','SUITE','ROOM','HOUSE','APARTMENT'].map(type => `<option value="${type}" ${state.search.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></label>
            <button id="mapToggle" aria-controls="mapSection">⌖ Ver mapa</button>
          </div>
        </div>
        ${state.error ? `<div class="notice">${escapeHtml(state.error)} <button id="retryLoad">Reintentar</button></div>` : ''}
        ${state.loading ? `<div class="cards-grid">${Array.from({length:3},()=>'<div class="skeleton-card"></div>').join('')}</div>` : items.length ? `<div class="cards-grid">${items.map(propertyCard).join('')}</div>` : `<div class="empty-state"><span>⌂</span><h3>${emptyTitle}</h3><p>${emptyText}</p><button data-tab="explore">Explorar estancias</button></div>`}
      </section>
      <section class="map-section container" id="mapSection" hidden><div class="map-heading"><div><span class="section-kicker">UBICACIÓN</span><h2>Explora el mapa</h2></div><button id="closeMap">× Cerrar mapa</button></div><div id="clientMap"></div></section>
    </main>`;
}

function tripsContent() {
  return `
    <main class="account-page container">
      <div class="section-heading"><div><span class="section-kicker">TU CUENTA</span><h2>Mis viajes</h2><p>Consulta tus reservaciones y próximas estancias.</p></div></div>
      ${!state.user ? `<div class="empty-state"><span>▣</span><h3>Inicia sesión para ver tus viajes</h3><p>Tus reservas aparecerán aquí después de iniciar sesión.</p><button data-login>Abrir mi cuenta</button></div>` : state.trips.length ? `<div class="trip-grid">${state.trips.map(trip => `
        <article class="trip-card"><div class="trip-image">${mediaMarkup({ name: trip.propertyName, media: trip.media }, 'stay-cover')}</div><div><span class="badge">${escapeHtml(trip.status)}</span><h3>${escapeHtml(trip.propertyName)}</h3><p>${escapeHtml(trip.city)}</p><strong>${new Date(trip.startsOn).toLocaleDateString('es-MX',{day:'numeric',month:'short'})} — ${new Date(trip.endsOn).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}</strong><small>${trip.guests} huéspedes</small><button class="trip-service-button" data-service-trip="${trip.id}">Solicitar servicio</button></div></article>`).join('')}</div>${serviceRequestMarkup()}` : `<div class="empty-state"><span>▣</span><h3>Aún no tienes viajes</h3><p>Cuando reserves una estancia podrás consultar aquí todos sus detalles.</p><button data-tab="explore">Encontrar alojamiento</button></div>`}
    </main>`;
}

function profileContent() {
  return `
    <main class="account-page container">
      <div class="section-heading"><div><span class="section-kicker">TU ESPACIO</span><h2>Perfil</h2><p>Gestiona tu acceso al portal HTJ.</p></div></div>
      ${state.user ? `<section class="profile-card"><div class="profile-avatar">${escapeHtml(state.user.name?.charAt(0).toUpperCase() || 'H')}</div><div><span>Huésped HTJ</span><h3>${escapeHtml(state.user.name)}</h3><p>${escapeHtml(state.user.email)}</p></div><button id="logout">Cerrar sesión</button></section><section class="guest-help-card"><div><span class="section-kicker">ATENCIÓN PRIVADA</span><h3>Estamos para escucharte</h3><p>Comparte una duda, queja, sugerencia o mejora directamente con administración.</p></div><button id="guestFeedbackButton">Abrir buzón</button></section>` : `<div class="empty-state"><span>◎</span><h3>Bienvenido a HTJ</h3><p>Inicia sesión para reservar, consultar viajes y administrar tu perfil.</p><button data-login>Iniciar sesión</button></div>`}
    </main>`;
}

function serviceRequestMarkup(){return `<section class="guest-requests"><div class="section-heading"><div><span class="section-kicker">SEGUIMIENTO</span><h2>Mis solicitudes</h2><p>Consulta el estado informado por el departamento responsable.</p></div></div><div class="guest-request-grid">${state.serviceRequests.length?state.serviceRequests.map(r=>`<article><div><span>#${r.folio} · ${escapeHtml(r.department)}</span><em>${escapeHtml(r.status)}</em></div><h3>${escapeHtml(r.subject)}</h3><p>${escapeHtml(r.description)}</p>${r.resolution?`<blockquote><b>Respuesta HTJ:</b> ${escapeHtml(r.resolution)}</blockquote>`:''}<small>${new Date(r.createdAt).toLocaleString('es-MX')}</small></article>`).join(''):'<p class="request-empty">Todavía no has enviado solicitudes.</p>'}</div></section>`}

function header() {
  const tabs = [{id:'explore',label:'Explorar'},{id:'favorites',label:'Favoritos'},{id:'trips',label:'Mis viajes'}];
  return `
    <header class="site-header">
      <div class="header-inner container">
        <button class="brand" data-tab="explore"><img src="/logo-htj.png" alt="HTJ Hotel"><span><b>HTJ</b><small>HOSPEDAJE TAXI JUÁREZ</small></span></button>
        <nav class="desktop-nav">${tabs.map(tab => `<button class="${state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">${tab.label}${tab.id === 'favorites' && state.favorites.size ? `<em>${state.favorites.size}</em>` : ''}</button>`).join('')}</nav>
        <div class="header-actions"><button class="theme-button" id="themeToggle" aria-label="Cambiar tema">${document.documentElement.dataset.theme === 'dark' ? '☀' : '◐'}</button><button class="account-button" data-tab="profile"><span>${state.user ? escapeHtml(state.user.name.charAt(0).toUpperCase()) : '◎'}</span><b>${state.user ? escapeHtml(state.user.name.split(' ')[0]) : 'Ingresar'}</b></button></div>
      </div>
    </header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="container footer-grid"><div class="footer-brand"><img src="/logo-htj.png" alt="HTJ"><div><strong>HTJ Hotel</strong><span>Hospitalidad excepcional en Ciudad Juárez.</span></div></div><div><strong>Explora</strong><button data-tab="explore">Alojamientos</button><button data-tab="favorites">Favoritos</button></div><div><strong>Tu cuenta</strong><button data-tab="trips">Mis viajes</button><button data-tab="profile">Perfil</button></div><div><strong>Contacto</strong><span>Ciudad Juárez, Chihuahua</span><span>Atención personalizada</span></div></div><div class="footer-bottom container"><span>© ${new Date().getFullYear()} HTJ Hospedaje Taxi Juárez</span><span>Una estancia extraordinaria comienza aquí.</span></div></footer>`;
}

function mobileNav() {
  return `<nav class="mobile-nav">${[{id:'explore',icon:'⌂',label:'Explorar'},{id:'favorites',icon:'♡',label:'Favoritos'},{id:'trips',icon:'▣',label:'Viajes'},{id:'profile',icon:'◎',label:'Perfil'}].map(tab => `<button class="${state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}"><i>${tab.icon}</i><span>${tab.label}</span></button>`).join('')}</nav>`;
}

function render() {
  if (state.carousel >= Math.max(1, state.promotions.length)) state.carousel = 0;
  const homeHero = state.activeTab === 'explore';
  document.querySelector('#app').innerHTML = `
    ${header()}
    ${homeHero ? heroSection() + searchBar() + benefitsSection() : ''}
    ${['explore','favorites'].includes(state.activeTab) ? exploreContent() : state.activeTab === 'trips' ? tripsContent() : profileContent()}
    ${footer()}${mobileNav()}`;
  bindEvents();
  if (homeHero) startCarousel(); else stopCarousel();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', async () => {
    const tab = button.dataset.tab;
    state.activeTab = tab;
    if (tab === 'trips' && state.user) await loadTrips();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  document.querySelectorAll('[data-login]').forEach(button => button.addEventListener('click', loginModal));
  document.querySelector('#themeToggle')?.addEventListener('click', () => { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); render(); });
  document.querySelector('#logout')?.addEventListener('click', () => { localStorage.removeItem('token'); state.user = null; state.trips = []; state.activeTab = 'explore'; render(); });
  document.querySelectorAll('[data-service-trip]').forEach(button=>button.addEventListener('click',()=>openGuestService(button.dataset.serviceTrip)));
  document.querySelector('#guestFeedbackButton')?.addEventListener('click',openGuestFeedback);
  document.querySelector('#retryLoad')?.addEventListener('click', load);

  document.querySelector('#bookingSearch')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const from = form.get('from');
    const to = form.get('to');
    if (from && to && to <= from) return toast('La salida debe ser posterior a la llegada.', 'warning');
    state.search = { ...state.search, city: form.get('city').trim(), from, to, guests: Number(form.get('guests')) };
    filterProperties();
    render();
    setTimeout(() => document.querySelector('#alojamientos')?.scrollIntoView({ behavior: 'smooth' }), 50);
  });
  document.querySelector('#typeFilter')?.addEventListener('change', event => { state.search.type = event.target.value; filterProperties(); render(); });
  document.querySelectorAll('[data-scroll-stays]').forEach(button => button.addEventListener('click', () => document.querySelector('#alojamientos')?.scrollIntoView({ behavior: 'smooth' })));

  document.querySelectorAll('[data-favorite]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    toggleFavorite(button.dataset.favorite);
  }));
  document.querySelectorAll('[data-property]').forEach(card => {
    const open = () => openProperty(card.dataset.property);
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => { if (event.key === 'Enter') open(); });
  });
  document.querySelector('#mapToggle')?.addEventListener('click', showMap);
  document.querySelector('#closeMap')?.addEventListener('click', hideMap);

  document.querySelectorAll('[data-carousel]').forEach(button => button.addEventListener('click', () => moveCarousel(button.dataset.carousel === 'next' ? 1 : -1)));
  document.querySelectorAll('[data-dot]').forEach(button => button.addEventListener('click', () => setCarousel(Number(button.dataset.dot))));
  const hero = document.querySelector('.hero');
  if (hero) {
    let startX = 0;
    hero.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', event => { const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) > 45) moveCarousel(delta < 0 ? 1 : -1); }, { passive: true });
  }
}

function filterProperties() {
  const city = state.search.city.toLowerCase();
  state.filtered = state.properties.filter(property => {
    const matchesCity = !city || property.city?.toLowerCase().includes(city) || property.name?.toLowerCase().includes(city) || property.address?.toLowerCase().includes(city);
    const matchesGuests = Number(property.maxGuests || 0) >= state.search.guests;
    const matchesType = state.search.type === 'ALL' || property.type === state.search.type;
    return matchesCity && matchesGuests && matchesType;
  });
}

function toggleFavorite(id) {
  const key = String(id);
  if (state.favorites.has(key)) state.favorites.delete(key); else state.favorites.add(key);
  localStorage.setItem('htj-favorites', JSON.stringify([...state.favorites]));
  render();
}

function stopCarousel() { if (carouselTimer) clearInterval(carouselTimer); carouselTimer = null; }
function startCarousel() {
  stopCarousel();
  if (state.promotions.length > 1) carouselTimer = setInterval(() => setCarousel((state.carousel + 1) % state.promotions.length), 6500);
}
function moveCarousel(delta) { setCarousel((state.carousel + delta + Math.max(1, state.promotions.length)) % Math.max(1, state.promotions.length)); }
function setCarousel(index) {
  state.carousel = index;
  document.querySelectorAll('.hero-slide').forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  document.querySelectorAll('[data-dot]').forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  startCarousel();
}

async function showMap() {
  const section = document.querySelector('#mapSection');
  if (!section) return;
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try { await loadLeaflet(); initMap(); } catch { document.querySelector('#clientMap').innerHTML = '<div class="map-empty">No fue posible cargar el mapa.</div>'; }
}
function hideMap() { const section = document.querySelector('#mapSection'); if (section) section.hidden = true; if (mapInstance) { mapInstance.remove(); mapInstance = null; } }

function initMap() {
  const mapElement = document.querySelector('#clientMap');
  if (!mapElement || !window.L) return;
  if (mapInstance) mapInstance.remove();
  const items = (state.activeTab === 'favorites' ? state.properties.filter(p => state.favorites.has(String(p.id))) : state.filtered).filter(property => Number.isFinite(Number(property.details?.lat)) && Number.isFinite(Number(property.details?.lng)));
  const center = items.length ? [Number(items[0].details.lat), Number(items[0].details.lng)] : [31.737, -106.485];
  mapInstance = L.map(mapElement, { scrollWheelZoom: false }).setView(center, items.length === 1 ? 14 : 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
  if (!items.length) {
    L.popup({ closeButton: false, closeOnClick: false }).setLatLng(center).setContent('<b>Ciudad Juárez</b><br>Las ubicaciones aparecerán al ser publicadas.').openOn(mapInstance);
    return;
  }
  const bounds = [];
  items.forEach(property => {
    const point = [Number(property.details.lat), Number(property.details.lng)];
    bounds.push(point);
    const icon = L.divIcon({ className: 'map-price-wrapper', html: `<button class="map-price">${money(property.basePrice)}</button>`, iconSize: [100, 36], iconAnchor: [50, 18] });
    L.marker(point, { icon }).addTo(mapInstance).bindPopup(`<div class="map-popup"><strong>${escapeHtml(property.name)}</strong><span>${escapeHtml(property.city)}</span><button onclick="window.openMapProperty('${property.id}')">Ver estancia</button></div>`);
  });
  if (bounds.length > 1) mapInstance.fitBounds(bounds, { padding: [45, 45] });
}
window.openMapProperty = openProperty;

function galleryMarkup(property) {
  const items = (Array.isArray(property.media) ? property.media : []).filter(item => safeMedia(item?.url)).slice(0, 5);
  if (!items.length) return `<div class="detail-gallery single">${mediaMarkup(property, 'detail-media')}</div>`;
  return `<div class="detail-gallery ${items.length === 1 ? 'single' : ''}">${items.map((item, index) => item.type === 'video' ? `<video class="detail-media item-${index}" src="${safeMedia(item.url)}" controls muted playsinline></video>` : `<img class="detail-media item-${index}" src="${safeMedia(item.url)}" alt="${escapeHtml(property.name)} ${index + 1}">`).join('')}</div>`;
}

function openProperty(id) {
  const property = state.properties.find(item => String(item.id) === String(id));
  if (!property) return;
  const details = property.details || {};
  const amenities = getAmenities(property);
  const favorite = state.favorites.has(String(property.id));
  modal('', `
    <div class="property-detail">
      ${galleryMarkup(property)}
      <div class="detail-content">
        <div class="detail-title"><div><span class="stay-city">${escapeHtml(property.city)} · ${escapeHtml(property.type)}</span><h2>${escapeHtml(property.name)}</h2><p>${escapeHtml(property.address || '')}</p></div><button class="detail-favorite" data-modal-favorite="${property.id}">${favorite ? '♥ Guardado' : '♡ Guardar'}</button></div>
        <div class="detail-columns">
          <div class="detail-info">
            <div class="detail-facts"><span>👥 <b>${property.maxGuests}</b> huéspedes</span>${details.bedrooms ? `<span>🛏 <b>${details.bedrooms}</b> recámaras</span>` : ''}${details.bathrooms ? `<span>◫ <b>${details.bathrooms}</b> baños</span>` : ''}${details.property_size ? `<span>◇ <b>${details.property_size}</b> m²</span>` : ''}</div>
            ${details.description ? `<section><h3>Acerca de esta estancia</h3><p>${escapeHtml(details.description)}</p></section>` : ''}
            ${amenities.length ? `<section><h3>Lo que ofrece</h3><div class="detail-amenities">${amenities.map(item => `<span>✓ ${escapeHtml(item)}</span>`).join('')}</div></section>` : ''}
            <section class="detail-times"><div><span>Llegada</span><strong>${escapeHtml(details.check_in_time || '15:00')}</strong></div><div><span>Salida</span><strong>${escapeHtml(details.check_out_time || '12:00')}</strong></div></section>
            ${details.rules ? `<section><h3>Reglas</h3><p>${escapeHtml(details.rules)}</p></section>` : ''}
          </div>
          <form class="reserve-box" id="reserveForm">
            <div class="reserve-rate"><strong>${money(property.basePrice)}</strong><span>/ noche</span><em>★ 4.9</em></div>
            <div class="reserve-dates"><label>Llegada<input id="reserveFrom" name="from" type="date" min="${today}" value="${state.search.from || today}"></label><label>Salida<input id="reserveTo" name="to" type="date" min="${tomorrow}" value="${state.search.to || tomorrow}"></label><label class="full">Huéspedes<select id="reserveGuests" name="guests">${Array.from({length:Number(property.maxGuests)||1},(_,index)=>`<option value="${index+1}" ${index+1===state.search.guests?'selected':''}>${index+1} ${index?'huéspedes':'huésped'}</option>`).join('')}</select></label></div>
            <div class="reserve-summary"><div><span id="nightLabel">1 noche</span><span id="nightSubtotal">${money(property.basePrice)}</span></div><div class="total"><strong>Total estimado</strong><strong id="reserveTotal">${money(property.basePrice)}</strong></div></div>
            <button class="reserve-submit" type="submit">Reservar ahora</button><small>No se realizará ningún cargo en este momento.</small>
          </form>
        </div>
      </div>
    </div>`, true);
  document.querySelector('[data-modal-favorite]')?.addEventListener('click', event => { toggleFavorite(event.currentTarget.dataset.modalFavorite); document.querySelector('.modal')?.remove(); openProperty(id); });
  const form = document.querySelector('#reserveForm');
  const recalculate = () => {
    const from = new Date(form.from.value + 'T12:00:00');
    const to = new Date(form.to.value + 'T12:00:00');
    const nights = Math.max(1, Math.round((to - from) / 86_400_000) || 1);
    document.querySelector('#nightLabel').textContent = `${nights} ${nights === 1 ? 'noche' : 'noches'}`;
    document.querySelector('#nightSubtotal').textContent = money(property.basePrice * nights);
    document.querySelector('#reserveTotal').textContent = money(property.basePrice * nights);
  };
  form.from.addEventListener('change', () => { form.to.min = form.from.value; recalculate(); });
  form.to.addEventListener('change', recalculate);
  recalculate();
  form.addEventListener('submit', event => reserve(event, property));
}

async function reserve(event, property) {
  event.preventDefault();
  if (!state.user || !localStorage.getItem('token')) {
    toast('Inicia sesión para completar tu reservación.', 'warning');
    document.querySelector('.modal')?.remove();
    return loginModal(() => openProperty(property.id));
  }
  const form = event.currentTarget;
  if (form.to.value <= form.from.value) return toast('Selecciona una fecha de salida posterior.', 'warning');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Creando reservación…';
  try {
    await fetchJson('/v1/reservations/hold', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ propertyId: property.id, from: form.from.value, to: form.to.value, guests: Number(form.guests.value), idempotencyKey: 'htj-' + crypto.randomUUID() }) });
    document.querySelector('.modal')?.remove();
    toast('¡Reservación creada! Ya aparece en Mis viajes.', 'success');
    await loadTrips();
  } catch (error) { toast(error.message, 'warning'); button.disabled = false; button.textContent = 'Reservar ahora'; }
}

function loginModal(onSuccess) {
  modal('Bienvenido a HTJ', `
    <div class="auth-tabs"><button class="active" data-auth-tab="login">Iniciar sesión</button><button data-auth-tab="register">Crear cuenta</button></div>
    <form class="auth-form" id="loginForm"><p>Accede para reservar y consultar tus viajes.</p><label>Correo electrónico<input name="email" type="email" required placeholder="tu@correo.com"></label><label>Contraseña<input name="password" type="password" required placeholder="Tu contraseña"></label><button>Iniciar sesión</button></form>
    <form class="auth-form" id="registerForm" hidden><p>Crea tu cuenta de huésped en menos de un minuto.</p><label>Nombre completo<input name="name" required minlength="2" placeholder="Tu nombre"></label><label>Correo electrónico<input name="email" type="email" required placeholder="tu@correo.com"></label><label>Contraseña<input name="password" type="password" required minlength="12" placeholder="Mínimo 12 caracteres"></label><button>Crear mi cuenta</button></form>`);
  document.querySelectorAll('[data-auth-tab]').forEach(tab => tab.addEventListener('click', () => {
    const register = tab.dataset.authTab === 'register';
    document.querySelector('#loginForm').hidden = register;
    document.querySelector('#registerForm').hidden = !register;
    document.querySelectorAll('[data-auth-tab]').forEach(item => item.classList.toggle('active', item === tab));
  }));
  document.querySelector('#loginForm').addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await authenticate('/v1/auth/login', { email: form.get('email'), password: form.get('password') }, onSuccess, event.currentTarget.querySelector('button'));
  });
  document.querySelector('#registerForm').addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await authenticate('/v1/auth/register', { name: form.get('name'), email: form.get('email'), password: form.get('password') }, onSuccess, event.currentTarget.querySelector('button'));
  });
}

async function authenticate(path, body, onSuccess, button) {
  const original = button.textContent; button.disabled = true; button.textContent = 'Un momento…';
  try {
    const data = await fetchJson(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    localStorage.setItem('token', data.accessToken);
    state.user = data.user || await fetchJson('/v1/me', { headers: { Authorization: 'Bearer ' + data.accessToken } });
    document.querySelector('.modal')?.remove(); render(); toast(`Bienvenido, ${state.user.name.split(' ')[0]}.`, 'success');
    if (typeof onSuccess === 'function') onSuccess();
  } catch (error) { toast(error.message, 'warning'); button.disabled = false; button.textContent = original; }
}

async function loadTrips() {
  if (!state.user) return;
  try { const auth={Authorization:'Bearer '+localStorage.getItem('token')};const [trips,requests]=await Promise.all([fetchJson('/v1/me/reservations',{headers:auth}),fetchJson('/v1/me/service-requests',{headers:auth})]);state.trips=trips.items||[];state.serviceRequests=requests.items||[]; }
  catch (error) { if (/autorizado/i.test(error.message)) { localStorage.removeItem('token'); state.user = null; } }
}

function openGuestService(tripId){const trip=state.trips.find(x=>x.id===tripId);modal('Solicitar atención HTJ',`<form class="auth-form" id="guestServiceForm"><p>Tu solicitud se enviará directamente al departamento responsable.</p><label>Servicio<select name="department"><option value="HOUSEKEEPING">Limpieza de habitación</option><option value="MAINTENANCE">Mantenimiento / desperfecto</option><option value="RECEPTION">Recepción / amenidad</option><option value="FINANCE">Pago, recibo o aclaración</option></select></label><label>Prioridad<select name="priority"><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option><option value="LOW">Baja</option></select></label><label>Asunto<input name="subject" required></label><label>Detalles<textarea name="description" rows="5" required></textarea></label><button>Enviar solicitud</button></form>`);document.querySelector('#guestServiceForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),button=e.target.querySelector('button');button.disabled=true;try{await fetchJson('/v1/me/service-requests',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('token')},body:JSON.stringify({reservationId:trip.id,propertyId:trip.propertyId,department:f.get('department'),category:f.get('department')==='HOUSEKEEPING'?'CLEANING_REQUEST':'SERVICE_REQUEST',subject:f.get('subject'),description:f.get('description'),priority:f.get('priority')})});document.querySelector('.modal')?.remove();await loadTrips();render();toast('Solicitud enviada al departamento correspondiente.','success')}catch(x){toast(x.message,'warning');button.disabled=false}}}
function openGuestFeedback(){modal('Buzón privado HTJ',`<form class="auth-form" id="guestFeedbackForm"><p>Este mensaje solamente será visible para la administración autorizada.</p><label>Tipo<select name="kind"><option value="QUESTION">Duda</option><option value="SUGGESTION">Sugerencia</option><option value="IMPROVEMENT">Mejora</option><option value="COMPLAINT">Queja</option></select></label><label>Asunto<input name="subject" required></label><label>Mensaje<textarea name="message" rows="6" required></textarea></label><button>Enviar de forma privada</button></form>`);document.querySelector('#guestFeedbackForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await fetchJson('/v1/me/feedback',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('token')},body:JSON.stringify(Object.fromEntries(f))});document.querySelector('.modal')?.remove();toast('Tu mensaje fue entregado directamente a administración.','success')}catch(x){toast(x.message,'warning')}}}

function modal(title, body, wide = false) {
  document.querySelectorAll('.modal').forEach(item => item.remove());
  const element = document.createElement('div');
  element.className = 'modal';
  element.innerHTML = `<div class="modal-sheet ${wide ? 'wide' : ''}"><button class="modal-close" aria-label="Cerrar">×</button>${title ? `<h2>${escapeHtml(title)}</h2>` : ''}${body}</div>`;
  element.querySelector('.modal-close').addEventListener('click', () => element.remove());
  element.addEventListener('click', event => { if (event.target === element) element.remove(); });
  document.body.append(element);
}

function toast(message, type = '') {
  document.querySelectorAll('.toast').forEach(item => item.remove());
  const element = document.createElement('div');
  element.className = `toast ${type}`;
  element.innerHTML = `<span>${type === 'success' ? '✓' : '!'}</span><p>${escapeHtml(message)}</p>`;
  document.body.append(element);
  setTimeout(() => element.classList.add('show'), 20);
  setTimeout(() => { element.classList.remove('show'); setTimeout(() => element.remove(), 300); }, 4200);
}

load();
