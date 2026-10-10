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

// Create Custom Invoice / Fee with Discount (Admin & Librarian)
router.post('/invoices', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      customerId: z.number().int().positive(),
      description: z.string().min(1),
      amount: z.number().positive(),
      discountAmount: z.number().min(0).default(0),
      chargeType: z.enum(['FINE', 'DAMAGE', 'MEMBERSHIP', 'PURCHASE', 'MISC']).default('MISC'),
      dueDate: z.string().optional(),
      notes: z.string().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const { getDbPool } = await import('../config/database.js');
    const pool = getDbPool();

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date().toISOString().split('T')[0];
    const subtotal = validated.amount;
    const discount = validated.discountAmount || 0;
    const totalAmount = Math.max(0, subtotal - discount);

    const [invRes] = await pool.query(
      `INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, discount_amount, total_amount, paid_amount, balance_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'ISSUED', ?)`,
      [
        invoiceNumber,
        validated.customerId,
        today,
        validated.dueDate || today,
        subtotal,
        discount,
        totalAmount,
        totalAmount,
        validated.notes || null,
      ]
    );

    await pool.query(
      `INSERT INTO invoice_items (invoice_id, description, charge_type, quantity, unit_amount, total_amount)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [invRes.insertId, validated.description, validated.chargeType, subtotal, totalAmount]
    );

    const newInvoice = await BillingService.getInvoiceDetails(invRes.insertId);
    res.status(201).json({ success: true, data: newInvoice });
  } catch (err) {
    next(err);
  }
});

export default router;
