/**
 * Calculates late fee according to configured policy.
 * 
 * Formula:
 * Overdue Days = Max(0, Floor((actualReturnDate - dueDate) in days))
 * Chargeable Days = Overdue Days > gracePeriodDays ? Overdue Days : 0
 * Raw Fine = Chargeable Days * dailyRate
 * Assessed Fine = Min(Raw Fine, maxFine)
 * 
 * Exact Decimal rounding to 2 decimal places.
 */
export function calculateFine({ dueDate, returnDate, dailyRate, gracePeriodDays = 0, maxFine = 0 }) {
  const due = new Date(dueDate);
  const ret = new Date(returnDate);

  // Strip time components to compare calendar days consistently
  const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const retUtc = Date.UTC(ret.getFullYear(), ret.getMonth(), ret.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((retUtc - dueUtc) / msPerDay);

  const overdueDays = Math.max(0, diffDays);

  let chargeableDays = 0;
  if (overdueDays > gracePeriodDays) {
    chargeableDays = overdueDays;
  }

  const rate = parseFloat(dailyRate) || 0;
  const rawFine = chargeableDays * rate;

  let assessedFine = rawFine;
  const cap = parseFloat(maxFine) || 0;
  if (cap > 0 && assessedFine > cap) {
    assessedFine = cap;
  }

  return {
    overdueDays,
    gracePeriodDays,
    chargeableDays,
    dailyRate: rate.toFixed(2),
    rawFine: rawFine.toFixed(2),
    maxFine: cap.toFixed(2),
    assessedFine: assessedFine.toFixed(2),
  };
}

/**
 * Generates human-readable, unique business codes with timestamps and random suffixes.
 */
export function generateCode(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}${month}-${randomPart}`;
}

export function generateInvoiceNumber() {
  return generateCode('INV');
}

export function generateLoanCode() {
  return generateCode('LN');
}

export function generateCustomerCode() {
  return generateCode('CUST');
}

export function generateReservationCode() {
  return generateCode('RES');
}

export function generatePaymentReference() {
  return generateCode('PAY');
}
