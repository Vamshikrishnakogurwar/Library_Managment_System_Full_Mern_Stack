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

// Issue Book (Admin & Librarian)
router.post('/issue', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      customerId: z.number().int().positive(),
      copyId: z.number().int().positive(),
      customLoanDays: z.number().int().positive().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const result = await CirculationService.issueBook({
      ...validated,
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

export default router;
