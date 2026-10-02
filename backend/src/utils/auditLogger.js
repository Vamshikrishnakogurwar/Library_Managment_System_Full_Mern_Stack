import { getDbPool } from '../config/database.js';

export async function logAudit({ userId = null, action, entityType, entityId, details = null, ipAddress = null }) {
  try {
    const pool = getDbPool();
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        String(entityId),
        details ? JSON.stringify(details) : null,
        ipAddress,
      ]
    );
  } catch (err) {
    // Non-blocking log failure
    console.error('Audit log failure:', err.message);
  }
}
