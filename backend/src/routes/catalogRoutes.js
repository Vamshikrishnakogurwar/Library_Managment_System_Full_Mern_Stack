import { Router } from 'express';
import { CatalogService } from '../services/catalogService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';
import { getDbPool } from '../config/database.js';

const router = Router();

// Public / Authenticated search catalog
router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, isArchived, limit, offset } = req.query;
    const result = await CatalogService.listBooks({
      search,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      isArchived: isArchived === 'true',
      limit,
      offset,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Categories list
router.get('/categories', async (req, res, next) => {
  try {
    const pool = getDbPool();
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: categories });
  } catch (err) {
    console.warn('Database query for categories failed, returning defaults:', err.message);
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Computer Science & IT' },
        { id: 2, name: 'Artificial Intelligence' },
        { id: 3, name: 'Mathematics & Discrete Logic' },
        { id: 4, name: 'Electronics & IoT' }
      ]
    });
  }
});

// Single book with copies
router.get('/:id', async (req, res, next) => {
  try {
    const book = await CatalogService.getBookById(req.params.id);
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// Create Book (Admin / Librarian)
router.post('/', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1, 'Title is required'),
      author: z.string().min(1, 'Author is required'),
      isbn: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
      book_code: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
      publisher: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
      edition: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
      language: z.string().default('English'),
      category_id: z.number().int().optional().nullable(),
      publication_year: z.number().int().optional().nullable(),
      replacement_cost: z.number().positive().default(500.00),
      description: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
      cover_image_url: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
      initial_copies: z.number().int().nonnegative().default(1),
      rack_location: z.string().default('General Stacks'),
    });

    const validated = schema.parse(req.body);
    const book = await CatalogService.createBook(validated, req.user.userId);
    res.status(201).json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// Add Physical Copy (Admin / Librarian)
router.post('/:id/copies', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      barcode: z.string().optional().nullable(),
      acquisition_date: z.string().optional(),
      acquisition_cost: z.number().nonnegative().optional(),
      condition: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).default('GOOD'),
      rack_location: z.string().default('General Stacks'),
      notes: z.string().optional().nullable(),
    });

    const validated = schema.parse(req.body);
    const copy = await CatalogService.addCopy(req.params.id, validated, req.user.userId);
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    next(err);
  }
});

// Update Copy Status
router.patch('/copies/:copyId/status', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['AVAILABLE', 'ISSUED', 'RESERVED', 'DAMAGED', 'LOST', 'WITHDRAWN']).optional(),
      condition: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
      notes: z.string().optional().nullable(),
    });
    const validated = schema.parse(req.body);
    const result = await CatalogService.updateCopyStatus(req.params.copyId, validated, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
