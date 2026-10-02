import { Router } from 'express';
import { CustomerService } from '../services/customerService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// List Customers (Admin & Librarian)
router.get('/', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const { search, status, limit, offset } = req.query;
    const result = await CustomerService.listCustomers({ search, status, limit, offset });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Get single customer profile and history (Admin, Librarian, or self Customer)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    // If user is CUSTOMER, ensure they cannot look up other customers' profiles
    if (req.user.role === 'CUSTOMER') {
      if (req.user.customerProfileId !== customerId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Customers may only view their own records.',
        });
      }
    }

    const customer = await CustomerService.getCustomerDetails(customerId);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// Toggle suspension (Admin only)
router.patch('/:id/suspend', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const schema = z.object({ isSuspended: z.boolean() });
    const { isSuspended } = schema.parse(req.body);
    const result = await CustomerService.toggleCustomerSuspension(req.params.id, isSuspended, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
