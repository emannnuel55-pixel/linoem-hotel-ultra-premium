import React, { useState, useEffect } from 'react';
import { 
  BuildingOffice, Users, Bed, Broom, Wrench, CurrencyDollar, 
  Megaphone, ShieldCheck, ChartLineUp, List, SignOut, Bell, CircleNotch,
  CheckCircle, WarningCircle, EnvelopeSimple, MagnifyingGlass
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
  const [chatMessages, setChatMessages] = useState([]);

  const isDemoMode = import.meta.env.VITE_APP_MODE !== 'FULL';

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
  }, []);

  const initializeData = () => {
    fetchRooms();
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('roomUpdated', (updatedRoom) => {
      setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
    });

    newSocket.on('chatMessage', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => newSocket.disconnect();
  };

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
        if(data.user.role === 'Cliente') {
          return alert('Cuenta no autorizada. Este portal es exclusivamente para Empleados.');
        }
        localStorage.setItem('employee_token', data.token);
        localStorage.setItem('employee_user', JSON.stringify(data.user));
        setUser(data.user);
        setIsLoggedIn(true);
        initializeData();
      } else {
        alert(data.error);
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
      if (!res.ok) alert('Error al actualizar habitación');
    } catch (error) {
      console.error(error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-void)', flexDirection: 'column' }}>
        {isDemoMode && (
          <div style={{ position: 'absolute', top: 0, width: '100%', background: 'var(--brand-gold)', color: '#000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            ⚠️ LINOEM Enterprise - Licencia DEMO (7 Días Restantes)
          </div>
        )}
        <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 20px', borderRadius: '15px', background: 'linear-gradient(135deg, var(--brand-gold), var(--brand-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
            <BuildingOffice size={32} color="#fff" weight="fill" />
          </div>
          <h2 style={{ marginBottom: '5px' }}>Portal Asociados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '25px' }}>Acceso exclusivo personal corporativo</p>
          
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Correo corporativo" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ marginBottom: '15px' }} />
            <input type="password" placeholder="Contraseña" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ marginBottom: '25px' }} />
            <button type="submit" className="btn full" style={{ width: '100%', justifyContent: 'center' }}>Ingresar al Sistema</button>
          </form>
          <div style={{ marginTop: '20px' }}>
             <a href="/" style={{ color: 'var(--brand-gold)', fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al Portal Público</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper" style={{ flexDirection: 'column' }}>
      {isDemoMode && (
        <div style={{ background: 'var(--brand-gold)', color: '#000', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', zIndex: 1000 }}>
          ⚠️ Licencia Empresarial DEMO: 7 Días Restantes. Funciones avanzadas limitadas.
        </div>
      )}
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
          
          <ul className="nav-menu" style={{ flexGrow: 1, overflowY: 'auto' }}>
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
        <main className="main-content" style={{ overflowY: 'auto' }}>
          <header className="topbar">
            <div>
              <h1>{menuItems.find(m => m.id === activeTab)?.label}</h1>
              <p style={{ color: 'var(--text-muted)' }}>Bienvenido, {user?.firstName} {user?.lastName} | Departamento: {user?.role}</p>
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

          {/* DASHBOARD (DIRECCION GENERAL) */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade">
              <div className="grid-cards" style={{ marginBottom: '30px' }}>
                <div className="card kpi-card">
                  <span className="kpi-title">Habitaciones Totales</span>
                  <span className="kpi-value">{rooms.length}</span>
                </div>
                <div className="card kpi-card">
                  <span className="kpi-title">Ocupación Actual</span>
                  <span className="kpi-value">{Math.round((rooms.filter(r => r.status === 'Ocupada').length / (rooms.length || 1)) * 100)}%</span>
                </div>
                <div className="card kpi-card">
                  <span className="kpi-title">Ingresos Mensuales</span>
                  <span className="kpi-value" style={{color: 'var(--success, #4ade80)'}}>$452,300</span>
                </div>
                <div className="card kpi-card">
                  <span className="kpi-title">Alertas Activas</span>
                  <span className="kpi-value" style={{color: 'var(--danger)'}}>{rooms.filter(r => r.status === 'Mantenimiento').length}</span>
                </div>
              </div>
              
              <div className="grid-cards">
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <h3 style={{ marginBottom: '20px' }}>Panorama General del Inventario (Real-Time)</h3>
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
                        {rooms.slice(0,5).map(room => (
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
                  <p style={{ textAlign: 'center', marginTop: '15px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Mostrando top 5. Ve a "Inventario de Cuartos" para ver más.</p>
                </div>
              </div>
            </div>
          )}

          {/* RECEPCION */}
          {activeTab === 'recepcion' && (
            <div className="grid-cards animate-fade">
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={24} color="var(--brand-gold)" /> Check-in Rápido</h3>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                  <input type="text" placeholder="Buscar por Nombre o Confirmación..." style={{ flex: 1, margin: 0 }} />
                  <button className="btn"><MagnifyingGlass size={18} /> Buscar Huésped</button>
                  <button className="btn outline">Walk-in (Nuevo)</button>
                </div>
              </div>
              <div className="card" style={{ gridColumn: 'span 2', height: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><EnvelopeSimple size={24} color="var(--brand-gold)" /> Mensajes de Clientes (Chat en Vivo)</h3>
                <div style={{ flex: 1, background: 'var(--bg-void)', borderRadius: '8px', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                  {chatMessages.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '50px' }}>No hay mensajes nuevos.</p>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} style={{ alignSelf: 'flex-start', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: '10px 15px', borderRadius: '15px', maxWidth: '80%' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-gold)', marginBottom: '4px', fontWeight: 'bold' }}>{msg.sender} (Huésped) • {msg.time}</div>
                        {msg.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RESERVACIONES */}
          {activeTab === 'reservaciones' && (
            <div className="card animate-fade">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Reservas de la Semana</h3>
                <button className="btn">Crear Reserva Manual</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>ID Conf.</th>
                    <th style={{ padding: '10px' }}>Huésped</th>
                    <th style={{ padding: '10px' }}>Check-in</th>
                    <th style={{ padding: '10px' }}>Check-out</th>
                    <th style={{ padding: '10px' }}>Habitación</th>
                    <th style={{ padding: '10px' }}>Estado Pago</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>#RES-0091</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Carlos Mendoza</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>12 Jul 2026</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>15 Jul 2026</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>101</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)', color: 'var(--success)' }}><CheckCircle size={16} style={{verticalAlign: 'middle', marginRight: '5px'}}/>Pagado</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>#RES-0092</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Ana Smith</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>14 Jul 2026</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>18 Jul 2026</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>205</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)', color: 'var(--brand-gold)' }}><WarningCircle size={16} style={{verticalAlign: 'middle', marginRight: '5px'}}/>Pendiente</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* INVENTARIO DE CUARTOS */}
          {activeTab === 'habitaciones' && (
            <div className="card animate-fade">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Gestión de Inventario (Real-Time Control)</h3>
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
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Forzar Cambio de Estatus</label>
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

          {/* LIMPIEZA */}
          {activeTab === 'limpieza' && (
            <div className="card animate-fade">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Broom size={24} color="var(--brand-gold)" /> Tareas de Limpieza Pendientes</h3>
              {rooms.filter(r => r.status === 'Limpieza').length === 0 ? (
                <p style={{ color: 'var(--success)' }}>¡Excelente! No hay habitaciones pendientes de limpieza.</p>
              ) : (
                <div className="grid-cards">
                  {rooms.filter(r => r.status === 'Limpieza').map(room => (
                    <div key={room.id} style={{ background: 'var(--bg-void)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                      <h4 style={{ color: 'var(--brand-gold)', marginBottom: '5px' }}>Habitación {room.roomNumber}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Check-out realizado hoy.</p>
                      <button className="btn outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => updateRoomStatus(room.id, 'Disponible')}>
                        <CheckCircle size={18} /> Marcar como Limpia (Disponible)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANTENIMIENTO */}
          {activeTab === 'mantenimiento' && (
            <div className="card animate-fade">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Wrench size={24} color="var(--brand-gold)" /> Tareas de Mantenimiento / Fallas</h3>
              {rooms.filter(r => r.status === 'Mantenimiento').length === 0 ? (
                <p style={{ color: 'var(--success)' }}>No hay reportes de fallas activos.</p>
              ) : (
                <div className="grid-cards">
                  {rooms.filter(r => r.status === 'Mantenimiento').map(room => (
                    <div key={room.id} style={{ background: 'var(--bg-void)', padding: '15px', borderRadius: '8px', border: '1px solid var(--danger)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '5px' }}>Habitación {room.roomNumber} - FUERA DE SERVICIO</h4>
                      <textarea placeholder="Agregar notas del técnico..." style={{ marginTop: '10px', height: '60px' }}></textarea>
                      <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} onClick={() => updateRoomStatus(room.id, 'Disponible')}>
                        <CheckCircle size={18} /> Reparación Terminada (Habilitar)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FINANZAS Y MARKETING */}
          {activeTab === 'finanzas' && (
            <div className="animate-fade">
              <div className="grid-cards" style={{ marginBottom: '30px' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '20px' }}>Ingresos por Tipo de Habitación (Q3)</h3>
                  <div style={{ display: 'flex', height: '200px', alignItems: 'flex-end', gap: '20px', justifyContent: 'center', padding: '20px', background: 'var(--bg-void)', borderRadius: '8px' }}>
                    <div style={{ width: '40px', height: '60%', background: 'var(--brand-gold)', borderRadius: '4px 4px 0 0', position: 'relative' }}><span style={{ position: 'absolute', top: '-25px', left: '-10px', fontSize: '0.7rem' }}>Sencilla</span></div>
                    <div style={{ width: '40px', height: '90%', background: 'var(--brand-gold-dark)', borderRadius: '4px 4px 0 0', position: 'relative' }}><span style={{ position: 'absolute', top: '-25px', left: '-5px', fontSize: '0.7rem' }}>Doble</span></div>
                    <div style={{ width: '40px', height: '40%', background: 'var(--border-strong)', borderRadius: '4px 4px 0 0', position: 'relative' }}><span style={{ position: 'absolute', top: '-25px', left: '-5px', fontSize: '0.7rem' }}>Suite</span></div>
                  </div>
                </div>
                <div className="card">
                  <h3 style={{ marginBottom: '20px' }}>Desglose Financiero</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-bg)' }}><span>Hospedaje Bruto</span> <b>$320,000</b></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-bg)' }}><span>Servicios Extra</span> <b>$45,000</b></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-bg)' }}><span>Impuestos (IVA/ISH)</span> <b style={{color:'var(--danger)'}}>-$35,000</b></li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.2rem', fontWeight: 'bold' }}><span style={{color: 'var(--brand-gold)'}}>Ingreso Neto</span> <b>$330,000</b></li>
                  </ul>
                  <button className="btn full" style={{ width: '100%', marginTop: '15px' }}>Descargar Reporte Contable PDF</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="card animate-fade">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Megaphone size={24} color="var(--brand-gold)" /> Creador de Campañas Email Marketing</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Nombre de la Campaña</label>
                  <input type="text" placeholder="Ej. Oferta Verano 2026" />
                  <label style={{ marginTop: '15px' }}>Público Objetivo</label>
                  <select>
                    <option>Todos los clientes (Newsletter)</option>
                    <option>Huéspedes Frecuentes (VIP)</option>
                    <option>Clientes inactivos (Hace > 6 meses)</option>
                  </select>
                  <label style={{ marginTop: '15px' }}>Mensaje Promocional HTML</label>
                  <textarea placeholder="<h1>Oferta especial...</h1>" style={{ height: '150px' }}></textarea>
                  <button className="btn" style={{ marginTop: '20px' }}>Programar Envío Masivo</button>
                </div>
                <div style={{ background: 'var(--bg-void)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '15px' }}>Campañas Activas</h4>
                  <div style={{ padding: '10px', borderLeft: '3px solid var(--success)', background: 'var(--bg-elevated)', marginBottom: '10px' }}>
                    <b>Preventa Navidad 2026</b>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Enviado a 1,200 contactos. Tasa apertura: 45%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AUDITORIA */}
          {activeTab === 'auditoria' && (
            <div className="card animate-fade">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldCheck size={24} color="var(--brand-gold)" /> Logs del Sistema (Matrix Auditoría)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Los registros son inalterables y cumplen con normas de seguridad de TI.</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-void)', color: 'var(--brand-gold)' }}>
                    <th style={{ padding: '10px' }}>FECHA/HORA</th>
                    <th style={{ padding: '10px' }}>USUARIO (ROL)</th>
                    <th style={{ padding: '10px' }}>ACCIÓN (MÓDULO)</th>
                    <th style={{ padding: '10px' }}>IP ORIGEN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>{new Date().toLocaleString()}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>{user?.email}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>AUTH: LOGIN_SUCCESS</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>192.168.1.100</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Hoy 10:15 AM</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>admin@hotel.com (Superadmin)</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>ROOM: UPDATE_STATUS (105 -> Limpieza)</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>10.0.0.52</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Ayer 08:30 PM</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>cliente@hotel.com (Cliente)</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>AUTH: OTP_VERIFIED</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>201.140.X.X</td>
                  </tr>
                </tbody>
              </table>
              <button className="btn outline" style={{ marginTop: '20px' }}>Exportar Logs (CSV)</button>
            </div>
          )}

        </main>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-fade { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default EmployeePortal;
