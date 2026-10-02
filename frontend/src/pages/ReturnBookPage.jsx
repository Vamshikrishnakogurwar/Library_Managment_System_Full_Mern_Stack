import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Clock,
  Printer,
  X
} from 'lucide-react';

export function ReturnBookPage() {
  const [activeLoans, setActiveLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Return inspection modal
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [condition, setCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(null);
  const [error, setError] = useState('');

  const fetchActiveLoans = async () => {
    setLoading(true);
    try {
      const res = await api.getActiveLoans({ search: search.trim() || undefined });
      if (res.success) {
        setActiveLoans(res.data);
      }
    } catch (err) {
      console.error('Failed to load active loans:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const handleOpenReturnModal = async (loan) => {
    setSelectedLoan(loan);
    setError('');
    setReturnSuccess(null);
    setCondition('GOOD');
    setReturnNotes('');

    try {
      const res = await api.previewReturn(loan.id);
      if (res.success) {
        setPreviewData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to preview fine calculation');
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;
    setProcessing(true);
    setError('');

    try {
      const res = await api.returnBook({
        loanId: selectedLoan.id,
        condition,
        returnNotes: returnNotes.trim() || null,
      });

      if (res.success) {
        setReturnSuccess(res.data);
        setSelectedLoan(null);
        setPreviewData(null);
        fetchActiveLoans();
      }
    } catch (err) {
      setError(err.message || 'Failed to process book return');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Return Desk</h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect physical condition, calculate automatic late fines, and complete returns
        </p>
      </div>

      {returnSuccess && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
            <span>Return Completed Successfully!</span>
          </div>
          <p className="text-sm">
            Actual Return Date: <strong>{returnSuccess.returnDate}</strong> | Status:{' '}
            <strong className="underline">{returnSuccess.newCopyStatus}</strong>
          </p>
          {returnSuccess.fine ? (
            <p className="text-sm text-rose-700 font-semibold">
              ⚠️ Fine Assessed: ₹{returnSuccess.fine.amount.toFixed(2)} (Invoice:{' '}
              {returnSuccess.invoice?.invoiceNumber})
            </p>
          ) : (
            <p className="text-xs text-emerald-700">No overdue fines assessed. Returned within grace period or on-time.</p>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by book title, copy barcode, customer name, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={fetchActiveLoans}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold"
        >
          Search
        </button>
      </div>

      {/* Active Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : activeLoans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Book & Barcode</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Issue Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Due Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Overdue Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeLoans.map((loan) => {
                  const overdueDays = parseInt(loan.current_overdue_days || 0, 10);
                  const isOverdue = overdueDays > 0;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{loan.book_title}</p>
                        <p className="text-xs font-mono text-sky-700">{loan.barcode}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{loan.customer_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{loan.customer_code}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{loan.issue_date}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{loan.due_date}</td>
                      <td className="px-4 py-3.5 text-center">
                        {isOverdue ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            {overdueDays} Days Overdue
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            On Time
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenReturnModal(loan)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          Process Return
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <RotateCcw className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-base font-semibold text-slate-700">No active loans found</p>
            <p className="text-sm mt-1">All borrowed copies have been returned to the library.</p>
          </div>
        )}
      </div>

      {/* Return Inspection & Fine Breakdown Modal */}
      {selectedLoan && previewData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Process Book Return</h2>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <h3 className="font-bold text-sm text-slate-900">{previewData.loan.book_title}</h3>
                <p className="text-xs text-slate-600">
                  Barcode: <span className="font-mono font-bold text-sky-700">{previewData.loan.barcode}</span> | Borrower:{' '}
                  <strong>{previewData.loan.customer_name}</strong>
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1 border-t border-slate-200 mt-2">
                  <div>Issue Date: {previewData.loan.issue_date}</div>
                  <div>Due Date: {previewData.loan.due_date}</div>
                </div>
              </div>

              {/* Fine Calculation Preview */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Automatic Fine Assessment Formula</span>
                </h4>
                <div className="text-xs text-amber-900 space-y-1">
                  <div className="flex justify-between">
                    <span>Overdue Days:</span>
                    <strong className="font-mono">{previewData.fineCalculation.overdueDays} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Grace Period Allowed:</span>
                    <strong className="font-mono">{previewData.fineCalculation.gracePeriodDays} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chargeable Days:</span>
                    <strong className="font-mono">{previewData.fineCalculation.chargeableDays} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Rate (Policy Snapshot):</span>
                    <strong className="font-mono">₹{previewData.fineCalculation.dailyRate} / day</strong>
                  </div>
                  <div className="flex justify-between border-t border-amber-200/80 pt-1 font-bold text-sm text-amber-950">
                    <span>Assessed Fine:</span>
                    <span className="font-mono">₹{previewData.fineCalculation.assessedFine}</span>
                  </div>
                </div>
              </div>

              {/* Physical Condition Inspection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Physical Condition on Return</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="GOOD">GOOD (Ready for immediate circulation)</option>
                  <option value="NEW">NEW / Mint Condition</option>
                  <option value="FAIR">FAIR (Minor wear, usable)</option>
                  <option value="DAMAGED">DAMAGED (Requires repair/assessment)</option>
                  <option value="LOST">LOST (Requires replacement charges)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Staff Inspection Notes</label>
                <textarea
                  rows="2"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Optional notes regarding copy condition..."
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleConfirmReturn}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-60"
                >
                  {processing ? 'Processing...' : 'Confirm Return & Billing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
