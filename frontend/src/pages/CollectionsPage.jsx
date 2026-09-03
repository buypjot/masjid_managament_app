import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import {
  getSanthaOverview,
  createSanthaCollection,
  updateSanthaCollection,
  deleteSanthaCollection,
  getSanthaArrears,
  getSanthaAdvances,
  getSanthaReceipts,
  getJumaCollections,
  createJumaCollection,
  updateJumaCollection,
  deleteJumaCollection,
  getDonations,
  createDonation,
  updateDonation,
  deleteDonation,
  getCommunityFamilies,
  getFamilySanthaCalculation
} from '../services/api';

import {
  Search,
  Plus,
  Printer,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  FileText,
  Calendar,
  Layers,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  Building,
  HeartHandshake,
  QrCode,
  CreditCard,
  Banknote,
  Landmark
} from 'lucide-react';

// Helper to get all Friday dates of any given date's month (or default current month)
const getMonthFridays = (targetDateStr = null) => {
  const target = targetDateStr ? new Date(targetDateStr) : new Date();
  const year = target.getFullYear();
  const monthIndex = target.getMonth();

  const fridays = [];
  const date = new Date(year, monthIndex, 1);

  // Move to first Friday of month
  while (date.getDay() !== 5) {
    date.setDate(date.getDate() + 1);
  }

  const ordinalNames = ['1st', '2nd', '3rd', '4th', '5th'];
  let count = 1;
  const monthName = target.toLocaleString('en-US', { month: 'short' });

  while (date.getMonth() === monthIndex) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const ordinal = ordinalNames[count - 1] || `${count}th`;

    const isToday = isoDate === new Date().toISOString().split('T')[0];
    const label = `${ordinal} Friday (${dd} ${monthName} ${yyyy})${isToday ? ' • Today' : ''}`;

    fridays.push({
      index: count,
      ordinal,
      date: isoDate,
      label,
      isToday,
      dayNum: dd,
      monthName,
      year: yyyy
    });

    count++;
    date.setDate(date.getDate() + 7);
  }

  return fridays;
};

// Helper to get closest or current live Friday
const getCurrentLiveFriday = (dateStr = null) => {
  const fridays = getMonthFridays(dateStr);
  const todayIso = new Date().toISOString().split('T')[0];
  const exactToday = fridays.find((f) => f.date === todayIso);
  if (exactToday) return exactToday;

  const upcoming = fridays.find((f) => f.date >= todayIso);
  return upcoming || fridays[fridays.length - 1] || { date: todayIso, label: `Friday Collection (${todayIso})` };
};

