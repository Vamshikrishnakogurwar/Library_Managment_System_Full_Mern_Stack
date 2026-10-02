import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  BookOpen,
  Users,
  AlertTriangle,
  RotateCcw,
  IndianRupee,
  Clock,
  TrendingUp,
  BookmarkCheck,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDashboardMetrics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
        <h3 className="font-bold text-lg mb-1">Failed to load dashboard metrics</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadMetrics}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const m = data?.metrics || {};

  const statCards = [
    {
      title: 'Total Book Titles',
      value: m.total_active_titles || 0,
      icon: BookOpen,
      color: 'bg-blue-500',
      subtitle: `${m.total_physical_copies || 0} physical copies in stock`,
    },
    {
      title: 'Available Copies',
      value: m.available_copies || 0,
      icon: BookmarkCheck,
      color: 'bg-emerald-500',
      subtitle: `${m.issued_copies || 0} copies actively issued`,
    },
    {
      title: 'Overdue Loans',
      value: m.overdue_loans_count || 0,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      subtitle: 'Loans requiring return or renewal',
    },
    {
      title: 'Active Customers',
      value: m.active_customers || 0,
      icon: Users,
      color: 'bg-purple-500',
      subtitle: `${m.total_customers || 0} total registered users`,
    },
    {
      title: 'Outstanding Fines',
      value: `₹${parseFloat(m.outstanding_fines || 0).toFixed(2)}`,
      icon: Clock,
      color: 'bg-rose-500',
      subtitle: `₹${parseFloat(m.total_fines_collected || 0).toFixed(2)} collected`,
    },
    {
      title: 'Total Revenue Collected',
      value: `₹${parseFloat(m.total_payments_received || 0).toFixed(2)}`,
      icon: IndianRupee,
      color: 'bg-sky-500',
      subtitle: 'From late fees & payments',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Circulation Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time circulation metrics and database activity</p>
        </div>
        <button
          onClick={loadMetrics}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start space-x-4">
              <div className={`p-3 rounded-lg text-white ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.title}</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{card.value}</h3>
                <p className="text-xs text-slate-500 mt-1 truncate">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circulation Trends Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Monthly Book Issues</h2>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          {data?.monthlyTrends && data.monthlyTrends.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrends}>
                  <XAxis dataKey="month_label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total_issued" fill="#0284c7" radius={[4, 4, 0, 0]} name="Books Issued" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <BookOpen className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-sm">No monthly loan history recorded yet.</p>
            </div>
          )}
        </div>

        {/* Most Borrowed Titles */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Most Popular Books</h2>
          {data?.popularBooks && data.popularBooks.length > 0 ? (
            <div className="space-y-4">
              {data.popularBooks.map((book, i) => (
                <div key={book.id} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="overflow-hidden pr-2">
                    <p className="font-semibold text-sm text-slate-800 truncate">{book.title}</p>
                    <p className="text-xs text-slate-500 truncate">{book.author}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800">
                    {book.borrow_count} loans
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <RotateCcw className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-sm text-center">Books will appear here as circulation begins.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Circulation Activity */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Circulation Events</h2>
        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Loan Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Book Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Issue Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentActivity.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-sky-700">{act.loan_code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-xs">{act.book_title}</td>
                    <td className="px-4 py-3 text-slate-600">{act.customer_name}</td>
                    <td className="px-4 py-3 text-slate-500">{act.issue_date}</td>
                    <td className="px-4 py-3 text-slate-500">{act.due_date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          act.status === 'RETURNED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : act.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-6 text-center">No recent issue or return events logged in the database.</p>
        )}
      </div>
    </div>
  );
}
