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
  X
} from 'lucide-react';

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Customer Detail Drawer/Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    try {
      const res = await api.getCustomerById(id);
      if (res.success) {
        setCustomerDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to get customer profile:', err.message);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Customer Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review customer memberships, active borrowings, and individual fine histories
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, email, code, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={fetchCustomers}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold"
        >
          Search
        </button>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Customer Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Name & Contact</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Membership</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Active Loans</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Unpaid Fines</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-sky-700">{c.customer_code}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{c.full_name}</p>
                      <p className="text-xs text-slate-500">{c.email} {c.phone && `• ${c.phone}`}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {c.membership_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                      {c.active_loans_count} / {c.max_borrow_limit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600">
                      ₹{parseFloat(c.total_outstanding_fines || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.is_suspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenCustomer(c.id)}
                        className="p-1.5 text-slate-600 hover:text-sky-600 border border-slate-200 rounded-lg"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(c)}
                        className={`p-1.5 rounded-lg border ${
                          c.is_suspended
                            ? 'text-emerald-600 hover:text-emerald-700 border-emerald-200'
                            : 'text-rose-600 hover:text-rose-700 border-rose-200'
                        }`}
                        title={c.is_suspended ? 'Reactivate Customer' : 'Suspend Customer'}
                      >
                        {c.is_suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-base font-semibold text-slate-700">No registered customers found</p>
            <p className="text-sm mt-1">Customers register their membership via the public registration page.</p>
          </div>
        )}
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomerId && customerDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{customerDetails.full_name}</h2>
                <p className="text-xs text-slate-500 font-mono">
                  {customerDetails.customer_code} • {customerDetails.email}
                </p>
              </div>
              <button onClick={() => setSelectedCustomerId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-6 text-sm">
              {/* Membership snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Membership:</span>
                  <strong className="text-slate-900">{customerDetails.membership_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Expires:</span>
                  <strong className="text-slate-900">{customerDetails.membership_expiry_date}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Borrow Limit:</span>
                  <strong className="text-slate-900">{customerDetails.max_borrow_limit} Books</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Daily Fine Rate:</span>
                  <strong className="text-slate-900">₹{customerDetails.daily_fine_rate} / day</strong>
                </div>
              </div>

              {/* Active Loans */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Currently Borrowed Books ({customerDetails.activeLoans?.length || 0})</span>
                </h3>
                {customerDetails.activeLoans?.length > 0 ? (
                  <div className="space-y-2">
                    {customerDetails.activeLoans.map((l) => (
                      <div key={l.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{l.book_title}</p>
                          <p className="text-slate-500 font-mono">{l.barcode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-600">Due Date: <strong>{l.due_date}</strong></p>
                          <p className="text-xs text-slate-400">Loan: {l.loan_code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-2">No active book loans at present.</p>
                )}
              </div>

              {/* Invoices & Fines */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-sky-600" />
                  <span>Invoice & Late Fee History</span>
                </h3>
                {customerDetails.invoices?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customerDetails.invoices.map((inv) => (
                      <div key={inv.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex justify-between items-center">
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
                  <p className="text-xs text-slate-400 py-2">No financial assessments or invoices recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
