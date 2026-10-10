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
  X,
  Plus,
  Percent,
  Tag,
  DollarSign,
  FileText,
  Sparkles,
  ArrowDownLeft,
  Calendar
} from 'lucide-react';

export function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
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

  // Custom Invoice Modal (Admin & Librarian)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    customerId: '',
    description: '',
    amount: '',
    discountAmount: 0,
    chargeType: 'MISC',
    dueDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  const isAdminOrLibrarian = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');
  const isAdmin = user && user.role === 'ADMIN';
  const isCustomer = user && user.role === 'CUSTOMER';

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

  const fetchCustomersList = async () => {
    if (isAdminOrLibrarian) {
      try {
        const res = await api.getCustomers();
        if (res.success) setCustomers(res.data.customers);
      } catch (err) {
        console.error('Failed to fetch customer list for billing:', err.message);
      }
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomersList();
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

  const handleCreateCustomInvoice = async (e) => {
    e.preventDefault();
    setSubmittingInvoice(true);
    setPaymentFeedback({ error: '', success: '' });

    try {
      const payload = {
        customerId: parseInt(newInvoiceForm.customerId, 10),
        description: newInvoiceForm.description,
        amount: parseFloat(newInvoiceForm.amount),
        discountAmount: parseFloat(newInvoiceForm.discountAmount || 0),
        chargeType: newInvoiceForm.chargeType,
        dueDate: newInvoiceForm.dueDate,
        notes: newInvoiceForm.notes,
      };

      const res = await api.createInvoice(payload);
      if (res.success) {
        setPaymentFeedback({
          success: `Invoice ${res.data.invoice_number} created with subtotal ₹${res.data.subtotal} and discount ₹${res.data.discount_amount}!`,
          error: '',
        });
        setShowCreateInvoiceModal(false);
        setNewInvoiceForm({
          customerId: '',
          description: '',
          amount: '',
          discountAmount: 0,
          chargeType: 'MISC',
          dueDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchInvoices();
      }
    } catch (err) {
      setPaymentFeedback({ error: err.message || 'Invoice generation failed', success: '' });
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2">
            <Receipt className="w-3.5 h-3.5" />
            {isAdmin ? 'ADMINISTRATIVE BILLING & RECEIVABLES' : 'MEMBER FINANCIAL LEDGER'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">
            {isAdmin ? 'Billing, Invoices & Fee Adjustments' : 'My Invoices, Purchases & Receipts'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Manage customer invoices, issue manual fee assessments with custom discounts, collect payments, and print audit receipts.'
              : 'Review your complete financial statements, book purchase records, and circulation receipts.'}
          </p>
        </div>

        {isAdminOrLibrarian && (
          <button
            onClick={() => {
              setPaymentFeedback({ error: '', success: '' });
              setShowCreateInvoiceModal(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Custom Bill / Fee</span>
          </button>
        )}
      </div>

      {/* Global Feedback */}
      {paymentFeedback.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{paymentFeedback.success}</span>
          </div>
          <button onClick={() => setPaymentFeedback({ ...paymentFeedback, success: '' })} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {paymentFeedback.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{paymentFeedback.error}</span>
          </div>
          <button onClick={() => setPaymentFeedback({ ...paymentFeedback, error: '' })} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {[
          { label: 'All Invoices', val: '' },
          { label: 'Unpaid / Issued', val: 'ISSUED' },
          { label: 'Partially Paid', val: 'PARTIALLY_PAID' },
          { label: 'Paid in Full', val: 'PAID' },
        ].map((t) => (
          <button
            key={t.val}
            onClick={() => setStatusFilter(t.val)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === t.val
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
            <p className="text-xs text-slate-400">Loading ledger...</p>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-600">Invoice Number</th>
                  <th className="px-5 py-4 text-left font-bold text-slate-600">Customer</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-600">Issue Date</th>
                  <th className="px-4 py-4 text-right font-bold text-slate-600">Subtotal</th>
                  <th className="px-4 py-4 text-right font-bold text-slate-600">Discount</th>
                  <th className="px-4 py-4 text-right font-bold text-slate-600">Total Amount</th>
                  <th className="px-4 py-4 text-right font-bold text-slate-600">Balance</th>
                  <th className="px-4 py-4 text-center font-bold text-slate-600">Status</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono font-bold text-sky-700 text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900 text-xs">{inv.customer_name || 'Member'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{inv.customer_code}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">{inv.invoice_date}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-slate-500">
                      ₹{parseFloat(inv.subtotal).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-emerald-600 font-bold">
                      {parseFloat(inv.discount_amount || 0) > 0 ? `-₹${parseFloat(inv.discount_amount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-xs text-slate-900">
                      ₹{parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-xs">
                      {parseFloat(inv.balance_amount) > 0 ? (
                        <span className="text-rose-600">₹{parseFloat(inv.balance_amount).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenInvoice(inv)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                      >
                        {isAdminOrLibrarian ? 'Process / View' : 'Receipt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-base font-bold text-slate-700">No invoices found</p>
            <p className="text-xs text-slate-400 mt-1">Invoices generate automatically upon overdue circulation or book purchase.</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: INVOICE DETAILS & PAYMENT PROCESSING
         ========================================================================= */}
      {selectedInvoice && invoiceDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-sky-600 block">TAX INVOICE & RECEIPT</span>
                <h2 className="text-xl font-black text-slate-900 font-display mt-0.5">{invoiceDetails.invoice_number}</h2>
                <p className="text-xs text-slate-500">Dated: {invoiceDetails.invoice_date} • Member: {invoiceDetails.customer_name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={handlePrint} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600" title="Print Invoice">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Line items */}
            <div className="mt-5 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs">
                <p className="font-bold text-slate-700 mb-2">Itemized Charges:</p>
                <div className="space-y-2">
                  {invoiceDetails.items?.map((it) => (
                    <div key={it.id} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                      <div>
                        <p className="font-bold text-slate-900">{it.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">{it.charge_type}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">₹{parseFloat(it.total_amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{parseFloat(invoiceDetails.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(invoiceDetails.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount Applied:</span>
                      <span className="font-mono">-₹{parseFloat(invoiceDetails.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-1">
                    <span>Total Amount:</span>
                    <span className="font-mono">₹{parseFloat(invoiceDetails.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">₹{parseFloat(invoiceDetails.balance_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Receipt History */}
              <div>
                <p className="font-bold text-slate-900 text-xs mb-2">Payment Transaction History:</p>
                {invoiceDetails.payments?.length > 0 ? (
                  <div className="space-y-1.5 text-xs font-mono">
                    {invoiceDetails.payments.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{p.payment_reference}</p>
                          <p className="text-[10px] text-slate-400 font-sans">{p.payment_date} via {p.payment_method}</p>
                        </div>
                        <span className="font-bold text-emerald-600 font-mono">₹{parseFloat(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
                )}
              </div>

              {/* Collect Payment Form (Admin & Librarian) */}
              {isAdminOrLibrarian && parseFloat(invoiceDetails.balance_amount) > 0 && (
                <form onSubmit={handleRecordPayment} className="mt-4 p-4 rounded-2xl bg-sky-50 border border-sky-100 text-xs space-y-3">
                  <p className="font-bold text-sky-900 text-sm">Collect Payment for this Bill</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        max={parseFloat(invoiceDetails.balance_amount)}
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Transaction Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Counter cash settlement receipt"
                      value={transactionNote}
                      onChange={(e) => setTransactionNote(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="w-full py-2.5 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 disabled:opacity-50"
                  >
                    {submittingPayment ? 'Processing...' : 'Record Payment & Issue Receipt'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: GENERATE CUSTOM BILL / FEE (Admin Only)
         ========================================================================= */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Generate Custom Bill / Assessment</h2>
                <p className="text-xs text-slate-500">Apply fees, custom book sales, or discounts</p>
              </div>
              <button onClick={() => setShowCreateInvoiceModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomInvoice} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
                <select
                  required
                  value={newInvoiceForm.customerId}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, customerId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">Select Customer Member</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.customer_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Book Binding Charge or Annual Fee"
                  value={newInvoiceForm.description}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (Subtotal ₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500"
                    value={newInvoiceForm.amount}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50"
                    value={newInvoiceForm.discountAmount}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, discountAmount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Charge Type</label>
                  <select
                    value={newInvoiceForm.chargeType}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, chargeType: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="MISC">Miscellaneous</option>
                    <option value="FINE">Overdue Late Fine</option>
                    <option value="DAMAGE">Book Damage Fee</option>
                    <option value="PURCHASE">Book Purchase</option>
                    <option value="MEMBERSHIP">Membership Registration</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newInvoiceForm.dueDate}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 disabled:opacity-50"
                >
                  {submittingInvoice ? 'Generating...' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
