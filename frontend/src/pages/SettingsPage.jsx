import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Settings, Shield, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState({
    library_name: '',
    library_email: '',
    library_phone: '',
    library_address: '',
    timezone: 'Asia/Kolkata',
    currency_code: 'INR',
    currency_symbol: '₹',
    default_loan_days: 14,
    default_grace_period_days: 2,
    default_daily_fine_rate: '5.00',
    default_max_fine_per_loan: '200.00',
    receipt_footer_note: '',
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ success: '', error: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [setRes, logsRes] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs({ limit: 30 }),
      ]);
      if (setRes.success) setSettings(setRes.data);
      if (logsRes.success) setAuditLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load settings data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ success: '', error: '' });

    try {
      const payload = {
        ...settings,
        default_loan_days: parseInt(settings.default_loan_days, 10),
        default_grace_period_days: parseInt(settings.default_grace_period_days, 10),
        default_daily_fine_rate: parseFloat(settings.default_daily_fine_rate),
        default_max_fine_per_loan: parseFloat(settings.default_max_fine_per_loan),
      };

      const res = await api.updateSettings(payload);
      if (res.success) {
        setFeedback({ success: 'Library settings and circulation policies updated successfully!', error: '' });
        fetchData();
      }
    } catch (err) {
      setFeedback({ error: err.message || 'Failed to update settings', success: '' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">System Settings & Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure default borrowing policies, fine rates, and inspect immutable system audit history
        </p>
      </div>

      {feedback.success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{feedback.success}</span>
        </div>
      )}

      {feedback.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{feedback.error}</span>
        </div>
      )}

      {/* Circulation Policy Configuration Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-sky-600" />
          <span>Circulation Policies & Fine Formulas</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Library Name</label>
            <input
              type="text"
              required
              value={settings.library_name || ''}
              onChange={(e) => setSettings({ ...settings, library_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Library Email</label>
            <input
              type="email"
              value={settings.library_email || ''}
              onChange={(e) => setSettings({ ...settings, library_email: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Default Loan Period (Days)</label>
            <input
              type="number"
              min="1"
              required
              value={settings.default_loan_days}
              onChange={(e) => setSettings({ ...settings, default_loan_days: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Grace Period (Days)</label>
            <input
              type="number"
              min="0"
              required
              value={settings.default_grace_period_days}
              onChange={(e) => setSettings({ ...settings, default_grace_period_days: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Daily Fine Rate (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={settings.default_daily_fine_rate}
              onChange={(e) => setSettings({ ...settings, default_daily_fine_rate: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Max Fine Cap (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={settings.default_max_fine_per_loan}
              onChange={(e) => setSettings({ ...settings, default_max_fine_per_loan: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">Receipt Footer Note</label>
          <input
            type="text"
            value={settings.receipt_footer_note || ''}
            onChange={(e) => setSettings({ ...settings, receipt_footer_note: e.target.value })}
            placeholder="Thank you for using the Central Library!"
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Policies & Settings'}
          </button>
        </div>
      </form>

      {/* System Audit Logs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span>Security & Financial Audit Trail</span>
        </h2>

        {auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Action</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Entity</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Actor</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 font-mono">{log.created_at}</td>
                    <td className="px-4 py-2 font-semibold text-slate-900">{log.action}</td>
                    <td className="px-4 py-2 text-slate-600">{log.entity_type} #{log.entity_id}</td>
                    <td className="px-4 py-2 text-slate-700">{log.username || 'System'}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-4 text-center">No audit logs recorded yet.</p>
        )}
      </div>
    </div>
  );
}
