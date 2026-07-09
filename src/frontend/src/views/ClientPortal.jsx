import React, { useState, useEffect } from 'react';
import { Bed, CalendarCheck, ShieldCheck, Key, SignOut, CircleNotch, BuildingOffice } from '@phosphor-icons/react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const ClientPortal = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('home'); // home, login, register, verify, dashboard
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  // Formularios
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    // Verificar si hay token
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setView('dashboard');
    }

    // Inicializar Socket.io
    const newSocket = io(); // se conecta al mismo origen
    setSocket(newSocket);

    // Obtener habitaciones de la API
    fetchRooms();

    newSocket.on('roomUpdated', (updatedRoom) => {
      setRooms(prevRooms => prevRooms.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
    });

    return () => newSocket.disconnect();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error('Error fetching rooms:', e);
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
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setView('dashboard');
      } else {
        alert(data.error || 'Error al iniciar sesión');
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
        alert(data.error || 'Error al registrar');
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
        alert(data.error || 'Código incorrecto');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('home');
  };

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
          {(!user && view !== 'dashboard') ? (
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="btn outline" onClick={() => setView('login')}>Iniciar Sesión</button>
              <button className="btn" onClick={() => setView('register')}>Registrarse</button>
              <button className="btn outline" onClick={() => navigate('/admin')} title="Acceso para Empleados">
                <BuildingOffice size={18} /> Intranet Empleados
              </button>
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
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 40px' }}>
              Reserva tu estancia en LINOEM Hotel Control. Habitaciones premium, servicio de clase mundial y confirmación inmediata.
            </p>
            
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
                    <div style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '1.4rem', color: 'var(--brand-gold)', margin: '0 0 5px 0' }}>{room.roomType}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>Habitación {room.roomNumber} - Piso {room.floor}</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '800' }}>${room.price} MXN <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>/ noche</span></p>
                      
                      <button className="btn full" style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }} onClick={() => {
                        if(room.status === 'Disponible') {
                          user ? alert('Ir a pasarela de pago para la habitación ' + room.roomNumber) : setView('login');
                        } else {
                          alert('Esta habitación no está disponible actualmente.');
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
            <p style={{ marginTop: '20px', fontSize: '0.85rem' }}>
              ¿No tienes cuenta? <span style={{ color: 'var(--brand-gold)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setView('register')}>Regístrate aquí</span>
            </p>
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
              <button className="btn" onClick={() => setView('home')}>Ver Habitaciones Disponibles</button>
            </div>
            <div className="grid-cards">
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <CalendarCheck size={32} color="var(--brand-gold)" />
                  <h3 style={{ margin: 0 }}>Reservaciones Activas</h3>
                </div>
                <div style={{ background: 'var(--bg-void)', border: '1px solid var(--border-strong)', padding: '15px', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>No tienes reservas activas por el momento.</p>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '15px' }}>Opciones Rápidas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="btn outline" style={{ justifyContent: 'center' }}>Actualizar mis datos</button>
                  <button className="btn outline" style={{ justifyContent: 'center' }}>Chat con Recepción</button>
                  <button className="btn outline" style={{ justifyContent: 'center' }}>Ver Facturas</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientPortal;
