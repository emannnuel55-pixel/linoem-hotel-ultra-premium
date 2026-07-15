import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "@node-rs/argon2";

export async function GET() {
  try {
    // Eliminar en orden para respetar las claves foráneas
    await db.booking.deleteMany();
    await db.session.deleteMany();
    await db.authToken.deleteMany();
    await db.user.deleteMany();
    await db.room.deleteMany();

    // 1. Sembrar Habitaciones por Defecto
    await db.room.createMany({
      data: [
        { number: "101", name: "Estándar Sencilla", type: "SINGLE", description: "Una cómoda habitación individual con vista al jardín y WiFi de alta velocidad.", price: 1200, capacity: 1, status: "AVAILABLE" },
        { number: "102", name: "Sencilla Superior", type: "SINGLE", description: "Habitación individual con cama Queen, escritorio de trabajo y balcón.", price: 1500, capacity: 1, status: "AVAILABLE" },
        { number: "201", name: "Doble Clásica", type: "DOUBLE", description: "Dos camas matrimoniales, ideal para familias o viajes grupales.", price: 2200, capacity: 4, status: "AVAILABLE" },
        { number: "202", name: "Doble Deluxe", type: "DOUBLE", description: "Dos camas Queen con terraza privada, frigobar y cafetera premium.", price: 2600, capacity: 4, status: "AVAILABLE" },
        { number: "301", name: "Suite Presidencial LINOEM", type: "SUITE", description: "La máxima experiencia de lujo y confort con jacuzzi, sala de estar y vista panorámica.", price: 5000, capacity: 2, status: "AVAILABLE" }
      ]
    });

    // 2. Sembrar un Usuario Empleado (Manager) por Defecto para pruebas
    const defaultManagerPasswordHash = await hash("Linoem2026!", {
      memoryCost: 19456,
      timeCost: 3,
      parallelism: 1
    });

    await db.user.create({
      data: {
        name: "Emanuel Rivera (Manager)",
        email: "empleado@hotel.com",
        passwordHash: defaultManagerPasswordHash,
        role: "MANAGER",
        emailVerifiedAt: new Date()
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Base de datos vaciada y sembrada con éxito. Habitaciones creadas y cuenta de empleado activa (empleado@hotel.com / Linoem2026!)."
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || "Error al vaciar y sembrar la base de datos"
    }, { status: 500 });
  }
}
