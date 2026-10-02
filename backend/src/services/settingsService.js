import { getDbPool } from '../config/database.js';
import { logAudit } from '../utils/auditLogger.js';

export class SettingsService {
  static async getSettings() {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query('SELECT * FROM library_settings WHERE id = 1 LIMIT 1');
      if (rows.length === 0) {
        return {
          library_name: 'LibraFlow Library',
          timezone: 'Asia/Kolkata',
          currency_code: 'INR',
          currency_symbol: '₹',
          default_loan_days: 14,
          default_grace_period_days: 2,
          default_daily_fine_rate: '5.00',
          default_max_fine_per_loan: '200.00',
        };
      }
      return rows[0];
    } catch (err) {
      console.warn('Database query for settings failed, using standard defaults:', err.message);
      return {
        library_name: 'LibraFlow Central Library',
        timezone: 'Asia/Kolkata',
        currency_code: 'INR',
        currency_symbol: '₹',
        default_loan_days: 14,
        default_grace_period_days: 2,
        default_daily_fine_rate: '5.00',
        default_max_fine_per_loan: '200.00',
      };
    }
  }

  static async updateSettings(data, actorUserId) {
    const pool = getDbPool();
    await pool.query(
      `INSERT INTO library_settings (id, library_name, library_email, library_phone, library_address, timezone, currency_code, currency_symbol, default_loan_days, default_grace_period_days, default_daily_fine_rate, default_max_fine_per_loan, receipt_footer_note)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         library_name = VALUES(library_name),
         library_email = VALUES(library_email),
         library_phone = VALUES(library_phone),
         library_address = VALUES(library_address),
         timezone = VALUES(timezone),
         currency_code = VALUES(currency_code),
         currency_symbol = VALUES(currency_symbol),
         default_loan_days = VALUES(default_loan_days),
         default_grace_period_days = VALUES(default_grace_period_days),
         default_daily_fine_rate = VALUES(default_daily_fine_rate),
         default_max_fine_per_loan = VALUES(default_max_fine_per_loan),
         receipt_footer_note = VALUES(receipt_footer_note)`,
      [
        data.library_name || 'LibraFlow Library',
        data.library_email || null,
        data.library_phone || null,
        data.library_address || null,
        data.timezone || 'Asia/Kolkata',
        data.currency_code || 'INR',
        data.currency_symbol || '₹',
        data.default_loan_days || 14,
        data.default_grace_period_days || 2,
        data.default_daily_fine_rate || 5.00,
        data.default_max_fine_per_loan || 200.00,
        data.receipt_footer_note || null,
      ]
    );

    await logAudit({
      userId: actorUserId,
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: 1,
      details: data,
    });

    return this.getSettings();
  }

  static async listMembershipPlans() {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query('SELECT * FROM membership_types ORDER BY id ASC');
      return rows;
    } catch (err) {
      console.warn('Database query for membership types failed, returning defaults:', err.message);
      return [
        { id: 1, code: 'STUDENT', name: 'B.Tech / Student Plan', max_borrow_limit: 4, loan_duration_days: 14, grace_period_days: 2, daily_fine_rate: '5.00' },
        { id: 2, code: 'FACULTY', name: 'Faculty & Researchers', max_borrow_limit: 8, loan_duration_days: 30, grace_period_days: 5, daily_fine_rate: '2.00' },
        { id: 3, code: 'GENERAL', name: 'General Public', max_borrow_limit: 2, loan_duration_days: 7, grace_period_days: 1, daily_fine_rate: '10.00' },
      ];
    }
  }

  static async getAuditLogs({ limit = 100, offset = 0 }) {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.username, u.full_name, u.role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
  }
}
