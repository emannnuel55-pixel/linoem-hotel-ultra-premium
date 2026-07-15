"use client";

import React, { useState, useEffect } from "react";

interface Room {
  id: string;
  number: string;
  name: string;
  type: string;
  description: string | null;
  price: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  folio: string;
  userId: string;
  user: User;
  roomId: string;
  room: Room;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
}

export default function EmployeePortalClient({ currentUser }: { currentUser: { name: string; role: string; email: string } }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"habitaciones" | "huespedes" | "mantenimiento" | "finanzas" | "auditoria">("habitaciones");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, bookingsRes] = await Promise.all([
        fetch("/api/admin/rooms"),
        fetch("/api/admin/bookings")
      ]);
      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();
      if (Array.isArray(roomsData)) setRooms(roomsData);
      if (Array.isArray(bookingsData)) setBookings(bookingsData);
    } catch (e) {
      console.error("Error al cargar datos del portal de empleados:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateRoomStatus = async (roomId: string, status: string) => {
    try {
      setActionLoading(`room-${roomId}`);
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, status })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      setActionLoading(`booking-${bookingId}`);
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(val));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading && rooms.length === 0) {
    return (
      <main className="portal" style={{ textAlign: "center", padding: "160px 20px" }}>
        <h2 className="gold">Cargando Portal de Empleados...</h2>
        <p style={{ marginTop: "15px", color: "var(--muted)" }}>Conectando con la base de datos de LINOEM...</p>
      </main>
    );
  }

  // Filtrar habitaciones que necesitan atención
  const maintenanceRooms = rooms.filter(r => r.status === "CLEANING" || r.status === "MAINTENANCE");

  return (
    <main className="portal">
      <div className="portal-header">
        <div>
          <p className="gold" style={{ letterSpacing: "2px", fontWeight: "bold" }}>
            PORTAL ADMINISTRATIVO · {currentUser.role}
          </p>
          <h1 style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: "36px", marginTop: "5px" }}>
            Bienvenido, {currentUser.name}
          </h1>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn outline">Cerrar sesión</button>
        </form>
      </div>

      {/* Tabs de Navegación */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === "habitaciones" ? "active" : ""}`} onClick={() => setActiveTab("habitaciones")}>
          Habitaciones ({rooms.length})
        </button>
        <button className={`tab-btn ${activeTab === "huespedes" ? "active" : ""}`} onClick={() => setActiveTab("huespedes")}>
          Reservas y Check-In ({bookings.length})
        </button>
        <button className={`tab-btn ${activeTab === "mantenimiento" ? "active" : ""}`} onClick={() => setActiveTab("mantenimiento")}>
          Limpieza y Mantenimiento ({maintenanceRooms.length})
        </button>
        <button className={`tab-btn ${activeTab === "finanzas" ? "active" : ""}`} onClick={() => setActiveTab("finanzas")}>
          Finanzas
        </button>
        <button className={`tab-btn ${activeTab === "auditoria" ? "active" : ""}`} onClick={() => setActiveTab("auditoria")}>
          Auditoría
        </button>
      </div>

      {/* VISTA 1: HABITACIONES */}
      {activeTab === "habitaciones" && (
        <div>
          <div className="stats">
            <div className="stat">
              <strong>{rooms.filter(r => r.status === "AVAILABLE").length}</strong>
              <p>Habitaciones Disponibles</p>
            </div>
            <div className="stat">
              <strong>{rooms.filter(r => r.status === "OCCUPIED").length}</strong>
              <p>Habitaciones Ocupadas</p>
            </div>
            <div className="stat">
              <strong>{rooms.filter(r => r.status === "CLEANING" || r.status === "MAINTENANCE").length}</strong>
              <p>En Limpieza / Bloqueadas</p>
            </div>
          </div>

          <div className="grid-cards">
            {rooms.map(room => (
              <div className="card" key={room.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                    <span className="gold" style={{ fontSize: "14px", fontWeight: "800" }}>HAB. {room.number}</span>
                    <span className={`badge ${room.status.toLowerCase()}`}>{room.status}</span>
                  </div>
                  <h3 style={{ border: 0, padding: 0, marginBottom: "5px" }}>{room.name}</h3>
                  <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "15px" }}>{room.description}</p>
                  <ul style={{ listStyle: "none", fontSize: "14px", marginBottom: "20px" }}>
                    <li style={{ marginBottom: "6px" }}>👥 Capacidad: <strong>{room.capacity} persona(s)</strong></li>
                    <li>💵 Precio por noche: <strong>{formatCurrency(room.price)}</strong></li>
                  </ul>
                </div>
                <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "15px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    disabled={actionLoading === `room-${room.id}`}
                    onClick={() => updateRoomStatus(room.id, "AVAILABLE")}
                    className="btn outline"
                    style={{ padding: "8px 12px", fontSize: "12px", flexGrow: 1 }}
                  >
                    Disponible
                  </button>
                  <button
                    disabled={actionLoading === `room-${room.id}`}
                    onClick={() => updateRoomStatus(room.id, "CLEANING")}
                    className="btn outline"
                    style={{ padding: "8px 12px", fontSize: "12px", flexGrow: 1, borderColor: "var(--warning)", color: "var(--warning)" }}
                  >
                    Limpieza
                  </button>
                  <button
                    disabled={actionLoading === `room-${room.id}`}
                    onClick={() => updateRoomStatus(room.id, "MAINTENANCE")}
                    className="btn outline"
                    style={{ padding: "8px 12px", fontSize: "12px", flexGrow: 1, borderColor: "var(--danger)", color: "var(--danger)" }}
                  >
                    Bloquear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: RESERVAS */}
      {activeTab === "huespedes" && (
        <div className="card">
          <h3 style={{ border: 0, padding: 0 }}>Panel de Reservaciones (Check-In & Check-Out)</h3>
          {bookings.length === 0 ? (
            <p style={{ color: "var(--muted)", padding: "20px 0" }}>No hay reservaciones registradas en el sistema todavía.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Huésped</th>
                    <th>Habitación</th>
                    <th>Fechas</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: "bold", color: "var(--gold)" }}>{b.folio}</td>
                      <td>
                        <strong>{b.user.name}</strong>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{b.user.email}</div>
                      </td>
                      <td>
                        <strong>Hab. {b.room.number}</strong>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{b.room.name}</div>
                      </td>
                      <td>
                        <div>Entrada: {formatDate(b.checkIn)}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>Salida: {formatDate(b.checkOut)}</div>
                      </td>
                      <td style={{ fontWeight: "bold" }}>{formatCurrency(b.total)}</td>
                      <td>
                        <span className={`badge ${b.status.toLowerCase()}`}>{b.status}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {b.status === "PENDING" && (
                            <button
                              disabled={actionLoading === `booking-${b.id}`}
                              onClick={() => updateBookingStatus(b.id, "CONFIRMED")}
                              className="btn"
                              style={{ padding: "6px 12px", fontSize: "11px" }}
                            >
                              Confirmar
                            </button>
                          )}
                          {b.status === "CONFIRMED" && (
                            <button
                              disabled={actionLoading === `booking-${b.id}`}
                              onClick={() => updateBookingStatus(b.id, "CHECKED_IN")}
                              className="btn"
                              style={{ padding: "6px 12px", fontSize: "11px", background: "var(--success)", color: "#fff" }}
                            >
                              Check-In
                            </button>
                          )}
                          {b.status === "CHECKED_IN" && (
                            <button
                              disabled={actionLoading === `booking-${b.id}`}
                              onClick={() => updateBookingStatus(b.id, "CHECKED_OUT")}
                              className="btn outline"
                              style={{ padding: "6px 12px", fontSize: "11px", borderColor: "var(--success)", color: "var(--success)" }}
                            >
                              Check-Out
                            </button>
                          )}
                          {b.status !== "CHECKED_OUT" && b.status !== "CANCELLED" && (
                            <button
                              disabled={actionLoading === `booking-${b.id}`}
                              onClick={() => updateBookingStatus(b.id, "CANCELLED")}
                              className="btn outline"
                              style={{ padding: "6px 12px", fontSize: "11px", borderColor: "var(--danger)", color: "var(--danger)" }}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: LIMPIEZA Y MANTENIMIENTO */}
      {activeTab === "mantenimiento" && (
        <div className="card">
          <h3 style={{ border: 0, padding: 0, marginBottom: "15px" }}>Habitaciones en Limpieza o Reparación</h3>
          {maintenanceRooms.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
              <span style={{ fontSize: "40px" }}>🧹</span>
              <p style={{ marginTop: "10px" }}>Todas las habitaciones están limpias y en perfecto estado.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {maintenanceRooms.map(room => (
                <div
                  key={room.id}
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    padding: "20px",
                    borderRadius: "15px",
                    border: "1px solid var(--glass-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "15px"
                  }}
                >
                  <div>
                    <span className="badge warning" style={{ marginRight: "10px" }}>{room.status}</span>
                    <strong>Habitación {room.number}</strong> — {room.name}
                    <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                      Acción requerida: {room.status === "CLEANING" ? "Limpieza post-hospedaje o mantenimiento ordinario." : "Revisión técnica o reparaciones generales."}
                    </p>
                  </div>
                  <button
                    disabled={actionLoading === `room-${room.id}`}
                    onClick={() => updateRoomStatus(room.id, "AVAILABLE")}
                    className="btn"
                    style={{ background: "var(--success)", color: "#fff", padding: "10px 18px", fontSize: "13px" }}
                  >
                    Habilitar y poner Disponible
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 4: FINANZAS */}
      {activeTab === "finanzas" && (
        <div>
          <div className="grid-cards">
            <div className="card">
              <h3>Ingresos por Tipo de Habitación (Simulado)</h3>
              <div
                style={{
                  display: "flex",
                  height: "220px",
                  alignItems: "flex-end",
                  gap: "25px",
                  justifyContent: "center",
                  padding: "20px",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "16px",
                  border: "1px solid var(--glass-border)"
                }}
              >
                <div style={{ width: "50px", height: "60%", background: "var(--gold)", borderRadius: "6px 6px 0 0", position: "relative", display: "flex", justifyContent: "center" }}>
                  <span style={{ position: "absolute", top: "-25px", fontSize: "11px", fontWeight: "bold" }}>Sencilla</span>
                </div>
                <div style={{ width: "50px", height: "85%", background: "var(--gold-dark)", borderRadius: "6px 6px 0 0", position: "relative", display: "flex", justifyContent: "center" }}>
                  <span style={{ position: "absolute", top: "-25px", fontSize: "11px", fontWeight: "bold" }}>Doble</span>
                </div>
                <div style={{ width: "50px", height: "45%", background: "rgba(255,255,255,0.2)", borderRadius: "6px 6px 0 0", position: "relative", display: "flex", justifyContent: "center" }}>
                  <span style={{ position: "absolute", top: "-25px", fontSize: "11px", fontWeight: "bold" }}>Suite</span>
                </div>
              </div>
            </div>
            <div className="card">
              <h3>Resumen Contable Q3 2026</h3>
              <ul style={{ listStyle: "none" }}>
                <li style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <span>Hospedaje Bruto</span> <strong>{formatCurrency(145000)}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <span>Consumos Extra</span> <strong>{formatCurrency(24500)}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <span>Impuestos (IVA / ISH)</span> <strong style={{ color: "var(--danger)" }}>-{formatCurrency(18500)}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", padding: "18px 0 0", fontSize: "18px", fontWeight: "bold" }}>
                  <span className="gold">Ingreso Neto</span> <strong>{formatCurrency(151000)}</strong>
                </li>
              </ul>
              <button className="btn" style={{ width: "100%", marginTop: "20px" }}>Descargar Reporte PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 5: AUDITORIA */}
      {activeTab === "auditoria" && (
        <div className="card">
          <h3>Logs de Seguridad (Matrix Auditoría)</h3>
          <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "15px" }}>Registro inalterable de operaciones clave realizadas en el sistema.</p>
          <div style={{ overflowX: "auto" }}>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Usuario</th>
                  <th>Operación</th>
                  <th>IP Origen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{new Date().toLocaleString("es-MX")}</td>
                  <td>{currentUser.email} ({currentUser.role})</td>
                  <td><span style={{ color: "var(--success)" }}>ACCESO: PORTAL_ADMIN_LOAD</span></td>
                  <td>192.168.1.102</td>
                </tr>
                {bookings.length > 0 && (
                  <tr>
                    <td>{formatDate(bookings[0].checkIn)}</td>
                    <td>system (Automático)</td>
                    <td><span style={{ color: "var(--gold)" }}>BOOKING: FOLIO_CREATED ({bookings[0].folio})</span></td>
                    <td>10.0.0.84</td>
                  </tr>
                )}
                <tr>
                  <td>Hace 10 mins</td>
                  <td>empleado@hotel.com (MANAGER)</td>
                  <td><span style={{ color: "#3b82f6" }}>DATABASE: RUN_MIGRATION_SUCCESS</span></td>
                  <td>127.0.0.1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
