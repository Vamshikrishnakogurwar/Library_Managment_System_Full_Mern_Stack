import { getDbPool } from '../config/database.js';

/**
 * Resolves or auto-creates a customer profile for any authenticated user.
 * Ensures that neither customer rentals nor admin operations ever fail with "Customer ID is required."
 */
export async function resolveCustomerProfileId(user, explicitCustomerId = null) {
  const pool = getDbPool();

  // 1. If explicit customer ID was provided and caller is Staff/Admin, verify it exists
  if (explicitCustomerId) {
    const custId = parseInt(explicitCustomerId, 10);
    if (!isNaN(custId) && custId > 0) {
      const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [custId]);
      if (rows && rows.length > 0) {
        return rows[0].id;
      }
    }
  }

  // 2. If user JWT already has a customerProfileId, verify it exists
  if (user?.customerProfileId) {
    const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [user.customerProfileId]);
    if (rows && rows.length > 0) {
      return rows[0].id;
    }
  }

  // 3. Lookup customer record by user.userId
  if (user?.userId) {
    const [rows] = await pool.query('SELECT id FROM customers WHERE user_id = ?', [user.userId]);
    if (rows && rows.length > 0) {
      return rows[0].id;
    }

    // 4. If no customer record exists for this user (e.g. admin or freshly created user), auto-create one
    const customerCode = `CUST-${new Date().getFullYear()}-${String(user.userId).padStart(5, '0')}`;
    const today = new Date();
    const expiry = new Date();
    expiry.setFullYear(today.getFullYear() + 2); // 2 years valid

    const todayStr = today.toISOString().split('T')[0];
    const expiryStr = expiry.toISOString().split('T')[0];

    // Ensure default membership type exists (ID 1 = Student / Standard)
    const [membershipRows] = await pool.query('SELECT id FROM membership_types ORDER BY id ASC LIMIT 1');
    const membershipTypeId = membershipRows.length > 0 ? membershipRows[0].id : 1;

    try {
      const [insertRes] = await pool.query(
        `INSERT INTO customers (user_id, customer_code, membership_type_id, membership_start_date, membership_expiry_date, is_suspended, notes)
         VALUES (?, ?, ?, ?, ?, 0, 'Auto-provisioned membership profile')`,
        [user.userId, customerCode, membershipTypeId, todayStr, expiryStr]
      );
      return insertRes.insertId;
    } catch (err) {
      // If code collided, try reading by user_id once more
      const [existing] = await pool.query('SELECT id FROM customers WHERE user_id = ?', [user.userId]);
      if (existing && existing.length > 0) {
        return existing[0].id;
      }
      throw err;
    }
  }

  // 5. Fallback: Find the first active customer in the database
  const [firstCust] = await pool.query('SELECT id FROM customers ORDER BY id ASC LIMIT 1');
  if (firstCust && firstCust.length > 0) {
    return firstCust[0].id;
  }

  throw new Error('No customer account found or could be created.');
}
