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

// Update Customer details (Admin & Librarian)
router.put('/:id', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      fullName: z.string().optional(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      idProofNumber: z.string().optional().nullable(),
      membershipTypeId: z.number().int().optional(),
      notes: z.string().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const { getDbPool } = await import('../config/database.js');
    const pool = getDbPool();

    const [custRows] = await pool.query('SELECT user_id FROM customers WHERE id = ?', [req.params.id]);
    if (custRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const userId = custRows[0].user_id;

    if (validated.fullName || validated.phone !== undefined) {
      await pool.query(
        'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?',
        [validated.fullName || null, validated.phone !== undefined ? validated.phone : null, userId]
      );
    }

    await pool.query(
      `UPDATE customers SET
        address = COALESCE(?, address),
        id_proof_number = COALESCE(?, id_proof_number),
        membership_type_id = COALESCE(?, membership_type_id),
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [
        validated.address !== undefined ? validated.address : null,
        validated.idProofNumber !== undefined ? validated.idProofNumber : null,
        validated.membershipTypeId || null,
        validated.notes !== undefined ? validated.notes : null,
        req.params.id,
      ]
    );

    const updated = await CustomerService.getCustomerDetails(parseInt(req.params.id, 10));
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
