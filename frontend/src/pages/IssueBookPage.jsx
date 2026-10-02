import React, { useState } from 'react';
import { api } from '../api/client';
import {
  Search,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar
} from 'lucide-react';

export function IssueBookPage() {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerSearching, setCustomerSearching] = useState(false);

  const [bookSearch, setBookSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [bookSearching, setBookSearching] = useState(false);

  const [customDays, setCustomDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [issueResult, setIssueResult] = useState(null);
  const [error, setError] = useState('');

  // 1. Search Customer
  const handleSearchCustomer = async (e) => {
    e.preventDefault();
    if (!customerSearch.trim()) return;
    setCustomerSearching(true);
    setError('');
    setIssueResult(null);

    try {
      const res = await api.getCustomers({ search: customerSearch.trim(), limit: 1 });
      if (res.success && res.data.customers.length > 0) {
        const found = res.data.customers[0];
        // Fetch detailed profile with active loans
        const detailRes = await api.getCustomerById(found.id);
        setCustomer(detailRes.data);
      } else {
        setError('No active customer account found with that ID, email, or name.');
        setCustomer(null);
      }
    } catch (err) {
      setError(err.message || 'Error searching for customer');
    } finally {
      setCustomerSearching(false);
    }
  };

  // 2. Search Available Book Copies
  const handleSearchBooks = async (e) => {
    e.preventDefault();
    if (!bookSearch.trim()) return;
    setBookSearching(true);
    setError('');
    setSelectedCopy(null);

    try {
      const res = await api.getBooks({ search: bookSearch.trim(), limit: 10 });
      if (res.success) {
        // Collect detailed copies for these books
        const withCopies = await Promise.all(
          res.data.books.map(async (b) => {
            const detail = await api.getBookById(b.id);
            return detail.data;
          })
        );
        setBooks(withCopies);
      }
    } catch (err) {
      setError(err.message || 'Error searching books');
    } finally {
      setBookSearching(false);
    }
  };

  // 3. Confirm Book Issue
  const handleConfirmIssue = async () => {
    if (!customer || !selectedCopy) return;
    setSubmitting(true);
    setError('');
    setIssueResult(null);

    try {
      const res = await api.issueBook({
        customerId: customer.id,
        copyId: selectedCopy.id,
        customLoanDays: customDays ? parseInt(customDays, 10) : undefined,
      });

      if (res.success) {
        setIssueResult(res.data);
        setSelectedCopy(null);
        // Refresh customer details to update loan count
        const refresh = await api.getCustomerById(customer.id);
        setCustomer(refresh.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to issue book');
    } finally {
      setSubmitting(false);
    }
  };

  const isEligible = customer && !customer.is_suspended && (customer.activeLoans?.length || 0) < customer.max_borrow_limit;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Issue Desk (Circulation)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verify customer eligibility, select physical copy, and issue book atomically
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {issueResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
            <span>Book Issued Successfully!</span>
          </div>
          <p className="text-sm">
            Loan Code: <strong className="font-mono">{issueResult.loanCode}</strong> | Due Date:{' '}
            <strong className="underline">{issueResult.dueDate}</strong>
          </p>
          <p className="text-xs text-emerald-700">
            Issued to customer <strong>{customer?.full_name}</strong> ({issueResult.bookTitle} - Barcode:{' '}
            {issueResult.copyBarcode})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Customer Lookup */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 inline-flex items-center justify-center text-xs font-bold">1</span>
            <span>Customer Eligibility & Lookup</span>
          </h2>

          <form onSubmit={handleSearchCustomer} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Customer code, email, or name..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={customerSearching}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 disabled:opacity-50"
            >
              {customerSearching ? 'Searching...' : 'Find'}
            </button>
          </form>

          {customer && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900">{customer.full_name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{customer.customer_code}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  customer.is_suspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {customer.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200/80 pt-2">
                <div>Plan: <strong>{customer.membership_name}</strong></div>
                <div>Expiry: <strong>{customer.membership_expiry_date}</strong></div>
                <div>Active Loans: <strong>{customer.activeLoans?.length || 0} / {customer.max_borrow_limit}</strong></div>
                <div>Grace Period: <strong>{customer.grace_period_days} Days</strong></div>
              </div>

              {!isEligible && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Borrowing limit reached or account suspended.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Book Copy Selection */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 inline-flex items-center justify-center text-xs font-bold">2</span>
            <span>Search Catalog & Select Copy</span>
          </h2>

          <form onSubmit={handleSearchBooks} className="flex gap-2">
            <div className="relative flex-1">
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Title, ISBN, author, or code..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={bookSearching}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 disabled:opacity-50"
            >
              {bookSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {books.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {books.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <p className="font-bold text-slate-900">{b.title}</p>
                  <p className="text-slate-500">By {b.author}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {b.copies && b.copies.length > 0 ? (
                      b.copies.map((cp) => {
                        const isAvail = cp.status === 'AVAILABLE';
                        const isSelected = selectedCopy?.id === cp.id;
                        return (
                          <button
                            key={cp.id}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => setSelectedCopy({ ...cp, bookTitle: b.title })}
                            className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-all ${
                              isSelected
                                ? 'bg-sky-600 text-white ring-2 ring-sky-500'
                                : isAvail
                                ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {cp.barcode} ({cp.status})
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-slate-400">No physical copies added</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800">Issue Confirmation</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {customer && selectedCopy
              ? `Ready to issue ${selectedCopy.bookTitle} (${selectedCopy.barcode}) to ${customer.full_name}`
              : 'Select both an eligible customer and an available copy above to proceed.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span>Loan Days:</span>
            <input
              type="number"
              placeholder={String(customer?.loan_duration_days || 14)}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="w-16 px-2 py-1.5 border border-slate-300 rounded text-center text-xs"
            />
          </div>

          <button
            type="button"
            disabled={!customer || !selectedCopy || !isEligible || submitting}
            onClick={handleConfirmIssue}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{submitting ? 'Issuing...' : 'Confirm Issue'}</span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
