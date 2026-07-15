import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  try {
    const u = await currentUser();
    if (!u || u.role === "GUEST") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const rooms = await db.room.findMany({ orderBy: { number: "asc" } });
    return NextResponse.json(rooms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener habitaciones" }, { status: 500 });
  }
}

export async function POST(r: Request) {
  try {
    const u = await currentUser();
    if (!u || u.role === "GUEST") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { roomId, status } = await r.json();
    const updated = await db.room.update({
      where: { id: roomId },
      data: { status }
    });
    return NextResponse.json({ ok: true, room: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar habitación" }, { status: 500 });
  }
}
