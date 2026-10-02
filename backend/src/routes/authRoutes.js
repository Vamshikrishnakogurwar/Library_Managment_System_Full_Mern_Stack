import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerCustomerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  idProofNumber: z.string().optional(),
  membershipTypeId: z.number().int().positive(),
});

router.post('/login', async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await AuthService.login({
      ...validated,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const validated = registerCustomerSchema.parse(req.body);
    const result = await AuthService.registerCustomer({
      ...validated,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const profile = await AuthService.getProfile(req.user.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

export default router;
