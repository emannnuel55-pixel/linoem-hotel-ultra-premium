import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import EmployeePortalClient from "./EmployeePortalClient";

export default async function Portal() {
  const u = await currentUser();
  if (!u) redirect("/login");

  // Si el usuario es un empleado/admin, renderizar el Portal de Empleados
  if (u.role !== "GUEST") {
    return <EmployeePortalClient currentUser={{ name: u.name, role: u.role, email: u.email }} />;
  }

  // De lo contrario, renderizar el Portal del Huésped (Cliente) clásico
  const bookings = await db.booking.findMany({
    where: { userId: u.id },
    include: { room: true },
    orderBy: { checkIn: "desc" }
  });

  return (
    <>
      <nav className="nav">
        <div className="brand">LINOEM HOTEL</div>
        <form action="/api/auth/logout" method="post">
          <button className="btn outline">Cerrar sesión</button>
        </form>
      </nav>
      
      <main className="portal">
        <p className="gold" style={{ letterSpacing: "2px", fontWeight: "bold" }}>PORTAL DEL HUÉSPED</p>
        <h1 style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: "36px", marginTop: "5px" }}>
          Hola, {u.name}
        </h1>
        
        <div className="stats">
          <div className="stat">
            <strong>{bookings.length}</strong>
            <p>Reservaciones</p>
          </div>
          <div className="stat">
            <strong>{bookings.filter(b => b.status === "CONFIRMED").length}</strong>
            <p>Confirmadas</p>
          </div>
          <div className="stat">
            <strong>24/7</strong>
            <p>Atención al huésped</p>
          </div>
        </div>

        <h2 className="booking-section-title">Mis reservaciones</h2>
        
        {bookings.length ? (
          bookings.map(b => (
            <div className="booking" key={b.id}>
              <b>{b.room.name} · Habitación {b.room.number}</b>
              <p>
                {b.checkIn.toLocaleDateString("es-MX")} — {b.checkOut.toLocaleDateString("es-MX")} · 
                <span className={`badge ${b.status.toLowerCase()}`} style={{ marginLeft: "10px" }}>{b.status}</span>
              </p>
            </div>
          ))
        ) : (
          <div className="booking">
            Aún no tienes reservaciones. El catálogo y el flujo de reservación están listos para la siguiente fase.
          </div>
        )}
      </main>
    </>
  );
}
