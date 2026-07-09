import React, { useState, useEffect } from 'react';
import { Bed, CalendarCheck, ShieldCheck, Key, SignOut, CircleNotch, BuildingOffice, User, ChatText, Receipt } from '@phosphor-icons/react';
import { io } from 'socket.io-client';

const ClientPortal = () => {
  const [view, setView] = useState('home'); // home, login, register, verify, dashboard
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  
  // Modals for dashboard
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'chat', 'invoices'
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Formularios
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');

  const isDemoMode = import.meta.env.VITE_APP_MODE !== 'FULL';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setView('dashboard');
    }

    const newSocket = io();
    setSocket(newSocket);

    fetchRooms();

    newSocket.on('roomUpdated', (updatedRoom) => {
      setRooms(prevRooms => prevRooms.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
    });

    newSocket.on('chatMessage', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => newSocket.disconnect();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) setRooms(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        if(data.user.role !== 'Cliente') {
          return alert('Cuenta no autorizada. Entraste con cuenta de empleado. Usa el Portal de Empleados.');
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setView('dashboard');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        setView('verify');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regData.email, otp: otpCode })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        setView('login');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if(!currentMessage.trim() || !socket) return;
    
    const msg = { sender: user.firstName, text: currentMessage, time: new Date().toLocaleTimeString() };
    socket.emit('chatMessage', msg); // Sends to server to broadcast to Recepcion
    setChatMessages(prev => [...prev, { ...msg, me: true }]);
    setCurrentMessage('');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('home');
  };

  return (
    <div className="app-wrapper" style={{ flexDirection: 'column' }}>
      {/* Global Demo Banner */}
      {isDemoMode && (
        <div style={{ background: 'var(--brand-gold)', color: '#000', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ⚠️ Licencia DEMO: 7 Días Restantes. Contactar a soporte para activar versión FULL.
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="sidebar-logo">
            <Bed size={24} weight="fill" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>LINOEM</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--brand-gold)', letterSpacing: '0.1em', fontWeight: 'bold' }}>PORTAL DE CLIENTES</p>
          </div>
        </div>
        
        <div>
          {(!user && view !== 'dashboard') ? (
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="btn outline" onClick={() => setView('login')}>Iniciar Sesión</button>
              <button className="btn" onClick={() => setView('register')}>Registrarse</button>
              {/* Note: This is an absolute link pointing to the separated MPA admin route */}
              <a href="/admin" className="btn outline" title="Acceso Exclusivo para Personal">
                <BuildingOffice size={18} /> Intranet Empleados
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontWeight: '600', color: 'var(--brand-gold)' }}>Hola, {user?.firstName}</span>
              <button className="btn outline" onClick={logout}><SignOut size={18} /> Salir</button>
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
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                <CircleNotch size={48} color="var(--brand-gold)" className="spin" />
              </div>
            ) : (
              <div className="grid-cards" style={{ marginTop: '50px' }}>
                {rooms.map(room => (
                  <div key={room.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ height: '200px', backgroundImage: `url(${room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500'})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div style={{ padding: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <span className={`badge ${room.status}`}>{room.status}</span>
                      </div>
                    </div>
                    <div style={{ padding: '20px', textAlign: 'left' }}>
                      <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-gold)', margin: '0 0 5px 0' }}>{room.roomType}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>Habitación {room.roomNumber}</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '800' }}>${room.price} MXN <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>/ noche</span></p>
                      
                      <button className="btn full" style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }} onClick={() => {
                        if(room.status === 'Disponible') {
                          user ? alert('Redirigiendo a pasarela de pago para la habitación ' + room.roomNumber) : setView('login');
                        } else {
                          alert('Esta habitación se encuentra Ocupada o en Mantenimiento.');
                        }
                      }}>
                        {room.status === 'Disponible' ? 'Reservar Ahora' : 'No Disponible'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'login' && (
          <div className="card" style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center' }}>
            <ShieldCheck size={48} color="var(--brand-gold)" weight="duotone" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px' }}>Acceso Huéspedes</h3>
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Correo electrónico" required style={{ marginBottom: '15px' }} value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" placeholder="Contraseña" required style={{ marginBottom: '25px' }} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>Ingresar al Portal</button>
            </form>
          </div>
        )}

        {view === 'register' && (
          <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', textAlign: 'center', color: 'var(--brand-gold)' }}>Registro Seguro de Cliente</h3>
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input type="text" placeholder="Nombre(s)" required value={regData.firstName} onChange={e => setRegData({...regData, firstName: e.target.value})} />
                <input type="text" placeholder="Apellidos" required value={regData.lastName} onChange={e => setRegData({...regData, lastName: e.target.value})} />
              </div>
              <input type="email" placeholder="Correo electrónico (recibirás un PIN)" required style={{ marginBottom: '15px' }} value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
              <input type="password" placeholder="Crear contraseña" required style={{ marginBottom: '15px' }} value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} />
              
              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                <Key size={18} /> Registrar y Recibir PIN al Correo
              </button>
            </form>
            <p style={{ marginTop: '20px', fontSize: '0.85rem', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setView('verify')}>¿Ya tienes un código? Ingresar PIN</span>
            </p>
          </div>
        )}

        {view === 'verify' && (
          <div className="card" style={{ maxWidth: '400px', margin: '60px auto', textAlign: 'center' }}>
            <Key size={48} color="var(--brand-gold)" weight="duotone" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Verifica tu Correo</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px' }}>Ingresa el código de 6 dígitos que enviamos a <b>{regData.email}</b></p>
            <form onSubmit={handleVerify}>
              <input type="text" placeholder="Código de 6 dígitos" required style={{ marginBottom: '25px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px' }} maxLength="6" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>Verificar Cuenta</button>
            </form>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>Mi Panel de Huésped</h2>
              <button className="btn" onClick={() => setView('home')}>Explorar Habitaciones</button>
            </div>

            {/* Dashboard main layout */}
            <div style={{ display: 'flex', gap: '30px' }}>
              {/* Left Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {activeModal === 'profile' ? (
                  <div className="card animate-fade">
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><User size={24} color="var(--brand-gold)" /> Actualizar mis Datos</h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <input type="text" defaultValue={user.firstName} placeholder="Nombre" />
                      <input type="text" defaultValue={user.lastName} placeholder="Apellidos" />
                      <input type="email" defaultValue={user.email} disabled style={{ opacity: 0.7 }} />
                      <div style={{ padding: '15px', border: '1px dashed var(--border-strong)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Actualizar Identificación Oficial (PDF/JPG)</p>
                        <input type="file" />
                      </div>
                      <button className="btn" style={{ justifyContent: 'center' }} onClick={() => { alert('Datos guardados exitosamente.'); setActiveModal(null); }}>Guardar Cambios</button>
                    </div>
                  </div>
                ) : activeModal === 'invoices' ? (
                  <div className="card animate-fade">
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Receipt size={24} color="var(--brand-gold)" /> Mis Facturas</h3>
                    <div style={{ background: 'var(--bg-void)', padding: '20px', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Receipt size={48} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                      <p>No tienes facturas emitidas recientemente.</p>
                      <button className="btn outline" style={{ marginTop: '15px' }} onClick={() => setActiveModal(null)}>Volver</button>
                    </div>
                  </div>
                ) : activeModal === 'chat' ? (
                  <div className="card animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><ChatText size={24} color="var(--brand-gold)" /> Chat en Vivo con Recepción</h3>
                    <div style={{ flex: 1, background: 'var(--bg-void)', borderRadius: '8px', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '10px' }}>Inicio de conversación securizada</div>
                      {chatMessages.map((msg, i) => (
                        <div key={i} style={{ alignSelf: msg.me ? 'flex-end' : 'flex-start', background: msg.me ? 'var(--brand-gold-dark)' : 'var(--bg-elevated)', color: '#fff', padding: '10px 15px', borderRadius: '15px', maxWidth: '80%' }}>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '4px' }}>{msg.sender} • {msg.time}</div>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '10px' }}>
                      <input type="text" value={currentMessage} onChange={e => setCurrentMessage(e.target.value)} placeholder="Escribe un mensaje a recepción..." style={{ margin: 0, flex: 1 }} />
                      <button type="submit" className="btn">Enviar</button>
                    </form>
                  </div>
                ) : (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <CalendarCheck size={32} color="var(--brand-gold)" />
                      <h3 style={{ margin: 0 }}>Reservaciones Activas</h3>
                    </div>
                    <div style={{ background: 'var(--bg-void)', border: '1px solid var(--border-strong)', padding: '20px', borderRadius: '8px' }}>
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>No tienes reservas activas por el momento.</p>
                      <div style={{ textAlign: 'center' }}>
                        <button className="btn outline" onClick={() => setView('home')}>Explorar Habitaciones</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Quick Options) */}
              <div className="card" style={{ width: '300px', height: 'fit-content' }}>
                <h3 style={{ marginBottom: '15px' }}>Opciones Rápidas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className={`btn outline ${activeModal === 'profile' ? 'active-outline' : ''}`} onClick={() => setActiveModal('profile')} style={{ justifyContent: 'center' }}><User size={18} /> Actualizar mis datos</button>
                  <button className={`btn outline ${activeModal === 'chat' ? 'active-outline' : ''}`} onClick={() => setActiveModal('chat')} style={{ justifyContent: 'center' }}><ChatText size={18} /> Chat con Recepción</button>
                  <button className={`btn outline ${activeModal === 'invoices' ? 'active-outline' : ''}`} onClick={() => setActiveModal('invoices')} style={{ justifyContent: 'center' }}><Receipt size={18} /> Ver Facturas</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-fade { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .active-outline { background: var(--glass-bg); border-color: var(--brand-gold); }
      `}</style>
    </div>
  );
};

export default ClientPortal;
