import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  try {
    const u = await currentUser();
    if (!u || u.role === "GUEST") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const bookings = await db.booking.findMany({
      include: { user: true, room: true },
      orderBy: { checkIn: "desc" }
    });
    return NextResponse.json(bookings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener reservas" }, { status: 500 });
  }
}

export async function POST(r: Request) {
  try {
    const u = await currentUser();
    if (!u || u.role === "GUEST") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { bookingId, status } = await r.json();
    
    // Si cambia a CHECKED_IN o CHECKED_OUT, también podemos actualizar automáticamente el estado de la habitación
    const booking = await db.booking.findUnique({
      where: { id: bookingId }
    });

    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status }
    });

    if (booking) {
      if (status === "CHECKED_IN") {
        await db.room.update({
          where: { id: booking.roomId },
          data: { status: "OCCUPIED" }
        });
      } else if (status === "CHECKED_OUT") {
        await db.room.update({
          where: { id: booking.roomId },
          data: { status: "CLEANING" }
        });
      }
    }

    return NextResponse.json({ ok: true, booking: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar reserva" }, { status: 500 });
  }
}
