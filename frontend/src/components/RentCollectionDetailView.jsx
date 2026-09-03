import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  History,
  User,
  Phone,
  Mail,
  Home,
  Tag,
  Clock,
  IndianRupee,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  Send,
  Download,
  Eye,
  Edit,
  Loader2,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';

import { getTenants, getTenantRentDetail, confirmRentPayment } from '../services/api';

export const RentCollectionDetailView = ({ onBack, preselectedTenantId = null, onPaymentConfirmed = null }) => {
  const [tenantsList, setTenantsList] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(preselectedTenantId);
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Payment Form State
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);


  // 1. Fetch real tenants list from backend DB
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await getTenants();
        if (data && Array.isArray(data) && data.length > 0) {
          setTenantsList(data);
          if (!selectedTenantId) {
            setSelectedTenantId(data[0].id);
          }
        } else {
          setTenantsList([]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
        setError('Failed to load tenants.');
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  // 2. Fetch selected tenant rent details & active invoice from backend DB
  useEffect(() => {
    if (!selectedTenantId) return;

    const loadTenantDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getTenantRentDetail(selectedTenantId);
        if (data) {
          setDetailData(data);
          if (data.active_invoice) {
            setAmountReceived(data.active_invoice.total_amount || data.tenant.monthly_rent || 0);
            setNotes(`Rent paid for ${data.active_invoice.for_month || 'current month'}`);
          }
        }
      } catch (err) {
        console.error('Error fetching tenant rent details:', err);
        setError('Failed to fetch tenant rent records.');
      } finally {
        setLoading(false);
      }
    };

    loadTenantDetails();
  }, [selectedTenantId]);

  // Helper formatting currency
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Helper avatar initials
  const getInitials = (name) => {
    if (!name) return 'TN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // 3. Handle Confirm Payment Submission
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!amountReceived || Number(amountReceived) <= 0) {
      setError('Please enter a valid received amount.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        tenant_id: Number(selectedTenantId),
        invoice_id: detailData?.active_invoice?.id,
        amount_received: Number(amountReceived),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_no: referenceNo || null,
        notes: notes || null,
        send_sms: sendSms,
        send_whatsapp: sendWhatsapp,
      };

      const res = await confirmRentPayment(payload);
      if (res && res.success) {
        setSuccessToast(`Payment of ${formatCurrency(amountReceived)} recorded successfully for ${res.paid_month || 'current month'}! Receipt: ${res.receipt_no}`);
        setTimeout(() => setSuccessToast(''), 4000);

        // Refresh detail data
        const updatedDetail = await getTenantRentDetail(selectedTenantId);
        if (updatedDetail) {
          setDetailData(updatedDetail);
          if (updatedDetail.active_invoice) {
            setAmountReceived(updatedDetail.active_invoice.total_amount || updatedDetail.tenant?.monthly_rent || 0);
            setNotes(`Rent paid for ${updatedDetail.active_invoice.for_month || 'current month'}`);
          }
        }
        if (typeof onPaymentConfirmed === 'function') {
          onPaymentConfirmed();
        }

      }
    } catch (err) {
      console.error('Error confirming rent payment:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to confirm payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !detailData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500">Loading rent collection workspace...</span>
      </div>
    );
  }

  if (tenantsList.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900">No Tenants Found</h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          There are currently no active tenant records. Please add a tenant to start collecting rent.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tenants List</span>
        </button>
      </div>
    );
  }

  const { tenant, summary, active_invoice, history } = detailData || {};

  // Calculate dynamic due / overdue status
  const getInvoiceDueDateInfo = () => {
    if (!active_invoice) return { badge: 'PENDING', badgeColor: 'bg-amber-100 text-amber-800', tag: '', tagColor: 'text-amber-600', calloutType: 'pending', calloutText: 'Please collect payment.' };

    if (active_invoice.status === 'Paid') {
      return {
        badge: 'PAID',
        badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        tag: '(Paid)',
        tagColor: 'text-emerald-700 font-bold',
        calloutType: 'paid',
        calloutText: 'This invoice has been fully collected and recorded.'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dueObj = null;
    if (active_invoice.due_date) {
      dueObj = new Date(active_invoice.due_date);
      if (isNaN(dueObj.getTime())) {
        const parts = String(active_invoice.due_date).trim().split(' ');
        if (parts.length === 3) {
          dueObj = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
        }
      }
    }

    if (dueObj && !isNaN(dueObj.getTime())) {
      dueObj.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - dueObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      if (diffDays > 0) {
        return {
          badge: 'OVERDUE',
          badgeColor: 'bg-rose-100 text-rose-800 border border-rose-300/80',
          tag: `(Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''})`,
          tagColor: 'text-rose-600 font-bold',
          calloutType: 'overdue',
          calloutText: `This invoice is overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}. Please collect the rent payment and confirm receipt below.`
        };
      } else if (diffDays === 0) {
        return {
          badge: 'DUE TODAY',
          badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300',
          tag: '(Due Today)',
          tagColor: 'text-amber-700 font-bold',
          calloutType: 'due_today',
          calloutText: `This invoice is due today (${active_invoice.due_date}). Please collect the rent payment and confirm receipt below.`
        };
      } else {
        const daysLeft = Math.abs(diffDays);
        return {
          badge: 'PENDING',
          badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
          tag: `(Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''})`,
          tagColor: 'text-blue-700 font-semibold',
          calloutType: 'pending',
          calloutText: `This invoice is pending payment (due on ${active_invoice.due_date}). Please collect payment below.`
        };
      }
    }

    return {
      badge: active_invoice.status || 'PENDING',
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300/60',
      tag: '(Pending)',
      tagColor: 'text-amber-700',
      calloutType: 'pending',
      calloutText: 'This invoice is pending payment. Please collect the rent payment and confirm receipt below.'
    };
  };

  const dueDateInfo = getInvoiceDueDateInfo();


  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-3 bg-emerald-950 text-emerald-100 border border-emerald-500/40 px-5 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">Collect Rent Payment</h1>
            {tenantsList.length > 1 && (
              <div className="relative inline-block">
                <select
                  value={selectedTenantId || ''}
                  onChange={(e) => setSelectedTenantId(Number(e.target.value))}
                  className="appearance-none bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.assigned_shop || 'Unit'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Record rent payment and generate official receipt for registered tenant
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Invoices</span>
          </button>
          <button className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors shadow-sm">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Tenant Ledger</span>
          </button>
          <button className="inline-flex items-center space-x-2 px-4.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-emerald-700/20">
            <History className="w-4 h-4" />
            <span>Rent History</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center space-x-2.5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 3-Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (4 Cols): Tenant & Property Details + Summary / Balance */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Tenant & Property Details */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Tenant & Property Details</h3>
            </div>

            {/* Profile Header */}
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black shrink-0 border border-emerald-200">
                {getInitials(tenant?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-black text-slate-950 truncate">{tenant?.name}</h4>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md shrink-0">
                    Active Tenant
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{tenant?.phone}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[140px]">{tenant?.email}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Field Details */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Property</span>
                </span>
                <span className="font-bold text-slate-900 text-right">{tenant?.property_name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unit / Shop</span>
                </span>
                <span className="font-bold text-slate-900">{tenant?.assigned_shop}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rent Type</span>
                </span>
                <span className="font-bold text-slate-900">{tenant?.rent_type || 'Monthly'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                  <span>Monthly Rent</span>
                </span>
                <span className="font-extrabold text-slate-950">{formatCurrency(tenant?.monthly_rent)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security Deposit</span>
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(tenant?.security_deposit)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lease Period</span>
                </span>
                <span className="font-bold text-slate-900">{tenant?.lease_period}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="flex items-center space-x-2 text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due Date</span>
                </span>
                <span className="font-bold text-slate-900">{tenant?.due_date}</span>
              </div>
            </div>

          </div>

          {/* Card 2: Summary / Balance */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3.5">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              Summary / Balance
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Total Rent (Till Date)</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(summary?.total_rent_till_date)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Total Received</span>
                <span className="font-black text-emerald-700">{formatCurrency(summary?.total_received)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Pending Amount</span>
                <span className="font-black text-rose-600">{formatCurrency(summary?.pending_amount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Next Due Date</span>
                <span className="font-bold text-slate-900">{summary?.next_due_date || '05 Sep 2026'}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Last Payment</span>
                <span className="font-bold text-emerald-700">{summary?.last_payment || 'N/A'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN (4 Cols): Invoice Details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Invoice Details</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${dueDateInfo.badgeColor}`}>
                {dueDateInfo.badge}
              </span>
            </div>

            {/* Invoice Green Container Box */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-300 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">Invoice No.</div>
                <div className="text-base font-black text-slate-950 tracking-tight">
                  {active_invoice?.invoice_no || 'RENT-2026-008'}
                </div>
              </div>
            </div>

            {/* Invoice Breakdown Fields */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">For Month</span>
                <span className="font-bold text-slate-950">{active_invoice?.for_month || 'August 2026'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Invoice Date</span>
                <span className="font-bold text-slate-950">{active_invoice?.invoice_date || '01 Aug 2026'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Due Date</span>
                <span className="font-bold flex items-center space-x-1.5">
                  <span className="text-slate-950">{active_invoice?.due_date || '26 Aug 2026'}</span>
                  {dueDateInfo.tag && (
                    <span className={`text-[10px] ${dueDateInfo.tagColor}`}>
                      {dueDateInfo.tag}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Rent Amount</span>
                <span className="font-bold text-slate-950">{formatCurrency(active_invoice?.rent_amount)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Late Fee</span>
                <span className="font-bold text-slate-950">{formatCurrency(active_invoice?.late_fee)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Other Charges</span>
                <span className="font-bold text-slate-950">{formatCurrency(active_invoice?.other_charges)}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t-2 border-dashed border-slate-200">
                <span className="font-extrabold text-slate-900 text-sm">Total Amount Due</span>
                <span className="font-black text-rose-600 text-base">{formatCurrency(active_invoice?.total_amount)}</span>
              </div>
            </div>

            {/* Overdue / Due Callout Alert */}
            {dueDateInfo.calloutType === 'paid' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  {dueDateInfo.calloutText}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-blue-900">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  {dueDateInfo.calloutText}
                </p>
              </div>
            )}

          </div>
        </div>


        {/* RIGHT COLUMN (4 Cols): Collect Payment Form + Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Payment Collection Form */}
          <form onSubmit={handleConfirmPayment} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              Collect Payment
            </h3>

            {/* Amount Received */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Received *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-black text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="8,000"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-extrabold text-sm text-slate-950"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs text-slate-900"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs text-slate-900 bg-white cursor-pointer"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* Reference / UTR No. */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reference / UTR No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. UPI/62837462837"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-xs text-slate-900"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Rent paid for August 2026"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs text-slate-900 resize-none"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 pt-1 text-xs font-semibold text-slate-700">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>Send SMS receipt to tenant</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsapp}
                  onChange={(e) => setSendWhatsapp(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>Send WhatsApp receipt to tenant</span>
              </label>
            </div>

            {/* Confirm Payment Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </form>

          {/* Card 2: Tenant Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2">
              Tenant Quick Actions
            </h3>
            <div className="space-y-1.5 text-xs">
              <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center space-x-2.5 transition-colors">
                <User className="w-4 h-4 text-slate-400" />
                <span>View Tenant Profile</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center space-x-2.5 transition-colors">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>View Rent Ledger</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center space-x-2.5 transition-colors">
                <Send className="w-4 h-4 text-slate-400" />
                <span>Send Reminder</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center space-x-2.5 transition-colors">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Download Agreement</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center space-x-2.5 transition-colors">
                <Edit className="w-4 h-4 text-slate-400" />
                <span>Update Tenant Details</span>
              </button>
            </div>
          </div>

          {/* Card 3: Send Reminder */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-amber-900">Send Reminder</h3>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Send rent due reminder to tenant via SMS / WhatsApp.
            </p>
            <button className="w-full py-2.5 px-4 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center space-x-2 transition-colors">
              <Send className="w-3.5 h-3.5 text-amber-700" />
              <span>Send Reminder</span>
            </button>
          </div>

        </div>

      </div>

      {/* BOTTOM FULL WIDTH SECTION: Rent Payment History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Rent Payment History</h3>
            <p className="text-xs text-slate-500 font-medium">
              Real recorded rent payments and pending invoice entries
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice No.</th>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Received Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(!history || history.length === 0) ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 text-xs font-semibold">
                    No payment history available for this tenant.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">{item.invoice_no || 'RENT-2026-008'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{item.month_year}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.payment_date || '01 Aug 2026'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.due_date || '05 Aug 2026'}</td>
                    <td className="py-3.5 px-4 font-black text-slate-950">{formatCurrency(item.amount)}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.payment_date || '-'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{item.payment_mode || 'UPI'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status || 'Paid'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.receipt_no ? (
                        <button className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 font-bold text-xs">
                          <span>{item.receipt_no}</span>
                          <Download className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {item.status === 'Paid' ? (
                        <button className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center">
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setAmountReceived(item.amount);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs transition-colors shadow-sm"
                        >
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default RentCollectionDetailView;
