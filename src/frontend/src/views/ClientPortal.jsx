import React, { useState, useEffect } from 'react';
import { Bed, CalendarCheck, ShieldCheck, Key, SignOut } from '@phosphor-icons/react';
// Simulating a socket connection for the client
// import { io } from 'socket.io-client';

const ClientPortal = () => {
  const [view, setView] = useState('home'); // home, login, register, dashboard
  const [rooms, setRooms] = useState([
    { id: '1', number: '101', type: 'Sencilla', price: 1200, status: 'Disponible', images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500'], amenities: 'Wifi, TV, Aire Acondicionado' },
    { id: '2', number: '201', type: 'Deluxe Ocean View', price: 3200, status: 'Disponible', images: ['https://images.unsplash.com/photo-1582719478250-c89cae4db85b?w=500'], amenities: 'Wifi, Jacuzzi, Balcón, Minibar' },
    { id: '3', number: '301', type: 'Suite Presidencial', price: 7500, status: 'Ocupada', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500'], amenities: 'Todo Incluido, Mayordomo, Vista Panorámica' }
  ]);

  return (
    <div className="app-wrapper" style={{ flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="sidebar-logo">
            <Bed size={24} weight="fill" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>LINOEM</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--brand-gold)', letterSpacing: '0.1em', fontWeight: 'bold' }}>HOTEL CONTROL - ULTRA PREMIUM</p>
          </div>
        </div>
        
        <div>
          {view === 'home' && (
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="btn outline" onClick={() => setView('login')}>Iniciar Sesión</button>
              <button className="btn" onClick={() => setView('register')}>Registrarse con PIN</button>
            </div>
          )}
          {view === 'dashboard' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontWeight: '600', color: 'var(--brand-gold)' }}>Hola, Cliente VIP</span>
              <button className="btn outline" onClick={() => setView('home')}><SignOut size={18} /> Salir</button>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ padding: '40px', flexGrow: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {view === 'home' && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '20px' }}>
              Descubre el <span style={{ color: 'var(--brand-gold)' }}>Lujo Absoluto</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 40px' }}>
              Reserva tu estancia en LINOEM Hotel Control. Habitaciones premium, servicio de clase mundial y confirmación inmediata.
            </p>
            
            <div className="grid-cards" style={{ marginTop: '50px' }}>
              {rooms.map(room => (
                <div key={room.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ height: '200px', backgroundImage: `url(${room.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div style={{ padding: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <span className={`badge ${room.status}`}>{room.status}</span>
                    </div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-gold)', margin: '0 0 5px 0' }}>{room.type}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>Habitación {room.number}</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: '800' }}>${room.price.toLocaleString()} MXN <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>/ noche</span></p>
                    
                    <button className="btn full" style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }} onClick={() => setView('login')}>
                      Reservar Ahora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="card" style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center' }}>
            <ShieldCheck size={48} color="var(--brand-gold)" weight="duotone" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px' }}>Acceso Huéspedes</h3>
            <form onSubmit={e => { e.preventDefault(); setView('dashboard'); }}>
              <input type="email" placeholder="Correo electrónico" required style={{ marginBottom: '15px' }} defaultValue="cliente@hotel.com" />
              <input type="password" placeholder="Contraseña" required style={{ marginBottom: '25px' }} defaultValue="Cliente123!" />
              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>Ingresar al Portal</button>
            </form>
            <p style={{ marginTop: '20px', fontSize: '0.85rem' }}>
              ¿No tienes cuenta? <span style={{ color: 'var(--brand-gold)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setView('register')}>Regístrate aquí</span>
            </p>
          </div>
        )}

        {view === 'register' && (
          <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', textAlign: 'center', color: 'var(--brand-gold)' }}>Registro Seguro de Cliente</h3>
            <form onSubmit={e => { e.preventDefault(); alert('PIN Enviado al correo.'); setView('login'); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input type="text" placeholder="Nombre(s)" required />
                <input type="text" placeholder="Apellidos" required />
              </div>
              <input type="email" placeholder="Correo electrónico (recibirás un PIN)" required style={{ marginBottom: '15px' }} />
              <input type="password" placeholder="Crear contraseña" required style={{ marginBottom: '15px' }} />
              
              <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Por seguridad, requerimos una foto de tu identificación oficial (INE/Pasaporte).
                </p>
                <input type="file" accept="image/*,application/pdf" required />
              </div>

              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                <Key size={18} /> Enviar Registro y Solicitar PIN
              </button>
            </form>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '30px' }}>Mi Panel de Huésped</h2>
            <div className="grid-cards">
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <CalendarCheck size={32} color="var(--brand-gold)" />
                  <h3 style={{ margin: 0 }}>Reservaciones Activas</h3>
                </div>
                <div style={{ background: 'var(--bg-void)', border: '1px solid var(--border-strong)', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>Habitación 201 - Deluxe</span>
                    <span className="badge Confirmado" style={{ background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid var(--success)' }}>Confirmada</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Del 15 de Agosto al 20 de Agosto, 2026</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Pagado: $16,000 MXN</p>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '15px' }}>Opciones Rápidas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="btn outline" style={{ justifyContent: 'center' }}>Solicitar Room Service</button>
                  <button className="btn outline" style={{ justifyContent: 'center' }}>Chat con Recepción</button>
                  <button className="btn outline" style={{ justifyContent: 'center' }}>Ver Facturas</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
