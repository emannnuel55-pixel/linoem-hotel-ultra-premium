import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// Obtener todas las habitaciones
router.get('/', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { roomNumber: 'asc' }
    });
    // Parse json fields
    const parsedRooms = rooms.map(r => ({
      ...r,
      amenities: JSON.parse(r.amenities || '[]'),
      images: JSON.parse(r.images || '[]')
    }));
    res.json(parsedRooms);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener habitaciones.' });
  }
});

// Actualizar estado de habitación (Recepcion / Limpieza / Mantenimiento)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { status }
    });
    
    // Emitir evento WebSocket
    req.io.emit('roomUpdated', room);
    
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar habitación.' });
  }
});

export default router;
