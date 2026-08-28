import React, { useEffect, useState } from 'react';
import { X, Receipt, Calendar, CreditCard, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getTenantHistory } from '../services/api';

export const TenantPaymentHistoryModal = ({ tenant, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenant) return;
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getTenantHistory(tenant.id);
        if (data && data.history) {
          setHistory(data.history);
        }
      } catch (err) {
        console.error('Failed to fetch tenant history:', err);
        setError('Failed to load payment history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [tenant]);

  if (!tenant) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-black">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{tenant.name || 'Tenant'} — Payment History</h2>
              <p className="text-xs text-slate-400 font-medium">
                Shop: {tenant.assigned_shop || 'Unit'} • Code: {tenant.tenant_code || tenant.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <span className="text-xs font-bold">Loading payment records...</span>
            </div>
          ) : error ? (
            <div className="py-8 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center text-rose-700 text-xs font-medium flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold">No payment records found for this tenant.</p>
              <p className="text-[11px] text-slate-400">Confirm a rent payment to see receipts listed here.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">For Month</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {record.receipt_no || `RCPT-${record.id}`}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {record.month_year || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {record.payment_date || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-700">
                        ₹{Number(record.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {record.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {record.reference_no || record.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{record.status || 'Paid'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total Records: <strong className="text-slate-900">{history.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default TenantPaymentHistoryModal;
