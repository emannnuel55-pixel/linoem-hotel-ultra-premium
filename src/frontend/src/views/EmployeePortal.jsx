import React, { useState, useEffect } from 'react';
import { 
  BuildingOffice, Users, Bed, Broom, Wrench, CurrencyDollar, 
  Megaphone, ShieldCheck, ChartLineUp, List, SignOut, Bell, CircleNotch
} from '@phosphor-icons/react';
import { io } from 'socket.io-client';

const EmployeePortal = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Login states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Data states
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dirección General', icon: <ChartLineUp size={20} /> },
    { id: 'recepcion', label: 'Recepción', icon: <Users size={20} /> },
    { id: 'reservaciones', label: 'Reservaciones', icon: <BuildingOffice size={20} /> },
    { id: 'habitaciones', label: 'Inventario de Cuartos', icon: <Bed size={20} /> },
    { id: 'limpieza', label: 'Housekeeping', icon: <Broom size={20} /> },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: <Wrench size={20} /> },
    { id: 'finanzas', label: 'Finanzas e Ingresos', icon: <CurrencyDollar size={20} /> },
    { id: 'marketing', label: 'Marketing', icon: <Megaphone size={20} /> },
    { id: 'auditoria', label: 'Seguridad / Auditoría', icon: <ShieldCheck size={20} /> },
  ];

  useEffect(() => {
    const token = localStorage.getItem('employee_token');
    const storedUser = localStorage.getItem('employee_user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      initializeData();
    }
    
    // eslint-disable-next-line
  }, []);

  const initializeData = () => {
    fetchRooms();
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('roomUpdated', (updatedRoom) => {
      setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
    });

    return () => newSocket.disconnect();
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        setRooms(await res.json());
      }
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
        if(data.user.role === 'Cliente') {
          return alert('Este portal es exclusivamente para Empleados.');
        }
        localStorage.setItem('employee_token', data.token);
        localStorage.setItem('employee_user', JSON.stringify(data.user));
        setUser(data.user);
        setIsLoggedIn(true);
        initializeData();
      } else {
        alert(data.error || 'Error de credenciales');
      }
    } catch (error) {
      alert('Error conectando al servidor');
    }
  };

  const logout = () => {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_user');
    setUser(null);
    setIsLoggedIn(false);
    if(socket) socket.disconnect();
  };

  const updateRoomStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/rooms/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Socket emitirá el evento a todos
      } else {
        alert('Error al actualizar habitación');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-void)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 20px', borderRadius: '15px', background: 'linear-gradient(135deg, var(--brand-gold), var(--brand-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
            <BuildingOffice size={32} color="#fff" weight="fill" />
          </div>
          <h2 style={{ marginBottom: '5px' }}>Portal Asociados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '25px' }}>Inicia sesión con tu rol departamental</p>
          
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Correo corporativo" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ marginBottom: '15px' }} />
            <input type="password" placeholder="Contraseña" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ marginBottom: '25px' }} />
            <button type="submit" className="btn full" style={{ width: '100%', justifyContent: 'center' }}>Ingresar al Sistema</button>
          </form>
          <div style={{ marginTop: '20px' }}>
             <a href="/" style={{ color: 'var(--brand-gold)', fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al Portal de Clientes</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ width: sidebarCollapsed ? '80px' : '260px' }}>
        <div className="sidebar-header" style={{ justifyContent: sidebarCollapsed ? 'center' : 'space-between', padding: sidebarCollapsed ? '20px 0' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo">
              <BuildingOffice size={20} weight="fill" />
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar-brand">
                <h2>LINOEM</h2>
                <p>Enterprise</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <List size={24} />
          </button>
        </div>
        
        <ul className="nav-menu">
          {menuItems.map(item => (
            <li key={item.id}>
              <a 
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '12px 0' : '10px 14px' }}
                title={sidebarCollapsed ? item.label : ''}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
        
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <button className="btn outline" style={{ width: '100%', justifyContent: 'center', padding: sidebarCollapsed ? '10px 0' : '10px', fontSize: sidebarCollapsed ? '0' : 'inherit' }} onClick={logout}>
            <SignOut size={20} />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{menuItems.find(m => m.id === activeTab)?.label}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Bienvenido, {user?.firstName} {user?.lastName} | Rol: {user?.role}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={24} color="var(--text-secondary)" />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 5px var(--danger)' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div>
            <div className="grid-cards" style={{ marginBottom: '30px' }}>
              <div className="card kpi-card">
                <span className="kpi-title">Habitaciones Totales</span>
                <span className="kpi-value">{rooms.length}</span>
              </div>
              <div className="card kpi-card">
                <span className="kpi-title">Disponibles</span>
                <span className="kpi-value">{rooms.filter(r => r.status === 'Disponible').length}</span>
              </div>
              <div className="card kpi-card">
                <span className="kpi-title">Ocupadas</span>
                <span className="kpi-value">{rooms.filter(r => r.status === 'Ocupada').length}</span>
              </div>
              <div className="card kpi-card">
                <span className="kpi-title">En Mantenimiento</span>
                <span className="kpi-value" style={{color: 'var(--danger)'}}>{rooms.filter(r => r.status === 'Mantenimiento').length}</span>
              </div>
            </div>
            
            <div className="grid-cards">
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <h3 style={{ marginBottom: '20px' }}>Vista General de Estatus (Socket.IO Real-Time)</h3>
                {loading ? <CircleNotch size={32} className="spin" /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px' }}>Habitación</th>
                        <th style={{ padding: '10px' }}>Tipo</th>
                        <th style={{ padding: '10px' }}>Precio</th>
                        <th style={{ padding: '10px' }}>Estatus Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(room => (
                        <tr key={room.id}>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)', fontWeight: 'bold' }}>{room.roomNumber}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>{room.roomType}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>${room.price}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>
                            <span className={`badge ${room.status}`}>{room.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'habitaciones' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Gestión de Inventario</h3>
            </div>
            
            <div className="grid-cards">
              {loading ? <CircleNotch size={32} className="spin" /> : rooms.map(room => (
                <div key={room.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '140px', background: `url(${room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500'}) center/cover` }}></div>
                  <div style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>Habitación {room.roomNumber}</h4>
                      <span className={`badge ${room.status}`}>{room.status}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{room.roomType} - {room.capacity} Personas</p>
                    
                    <div style={{ marginTop: '15px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cambiar Estatus (Instantáneo)</label>
                      <select 
                        value={room.status} 
                        onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                        style={{ marginTop: '5px' }}
                      >
                        <option value="Disponible">Disponible</option>
                        <option value="Ocupada">Ocupada</option>
                        <option value="Limpieza">En Limpieza</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab !== 'dashboard' && activeTab !== 'habitaciones' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <BuildingOffice size={64} color="var(--border-strong)" style={{ marginBottom: '20px' }} />
            <h3>Módulo {menuItems.find(m => m.id === activeTab)?.label}</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginTop: '10px' }}>
              Este departamento está conectado al backend. Puedes añadir los endpoints específicos para él en Node.js.
            </p>
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

export default EmployeePortal;
