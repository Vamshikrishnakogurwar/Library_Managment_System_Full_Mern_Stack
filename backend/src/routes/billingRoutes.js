import { Router } from 'express';
import { BillingService } from '../services/billingService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// List Invoices
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const { status, customerId, limit, offset } = req.query;

    let targetCustomerId = customerId ? parseInt(customerId, 10) : undefined;
    // Customer restriction
    if (req.user.role === 'CUSTOMER') {
      targetCustomerId = req.user.customerProfileId;
    }

    const invoices = await BillingService.listInvoices({
      customerId: targetCustomerId,
      status,
      limit,
      offset,
    });
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

// Get Invoice Details with Payments & Items
router.get('/invoices/:id', authenticate, async (req, res, next) => {
  try {
    const invoice = await BillingService.getInvoiceDetails(req.params.id);

    // Customer can only view their own invoice
    if (req.user.role === 'CUSTOMER' && req.user.customerProfileId !== invoice.customer_id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot view invoices belonging to other customers.',
      });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// Process Payment (Admin & Librarian)
router.post('/payments', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      invoiceId: z.number().int().positive(),
      amount: z.number().positive(),
      paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']).default('CASH'),
      transactionNote: z.string().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const result = await BillingService.recordPayment({
      ...validated,
      actorUserId: req.user.userId,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Waive Fine (Admin Only)
router.post('/fines/:fineId/waive', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const schema = z.object({
      waivedAmount: z.number().positive(),
      reason: z.string().min(5, 'A clear reason for the fine waiver is required'),
    });

    const validated = schema.parse(req.body);
    const result = await BillingService.waiveFine({
      fineId: req.params.fineId,
      ...validated,
      actorUserId: req.user.userId,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
