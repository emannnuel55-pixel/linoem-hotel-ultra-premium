import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Eliminar en orden para respetar las claves foráneas
    await db.booking.deleteMany();
    await db.session.deleteMany();
    await db.authToken.deleteMany();
    await db.user.deleteMany();
    await db.room.deleteMany();

    return NextResponse.json({
      ok: true,
      message: "Base de datos vaciada completamente (usuarios, habitaciones, reservas, tokens y sesiones eliminadas)."
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || "Error al vaciar la base de datos"
    }, { status: 500 });
  }
}
