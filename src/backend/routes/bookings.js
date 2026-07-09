import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// Crear reserva (Cliente)
router.post('/', async (req, res) => {
  try {
    const { userId, roomId, checkIn, checkOut, totalAmount } = req.body;
    
    // Validar disponibilidad
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.status !== 'Disponible') {
      return res.status(400).json({ error: 'Habitación no disponible en esas fechas.' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        roomId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalAmount
      }
    });

    // Actualizar habitación a Reservada (temporal hasta checkin)
    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'Reservada' }
    });

    req.io.emit('newBooking', booking);
    req.io.emit('roomUpdated', { id: roomId, status: 'Reservada' });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la reserva.' });
  }
});

export default router;
