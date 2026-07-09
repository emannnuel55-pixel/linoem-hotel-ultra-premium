import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const router = express.Router();

// Registro de Cliente con OTP simulado
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const otpExpiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        otpSecret: otp,
        otpExpiresAt
      }
    });

    // In a real app, send OTP via email here using Nodemailer/Resend
    console.log(`[EMAIL MOCK] Enviando PIN a ${email}: ${otp}`);

    res.status(201).json({ message: 'Registro exitoso. Revisa tu correo para el PIN de verificación.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Verificación de OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.otpSecret !== otp || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'PIN inválido o expirado.' });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otpSecret: null, otpExpiresAt: null }
    });

    res.json({ message: 'Cuenta verificada exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Login Unificado (Empleados y Clientes)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Cuenta no verificada. Revisa tu correo.' });
    }

    if (user.status !== 'Activo') {
      return res.status(403).json({ error: 'Cuenta inactiva o bloqueada.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, department: user.departmentKey },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    // Registro de Auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'Inicio de sesión exitoso',
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.departmentKey
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;
