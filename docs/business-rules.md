# LibraFlow Business Rules & Fine Calculation Specification

This document details the exact mathematical formulas, constraints, and business logic governing circulation, overdue fines, and financial operations.

## 1. Issue Book Business Rules

1. **Active Customer Eligibility**:
   - Customer account must have `status = 'ACTIVE'` and `is_suspended = FALSE`.
   - Customer membership must be valid (`membership_expiry_date >= CURDATE()`).
2. **Borrowing Limits**:
   - The number of currently borrowed active copies (`COUNT(loans WHERE customer_id = ? AND status = 'ACTIVE')`) must be strictly less than the customer's `max_borrow_limit`.
3. **No Overdue Holding**:
   - If a customer has one or more existing overdue active loans (`status = 'ACTIVE' AND due_date < CURDATE()`), new book issues are strictly blocked until overdue copies are returned.
4. **Physical Copy Availability**:
   - Physical copy must have status `AVAILABLE`.
   - Copy is locked using `SELECT ... FOR UPDATE` to prevent concurrent collisions.
5. **Policy Snapshotting**:
   - At the time of issue, the active plan's daily fine rate, grace period, and max fine cap are written into the loan row as an immutable policy snapshot.

## 2. Return & Fine Calculation Specification

### Late Fine Formula:
$$\text{Overdue Days} = \max(0, \lfloor (\text{Actual Return Date} - \text{Due Date}) \text{ in days} \rfloor)$$

$$\text{Chargeable Days} = \begin{cases} \text{Overdue Days}, & \text{if } \text{Overdue Days} > \text{Grace Period Days} \\ 0, & \text{otherwise} \end{cases}$$

$$\text{Raw Fine} = \text{Chargeable Days} \times \text{Daily Fine Rate}$$

$$\text{Assessed Fine} = \begin{cases} \min(\text{Raw Fine}, \text{Max Fine Cap}), & \text{if } \text{Max Fine Cap} > 0 \\ \text{Raw Fine}, & \text{otherwise} \end{cases}$$

### Illustrative Example:
- Due Date: October 10
- Actual Return Date: October 15
- Overdue Days: 5 days
- Configured Grace Period: 2 days
- Daily Rate: ₹5.00
- Because Overdue Days ($5$) > Grace Period ($2$), all 5 overdue days are chargeable.
- Assessed Fine = $5 \times 5.00 = ₹25.00$ (subject to max cap).

If the book were returned on October 12 (2 days overdue), overdue days ($2$) $\le$ grace period ($2$), so Chargeable Days = $0$ and Assessed Fine = $₹0.00$.

## 3. Financial & Billing Rules

1. **Decimal Precision**: All currency calculations and database columns use `DECIMAL(10, 2)` to eliminate floating-point arithmetic errors.
2. **Partial Payments**:
   - Customers can make partial payments towards an invoice.
   - The new outstanding balance is updated atomically:
     $$\text{Balance} = \text{Previous Balance} - \text{Payment Amount}$$
   - When balance reaches $0$, status automatically transitions to `PAID`.
3. **Waivers and Adjustments**:
   - Only authorized `ADMIN` accounts can waive or discount a fine.
   - Every waiver records the previous amount, waived amount, new amount, authorizing user ID, and mandatory explanation in the `fine_adjustments` audit log.
