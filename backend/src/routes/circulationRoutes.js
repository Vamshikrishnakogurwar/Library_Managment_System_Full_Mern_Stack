import { Router } from 'express';
import { CirculationService } from '../services/circulationService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// List Active Loans
router.get('/loans', authenticate, async (req, res, next) => {
  try {
    const { search, overdueOnly, customerId, limit, offset } = req.query;

    let targetCustomerId = customerId ? parseInt(customerId, 10) : undefined;
    // Restrict customers to only their own loans
    if (req.user.role === 'CUSTOMER') {
      targetCustomerId = req.user.customerProfileId;
    }

    const loans = await CirculationService.listActiveLoans({
      search,
      customerId: targetCustomerId,
      overdueOnly: overdueOnly === 'true',
      limit,
      offset,
    });

    res.json({ success: true, data: loans });
  } catch (err) {
    next(err);
  }
});

// Issue / Rent Book (Admin, Librarian, or self Customer)
router.post('/issue', authenticate, async (req, res, next) => {
  try {
    let targetCustomerId = req.body.customerId;

    // If caller is CUSTOMER, they can only rent for themselves
    if (req.user.role === 'CUSTOMER') {
      if (!req.user.customerProfileId) {
        return res.status(400).json({ success: false, error: 'Customer account profile not linked.' });
      }
      targetCustomerId = req.user.customerProfileId;
    } else {
      // Admin or Librarian must specify customerId
      if (!targetCustomerId) {
        return res.status(400).json({ success: false, error: 'Customer ID is required.' });
      }
    }

    const schema = z.object({
      copyId: z.number().int().positive(),
      customLoanDays: z.number().int().positive().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const result = await CirculationService.issueBook({
      customerId: parseInt(targetCustomerId, 10),
      copyId: validated.copyId,
      customLoanDays: req.user.role === 'CUSTOMER' ? null : validated.customLoanDays,
      actorUserId: req.user.userId,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Preview Return and Fine Assessment (Admin & Librarian)
router.get('/return-preview/:loanId', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const result = await CirculationService.previewReturn({ loanId: req.params.loanId });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Return Book (Admin & Librarian)
router.post('/return', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      loanId: z.number().int().positive(),
      condition: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'LOST']).default('GOOD'),
      returnNotes: z.string().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const result = await CirculationService.returnBook({
      ...validated,
      actorUserId: req.user.userId,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Edit / Update Active Loan (Admin & Librarian) - extend due date, change notes
router.patch('/loans/:loanId', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      dueDate: z.string().optional(),
      notes: z.string().optional().nullable(),
      status: z.enum(['ACTIVE', 'RETURNED', 'OVERDUE', 'LOST']).optional(),
    });

    const validated = schema.parse(req.body);
    const { getDbPool } = await import('../config/database.js');
    const pool = getDbPool();

    const [loans] = await pool.query('SELECT * FROM loans WHERE id = ?', [req.params.loanId]);
    if (loans.length === 0) {
      return res.status(404).json({ success: false, error: 'Loan record not found' });
    }

    await pool.query(
      `UPDATE loans SET 
        due_date = COALESCE(?, due_date),
        return_notes = COALESCE(?, return_notes),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [validated.dueDate || null, validated.notes || null, validated.status || null, req.params.loanId]
    );

    res.json({ success: true, message: 'Loan record updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
