import { Router } from 'express';
import { DashboardService } from '../services/dashboardService.js';
import { SettingsService } from '../services/settingsService.js';
import { AiAssistantService } from '../services/aiAssistantService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Dashboard Metrics (Admin & Librarian)
router.get('/metrics', authenticate, authorize('ADMIN', 'LIBRARIAN'), async (req, res, next) => {
  try {
    const data = await DashboardService.getMetrics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Library Settings (Public/Auth for currency & name, admin for update)
router.get('/settings', async (req, res, next) => {
  try {
    const data = await SettingsService.getSettings();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const data = await SettingsService.updateSettings(req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Membership Plans list
router.get('/memberships', async (req, res, next) => {
  try {
    const data = await SettingsService.listMembershipPlans();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Audit Logs (Admin only)
router.get('/audit-logs', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await SettingsService.getAuditLogs({ limit, offset });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Optional AI Assistant
router.post('/ai/ask', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({ query: z.string().min(1) });
    const { query } = schema.parse(req.body);
    const data = await AiAssistantService.ask({ query, userRole: req.user.role });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
