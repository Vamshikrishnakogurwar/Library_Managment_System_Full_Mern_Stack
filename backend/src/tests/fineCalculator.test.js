import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFine, generateInvoiceNumber, generateLoanCode } from '../utils/fineCalculator.js';

test('Fine Calculation - On-time return returns zero fine', () => {
  const result = calculateFine({
    dueDate: '2026-10-15',
    returnDate: '2026-10-14',
    dailyRate: 5.00,
    gracePeriodDays: 2,
    maxFine: 200.00,
  });

  assert.equal(result.overdueDays, 0);
  assert.equal(result.chargeableDays, 0);
  assert.equal(result.assessedFine, '0.00');
});

test('Fine Calculation - Return within grace period returns zero fine', () => {
  const result = calculateFine({
    dueDate: '2026-10-15',
    returnDate: '2026-10-17', // 2 days overdue <= 2 grace days
    dailyRate: 5.00,
    gracePeriodDays: 2,
    maxFine: 200.00,
  });

  assert.equal(result.overdueDays, 2);
  assert.equal(result.chargeableDays, 0);
  assert.equal(result.assessedFine, '0.00');
});

test('Fine Calculation - Return exceeding grace period charges for all overdue days', () => {
  const result = calculateFine({
    dueDate: '2026-10-10',
    returnDate: '2026-10-15', // 5 days overdue > 2 grace days
    dailyRate: 5.00,
    gracePeriodDays: 2,
    maxFine: 200.00,
  });

  assert.equal(result.overdueDays, 5);
  assert.equal(result.chargeableDays, 5);
  assert.equal(result.rawFine, '25.00');
  assert.equal(result.assessedFine, '25.00');
});

test('Fine Calculation - Capped by maximum fine policy', () => {
  const result = calculateFine({
    dueDate: '2026-08-01',
    returnDate: '2026-10-01', // 61 days overdue * 10 = 610, max fine = 150
    dailyRate: 10.00,
    gracePeriodDays: 1,
    maxFine: 150.00,
  });

  assert.equal(result.overdueDays, 61);
  assert.equal(result.chargeableDays, 61);
  assert.equal(result.rawFine, '610.00');
  assert.equal(result.assessedFine, '150.00');
});

test('Business Code Generator - Generates correct prefixes', () => {
  const inv = generateInvoiceNumber();
  const ln = generateLoanCode();

  assert.match(inv, /^INV-\d{6}-[A-Z0-9]+$/);
  assert.match(ln, /^LN-\d{6}-[A-Z0-9]+$/);
});