export const CollectionsPage = ({ activeSubTab = 'santha' }) => {
  const { userInfo } = useAuth();
  const [currentTab, setCurrentTab] = useState(activeSubTab);

  useEffect(() => {
    setCurrentTab(activeSubTab);
  }, [activeSubTab]);

  // Common State
  const [familiesList, setFamiliesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to auto-generate unique Transaction / Receipt IDs
  const generateAutoTransactionId = (prefix = 'TXN', countVal = null) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // 20260902
    const yy = now.getFullYear().toString().slice(-2); // 26
    const randomSeq = Math.floor(10 + Math.random() * 90);
    const seq = countVal !== null && countVal !== undefined ? (countVal < 10 ? `0${countVal}` : `${countVal}`) : `${randomSeq}`;

    if (prefix === 'SANT' || prefix === 'REC-SANT') {
      return `SANT-${yy}-${seq}`;
    }
    if (prefix === 'JUM' || prefix === 'REC-JUM') {
      return `JUM-${yy}-${seq}`;
    }
    if (prefix === 'DON' || prefix === 'REC-DON' || prefix === 'DNC') {
      return `DON-${yy}-${seq}`;
    }
    return `TXN-${dateStr}-${seq}`;
  };

  // Helper to get today's date in YYYY-MM-DD
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Helper to get today's time in HH:MM
  const getTodayTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // 1. Santha Overview State
  const [santhaOverview, setSanthaOverview] = useState({
    summary: {
      due_amount: 0,
      total_families: 0,
      collected_amount: 0,
      collection_rate: 0,
      arrears_amount: 0,
      arrears_families: 0,
      advance_amount: 0,
      advance_families: 0
    },
    families: []
  });
  const [santhaSearchTerm, setSanthaSearchTerm] = useState('');
  const [santhaMonthFilter, setSanthaMonthFilter] = useState('August');
  const [santhaYearFilter, setSanthaYearFilter] = useState(2026);

  const [showSanthaModal, setShowSanthaModal] = useState(false);
  const [santhaForm, setSanthaForm] = useState({
    family_id: '',
    family_name: '',
    family_code: '',
    head_name: '',
    payment_date: getTodayDate(),
    payment_time: getTodayTime(),
    month: 'August',
    year: 2026,
    amount: '500',
    monthly_santha: 500,
    payment_method: 'Cash',
    financial_account: 'Main Cash',
    allocation: 'Auto',
    advance_months: 1,
    advance_period: 'Next 1 Months Credit Coverage',
    reference_id: generateAutoTransactionId('TXN'),
    notes: ''
  });

  // 2. Santha Arrears State
  const [arrearsList, setArrearsList] = useState([]);

  // 3. Santha Advances State & Edit Advance Modal
  const [advancesList, setAdvancesList] = useState([]);
  const [showEditAdvanceModal, setShowEditAdvanceModal] = useState(false);
  const [editAdvanceForm, setEditAdvanceForm] = useState({
    id: null,
    receipt_no: '',
    family_name: '',
    family_code: '',
    head_name: '',
    amount: '',
    payment_date: '',
    payment_method: 'Cash',
    financial_account: 'Main Cash',
    advance_months: 1,
    advance_period: '',
    reference_id: '',
    notes: ''
  });

  // 4. Santha Receipts State
  const [receiptsList, setReceiptsList] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // 5. Juma Collection State & Modals (Standard Streamlined Receipt Format with Live Friday Capture)
  const [jumaList, setJumaList] = useState([]);
  const [jumaSearchTerm, setJumaSearchTerm] = useState('');
  const [showJumaModal, setShowJumaModal] = useState(false);
  const [showEditJumaModal, setShowEditJumaModal] = useState(false);

  const initialFriday = getCurrentLiveFriday();

  const [jumaForm, setJumaForm] = useState({
    receipt_no: generateAutoTransactionId('REC-JUM'),
    collection_date: initialFriday.date,
    donor_name: 'Friday Jumma Jamaat',
    category: initialFriday.label,
    cash_amount: '0',
    upi_amount: '0',
    paytm_amount: '0',
    bank_amount: '0',
    cheque_amount: '0',
    amount: '0',
    payment_method: 'Cash',
    status: 'Received',
    notes: ''
  });

  const [editJumaForm, setEditJumaForm] = useState({
    id: null,
    receipt_no: '',
    collection_date: '',
    donor_name: '',
    category: '',
    cash_amount: '0',
    upi_amount: '0',
    paytm_amount: '0',
    bank_amount: '0',
    cheque_amount: '0',
    amount: '0',
    payment_method: 'Cash',
    status: 'Received',
    notes: ''
  });

  // 6. Donations & Sadaqah State & Modals (Full 15-Column Layout)
  const [donationsList, setDonationsList] = useState([]);
  const [donationSearchTerm, setDonationSearchTerm] = useState('');
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showEditDonationModal, setShowEditDonationModal] = useState(false);

  const [donationForm, setDonationForm] = useState({
    contributor_type: 'Family',
    family_id: '',
    family_code: '',
    receipt_no: generateAutoTransactionId('REC-DON'),
    donation_date: getTodayDate(),
    donor_name: '',
    donor_mobile: '',
    category: 'General Donation',
    general_amount: '0',
    madrasa_amount: '0',
    ramadan_amount: '0',
    zakat_amount: '0',
    welfare_amount: '0',
    graveyard_amount: '0',
    other_amount: '0',
    cash_amount: '0',
    upi_amount: '0',
    paytm_amount: '0',
    bank_amount: '0',
    cheque_amount: '0',
    amount: '0',
    payment_method: 'Cash',
    status: 'Received',
    notes: ''
  });

  const [editDonationForm, setEditDonationForm] = useState({
    id: null,
    contributor_type: 'Family',
    family_id: '',
    family_code: '',
    receipt_no: '',
    donation_date: '',
    donor_name: '',
    donor_mobile: '',
    category: 'General Donation',
    general_amount: '0',
    madrasa_amount: '0',
    ramadan_amount: '0',
    zakat_amount: '0',
    welfare_amount: '0',
    graveyard_amount: '0',
    other_amount: '0',
    cash_amount: '0',
    upi_amount: '0',
    paytm_amount: '0',
    bank_amount: '0',
    cheque_amount: '0',
    amount: '0',
    payment_method: 'Cash',
    status: 'Received',
    notes: ''
  });

  // Fetch registered families safely on mount
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const res = await getCommunityFamilies();
        const list = Array.isArray(res) ? res : (res?.families || []);
        setFamiliesList(list);
      } catch (e) {
        console.warn('Error loading families:', e);
        setFamiliesList([]);
      }
    };
    loadFamilies();
  }, []);

  const fetchDataForTab = async () => {
    setLoading(true);
    try {
      if (currentTab === 'santha') {
        const data = await getSanthaOverview(santhaMonthFilter, santhaYearFilter);
        setSanthaOverview({
          summary: data?.summary || {
            due_amount: 0,
            total_families: 0,
            collected_amount: 0,
            collection_rate: 0,
            arrears_amount: 0,
            arrears_families: 0,
            advance_amount: 0,
            advance_families: 0
          },
          families: Array.isArray(data?.families) ? data.families : []
        });
      } else if (currentTab === 'santha-arrears') {
        const data = await getSanthaArrears();
        setArrearsList(Array.isArray(data) ? data : []);
      } else if (currentTab === 'santha-advances') {
        const data = await getSanthaAdvances();
        setAdvancesList(Array.isArray(data) ? data : []);
      } else if (currentTab === 'santha-receipts') {
        const data = await getSanthaReceipts();
        setReceiptsList(Array.isArray(data) ? data : []);
      } else if (currentTab === 'juma-collection') {
        const data = await getJumaCollections();
        setJumaList(Array.isArray(data) ? data : []);
      } else if (currentTab === 'donations') {
        const data = await getDonations();
        setDonationsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error fetching tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataForTab();
  }, [currentTab, santhaMonthFilter, santhaYearFilter]);

  // Helper to calculate advance description
  const calculateAdvanceDescription = (amountVal, rateVal) => {
    const num = parseFloat(amountVal) || 0;
    const rate = parseFloat(rateVal) || 500;
    if (num <= 0) return 'Advance Credit';
    if (num < rate) {
      return `₹${num} Partial Advance Credit towards Next Month`;
    }
    const months = Math.floor(num / rate);
    const remainder = num % rate;
    if (remainder === 0) {
      return `Next ${months} Months Credit Coverage`;
    }
    return `Next ${months} Months + ₹${remainder} Partial Credit Coverage`;
  };

  const [santhaCalcData, setSanthaCalcData] = useState(null);
  const [loadingCalc, setLoadingCalc] = useState(false);

  const fetchFamilyCalculation = async (famId) => {
    if (!famId) return;
    setLoadingCalc(true);
    try {
      const calc = await getFamilySanthaCalculation(famId);
      setSanthaCalcData(calc);
      if (calc && calc.suggested_collection_amount !== undefined) {
        setSanthaForm((prev) => ({
          ...prev,
          amount: calc.suggested_collection_amount.toString()
        }));
      }
    } catch (e) {
      console.warn('Error fetching family calculation:', e);
    } finally {
      setLoadingCalc(false);
    }
  };

  // Open Collect Santha Modal safely
  const handleOpenSanthaModal = (targetFamily = null) => {
    const safeFamilies = Array.isArray(familiesList) ? familiesList : [];
    const fam = targetFamily || (safeFamilies.length > 0 ? safeFamilies[0] : null);
    const famId = fam ? (fam.id || fam.family_id) : '';
    const rate = fam ? (fam.monthly_santha || 500) : 500;

    let initialAmt = rate;
    if (fam) {
      if (fam.pending_arrears !== undefined && fam.pending_arrears > 0) {
        initialAmt = fam.pending_arrears;
      } else if (fam.balance !== undefined && fam.balance > 0) {
        initialAmt = fam.balance;
      } else if (fam.due) {
        initialAmt = fam.due;
      }
    }

    setSanthaForm({
      family_id: famId,
      family_name: fam ? fam.family_name : '',
      family_code: fam ? fam.family_code || `F-${famId}` : '',
      head_name: fam ? fam.head_name || fam.family_name : '',
      payment_date: getTodayDate(),
      payment_time: getTodayTime(),
      month: santhaMonthFilter,
      year: santhaYearFilter,
      amount: initialAmt.toString(),
      monthly_santha: rate,
      payment_method: 'Cash',
      financial_account: 'Main Cash',
      allocation: 'Auto',
      advance_months: 1,
      advance_period: 'Next 1 Months Credit Coverage',
      reference_id: generateAutoTransactionId('TXN'),
      notes: ''
    });
    setSubmitError('');
    setSanthaCalcData(null);
    setShowSanthaModal(true);

    if (famId) {
      fetchFamilyCalculation(famId);
    }
  };

  // Open Edit Advance Modal
  const handleOpenEditAdvanceModal = (item) => {
    setEditAdvanceForm({
      id: item.id,
      receipt_no: item.receipt_no || '',
      family_name: item.family_name || '',
      family_code: item.family_code || '',
      head_name: item.head_name || '',
      amount: (item.advance_amount || item.amount || 0).toString(),
      payment_date: item.date && item.date !== '—' ? item.date : getTodayDate(),
      payment_method: item.payment_method || 'Cash',
      financial_account: item.financial_account || 'Main Cash',
      advance_months: item.advance_months || 1,
      advance_period: item.period || '',
      reference_id: item.reference_id || '',
      notes: item.notes || ''
    });
    setSubmitError('');
    setShowEditAdvanceModal(true);
  };

  // Open Add Juma Collection Modal (Auto Captures Live Current Month Friday)
  const handleOpenAddJumaModal = () => {
    const liveFriday = getCurrentLiveFriday();
    setJumaForm({
      receipt_no: generateAutoTransactionId('REC-JUM'),
      collection_date: liveFriday.date,
      donor_name: 'Friday Jumma Jamaat',
      category: liveFriday.label,
      cash_amount: '0',
      upi_amount: '0',
      paytm_amount: '0',
      bank_amount: '0',
      cheque_amount: '0',
      amount: '0',
      payment_method: 'Cash',
      status: 'Received',
      notes: ''
    });
    setSubmitError('');
    setShowJumaModal(true);
  };

  // Open Edit Juma Collection Modal
  const handleOpenEditJumaModal = (item) => {
    setEditJumaForm({
      id: item.id,
      receipt_no: item.receipt_no || '',
      collection_date: item.collection_date || getTodayDate(),
      donor_name: item.donor_name || 'Friday Jumma Jamaat',
      category: item.notes || '1st Juma Prayer',
      cash_amount: (item.cash_amount || 0).toString(),
      upi_amount: (item.upi_amount || 0).toString(),
      paytm_amount: (item.paytm_amount || 0).toString(),
      bank_amount: (item.bank_amount || 0).toString(),
      cheque_amount: (item.cheque_amount || 0).toString(),
      amount: (item.amount || 0).toString(),
      payment_method: item.payment_method || 'Cash',
      status: item.status || 'Received',
      notes: item.notes || ''
    });
    setSubmitError('');
    setShowEditJumaModal(true);
  };

  // Open Add Donation Modal (Full 15-Column Modal)
  const handleOpenAddDonationModal = () => {
    const safeFamilies = Array.isArray(familiesList) ? familiesList : [];
    const firstFam = safeFamilies.length > 0 ? safeFamilies[0] : null;

    setDonationForm({
      contributor_type: 'Family',
      family_id: firstFam ? firstFam.id : '',
      family_code: firstFam ? firstFam.family_code || `F-${firstFam.id}` : '',
      receipt_no: generateAutoTransactionId('REC-DON'),
      donation_date: getTodayDate(),
      donor_name: firstFam ? (firstFam.head_name || firstFam.family_name) : '',
      donor_mobile: '',
      category: 'General Donation',
      general_amount: '0',
      madrasa_amount: '0',
      ramadan_amount: '0',
      zakat_amount: '0',
      welfare_amount: '0',
      graveyard_amount: '0',
      other_amount: '0',
      cash_amount: '0',
      upi_amount: '0',
      paytm_amount: '0',
      bank_amount: '0',
      cheque_amount: '0',
      amount: '0',
      payment_method: 'Cash',
      status: 'Received',
      notes: ''
    });
    setSubmitError('');
    setShowDonationModal(true);
  };

  // Open Edit Donation Modal
  const handleOpenEditDonationModal = (item) => {
    setEditDonationForm({
      id: item.id,
      contributor_type: item.contributor_type || (item.family_id ? 'Family' : 'Other Person'),
      family_id: item.family_id || '',
      family_code: item.family_code || '',
      receipt_no: item.receipt_no || '',
      donation_date: item.donation_date || getTodayDate(),
      donor_name: item.donor_name || '',
      donor_mobile: item.donor_mobile || '',
      category: item.category || 'General Donation',
      general_amount: (item.general_amount || 0).toString(),
      madrasa_amount: (item.madrasa_amount || 0).toString(),
      ramadan_amount: (item.ramadan_amount || 0).toString(),
      zakat_amount: (item.zakat_amount || 0).toString(),
      welfare_amount: (item.welfare_amount || 0).toString(),
      graveyard_amount: (item.graveyard_amount || 0).toString(),
      other_amount: (item.other_amount || 0).toString(),
      cash_amount: (item.cash_amount || 0).toString(),
      upi_amount: (item.upi_amount || 0).toString(),
      paytm_amount: (item.paytm_amount || 0).toString(),
      bank_amount: (item.bank_amount || 0).toString(),
      cheque_amount: (item.cheque_amount || 0).toString(),
      amount: (item.amount || 0).toString(),
      payment_method: item.payment_method || 'Cash',
      status: item.status || 'Received',
      notes: item.notes || ''
    });
    setSubmitError('');
    setShowEditDonationModal(true);
  };

  // Submit Edit Advance Payment
  const handleEditAdvanceSubmit = async (e) => {
    e.preventDefault();
    if (!editAdvanceForm.amount || parseFloat(editAdvanceForm.amount) <= 0) {
      setSubmitError('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const amtVal = parseFloat(editAdvanceForm.amount) || 0;
      const computedMonths = Math.floor(amtVal / 500) || 0;

      await updateSanthaCollection(editAdvanceForm.id, {
        amount: amtVal,
        payment_date: editAdvanceForm.payment_date,
        payment_method: editAdvanceForm.payment_method,
        financial_account: editAdvanceForm.financial_account,
        reference_id: editAdvanceForm.reference_id,
        advance_months: computedMonths,
        advance_period: editAdvanceForm.advance_period || `Advance Credit (₹${amtVal})`,
        notes: editAdvanceForm.notes
      });

      setShowEditAdvanceModal(false);
      await fetchDataForTab();
    } catch (err) {
      console.error('Error updating advance payment:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to update advance payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Santha Payment (Calls POST /api/collections/santha)
  const handleSanthaSubmit = async (e) => {
    e.preventDefault();
    if (!santhaForm.family_name) {
      setSubmitError('Please select a family record.');
      return;
    }
    if (!santhaForm.amount || parseFloat(santhaForm.amount) <= 0) {
      setSubmitError('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const amtVal = parseFloat(santhaForm.amount) || 0;
      const rateVal = santhaForm.monthly_santha || 500;
      const computedMonths = Math.floor(amtVal / rateVal) || 0;
      const desc = calculateAdvanceDescription(amtVal, rateVal);
      const autoRef = santhaForm.reference_id || generateAutoTransactionId('TXN');

      const pDate = santhaForm.payment_date || getTodayDate();
      const pTime = santhaForm.payment_time || getTodayTime();
      const fullPaymentDate = `${pDate} ${pTime}`;

      await createSanthaCollection({
        family_id: parseInt(santhaForm.family_id),
        family_name: santhaForm.family_name,
        family_code: santhaForm.family_code,
        head_name: santhaForm.head_name,
        payment_date: fullPaymentDate,
        month: santhaForm.month,
        year: parseInt(santhaForm.year) || 2026,
        amount: amtVal,
        payment_method: santhaForm.payment_method,
        financial_account: santhaForm.financial_account,
        allocation: santhaForm.allocation,
        reference_id: autoRef,
        is_advance: santhaForm.allocation === 'Advance',
        is_arrears: santhaForm.allocation === 'Specific',
        advance_months: santhaForm.allocation === 'Advance' ? computedMonths : 0,
        advance_period: santhaForm.allocation === 'Advance' ? (santhaForm.advance_period || desc) : `${santhaForm.month} ${santhaForm.year}`,
        notes: santhaForm.notes || null
      });

      setShowSanthaModal(false);
      await fetchDataForTab();
    } catch (err) {
      console.error('Error saving Santha payment:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to save Santha collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Juma Collection (Calls POST /api/collections/juma)
  const handleJumaSubmit = async (e) => {
    e.preventDefault();
    const cash = parseFloat(jumaForm.cash_amount) || 0;
    const upi = parseFloat(jumaForm.upi_amount) || 0;
    const paytm = parseFloat(jumaForm.paytm_amount) || 0;
    const bank = parseFloat(jumaForm.bank_amount) || 0;
    const chq = parseFloat(jumaForm.cheque_amount) || 0;
    const pmtSum = cash + upi + paytm + bank + chq;
    const finalAmount = pmtSum > 0 ? pmtSum : (parseFloat(jumaForm.amount) || 0);

    if (finalAmount <= 0) {
      setSubmitError('Please enter a valid collection amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await createJumaCollection({
        receipt_no: jumaForm.receipt_no || generateAutoTransactionId('REC-JUM'),
        collection_date: jumaForm.collection_date || getTodayDate(),
        donor_name: jumaForm.donor_name || 'Friday Jumma Jamaat',
        cash_amount: cash,
        upi_amount: upi,
        paytm_amount: paytm,
        bank_amount: bank,
        cheque_amount: chq,
        payment_method: jumaForm.payment_method,
        amount: finalAmount,
        status: jumaForm.status || 'Received',
        juma_type: jumaForm.category || '1st Juma Prayer',
        notes: jumaForm.category || jumaForm.notes || null
      });

      setShowJumaModal(false);
      await fetchDataForTab();
    } catch (err) {
      console.error('Error saving Juma record:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to record Juma collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Juma Collection Record (Calls PUT /api/collections/juma/:id)
  const handleEditJumaSubmit = async (e) => {
    e.preventDefault();
    const cash = parseFloat(editJumaForm.cash_amount) || 0;
    const upi = parseFloat(editJumaForm.upi_amount) || 0;
    const paytm = parseFloat(editJumaForm.paytm_amount) || 0;
    const bank = parseFloat(editJumaForm.bank_amount) || 0;
    const chq = parseFloat(editJumaForm.cheque_amount) || 0;
    const pmtSum = cash + upi + paytm + bank + chq;
    const finalAmount = pmtSum > 0 ? pmtSum : (parseFloat(editJumaForm.amount) || 0);

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await updateJumaCollection(editJumaForm.id, {
        receipt_no: editJumaForm.receipt_no,
        collection_date: editJumaForm.collection_date,
        donor_name: editJumaForm.donor_name,
        cash_amount: cash,
        upi_amount: upi,
        paytm_amount: paytm,
        bank_amount: bank,
        cheque_amount: chq,
        payment_method: editJumaForm.payment_method,
        amount: finalAmount,
        status: editJumaForm.status,
        juma_type: editJumaForm.category || '1st Juma Prayer',
        notes: editJumaForm.category || editJumaForm.notes
      });

      setShowEditJumaModal(false);
      await fetchDataForTab();
    } catch (err) {
      console.error('Error updating Juma record:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to update Juma collection record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Donation (Calls POST /api/collections/donations)
  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donationForm.donor_name) {
      setSubmitError('Please specify the Donor Name or select a Family.');
      return;
    }

    const cash = parseFloat(donationForm.cash_amount) || 0;
    const upi = parseFloat(donationForm.upi_amount) || 0;
    const paytm = parseFloat(donationForm.paytm_amount) || 0;
    const bank = parseFloat(donationForm.bank_amount) || 0;
    const chq = parseFloat(donationForm.cheque_amount) || 0;
    const pmtSum = cash + upi + paytm + bank + chq;

    const gen = parseFloat(donationForm.general_amount) || 0;
    const mad = parseFloat(donationForm.madrasa_amount) || 0;
    const ram = parseFloat(donationForm.ramadan_amount) || 0;
    const zak = parseFloat(donationForm.zakat_amount) || 0;
    const wel = parseFloat(donationForm.welfare_amount) || 0;
    const grv = parseFloat(donationForm.graveyard_amount) || 0;
    const oth = parseFloat(donationForm.other_amount) || 0;
    const catSum = gen + mad + ram + zak + wel + grv + oth;

    const finalAmount = pmtSum > 0 ? pmtSum : (catSum > 0 ? catSum : (parseFloat(donationForm.amount) || 0));

    if (finalAmount <= 0) {
      setSubmitError('Please enter at least one donation contribution amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await createDonation({
        contributor_type: donationForm.contributor_type,
        family_id: donationForm.contributor_type === 'Family' && donationForm.family_id ? parseInt(donationForm.family_id) : null,
        family_code: donationForm.contributor_type === 'Family' ? donationForm.family_code : null,
        receipt_no: donationForm.receipt_no || generateAutoTransactionId('REC-DON'),
        donation_date: donationForm.donation_date || getTodayDate(),
        donor_name: donationForm.donor_name,
        donor_mobile: donationForm.donor_mobile || null,
        category: donationForm.category || 'General Donation',
        general_amount: gen,
        madrasa_amount: mad,
        ramadan_amount: ram,
        zakat_amount: zak,
        welfare_amount: wel,
        graveyard_amount: grv,
        other_amount: oth,
        cash_amount: cash,
        upi_amount: upi,
        paytm_amount: paytm,
        bank_amount: bank,
        cheque_amount: chq,
        amount: finalAmount,
        payment_method: donationForm.payment_method,
        status: donationForm.status || 'Received',
        notes: donationForm.notes || null
      });

      setShowDonationModal(false);
      await fetchDataForTab();
    } catch (err) {
      console.error('Error recording donation:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to record donation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Donation (Calls PUT /api/collections/donations/:id)
  const handleEditDonationSubmit = async (e) => {
    e.preventDefault();
    if (!editDonationForm.donor_name) {
      setSubmitError('Please specify Donor Name.');
      return;
    }

    const cash = parseFloat(editDonationForm.cash_amount) || 0;
    const upi = parseFloat(editDonationForm.upi_amount) || 0;
    const paytm = parseFloat(editDonationForm.paytm_amount) || 0;
    const bank = parseFloat(editDonationForm.bank_amount) || 0;
    const chq = parseFloat(editDonationForm.cheque_amount) || 0;
    const pmtSum = cash + upi + paytm + bank + chq;

    const gen = parseFloat(editDonationForm.general_amount) || 0;
    const mad = parseFloat(editDonationForm.madrasa_amount) || 0;
    const ram = parseFloat(editDonationForm.ramadan_amount) || 0;
    const zak = parseFloat(editDonationForm.zakat_amount) || 0;
    const wel = parseFloat(editDonationForm.welfare_amount) || 0;
    const grv = parseFloat(editDonationForm.graveyard_amount) || 0;
    const oth = parseFloat(editDonationForm.other_amount) || 0;
    const catSum = gen + mad + ram + zak + wel + grv + oth;

    const finalAmount = pmtSum > 0 ? pmtSum : (catSum > 0 ? catSum : (parseFloat(editDonationForm.amount) || 0));

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await updateDonation(editDonationForm.id, {
        contributor_type: editDonationForm.contributor_type,
        family_id: editDonationForm.contributor_type === 'Family' && editDonationForm.family_id ? parseInt(editDonationForm.family_id) : null,
        family_code: editDonationForm.contributor_type === 'Family' ? editDonationForm.family_code : null,
        receipt_no: editDonationForm.receipt_no,
        donation_date: editDonationForm.donation_date,
        donor_name: editDonationForm.donor_name,
        donor_mobile: editDonationForm.donor_mobile,
        category: editDonationForm.category,
        general_amount: gen,
        madrasa_amount: mad,
        ramadan_amount: ram,
        zakat_amount: zak,
        welfare_amount: wel,
        graveyard_amount: grv,
        other_amount: oth,
        cash_amount: cash,
        upi_amount: upi,
        paytm_amount: paytm,
        bank_amount: bank,
        cheque_amount: chq,
        payment_method: editDonationForm.payment_method,
        amount: finalAmount,
        status: editDonationForm.status,
        notes: editDonationForm.notes
      });

      setShowEditDonationModal(false);
      await fetchDataForTab();
    } catch (err) {
      console.error('Error updating donation:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to update donation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { summary, families } = santhaOverview;
  const safeFamiliesList = Array.isArray(familiesList) ? familiesList : [];
  const safeArrearsList = Array.isArray(arrearsList) ? arrearsList : [];
  const safeAdvancesList = Array.isArray(advancesList) ? advancesList : [];
  const safeReceiptsList = Array.isArray(receiptsList) ? receiptsList : [];
  const safeJumaList = Array.isArray(jumaList) ? jumaList : [];
  const safeDonationsList = Array.isArray(donationsList) ? donationsList : [];

  // Calculate Juma Summary Totals dynamically from PostgreSQL data
  const totalJumaCollected = safeJumaList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const cashJumaCollected = safeJumaList.reduce((sum, item) => sum + (item.cash_amount || (item.payment_method === 'Cash' ? item.amount : 0)), 0);
  const digitalJumaCollected = safeJumaList.reduce((sum, item) => sum + (item.upi_amount + item.paytm_amount + item.bank_amount || (item.payment_method !== 'Cash' ? item.amount : 0)), 0);

  // Calculate Donation Summary Totals dynamically from PostgreSQL data
  const totalDonationCollected = safeDonationsList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalDonationGeneral = safeDonationsList.reduce((sum, item) => sum + (item.general_amount || 0), 0);
  const totalDonationMadrasa = safeDonationsList.reduce((sum, item) => sum + (item.madrasa_amount || 0), 0);
  const totalDonationZakat = safeDonationsList.reduce((sum, item) => sum + (item.zakat_amount || 0), 0);
  const totalDonationWelfare = safeDonationsList.reduce((sum, item) => sum + (item.welfare_amount || 0), 0);
  const totalDonationRamadan = safeDonationsList.reduce((sum, item) => sum + (item.ramadan_amount || 0), 0);
  const totalDonationGraveyard = safeDonationsList.reduce((sum, item) => sum + (item.graveyard_amount || 0), 0);

  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-[#f8fafc] font-sans">
      <UserSidebar />

      <div className="min-w-0 h-full flex-1 overflow-y-auto flex flex-col justify-between">
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Breadcrumb Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
              <span className="hover:text-slate-600 cursor-pointer">Masjid</span>
              <span>/</span>
              <span className="text-slate-900 font-bold">Collections</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAGE 1: SANTHA COLLECTION MAIN PAGE                                       */}
          {/* ========================================================================= */}
          {currentTab === 'santha' && (
            <div className="space-y-6 font-sans">
              
              {/* Header Title & Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Santha Collection</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Monthly family contributions, arrears, advances and receipts.</p>
                </div>

                <button
                  onClick={() => handleOpenSanthaModal(null)}
                  className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-2 shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Collect Santha</span>
                </button>
              </div>

              {/* 4 Summary Metric Cards (Dynamic API Data) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1: Month Due */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">{santhaMonthFilter} Due</span>
                    <h3 className="text-2xl font-black text-slate-900">
                      ₹{summary?.due_amount ? summary.due_amount.toLocaleString() : '0'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{summary?.total_families || 0} families</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    ₹
                  </div>
                </div>

                {/* Metric 2: Collected */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Collected</span>
                    <h3 className="text-2xl font-black text-slate-900">
                      ₹{summary?.collected_amount ? summary.collected_amount.toLocaleString() : '0'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{summary?.collection_rate || 0}%</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                  </div>
                </div>

                {/* Metric 3: Arrears */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Arrears</span>
                    <h3 className="text-2xl font-black text-slate-900">
                      ₹{summary?.arrears_amount ? summary.arrears_amount.toLocaleString() : '0'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{summary?.arrears_families || 0} families</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    !
                  </div>
                </div>

                {/* Metric 4: Advance */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Advance</span>
                    <h3 className="text-2xl font-black text-slate-900">
                      ₹{summary?.advance_amount ? summary.advance_amount.toLocaleString() : '0'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{summary?.advance_families || 0} families</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    +
                  </div>
                </div>

              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search family or member..."
                    value={santhaSearchTerm}
                    onChange={(e) => setSanthaSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center space-x-3 shrink-0 w-full sm:w-auto justify-end">
                  <select
                    value={santhaMonthFilter}
                    onChange={(e) => setSanthaMonthFilter(e.target.value)}
                    className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                      <option key={m} value={m}>{m} 2026</option>
                    ))}
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>

              {/* Table View */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="py-4 px-4 sm:px-6">FAMILY</th>
                        <th className="py-4 px-4 sm:px-6">HEAD</th>
                        <th className="py-4 px-4 sm:px-6">PERIOD</th>
                        <th className="py-4 px-4 sm:px-6">DUE</th>
                        <th className="py-4 px-4 sm:px-6">PAID</th>
                        <th className="py-4 px-4 sm:px-6">BALANCE</th>
                        <th className="py-4 px-4 sm:px-6">STATUS</th>
                        <th className="py-4 px-4 sm:px-6 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-400">Loading live Santha collection records...</td>
                        </tr>
                      ) : (() => {
                        const safeFamilies = Array.isArray(families) ? families : [];
                        const filtered = safeFamilies.filter((f) => {
                          if (!santhaSearchTerm) return true;
                          const term = santhaSearchTerm.toLowerCase();
                          return (
                            (f.family_name || '').toLowerCase().includes(term) ||
                            (f.family_code || '').toLowerCase().includes(term) ||
                            (f.head_name || '').toLowerCase().includes(term)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan="8" className="py-8 text-center text-slate-400">No family Santha records found matching your search.</td>
                            </tr>
                          );
                        }

                        return filtered.map((item) => {
                          const outstanding = item.balance ?? 0;
                          const isFullPaid = outstanding === 0;
                          const isPartiallyPaid = outstanding > 0 && (item.paid > 0);

                          let statusBadge = (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              ✓ Full Amount Paid
                            </span>
                          );

                          if (isPartiallyPaid) {
                            statusBadge = (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-800 border-amber-300">
                                ⚡ Partially Paid (₹{outstanding.toLocaleString()} Pending)
                              </span>
                            );
                          } else if (outstanding > 0) {
                            statusBadge = (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-50 text-rose-800 border-rose-300">
                                ⚠️ Outstanding Dues (₹{outstanding.toLocaleString()})
                              </span>
                            );
                          }

                          return (
                            <tr key={item.family_id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                                {item.family_code} • {item.family_name}
                              </td>
                              <td className="py-4 px-4 sm:px-6 text-slate-700 font-bold">
                                {item.head_name}
                              </td>
                              <td className="py-4 px-4 sm:px-6 text-slate-600 font-medium">
                                {item.joining_date || item.period}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                                ₹{item.due.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-emerald-600">
                                ₹{item.paid.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-rose-700">
                                ₹{outstanding.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 sm:px-6">
                                {statusBadge}
                              </td>
                              <td className="py-4 px-4 sm:px-6 text-right">
                                <button
                                  onClick={() => handleOpenSanthaModal(item)}
                                  className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center space-x-1.5"
                                >
                                  <Edit2 className="w-3 h-3 text-emerald-400" />
                                  <span>Manage Record</span>
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 2: SANTHA ARREARS                                                 */}
          {/* ========================================================================= */}
          {currentTab === 'santha-arrears' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-900">Santha Arrears & Pending Dues</h3>
                <p className="text-xs text-slate-500 font-medium">Track families with outstanding unpaid Santha balances.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4">FAMILY CODE</th>
                      <th className="py-3.5 px-4">FAMILY NAME</th>
                      <th className="py-3.5 px-4">HEAD NAME</th>
                      <th className="py-3.5 px-4">AREA</th>
                      <th className="py-3.5 px-4">MONTHLY RATE</th>
                      <th className="py-3.5 px-4">PENDING ARREARS</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400">Loading Santha arrears...</td>
                      </tr>
                    ) : safeArrearsList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400">No families with outstanding Santha arrears! All dues are clear.</td>
                      </tr>
                    ) : (
                      safeArrearsList.map((item) => (
                        <tr key={item.family_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.family_code}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{item.family_name}</td>
                          <td className="py-3.5 px-4 text-slate-700">{item.head_name}</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.area}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">₹{item.monthly_santha}</td>
                          <td className="py-3.5 px-4 font-extrabold text-rose-600">₹{item.pending_arrears.toLocaleString()}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                              ⚠️ {item.months_overdue} Months Arrears
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenSanthaModal(item)}
                              className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center space-x-1.5"
                            >
                              <Edit2 className="w-3 h-3 text-rose-400" />
                              <span>Edit / Collect</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 3: SANTHA ADVANCES                                                */}
          {/* ========================================================================= */}
          {currentTab === 'santha-advances' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Santha Advances Ledger</h3>
                  <p className="text-xs text-slate-500 font-medium">Record of advance Santha payments contributed ahead of schedule by families.</p>
                </div>
                <button
                  onClick={() => handleOpenSanthaModal(null)}
                  className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Collect Advance</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4">RECEIPT NO</th>
                      <th className="py-3.5 px-4">PAYMENT DATE</th>
                      <th className="py-3.5 px-4">FAMILY CODE</th>
                      <th className="py-3.5 px-4">FAMILY NAME</th>
                      <th className="py-3.5 px-4">HEAD NAME</th>
                      <th className="py-3.5 px-4 font-bold text-emerald-700">ADVANCE AMOUNT</th>
                      <th className="py-3.5 px-4">MONTHS / CREDIT</th>
                      <th className="py-3.5 px-4">COVERAGE PERIOD</th>
                      <th className="py-3.5 px-4">PAYMENT METHOD</th>
                      <th className="py-3.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-slate-400">Loading advance payments...</td>
                      </tr>
                    ) : safeAdvancesList.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-slate-400">No advance Santha payments recorded yet. Click "+ Collect Santha" and select "Advance".</td>
                      </tr>
                    ) : (
                      safeAdvancesList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.receipt_no}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 bg-slate-50/50">{item.date}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{item.family_code}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{item.family_name}</td>
                          <td className="py-3.5 px-4 text-slate-700">{item.head_name}</td>
                          <td className="py-3.5 px-4 font-extrabold text-emerald-700">₹{item.advance_amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {item.advance_months > 0 ? `${item.advance_months} Months` : 'Custom Credit'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">{item.period}</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.payment_method}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditAdvanceModal(item)}
                              className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center space-x-1.5"
                            >
                              <Edit2 className="w-3 h-3 text-emerald-400" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 4: SANTHA RECEIPTS                                                */}
          {/* ========================================================================= */}
          {currentTab === 'santha-receipts' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-900">Santha Receipts Ledger</h3>
                <p className="text-xs text-slate-500 font-medium">Complete record of official Santha payment receipts.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                    <tr>
                      <th className="py-3.5 px-4">RECEIPT NO</th>
                      <th className="py-3.5 px-4">DATE</th>
                      <th className="py-3.5 px-4">FAMILY</th>
                      <th className="py-3.5 px-4">PERIOD</th>
                      <th className="py-3.5 px-4">AMOUNT</th>
                      <th className="py-3.5 px-4">PREV BAL</th>
                      <th className="py-3.5 px-4">REMAINING BAL</th>
                      <th className="py-3.5 px-4">PAYMENT MODE</th>
                      <th className="py-3.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-400">Loading receipts ledger...</td>
                      </tr>
                    ) : safeReceiptsList.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-400">No receipts generated yet.</td>
                      </tr>
                    ) : (
                      safeReceiptsList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.receipt_no}</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.date}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{item.family_name} ({item.family_code})</td>
                          <td className="py-3.5 px-4 text-slate-700">{item.month_year}</td>
                          <td className="py-3.5 px-4 font-extrabold text-emerald-700">₹{item.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">₹{(item.previous_balance || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-rose-600">₹{(item.remaining_balance || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.payment_method}</td>
                          <td className="py-3.5 px-4 text-right flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenEditAdvanceModal(item)}
                              className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center space-x-1.5"
                            >
                              <Edit2 className="w-3 h-3 text-emerald-400" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setSelectedReceipt(item)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5"
                            >
                              <Printer className="w-3 h-3 text-slate-600" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 5: JUMMA COLLECTION (Standard Streamlined Format)                 */}
          {/* ========================================================================= */}
          {currentTab === 'juma-collection' && (
            <div className="space-y-6 font-sans">
              
              {/* Header Title & + Add Record Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Jumma Collection</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Friday Jumma contributions, cash and digital collection log.</p>
                </div>

                <button
                  onClick={handleOpenAddJumaModal}
                  className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-2 shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Add Record</span>
                </button>
              </div>

              {/* 4 Streamlined Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Total Jumma Collection</span>
                    <h3 className="text-2xl font-black text-emerald-700">₹{totalJumaCollected.toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">{safeJumaList.length} collection entries</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    ₹
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Cash Collection</span>
                    <h3 className="text-2xl font-black text-slate-900">₹{cashJumaCollected.toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">Physical Cash Box</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Banknote className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Digital / Online</span>
                    <h3 className="text-2xl font-black text-slate-900">₹{digitalJumaCollected.toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">QR / UPI / Bank</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Total Friday Records</span>
                    <h3 className="text-2xl font-black text-slate-900">{safeJumaList.length}</h3>
                    <p className="text-xs text-slate-400 font-medium">Recorded Friday Collections</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by receipt ID, donor..."
                    value={jumaSearchTerm}
                    onChange={(e) => setJumaSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-colors self-end sm:self-center"
                >
                  Export Ledger
                </button>
              </div>

              {/* Standard 8-Column Table for Jumma Collection */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="py-4 px-4 whitespace-nowrap">RECEIPT NO</th>
                        <th className="py-4 px-4 whitespace-nowrap">DATE</th>
                        <th className="py-4 px-4 whitespace-nowrap">DONOR NAME</th>
                        <th className="py-4 px-4 whitespace-nowrap">JUMMA CATEGORY / TYPE</th>
                        <th className="py-4 px-4 whitespace-nowrap font-bold text-slate-900">AMOUNT</th>
                        <th className="py-4 px-4 whitespace-nowrap">PAYMENT METHOD</th>
                        <th className="py-4 px-4 whitespace-nowrap">STATUS</th>
                        <th className="py-4 px-4 text-right whitespace-nowrap">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-400">Loading Jumma collection records...</td>
                        </tr>
                      ) : (() => {
                        const filtered = safeJumaList.filter((item) => {
                          if (!jumaSearchTerm) return true;
                          const term = jumaSearchTerm.toLowerCase();
                          return (
                            (item.donor_name || '').toLowerCase().includes(term) ||
                            (item.receipt_no || '').toLowerCase().includes(term) ||
                            (item.notes || '').toLowerCase().includes(term)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan="8" className="py-8 text-center text-slate-400">No Jumma collection records found. Click "+ Add Record" to add one.</td>
                            </tr>
                          );
                        }

                        return filtered.map((item) => {
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-slate-700">{item.receipt_no || `JUM-26-${item.id < 10 ? '0' + item.id : item.id}`}</td>
                              <td className="py-4 px-4 text-slate-600 whitespace-nowrap">{item.collection_date || '—'}</td>
                              <td className="py-4 px-4 font-bold text-slate-900">{item.donor_name || 'Friday Jumma Jamaat'}</td>
                              <td className="py-4 px-4 text-slate-700 font-bold">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-emerald-600" />
                                  <span>{item.notes || 'Friday Juma Prayer'}</span>
                                </span>
                              </td>
                              <td className="py-4 px-4 font-black text-emerald-700 text-sm">₹{(item.amount || 0).toLocaleString()}</td>
                              <td className="py-4 px-4 font-medium text-slate-700">{item.payment_method || 'Cash'}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.status === 'Received' || item.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {item.status || 'Received'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenEditJumaModal(item)}
                                  className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1 shadow-sm"
                                >
                                  <Edit2 className="w-3 h-3 text-emerald-400" />
                                  <span>Edit</span>
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 6: DONATIONS & SADAQAH (Full 15-Column Category & Breakdown Layout) */}
          {/* ========================================================================= */}
          {currentTab === 'donations' && (
            <div className="space-y-6 font-sans">
              
              {/* Header Title & + Add Record Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Donations & Sadaqah</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Category & payment-method wise general donations & Sadaqah contributions log.</p>
                </div>

                <button
                  onClick={handleOpenAddDonationModal}
                  className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-2 shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Add Record</span>
                </button>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Total Donations Collected</span>
                    <h3 className="text-2xl font-black text-emerald-700">₹{totalDonationCollected.toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">{safeDonationsList.length} total entries</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    ₹
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">General & Madrasa</span>
                    <h3 className="text-2xl font-black text-slate-900">₹{(totalDonationGeneral + totalDonationMadrasa).toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">General: ₹{totalDonationGeneral} • Madrasa: ₹{totalDonationMadrasa}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Building className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Zakat & Welfare</span>
                    <h3 className="text-2xl font-black text-slate-900">₹{(totalDonationZakat + totalDonationWelfare).toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">Zakat: ₹{totalDonationZakat} • Welfare: ₹{totalDonationWelfare}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                    <HeartHandshake className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Ramadan & Graveyard</span>
                    <h3 className="text-2xl font-black text-slate-900">₹{(totalDonationRamadan + totalDonationGraveyard).toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 font-medium">Ramadan: ₹{totalDonationRamadan} • Graveyard: ₹{totalDonationGraveyard}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    +
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search donation receipt, donor name..."
                    value={donationSearchTerm}
                    onChange={(e) => setDonationSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-colors self-end sm:self-center"
                >
                  Export Ledger
                </button>
              </div>

              {/* 15-Column Table for Donations */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="py-4 px-3 whitespace-nowrap">FAMILY / OTHER PERSON</th>
                        <th className="py-4 px-3 whitespace-nowrap">RECEIPT ID</th>
                        <th className="py-4 px-3 whitespace-nowrap">DATE</th>
                        <th className="py-4 px-3 whitespace-nowrap">DONOR NAME</th>
                        <th className="py-4 px-3 whitespace-nowrap">GENERAL</th>
                        <th className="py-4 px-3 whitespace-nowrap">MADRASA</th>
                        <th className="py-4 px-3 whitespace-nowrap">RAMADAN</th>
                        <th className="py-4 px-3 whitespace-nowrap">ZAKAT</th>
                        <th className="py-4 px-3 whitespace-nowrap">WELFARE</th>
                        <th className="py-4 px-3 whitespace-nowrap">GRAVEYARD</th>
                        <th className="py-4 px-3 whitespace-nowrap">OTHER</th>
                        <th className="py-4 px-3 whitespace-nowrap">METHOD</th>
                        <th className="py-4 px-3 whitespace-nowrap font-bold text-slate-900">AMOUNT</th>
                        <th className="py-4 px-3 whitespace-nowrap">STATUS</th>
                        <th className="py-4 px-3 text-right whitespace-nowrap">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan="15" className="py-8 text-center text-slate-400">Loading live donation records...</td>
                        </tr>
                      ) : (() => {
                        const filtered = safeDonationsList.filter((item) => {
                          if (!donationSearchTerm) return true;
                          const term = donationSearchTerm.toLowerCase();
                          return (
                            (item.donor_name || '').toLowerCase().includes(term) ||
                            (item.receipt_no || '').toLowerCase().includes(term) ||
                            (item.family_code || '').toLowerCase().includes(term)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan="15" className="py-8 text-center text-slate-400">No donation records found matching your search. Click "+ Add Record" to add one.</td>
                            </tr>
                          );
                        }

                        return filtered.map((item) => {
                          const isFamily = item.contributor_type === 'Family' || !!item.family_id;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isFamily
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {isFamily ? <Users className="w-3 h-3 text-emerald-600" /> : <UserCheck className="w-3 h-3 text-slate-500" />}
                                  <span>{isFamily ? `Family (${item.family_code || 'F-001'})` : 'Other Person'}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-mono font-bold text-slate-700">{item.receipt_no || `DON-26-${item.id < 10 ? '0' + item.id : item.id}`}</td>
                              <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{item.donation_date || '—'}</td>
                              <td className="py-3.5 px-3 font-bold text-slate-900">{item.donor_name || 'Anonymous Donor'}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.general_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.madrasa_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.ramadan_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.zakat_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.welfare_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.graveyard_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-slate-700">₹{(item.other_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 font-medium text-slate-700">{item.payment_method || 'Cash'}</td>
                              <td className="py-3.5 px-3 font-black text-emerald-700 text-sm">₹{(item.amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {item.status || 'Received'}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenEditDonationModal(item)}
                                  className="px-3 py-1 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1 shadow-sm"
                                >
                                  <Edit2 className="w-3 h-3 text-emerald-400" />
                                  <span>Edit</span>
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>

        <footer className="text-center py-4 border-t border-slate-200/60 bg-[#f8fafc] text-slate-400 text-xs font-medium shrink-0">
          Masjid Manager • Active System
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: COLLECT SANTHA                                                     */}
      {/* ========================================================================= */}
      {showSanthaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">Collect Santha</h3>
              <button
                onClick={() => setShowSanthaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleSanthaSubmit} className="space-y-5 text-xs font-medium">
              
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Family</label>
                <select
                  value={santhaForm.family_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    const fam = safeFamiliesList.find((f) => f.id === parseInt(val));
                    const rate = fam ? (fam.monthly_santha || 500) : 500;
                    setSanthaForm({
                      ...santhaForm,
                      family_id: val,
                      family_name: fam ? fam.family_name : '',
                      family_code: fam ? fam.family_code || `F-${fam.id}` : '',
                      head_name: fam ? fam.head_name || fam.family_name : '',
                      monthly_santha: rate,
                      amount: santhaForm.allocation === 'Advance' ? (rate * (santhaForm.advance_months || 1)).toString() : (fam ? (fam.due || rate).toString() : '500')
                    });
                    if (val) {
                      fetchFamilyCalculation(val);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                >
                  {safeFamiliesList.length === 0 ? (
                    <option value="">No families registered</option>
                  ) : (
                    safeFamiliesList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.family_code || `F-${String(f.id).padStart(4, '0')}`} • {f.family_name} • {f.head_name || f.family_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* SANTHA JOINING DATE & PAYMENT BREAKDOWN CARD */}
              {loadingCalc ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center space-x-2 text-xs text-slate-500 font-medium">
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span>Calculating joining date dues & payment history...</span>
                </div>
              ) : santhaCalcData ? (
                <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-md font-sans">
                  {/* Sequence Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                        Santha Calculation Sequence
                      </span>
                      <h4 className="text-xs font-bold text-slate-200 mt-0.5">
                        Joining Date ({santhaCalcData.joining_date}) → {santhaCalcData.applicable_months} Applicable Months
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ₹{santhaCalcData.monthly_rate}/mo
                    </span>
                  </div>

                  {/* Metric Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-medium block uppercase">Total Required</span>
                      <span className="text-sm font-extrabold text-white">₹{santhaCalcData.required_santha?.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-medium block uppercase">Previous Paid</span>
                      <span className="text-sm font-extrabold text-emerald-400">₹{santhaCalcData.total_paid?.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-medium block uppercase">Pending Arrears</span>
                      <span className="text-sm font-extrabold text-rose-400">₹{santhaCalcData.pending_arrears?.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-medium block uppercase">Suggested Pay</span>
                      <span className="text-sm font-extrabold text-amber-300">₹{santhaCalcData.suggested_collection_amount?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Month-by-Month History Accordion/Table */}
                  {santhaCalcData.month_breakdown && santhaCalcData.month_breakdown.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Payment History from Joining Month ({santhaCalcData.joining_date})
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {santhaCalcData.month_breakdown.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/40 text-[11px]">
                            <span className="font-bold text-slate-200">{m.month}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-400 font-mono">₹{m.due_amount}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                                m.status === 'Paid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : m.status === 'Partially Paid'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}>
                                {m.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={santhaForm.payment_date}
                    onChange={(e) => setSanthaForm({ ...santhaForm, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Payment Time</label>
                  <input
                    type="time"
                    value={santhaForm.payment_time}
                    onChange={(e) => setSanthaForm({ ...santhaForm, payment_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Type any amount e.g. 100, 200, 300, 500"
                    value={santhaForm.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = parseFloat(val) || 0;
                      const rate = santhaForm.monthly_santha || 500;
                      const desc = calculateAdvanceDescription(val, rate);
                      const mCount = Math.floor(numVal / rate) || 0;
                      setSanthaForm({
                        ...santhaForm,
                        amount: val,
                        advance_months: mCount,
                        advance_period: desc
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Payment Method</label>
                  <select
                    value={santhaForm.payment_method}
                    onChange={(e) => setSanthaForm({ ...santhaForm, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Financial Account</label>
                  <select
                    value={santhaForm.financial_account}
                    onChange={(e) => setSanthaForm({ ...santhaForm, financial_account: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Main Cash">Main Cash</option>
                    <option value="Bank Account">Bank Account</option>
                    <option value="UPI QR Account">UPI QR Account</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3">
                <label className="block text-slate-800 font-bold text-xs">Allocation</label>
                
                <div className="grid grid-cols-1 gap-3 text-xs max-w-xs">
                  <div
                    className="p-3 rounded-xl border bg-white border-slate-900 ring-2 ring-slate-900 shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-900 bg-slate-900 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                      <span className="font-extrabold text-slate-900">Auto</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">Oldest dues first</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-semibold">Reference / Transaction ID</label>
                  <button
                    type="button"
                    onClick={() => setSanthaForm({ ...santhaForm, reference_id: generateAutoTransactionId('TXN') })}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-600" />
                    <span>Auto-Generate New ID</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Auto-generated (e.g. TXN-20260821-4921) or custom UPI Ref"
                  value={santhaForm.reference_id}
                  onChange={(e) => setSanthaForm({ ...santhaForm, reference_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
                <textarea
                  rows="3"
                  placeholder="Optional notes"
                  value={santhaForm.notes}
                  onChange={(e) => setSanthaForm({ ...santhaForm, notes: e.target.value })}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSanthaModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Payment...</span>
                    </>
                  ) : (
                    <span>Save & Generate Receipt</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT ADVANCE SANTHA PAYMENT                                        */}
      {/* ========================================================================= */}
      {showEditAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Advance Santha Payment</h3>
                <p className="text-xs text-slate-500 font-medium">Receipt #{editAdvanceForm.receipt_no} • {editAdvanceForm.family_name} ({editAdvanceForm.family_code})</p>
              </div>
              <button
                onClick={() => setShowEditAdvanceModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleEditAdvanceSubmit} className="space-y-5 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={editAdvanceForm.payment_date}
                    onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Advance Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="500"
                    value={editAdvanceForm.amount}
                    onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-extrabold text-emerald-800 bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Payment Method</label>
                  <select
                    value={editAdvanceForm.payment_method}
                    onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Financial Account</label>
                  <select
                    value={editAdvanceForm.financial_account}
                    onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, financial_account: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Main Cash">Main Cash</option>
                    <option value="Bank Account">Bank Account</option>
                    <option value="UPI QR Account">UPI QR Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Advance Coverage Description</label>
                <input
                  type="text"
                  value={editAdvanceForm.advance_period}
                  onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, advance_period: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  placeholder="e.g. Next 6 Months Credit Coverage"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-semibold">Reference / Transaction ID</label>
                  <button
                    type="button"
                    onClick={() => setEditAdvanceForm({ ...editAdvanceForm, reference_id: generateAutoTransactionId('TXN') })}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-600" />
                    <span>Auto-Generate New ID</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editAdvanceForm.reference_id}
                  onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, reference_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
                <textarea
                  rows="3"
                  value={editAdvanceForm.notes}
                  onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, notes: e.target.value })}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this advance payment record?')) {
                      try {
                        await deleteSanthaCollection(editAdvanceForm.id);
                        setShowEditAdvanceModal(false);
                        await fetchDataForTab();
                      } catch (err) {
                        setSubmitError('Failed to delete record.');
                      }
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowEditAdvanceModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Record...</span>
                      </>
                    ) : (
                      <span>Update Advance Record</span>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: + ADD JUMMA COLLECTION RECORD (Auto Captures Live Current Friday)   */}
      {/* ========================================================================= */}
      {showJumaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Add Jumma Collection Record</h3>
                <p className="text-xs text-slate-500 font-medium">Record Friday Jumma collection date, payment breakdown, and total collection.</p>
              </div>
              <button
                onClick={() => setShowJumaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleJumaSubmit} className="space-y-5 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Jumma Date</label>
                  <input
                    type="date"
                    value={jumaForm.collection_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const fridays = getMonthFridays(newDate);
                      const matched = fridays.find((f) => f.date === newDate);
                      setJumaForm({
                        ...jumaForm,
                        collection_date: newDate,
                        category: matched ? matched.label : (jumaForm.category || `Friday Collection (${newDate})`)
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-700 font-bold">Receipt ID</label>
                    <button
                      type="button"
                      onClick={() => setJumaForm({ ...jumaForm, receipt_no: generateAutoTransactionId('REC-JUM') })}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={jumaForm.receipt_no}
                    onChange={(e) => setJumaForm({ ...jumaForm, receipt_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Donor / Collection Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Friday Jumma Jamaat / General Box Collection"
                  value={jumaForm.donor_name}
                  onChange={(e) => setJumaForm({ ...jumaForm, donor_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                  <span>Jumma Category / Friday Date</span>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ⚡ Live Month Fridays Auto-Calculated
                  </span>
                </label>
                <select
                  value={jumaForm.category}
                  onChange={(e) => {
                    const selectedLabel = e.target.value;
                    const monthFridays = getMonthFridays(jumaForm.collection_date);
                    const matched = monthFridays.find((f) => f.label === selectedLabel);
                    setJumaForm({
                      ...jumaForm,
                      category: selectedLabel,
                      collection_date: matched ? matched.date : jumaForm.collection_date
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                >
                  {getMonthFridays(jumaForm.collection_date).map((f) => (
                    <option key={f.date} value={f.label}>
                      {f.label}
                    </option>
                  ))}
                  <option value="General Friday Collection">General Friday Collection</option>
                  <option value="Special Event Juma">Special Event Juma</option>
                </select>
              </div>

              {/* PAYMENT METHOD BREAKDOWN */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Payment Method-wise Collection Breakdown</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={jumaForm.cash_amount}
                      onChange={(e) => setJumaForm({ ...jumaForm, cash_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">QR / UPI (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={jumaForm.upi_amount}
                      onChange={(e) => setJumaForm({ ...jumaForm, upi_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Paytm (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={jumaForm.paytm_amount}
                      onChange={(e) => setJumaForm({ ...jumaForm, paytm_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Bank Transfer (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={jumaForm.bank_amount}
                      onChange={(e) => setJumaForm({ ...jumaForm, bank_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Cheque / Other (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={jumaForm.cheque_amount}
                      onChange={(e) => setJumaForm({ ...jumaForm, cheque_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Auto Calculated Sum */}
                {(() => {
                  const cash = parseFloat(jumaForm.cash_amount) || 0;
                  const upi = parseFloat(jumaForm.upi_amount) || 0;
                  const paytm = parseFloat(jumaForm.paytm_amount) || 0;
                  const bank = parseFloat(jumaForm.bank_amount) || 0;
                  const chq = parseFloat(jumaForm.cheque_amount) || 0;
                  const pmtTotal = cash + upi + paytm + bank + chq;
                  const autoCalculatedTotal = pmtTotal > 0 ? pmtTotal : (parseFloat(jumaForm.amount) || 0);

                  return (
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-300 flex items-center justify-between font-extrabold text-emerald-950 shadow-sm">
                      <span>Total Collection Amount:</span>
                      <span className="text-xl text-emerald-700 font-black">₹{autoCalculatedTotal.toLocaleString()}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Collection Status</label>
                  <select
                    value={jumaForm.status}
                    onChange={(e) => setJumaForm({ ...jumaForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
                  <input
                    type="text"
                    placeholder="Optional details or comments"
                    value={jumaForm.notes}
                    onChange={(e) => setJumaForm({ ...jumaForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowJumaModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Record...</span>
                    </>
                  ) : (
                    <span>Save Jumma Record</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT JUMMA COLLECTION RECORD                                       */}
      {/* ========================================================================= */}
      {showEditJumaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Jumma Collection Record</h3>
                <p className="text-xs text-slate-500 font-medium">Receipt ID: {editJumaForm.receipt_no}</p>
              </div>
              <button
                onClick={() => setShowEditJumaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleEditJumaSubmit} className="space-y-5 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Donor Name</label>
                  <input
                    type="text"
                    value={editJumaForm.donor_name}
                    onChange={(e) => setEditJumaForm({ ...editJumaForm, donor_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Collection Date</label>
                  <input
                    type="date"
                    value={editJumaForm.collection_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const fridays = getMonthFridays(newDate);
                      const matched = fridays.find((f) => f.date === newDate);
                      setEditJumaForm({
                        ...editJumaForm,
                        collection_date: newDate,
                        category: matched ? matched.label : editJumaForm.category
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Jumma Category / Friday Date</label>
                <select
                  value={editJumaForm.category}
                  onChange={(e) => {
                    const selectedLabel = e.target.value;
                    const monthFridays = getMonthFridays(editJumaForm.collection_date);
                    const matched = monthFridays.find((f) => f.label === selectedLabel);
                    setEditJumaForm({
                      ...editJumaForm,
                      category: selectedLabel,
                      collection_date: matched ? matched.date : editJumaForm.collection_date
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                >
                  {getMonthFridays(editJumaForm.collection_date).map((f) => (
                    <option key={f.date} value={f.label}>
                      {f.label}
                    </option>
                  ))}
                  <option value="General Friday Collection">General Friday Collection</option>
                  <option value="Special Event Juma">Special Event Juma</option>
                </select>
              </div>

              {/* Payment Method Breakdown */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider block">
                  Payment Method-wise Collection Breakdown
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editJumaForm.cash_amount}
                      onChange={(e) => setEditJumaForm({ ...editJumaForm, cash_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">QR / UPI (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editJumaForm.upi_amount}
                      onChange={(e) => setEditJumaForm({ ...editJumaForm, upi_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Paytm (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editJumaForm.paytm_amount}
                      onChange={(e) => setEditJumaForm({ ...editJumaForm, paytm_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Bank Transfer (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editJumaForm.bank_amount}
                      onChange={(e) => setEditJumaForm({ ...editJumaForm, bank_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Cheque / Other (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editJumaForm.cheque_amount}
                      onChange={(e) => setEditJumaForm({ ...editJumaForm, cheque_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Auto Calculated Sum */}
                {(() => {
                  const cash = parseFloat(editJumaForm.cash_amount) || 0;
                  const upi = parseFloat(editJumaForm.upi_amount) || 0;
                  const paytm = parseFloat(editJumaForm.paytm_amount) || 0;
                  const bank = parseFloat(editJumaForm.bank_amount) || 0;
                  const chq = parseFloat(editJumaForm.cheque_amount) || 0;
                  const pmtTotal = cash + upi + paytm + bank + chq;
                  const autoCalculatedTotal = pmtTotal > 0 ? pmtTotal : (parseFloat(editJumaForm.amount) || 0);

                  return (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between font-bold text-emerald-900">
                      <span>Total Collection Sum:</span>
                      <span className="text-base text-emerald-700 font-black">₹{autoCalculatedTotal.toLocaleString()}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Collection Status</label>
                  <select
                    value={editJumaForm.status}
                    onChange={(e) => setEditJumaForm({ ...editJumaForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
                  <input
                    type="text"
                    value={editJumaForm.notes}
                    onChange={(e) => setEditJumaForm({ ...editJumaForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this Jumma collection record?')) {
                      try {
                        await deleteJumaCollection(editJumaForm.id);
                        setShowEditJumaModal(false);
                        await fetchDataForTab();
                      } catch (err) {
                        setSubmitError('Failed to delete Jumma record.');
                      }
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowEditJumaModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Record...</span>
                      </>
                    ) : (
                      <span>Update Jumma Record</span>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: + ADD DONATION RECORD (FULL 15-COLUMN CATEGORY & BREAKDOWN MODAL)   */}
      {/* ========================================================================= */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Add Donation & Sadaqah Record</h3>
                <p className="text-xs text-slate-500 font-medium">Record donation date, payment-method wise amounts, and categories with automatic total calculation.</p>
              </div>
              <button
                onClick={() => setShowDonationModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleDonationSubmit} className="space-y-5 text-xs font-medium">
              
              {/* Contributor Type Cards */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold">Family / Other Person</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label
                    onClick={() => {
                      const firstFam = safeFamiliesList.length > 0 ? safeFamiliesList[0] : null;
                      setDonationForm({
                        ...donationForm,
                        contributor_type: 'Family',
                        family_id: firstFam ? firstFam.id : '',
                        family_code: firstFam ? firstFam.family_code || `F-${firstFam.id}` : '',
                        donor_name: firstFam ? (firstFam.head_name || firstFam.family_name) : ''
                      });
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                      donationForm.contributor_type === 'Family'
                        ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Users className={`w-5 h-5 ${donationForm.contributor_type === 'Family' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <div>
                      <span className="font-extrabold text-slate-900 block">Registered Family</span>
                      <span className="text-[10px] text-slate-500">Select registered family record</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setDonationForm({ ...donationForm, contributor_type: 'Other Person', family_id: '', family_code: '', donor_name: '' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                      donationForm.contributor_type === 'Other Person'
                        ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck className={`w-5 h-5 ${donationForm.contributor_type === 'Other Person' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <div>
                      <span className="font-extrabold text-slate-900 block">Individual / Other Person</span>
                      <span className="text-[10px] text-slate-500">Non-family or general contributor</span>
                    </div>
                  </label>
                </div>
              </div>

              {donationForm.contributor_type === 'Family' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Select Family</label>
                  <select
                    value={donationForm.family_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const fam = safeFamiliesList.find((f) => f.id === parseInt(val));
                      setDonationForm({
                        ...donationForm,
                        family_id: val,
                        family_code: fam ? fam.family_code || `F-${fam.id}` : '',
                        donor_name: fam ? (fam.head_name || fam.family_name) : ''
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    {safeFamiliesList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.family_code || `F-${String(f.id).padStart(4, '0')}`} • {f.family_name} • {f.head_name || f.family_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Donor Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter full name of individual or donor"
                    value={donationForm.donor_name}
                    onChange={(e) => setDonationForm({ ...donationForm, donor_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Donation Date</label>
                  <input
                    type="date"
                    value={donationForm.donation_date}
                    onChange={(e) => setDonationForm({ ...donationForm, donation_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-700 font-bold">Receipt ID</label>
                    <button
                      type="button"
                      onClick={() => setDonationForm({ ...donationForm, receipt_no: generateAutoTransactionId('REC-DON') })}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={donationForm.receipt_no}
                    onChange={(e) => setDonationForm({ ...donationForm, receipt_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* PAYMENT METHOD BREAKDOWN */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Payment Method-wise Donation Breakdown</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.cash_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, cash_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">QR / UPI (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.upi_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, upi_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Paytm (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.paytm_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, paytm_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Bank Transfer (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.bank_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, bank_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Cheque / Other (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.cheque_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, cheque_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Auto Calculated Sum */}
                {(() => {
                  const cash = parseFloat(donationForm.cash_amount) || 0;
                  const upi = parseFloat(donationForm.upi_amount) || 0;
                  const paytm = parseFloat(donationForm.paytm_amount) || 0;
                  const bank = parseFloat(donationForm.bank_amount) || 0;
                  const chq = parseFloat(donationForm.cheque_amount) || 0;
                  const pmtTotal = cash + upi + paytm + bank + chq;

                  const gen = parseFloat(donationForm.general_amount) || 0;
                  const mad = parseFloat(donationForm.madrasa_amount) || 0;
                  const ram = parseFloat(donationForm.ramadan_amount) || 0;
                  const zak = parseFloat(donationForm.zakat_amount) || 0;
                  const wel = parseFloat(donationForm.welfare_amount) || 0;
                  const grv = parseFloat(donationForm.graveyard_amount) || 0;
                  const oth = parseFloat(donationForm.other_amount) || 0;
                  const catTotal = gen + mad + ram + zak + wel + grv + oth;

                  const autoCalculatedTotal = pmtTotal > 0 ? pmtTotal : (catTotal > 0 ? catTotal : (parseFloat(donationForm.amount) || 0));

                  return (
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-300 flex items-center justify-between font-extrabold text-emerald-950 shadow-sm">
                      <span>Total Donation Amount:</span>
                      <span className="text-xl text-emerald-700 font-black">₹{autoCalculatedTotal.toLocaleString()}</span>
                    </div>
                  );
                })()}
              </div>

              {/* CATEGORY BREAKDOWN FOR DONATION */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider block">
                  Category Breakdown Contributions (₹)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">General</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.general_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, general_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Madrasa</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.madrasa_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, madrasa_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Ramadan</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.ramadan_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, ramadan_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Zakat</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.zakat_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, zakat_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Welfare</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.welfare_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, welfare_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Graveyard</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.graveyard_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, graveyard_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-slate-600 font-bold mb-1">Other Category</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={donationForm.other_amount}
                      onChange={(e) => setDonationForm({ ...donationForm, other_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Collection Status</label>
                  <select
                    value={donationForm.status}
                    onChange={(e) => setDonationForm({ ...donationForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
                  <input
                    type="text"
                    placeholder="Optional details or comments"
                    value={donationForm.notes}
                    onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowDonationModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Record...</span>
                    </>
                  ) : (
                    <span>Save Donation Record</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT DONATION RECORD                                               */}
      {/* ========================================================================= */}
      {showEditDonationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Donation Record</h3>
                <p className="text-xs text-slate-500 font-medium">Receipt ID: {editDonationForm.receipt_no}</p>
              </div>
              <button
                onClick={() => setShowEditDonationModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleEditDonationSubmit} className="space-y-5 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Donor Name</label>
                  <input
                    type="text"
                    value={editDonationForm.donor_name}
                    onChange={(e) => setEditDonationForm({ ...editDonationForm, donor_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Donation Date</label>
                  <input
                    type="date"
                    value={editDonationForm.donation_date}
                    onChange={(e) => setEditDonationForm({ ...editDonationForm, donation_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider block">
                  Payment Method-wise Donation Breakdown
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDonationForm.cash_amount}
                      onChange={(e) => setEditDonationForm({ ...editDonationForm, cash_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">QR / UPI (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDonationForm.upi_amount}
                      onChange={(e) => setEditDonationForm({ ...editDonationForm, upi_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Paytm (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDonationForm.paytm_amount}
                      onChange={(e) => setEditDonationForm({ ...editDonationForm, paytm_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Bank Transfer (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDonationForm.bank_amount}
                      onChange={(e) => setEditDonationForm({ ...editDonationForm, bank_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Cheque / Other (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDonationForm.cheque_amount}
                      onChange={(e) => setEditDonationForm({ ...editDonationForm, cheque_amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-emerald-300 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Auto Calculated Sum */}
                {(() => {
                  const cash = parseFloat(editDonationForm.cash_amount) || 0;
                  const upi = parseFloat(editDonationForm.upi_amount) || 0;
                  const paytm = parseFloat(editDonationForm.paytm_amount) || 0;
                  const bank = parseFloat(editDonationForm.bank_amount) || 0;
                  const chq = parseFloat(editDonationForm.cheque_amount) || 0;
                  const pmtTotal = cash + upi + paytm + bank + chq;

                  const gen = parseFloat(editDonationForm.general_amount) || 0;
                  const mad = parseFloat(editDonationForm.madrasa_amount) || 0;
                  const ram = parseFloat(editDonationForm.ramadan_amount) || 0;
                  const zak = parseFloat(editDonationForm.zakat_amount) || 0;
                  const wel = parseFloat(editDonationForm.welfare_amount) || 0;
                  const grv = parseFloat(editDonationForm.graveyard_amount) || 0;
                  const oth = parseFloat(editDonationForm.other_amount) || 0;
                  const catTotal = gen + mad + ram + zak + wel + grv + oth;

                  const autoCalculatedTotal = pmtTotal > 0 ? pmtTotal : (catTotal > 0 ? catTotal : (parseFloat(editDonationForm.amount) || 0));

                  return (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between font-bold text-emerald-900">
                      <span>Total Donation Sum:</span>
                      <span className="text-base text-emerald-700 font-black">₹{autoCalculatedTotal.toLocaleString()}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Collection Status</label>
                  <select
                    value={editDonationForm.status}
                    onChange={(e) => setEditDonationForm({ ...editDonationForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  >
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
                  <input
                    type="text"
                    value={editDonationForm.notes}
                    onChange={(e) => setEditDonationForm({ ...editDonationForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this donation record?')) {
                      try {
                        await deleteDonation(editDonationForm.id);
                        setShowEditDonationModal(false);
                        await fetchDataForTab();
                      } catch (err) {
                        setSubmitError('Failed to delete donation record.');
                      }
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowEditDonationModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Record...</span>
                      </>
                    ) : (
                      <span>Update Donation Record</span>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PRINTABLE SANTHA RECEIPT                                      */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Official Santha Receipt</h3>
              <button onClick={() => setSelectedReceipt(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between font-mono font-bold text-slate-600">
                <span>Receipt #: {selectedReceipt.receipt_no}</span>
                <span>Date: {selectedReceipt.date}</span>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="text-slate-400 font-semibold uppercase block text-[10px]">Family Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedReceipt.family_name} ({selectedReceipt.family_code})</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block text-[10px]">Period</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.month_year}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block text-[10px]">Paid Amount</span>
                  <span className="font-extrabold text-emerald-700 text-sm">₹{selectedReceipt.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block text-[10px]">Previous Balance</span>
                  <span className="font-bold text-slate-800">₹{(selectedReceipt.previous_balance || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block text-[10px]">Remaining Balance</span>
                  <span className="font-extrabold text-rose-600 text-sm">₹{(selectedReceipt.remaining_balance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex items-center space-x-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button onClick={() => setSelectedReceipt(null)} className="px-5 py-2 bg-[#0f172a] text-white rounded-xl font-bold text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
