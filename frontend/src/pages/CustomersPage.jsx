import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  UserX,
  UserCheck,
  Eye,
  BookOpen,
  Receipt,
  X,
  Edit3,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Customer Detail Drawer/Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit Customer Modal State
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Edit Rented Book / Loan State
  const [editingLoan, setEditingLoan] = useState(null);
  const [editLoanForm, setEditLoanForm] = useState({
    dueDate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const isAdminOrLibrarian = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN');
  const isAdmin = user && user.role === 'ADMIN';

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers({ search: search.trim() || undefined });
      if (res.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error('Failed to load customers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenCustomer = async (id) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    setFeedback({ error: '', success: '' });
    try {
      const res = await api.getCustomerById(id);
      if (res.success) {
        setCustomerDetails(res.data);
      }
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleSuspend = async (customer) => {
    const newStatus = !customer.is_suspended;
    try {
      const res = await api.toggleSuspension(customer.id, newStatus);
      if (res.success) {
        fetchCustomers();
        if (selectedCustomerId === customer.id) {
          handleOpenCustomer(customer.id);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to update customer status');
    }
  };

  // Open Edit Customer Form
  const openEditCustomer = () => {
    if (!customerDetails) return;
    setEditCustomerForm({
      fullName: customerDetails.full_name || '',
      phone: customerDetails.phone || '',
      address: customerDetails.address || '',
      notes: customerDetails.notes || '',
    });
    setShowEditCustomerModal(true);
  };

  // Save Customer Profile Changes
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerDetails) return;
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const res = await api.updateCustomer(customerDetails.id, editCustomerForm);
      if (res.success) {
        setFeedback({ success: 'Customer profile updated successfully!', error: '' });
        setShowEditCustomerModal(false);
        setCustomerDetails(res.data);
        fetchCustomers();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Customer update failed', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Loan Form
  const openEditLoan = (loan) => {
    setEditingLoan(loan);
    setEditLoanForm({
      dueDate: loan.due_date || '',
      notes: loan.return_notes || '',
    });
  };

  // Save Loan / Rented Book Extension
  const handleSaveLoan = async (e) => {
    e.preventDefault();
    if (!editingLoan) return;
    setSubmitting(true);
    setFeedback({ error: '', success: '' });

    try {
      const res = await api.updateLoan(editingLoan.id, {
        dueDate: editLoanForm.dueDate,
        notes: editLoanForm.notes,
      });

      if (res.success) {
        setFeedback({ success: `Loan ${editingLoan.loan_code} due date extended to ${editLoanForm.dueDate}!`, error: '' });
        setEditingLoan(null);
        handleOpenCustomer(selectedCustomerId);
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Loan extension failed', success: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100 mb-2">
            <Users className="w-3.5 h-3.5" />
            ADMIN REGISTRATION & CIRCULATION PORTAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">
            Customer Directory & Circulation History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View customer accounts, update member details, inspect active rentals, and adjust due dates.
          </p>
        </div>
      </div>

      {/* Global Feedback */}
      {feedback.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{feedback.success}</span>
          </div>
          <button onClick={() => setFeedback({ ...feedback, success: '' })} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {feedback.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{feedback.error}</span>
          </div>
          <button onClick={() => setFeedback({ ...feedback, error: '' })} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, email address, code (e.g. CUST-...), or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>
        <button
          onClick={fetchCustomers}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
        >
          Search
        </button>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
            <p className="text-xs text-slate-400">Loading customers...</p>
          </div>
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-600">Customer Name & Code</th>
                  <th className="px-5 py-4 text-left font-bold text-slate-600">Membership Tier</th>
                  <th className="px-5 py-4 text-left font-bold text-slate-600">Contact</th>
                  <th className="px-4 py-4 text-center font-bold text-slate-600">Active Rentals</th>
                  <th className="px-4 py-4 text-right font-bold text-slate-600">Fines Due</th>
                  <th className="px-4 py-4 text-center font-bold text-slate-600">Status</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{c.full_name}</p>
                      <p className="text-xs text-sky-600 font-mono mt-0.5">{c.customer_code}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {c.membership_name || 'Standard'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">{c.email}</p>
                      <p className="text-slate-400 font-mono mt-0.5">{c.phone || 'No phone'}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        c.active_loans_count > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.active_loans_count || 0} / {c.max_borrow_limit}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-xs">
                      {parseFloat(c.total_outstanding_fines || 0) > 0 ? (
                        <span className="text-rose-600">₹{parseFloat(c.total_outstanding_fines).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {c.is_suspended ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenCustomer(c.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage / View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-base font-bold text-slate-700">No registered customers found</p>
            <p className="text-xs text-slate-400 mt-1">Customers register their membership via the public registration portal.</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          CUSTOMER PROFILE DRAWER & RENTED BOOKS EDITOR
         ========================================================================= */}
      {selectedCustomerId && customerDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-extrabold text-slate-900 font-display">{customerDetails.full_name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    customerDetails.is_suspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {customerDetails.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {customerDetails.customer_code} • {customerDetails.email}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {isAdminOrLibrarian && (
                  <button
                    onClick={openEditCustomer}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-6 text-sm">
              {/* Membership snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Plan:</span>
                  <strong className="text-slate-900">{customerDetails.membership_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Valid Until:</span>
                  <strong className="text-slate-900">{customerDetails.membership_expiry_date}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Borrow Limit:</span>
                  <strong className="text-slate-900">{customerDetails.max_borrow_limit} Books</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Daily Late Fee:</span>
                  <strong className="text-slate-900">₹{customerDetails.daily_fine_rate} / day</strong>
                </div>
              </div>

              {/* Contact info details */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{customerDetails.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{customerDetails.address || 'No postal address recorded'}</span>
                </div>
                {customerDetails.notes && (
                  <div className="sm:col-span-2 text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                    <strong>Admin Notes:</strong> {customerDetails.notes}
                  </div>
                )}
              </div>

              {/* ACTIVE RENTED BOOKS (With Admin Edit / Extend feature) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-sky-600" />
                    <span>Currently Rented / Borrowed Books ({customerDetails.activeLoans?.length || 0})</span>
                  </h3>
                </div>

                {customerDetails.activeLoans?.length > 0 ? (
                  <div className="space-y-2.5">
                    {customerDetails.activeLoans.map((l) => (
                      <div
                        key={l.id}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{l.book_title}</p>
                          <p className="text-slate-500 font-mono mt-0.5">
                            Barcode: <span className="text-slate-700">{l.barcode}</span> • Loan: {l.loan_code}
                          </p>
                          <p className="text-slate-500 mt-1">
                            Issued: {l.issue_date} • Due Date: <strong className="text-rose-600 font-mono">{l.due_date}</strong>
                          </p>
                        </div>

                        {isAdminOrLibrarian && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditLoan(l)}
                              className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold border border-sky-200 transition"
                            >
                              Edit / Extend Due Date
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 bg-slate-50 rounded-2xl text-center">
                    Customer currently has no active book rentals.
                  </p>
                )}
              </div>

              {/* Invoices & Fines */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-sky-600" />
                  <span>Invoice & Late Fee Assessments</span>
                </h3>
                {customerDetails.invoices?.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {customerDetails.invoices.map((inv) => (
                      <div key={inv.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-mono font-bold text-sky-700">{inv.invoice_number}</p>
                          <p className="text-slate-500">{inv.invoice_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-800">₹{parseFloat(inv.total_amount).toFixed(2)}</p>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {inv.status} (Bal: ₹{parseFloat(inv.balance_amount).toFixed(2)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-2">No billing records on file.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT CUSTOMER DETAILS (Admin Only)
         ========================================================================= */}
      {showEditCustomerModal && customerDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Customer Profile</h2>
                <p className="text-xs text-slate-500">{customerDetails.customer_code}</p>
              </div>
              <button onClick={() => setShowEditCustomerModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editCustomerForm.fullName}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editCustomerForm.phone}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Postal Address</label>
                <textarea
                  rows={2}
                  value={editCustomerForm.address}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={editCustomerForm.notes}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, notes: e.target.value })}
                  placeholder="Internal notes regarding library privileges..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditCustomerModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT RENTED BOOK / LOAN DUE DATE (Admin & Librarian)
         ========================================================================= */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Rented Book Loan</h2>
                <p className="text-xs text-slate-500">{editingLoan.loan_code} • {editingLoan.barcode}</p>
              </div>
              <button onClick={() => setEditingLoan(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Book Title</label>
                <p className="font-bold text-slate-900 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {editingLoan.book_title}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Due Date *</label>
                <input
                  type="date"
                  required
                  value={editLoanForm.dueDate}
                  onChange={(e) => setEditLoanForm({ ...editLoanForm, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Extension Reason / Loan Notes</label>
                <textarea
                  rows={2}
                  value={editLoanForm.notes}
                  onChange={(e) => setEditLoanForm({ ...editLoanForm, notes: e.target.value })}
                  placeholder="e.g. Approved 7-day academic extension by administrator"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save & Extend Rental'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
