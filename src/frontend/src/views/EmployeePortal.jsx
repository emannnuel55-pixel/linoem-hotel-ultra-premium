import React, { useState } from 'react';
import { 
  BuildingOffice, 
  Users, 
  Bed, 
  Broom, 
  Wrench, 
  CurrencyDollar, 
  Megaphone, 
  ShieldCheck, 
  ChartLineUp, 
  List, 
  SignOut,
  Bell
} from '@phosphor-icons/react';

const EmployeePortal = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Fake login state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
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

  if (!isLoggedIn) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-void)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 20px', borderRadius: '15px', background: 'linear-gradient(135deg, var(--brand-gold), var(--brand-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
            <BuildingOffice size={32} color="#fff" weight="fill" />
          </div>
          <h2 style={{ marginBottom: '5px' }}>Portal Asociados</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '25px' }}>Inicia sesión con tu rol departamental</p>
          
          <form onSubmit={e => { e.preventDefault(); setIsLoggedIn(true); }}>
            <input type="email" placeholder="Correo corporativo" required defaultValue="admin@hotel.com" style={{ marginBottom: '15px' }} />
            <input type="password" placeholder="Contraseña" required defaultValue="Admin123!" style={{ marginBottom: '25px' }} />
            <button type="submit" className="btn full" style={{ width: '100%', justifyContent: 'center' }}>Ingresar al Sistema</button>
          </form>
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
          <button className="btn outline" style={{ width: '100%', justifyContent: 'center', padding: sidebarCollapsed ? '10px 0' : '10px', fontSize: sidebarCollapsed ? '0' : 'inherit' }} onClick={() => setIsLoggedIn(false)}>
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
            <p style={{ color: 'var(--text-muted)' }}>Bienvenido, Superadmin. Tienes todos los privilegios.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={24} color="var(--text-secondary)" />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 5px var(--danger)' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                SA
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div>
            <div className="grid-cards" style={{ marginBottom: '30px' }}>
              <div className="card kpi-card">
                <span className="kpi-title">Ocupación Total</span>
                <span className="kpi-value">84%</span>
                <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>+5% vs mes anterior</span>
              </div>
              <div className="card kpi-card">
                <span className="kpi-title">Ingresos Hoy</span>
                <span className="kpi-value">$142,500</span>
                <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>MXN Estimado</span>
              </div>
              <div className="card kpi-card">
                <span className="kpi-title">Llegadas (Check-ins)</span>
                <span className="kpi-value">12</span>
                <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>4 pendientes</span>
              </div>
              <div className="card kpi-card">
                <span className="kpi-title">Mantenimiento</span>
                <span className="kpi-value">2</span>
                <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Cuartos bloqueados</span>
              </div>
            </div>
            
            <div className="grid-cards">
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <h3 style={{ marginBottom: '20px' }}>Actividad en Tiempo Real</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px' }}>Hora</th>
                      <th style={{ padding: '10px' }}>Departamento</th>
                      <th style={{ padding: '10px' }}>Evento</th>
                      <th style={{ padding: '10px' }}>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Hace 2 min</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Recepción</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Check-in Habitación 201</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}><span className="badge Confirmado" style={{ background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid var(--success)' }}>Completado</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Hace 15 min</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Limpieza</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Habitación 105 lista</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}><span className="badge Disponible">Disponible</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Hace 45 min</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Cliente Web</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}>Nueva reserva pagada</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-bg)' }}><span className="badge Limpieza" style={{ background: 'var(--brand-gold-glow)', color: 'var(--brand-gold)', border: '1px solid var(--brand-gold)' }}>Pagado</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'habitaciones' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Gestión de Habitaciones (Tiempo Real)</h3>
              <button className="btn">Añadir Habitación</button>
            </div>
            
            <div className="grid-cards">
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ height: '140px', background: 'url(https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500) center/cover' }}></div>
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0 }}>Habitación 101</h4>
                    <span className="badge Disponible">Disponible</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Sencilla - 2 Personas</p>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input type="number" defaultValue="1200" style={{ width: '100px' }} title="Precio" />
                    <button className="btn outline" style={{ flexGrow: 1, justifyContent: 'center' }}>Actualizar</button>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ height: '140px', background: 'url(https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=500) center/cover' }}></div>
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0 }}>Habitación 102</h4>
                    <span className="badge Mantenimiento">Mantenimiento</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Doble - 4 Personas</p>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input type="number" defaultValue="1800" style={{ width: '100px' }} title="Precio" />
                    <button className="btn outline" style={{ flexGrow: 1, justifyContent: 'center' }}>Actualizar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab !== 'dashboard' && activeTab !== 'habitaciones' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <BuildingOffice size={64} color="var(--border-strong)" style={{ marginBottom: '20px' }} />
            <h3>Módulo {menuItems.find(m => m.id === activeTab)?.label} en construcción</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginTop: '10px' }}>
              Este departamento está listo para conectarse al backend Node.js + Prisma para sincronización en tiempo real.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployeePortal;
