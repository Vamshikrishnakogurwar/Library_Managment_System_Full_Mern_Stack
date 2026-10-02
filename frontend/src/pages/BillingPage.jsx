import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Search,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Printer,
  X
} from 'lucide-react';

export function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected invoice details & payment modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionNote, setTransactionNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState({ error: '', success: '' });

  const isStaff = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const res = await api.getInvoices(params);
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleOpenInvoice = async (inv) => {
    setSelectedInvoice(inv);
    setPaymentFeedback({ error: '', success: '' });
    try {
      const res = await api.getInvoiceDetails(inv.id);
      if (res.success) {
        setInvoiceDetails(res.data);
        setPaymentAmount(res.data.balance_amount);
      }
    } catch (err) {
      setPaymentFeedback({ error: err.message, success: '' });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!invoiceDetails) return;
    setSubmittingPayment(true);
    setPaymentFeedback({ error: '', success: '' });

    try {
      const res = await api.recordPayment({
        invoiceId: invoiceDetails.id,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        transactionNote: transactionNote.trim() || null,
      });

      if (res.success) {
        setPaymentFeedback({
          success: `Payment of ₹${res.data.amount} recorded successfully! Reference: ${res.data.paymentReference}`,
          error: '',
        });
        // Refresh invoice detail
        const updated = await api.getInvoiceDetails(invoiceDetails.id);
        setInvoiceDetails(updated.data);
        setPaymentAmount(updated.data.balance_amount);
        fetchInvoices();
      }
    } catch (err) {
      setPaymentFeedback({ error: err.message || 'Payment processing failed', success: '' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Billing & Late Fine Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time ledger of assessed fines, outstanding balances, and official payment receipts
          </p>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">ISSUED (Unpaid)</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Invoice Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Invoice Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Assessed</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Outstanding Balance</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-sky-700">{inv.invoice_number}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{inv.customer_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{inv.customer_code}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{inv.invoice_date}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800">
                      ₹{parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600">
                      ₹{parseFloat(inv.balance_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenInvoice(inv)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        View & Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-base font-semibold text-slate-700">No invoices found</p>
            <p className="text-sm mt-1">Invoices are automatically created whenever overdue fines or charges are assessed.</p>
          </div>
        )}
      </div>

      {/* Invoice Details & Payment Modal */}
      {selectedInvoice && invoiceDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-sky-600" />
                <h2 className="text-lg font-bold text-slate-900">Official Library Invoice</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={handlePrint} className="p-1.5 text-slate-600 hover:text-slate-900 border rounded-lg">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {paymentFeedback.success && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{paymentFeedback.success}</span>
              </div>
            )}

            {paymentFeedback.error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{paymentFeedback.error}</span>
              </div>
            )}

            {/* Printable Receipt Card */}
            <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs text-slate-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{invoiceDetails.library_name}</h3>
                  <p className="text-slate-500">{invoiceDetails.library_address}</p>
                  <p className="text-slate-500">Contact: {invoiceDetails.library_phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sky-700 text-sm">{invoiceDetails.invoice_number}</p>
                  <p className="text-slate-500">Date: {invoiceDetails.invoice_date}</p>
                  <p className="font-bold text-slate-800 uppercase mt-1">Status: {invoiceDetails.status}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="font-semibold text-slate-800">Bill To:</p>
                <p className="text-slate-900 font-bold">{invoiceDetails.customer_name} ({invoiceDetails.customer_code})</p>
                <p className="text-slate-500">{invoiceDetails.customer_email} | {invoiceDetails.customer_phone}</p>
              </div>

              {/* Line Items */}
              <div className="border-t border-slate-200 pt-3">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 font-semibold text-slate-600">
                      <th className="pb-1">Description</th>
                      <th className="pb-1 text-center">Qty / Days</th>
                      <th className="pb-1 text-right">Rate</th>
                      <th className="pb-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceDetails.items?.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-1.5">{item.description}</td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right font-mono">₹{parseFloat(item.unit_amount).toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono font-semibold">₹{parseFloat(item.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{parseFloat(invoiceDetails.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(invoiceDetails.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Waiver / Discount:</span>
                    <span className="font-mono">-₹{parseFloat(invoiceDetails.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1">
                  <span>Total Assessed:</span>
                  <span className="font-mono">₹{parseFloat(invoiceDetails.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Total Paid to Date:</span>
                  <span className="font-mono">₹{parseFloat(invoiceDetails.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-rose-700">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono">₹{parseFloat(invoiceDetails.balance_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Section (Librarian / Admin) */}
            {isStaff && parseFloat(invoiceDetails.balance_amount) > 0 && (
              <form onSubmit={handleRecordPayment} className="mt-5 p-4 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-sky-900 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-sky-700" />
                  <span>Receive Payment & Issue Receipt</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payment Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      max={invoiceDetails.balance_amount}
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Reference / Notes</label>
                    <input
                      type="text"
                      placeholder="Transaction note / ref..."
                      value={transactionNote}
                      onChange={(e) => setTransactionNote(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                  >
                    {submittingPayment ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
