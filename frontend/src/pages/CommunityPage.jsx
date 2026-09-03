import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import {
  getCommunityFamilies,
  createCommunityFamily,
  addCommunityMember,
  updateCommunityMember,
  getCommunityNextMemberCode,
  getCommunityMemberDetail,
  getCommunityMembers,
  getCommunityHeadChanges,
  submitCommunityHeadChange,
  updateCommunityFamily,
  getCommunityMemberRequests,
  getCommunityFamilyStatements,
  getCommunityFunctions,
  createCommunityFunction,
  updateCommunityFunction,
  getCommunityFamilyActivity,
  deleteCommunityMember,
  deleteCommunityFamily,
  createSanthaCollection,
  getFamilySanthaCalculation
} from '../services/api';

import {
  Search,
  Bell,
  Plus,
  Users,
  Heart,
  UserPlus,
  SlidersHorizontal,
  Download,
  X,
  Building2,
  Calendar,
  FileText,
  Upload,
  Eye,
  Pencil,
  Printer,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Wallet,
  ChevronDown,
  ChevronUp,
  Trash2,
  Image,
  Paperclip,
  ArrowLeft
} from 'lucide-react';


export const CommunityPage = ({ activeSubTab = 'families' }) => {
  const { userInfo } = useAuth();
  const [currentTab, setCurrentTab] = useState(activeSubTab);

  // Data states
  const [familiesData, setFamiliesData] = useState([]);
  const [stats, setStats] = useState({
    total_families: 0,
    total_members: 0,
    poor_families: 0,
    new_this_month: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Family Detail / Member List
  const [selectedFamilyForView, setSelectedFamilyForView] = useState(null);
  const [familyMembersList, setFamilyMembersList] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isModalMembersExpanded, setIsModalMembersExpanded] = useState(true);

  // Expandable Accordion Family Rows State
  const [expandedFamilyIds, setExpandedFamilyIds] = useState({});
  const [expandedMembersMap, setExpandedMembersMap] = useState({});
  const [loadingExpandedMembersMap, setLoadingExpandedMembersMap] = useState({});

  const toggleExpandFamily = async (familyId, e) => {
    if (e) e.stopPropagation();
    const isCurrentlyExpanded = !!expandedFamilyIds[familyId];
    setExpandedFamilyIds(prev => ({ ...prev, [familyId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !expandedMembersMap[familyId]) {
      setLoadingExpandedMembersMap(prev => ({ ...prev, [familyId]: true }));
      try {
        const members = await getCommunityMembers(familyId);
        setExpandedMembersMap(prev => ({ ...prev, [familyId]: members }));
      } catch (err) {
        console.error('Error fetching members for family expand:', err);
      } finally {
        setLoadingExpandedMembersMap(prev => ({ ...prev, [familyId]: false }));
      }
    }
  };

  // Delete Member Confirmation State
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const handleDeleteMemberClick = (member, family = null, e = null) => {
    if (e) e.stopPropagation();
    const targetFam = family || familiesData.find((f) => f.id === member.family_id) || selectedFamilyForView;
    setMemberToDelete({ member, family: targetFam });
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !memberToDelete.member) return;
    const { member, family } = memberToDelete;
    const famId = member.family_id || family?.id || selectedFamilyForView?.id;
    setIsDeletingMember(true);
    try {
      await deleteCommunityMember(member.id);
      await fetchFamilies();
      if (famId) {
        const updated = await getCommunityMembers(famId);
        setExpandedMembersMap((prev) => ({ ...prev, [famId]: updated }));
        if (selectedFamilyForView && selectedFamilyForView.id === famId) {
          setFamilyMembersList(updated);
        }
      }
      if (selectedMemberForView && selectedMemberForView.id === member.id) {
        setSelectedMemberForView(null);
      }
      setMemberToDelete(null);
    } catch (err) {
      console.error('Failed to delete member:', err);
      alert(err.response?.data?.detail || 'Failed to delete member. Please try again.');
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Delete Family Confirmation State
  const [familyToDelete, setFamilyToDelete] = useState(null);
  const [isDeletingFamily, setIsDeletingFamily] = useState(false);

  const handleDeleteFamilyClick = (family, e = null) => {
    if (e) e.stopPropagation();
    setFamilyToDelete(family);
  };

  const handleConfirmDeleteFamily = async () => {
    if (!familyToDelete) return;
    setIsDeletingFamily(true);
    try {
      await deleteCommunityFamily(familyToDelete.id);
      await fetchFamilies();
      await fetchHeadChanges();
      if (selectedFamilyForView && selectedFamilyForView.id === familyToDelete.id) {
        setSelectedFamilyForView(null);
      }
      setFamilyToDelete(null);
    } catch (err) {
      console.error('Failed to delete family:', err);
      alert(err.response?.data?.detail || 'Failed to delete family. Please try again.');
    } finally {
      setIsDeletingFamily(false);
    }
  };

  // View-Only Member Profile Detail Modal State
  const [selectedMemberForView, setSelectedMemberForView] = useState(null);

  // Add / Edit Member State & Preview Token
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [generatedMemberCode, setGeneratedMemberCode] = useState('');
  const [isMemberSubmitting, setIsMemberSubmitting] = useState(false);

  // Member Document Upload State & Ref
  const memberFileInputRef = useRef(null);
  const [selectedMemberFiles, setSelectedMemberFiles] = useState([]);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);

  const handleMemberFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processMemberFiles(Array.from(e.target.files));
    }
  };

  const handleMemberFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMemberFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processMemberFiles = (newFiles) => {
    const formatted = newFiles.map((file) => {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      const ext = file.name.split('.').pop().toUpperCase();
      return {
        name: file.name,
        size: sizeStr,
        type: ext,
        rawFile: file,
      };
    });

    setSelectedMemberFiles((prev) => {
      const updated = [...prev, ...formatted];
      const docNames = updated.map((f) => f.name).join(', ');
      setMemberForm((form) => ({ ...form, document_name: docNames }));
      return updated;
    });
  };

  const handleRemoveMemberFile = (indexToRemove) => {
    setSelectedMemberFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      const docNames = updated.map((f) => f.name).join(', ');
      setMemberForm((form) => ({ ...form, document_name: docNames }));
      return updated;
    });
    if (memberFileInputRef.current) memberFileInputRef.current.value = '';
  };

  // Family Head Changes & Modification Comparison State
  const [headChangesList, setHeadChangesList] = useState([]);
  const [loadingHeadChanges, setLoadingHeadChanges] = useState(false);
  const [showHeadChangeModal, setShowHeadChangeModal] = useState(false);
  const [selectedHeadChangeComparison, setSelectedHeadChangeComparison] = useState(null);

  // Team Head Selection & Filtering State
  const [selectedTeamHeadId, setSelectedTeamHeadId] = useState(null);
  const [teamHeadSearchQuery, setTeamHeadSearchQuery] = useState('');
  const [auditLogTypeFilter, setAuditLogTypeFilter] = useState('all');

  // Detailed Family Activity & History Modal State
  const [showFamilyActivityModal, setShowFamilyActivityModal] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityActiveTab, setActivityActiveTab] = useState('daily');

  const handleViewFamilyActivity = async (familyId) => {
    setLoadingActivity(true);
    setShowFamilyActivityModal(true);
    setActivityActiveTab('daily');

    // Pre-populate family object from existing familiesData/selectedFamilyForView to avoid blank header
    const existingFam = (familiesData || []).find((f) => f.id === familyId || f.family_code === familyId) ||
                       (selectedFamilyForView && (selectedFamilyForView.id === familyId || selectedFamilyForView.family_code === familyId) ? selectedFamilyForView : null);

    setActivityData({
      family: existingFam ? {
        id: existingFam.id,
        family_code: existingFam.family_code || `FM-${existingFam.id}`,
        family_name: existingFam.family_name || (existingFam.head_name ? `${existingFam.head_name} Family` : 'Family Profile'),
        head_name: existingFam.head_name || '—',
        area: existingFam.area || 'Tenkasi',
        city: existingFam.city || 'Tenkasi',
        mobile_number: existingFam.mobile_number || '—',
        status: existingFam.status || 'Active',
        monthly_santha: existingFam.monthly_santha || 500
      } : {
        id: familyId,
        family_code: '—',
        family_name: 'Family Profile & Activity History',
        head_name: '—',
        area: 'Tenkasi',
        city: 'Tenkasi',
        mobile_number: '—',
        status: 'Active',
        monthly_santha: 500
      },
      members: [],
      head_changes: [],
      collections: [],
      functions: []
    });

    try {
      const data = await getCommunityFamilyActivity(familyId);
      if (data && data.family) {
        setActivityData(data);
      }
    } catch (err) {
      console.warn('Error fetching family activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const parseSnapshot = (detailsJson, fallbackHeadName = 'N/A') => {
    if (!detailsJson) {
      return {
        head_name: fallbackHeadName,
        mobile_number: '—',
        area: 'Tenkasi',
        city: 'Tenkasi',
        gender: 'Male',
        dob: '—',
        status: 'Active',
        monthly_santha: 500,
        relationship_type: 'Family Head'
      };
    }
    try {
      if (typeof detailsJson === 'object') return detailsJson;
      return JSON.parse(detailsJson);
    } catch (e) {
      return {
        head_name: fallbackHeadName,
        mobile_number: '—',
        area: 'Tenkasi',
        city: 'Tenkasi',
        gender: 'Male',
        dob: '—',
        status: 'Active',
        monthly_santha: 500,
        relationship_type: 'Family Head'
      };
    }
  };

  const [headChangeForm, setHeadChangeForm] = useState({
    family_id: '',
    old_head: '',
    new_head: '',
    reason: 'Family Head Succession',
  });

  const fetchHeadChanges = async () => {
    setLoadingHeadChanges(true);
    try {
      const data = await getCommunityHeadChanges();
      setHeadChangesList(data || []);
    } catch (err) {
      console.warn('Error fetching head changes:', err);
    } finally {
      setLoadingHeadChanges(false);
    }
  };

  // Family Statements State
  const [statementsList, setStatementsList] = useState([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [selectedFamilyStatement, setSelectedFamilyStatement] = useState(null);
  const [statementSearchTerm, setStatementSearchTerm] = useState('');
  const [statementStatusFilter, setStatementStatusFilter] = useState('All');

  const fetchStatements = async () => {
    setLoadingStatements(true);
    try {
      const data = await getCommunityFamilyStatements();
      setStatementsList(data || []);
    } catch (err) {
      console.warn('Error fetching family statements:', err);
    } finally {
      setLoadingStatements(false);
    }
  };

  // Functions & Community Charges State
  const [functionsList, setFunctionsList] = useState([]);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [isAddingFunctionCharge, setIsAddingFunctionCharge] = useState(false);
  const [editingFunctionId, setEditingFunctionId] = useState(null);
  const [isFunctionSubmitting, setIsFunctionSubmitting] = useState(false);

  const [functionForm, setFunctionForm] = useState({
    family_id: '',
    family_name: '',
    function_type: 'Marriage Function',
    person_name: '',
    contact_number: '+91...',
    event_date: '',
    status: 'Draft',
    amount: '',
    paid_amount: '',
    payment_method: 'Cash',
    receipt_no: '',
    nikah_formalities: false,
    govt_registration: false,
    certificate_required: false,
    committee_verification: true,
    notes: ''
  });

  const fetchFunctions = async () => {
    setLoadingFunctions(true);
    try {
      const data = await getCommunityFunctions();
      setFunctionsList(data || []);
    } catch (err) {
      console.warn('Error fetching community functions:', err);
    } finally {
      setLoadingFunctions(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'head-changes') {
      fetchHeadChanges();
    } else if (currentTab === 'statements') {
      fetchStatements();
    } else if (currentTab === 'functions') {
      fetchFunctions();
    }
  }, [currentTab]);

  const handleOpenAddFunctionCharge = () => {
    setEditingFunctionId(null);
    const defaultFam = familiesData.length > 0 ? familiesData[0] : null;
    setFunctionForm({
      family_id: defaultFam ? defaultFam.id : '',
      family_name: defaultFam ? defaultFam.family_name : '',
      function_type: 'Marriage Function',
      person_name: '',
      contact_number: defaultFam ? defaultFam.mobile_number || '+91...' : '+91...',
      event_date: new Date().toISOString().split('T')[0],
      status: 'Draft',
      amount: '',
      paid_amount: '',
      payment_method: 'Cash',
      receipt_no: '',
      nikah_formalities: false,
      govt_registration: false,
      certificate_required: false,
      committee_verification: true,
      notes: ''
    });
    setSubmitError('');
    setIsAddingFunctionCharge(true);
  };

  const handleOpenEditFunctionCharge = (item) => {
    setEditingFunctionId(item.id);
    const formStr = item.formalities || '';

    setFunctionForm({
      family_id: item.family_id || '',
      family_name: item.family_name || '',
      function_type: item.function_type || 'Marriage Function',
      person_name: item.member_name && item.member_name !== '—' ? item.member_name : '',
      contact_number: item.contact_number && item.contact_number !== '—' ? item.contact_number : '+91...',
      event_date: item.event_date && item.event_date !== '—' ? item.event_date : new Date().toISOString().split('T')[0],
      status: item.status || 'Draft',
      amount: item.amount !== undefined ? item.amount.toString() : '',
      paid_amount: item.paid_amount !== undefined ? item.paid_amount.toString() : '',
      payment_method: item.payment_method || 'Cash',
      receipt_no: item.receipt_no || '',
      nikah_formalities: formStr.includes('Nikah'),
      govt_registration: formStr.includes('Government'),
      certificate_required: formStr.includes('Certificate'),
      committee_verification: formStr.includes('Committee'),
      notes: item.notes || ''
    });
    setSubmitError('');
    setIsAddingFunctionCharge(true);
  };

  const handleCreateFunctionCharge = async (e) => {
    e.preventDefault();
    if (!functionForm.family_name) {
      setSubmitError('Please select a family record.');
      return;
    }
    if (!functionForm.amount || parseFloat(functionForm.amount) <= 0) {
      setSubmitError('Please enter a valid Function Charge amount.');
      return;
    }

    setIsFunctionSubmitting(true);
    setSubmitError('');

    try {
      const formalitiesArr = [];
      if (functionForm.nikah_formalities) formalitiesArr.push('Nikah / Marriage Formalities');
      if (functionForm.govt_registration) formalitiesArr.push('Government Registration');
      if (functionForm.certificate_required) formalitiesArr.push('Certificate Required');
      if (functionForm.committee_verification) formalitiesArr.push('Committee Verification');

      const payload = {
        family_id: functionForm.family_id ? parseInt(functionForm.family_id) : null,
        family_name: functionForm.family_name,
        function_type: functionForm.function_type || 'Marriage Function',
        member_name: functionForm.person_name || null,
        contact_number: functionForm.contact_number || null,
        event_date: functionForm.event_date ? (functionForm.event_date.includes('-') ? new Date(functionForm.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : functionForm.event_date) : '12 Aug 2026',
        amount: parseFloat(functionForm.amount) || 0.0,
        paid_amount: parseFloat(functionForm.paid_amount) || 0.0,
        payment_method: functionForm.payment_method || 'Cash',
        receipt_no: functionForm.receipt_no || null,
        formalities: formalitiesArr.join(', '),
        notes: functionForm.notes || null,
        status: functionForm.status || 'Draft'
      };

      if (editingFunctionId) {
        await updateCommunityFunction(editingFunctionId, payload);
      } else {
        await createCommunityFunction(payload);
      }
      await fetchFunctions();
      setIsAddingFunctionCharge(false);
      setEditingFunctionId(null);
    } catch (err) {
      console.error('Error saving function charge:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to save Function Charge.');
    } finally {
      setIsFunctionSubmitting(false);
    }
  };

  const handleOpenHeadChangeModal = (family = null) => {
    const targetFamily = family || (familiesData.length > 0 ? familiesData[0] : null);
    if (targetFamily) {
      handleEditFamilyClick(targetFamily);
    } else {
      handleOpenAddFamilyModal();
    }
  };


  // Modals state
  const [showCreateFamilyModal, setShowCreateFamilyModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFamilyRosterModal, setShowFamilyRosterModal] = useState(false);
  const [rosterSearchTerm, setRosterSearchTerm] = useState('');
  const [loadingRosterMembers, setLoadingRosterMembers] = useState(false);
  const [rosterExpandedFamilyIds, setRosterExpandedFamilyIds] = useState({});

  // Create Family Form State (Matching Add New Family Screenshot)
  const [familyForm, setFamilyForm] = useState({
    first_name: '',
    last_name: '',
    status: 'Active',
    gender: 'Male',
    dob: '',
    mobile_number: '',
    joining_date: '',
    relationship_type: 'Select Relationship',
    aadhar_ref: '',
    house_no: '12/4',
    street: 'Main Street',
    area: 'East Area',
    city: 'Tenkasi',
    pin_code: '627811',
    landmark: 'Near Masjid',
    monthly_santha: 500,
  });

  // Add Member Form State (Matching exact user screenshot)
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    gender: 'Male',
    dob: '',
    mobile_number: '',
    marital_status: 'Single',
    family_id: '',
    relationship_type: 'Son',
    status: 'Active',
    occupation: '',
    education: '',
    email: '',
    document_name: '',
  });

  const masjidName = userInfo?.masjid_name || 'Al Noor Masjid';
  const userName = userInfo?.full_name || 'Abdul Rahman';
  const userRole = userInfo?.role || 'Administrator';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AR';

  // Fetch Families API
  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const res = await getCommunityFamilies({ search: searchTerm });
      if (res) {
        setFamiliesData(res.families || []);
        if (res.stats) setStats(res.stats);
        if (res.families && res.families.length > 0 && !memberForm.family_id) {
          setMemberForm((prev) => ({ ...prev, family_id: res.families[0].id }));
        }
      }
    } catch (err) {
      console.warn('Network error fetching community families:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchFamilies();
  }, [searchTerm]);

  useEffect(() => {
    setCurrentTab(activeSubTab);
  }, [activeSubTab]);

  // View Family Details & Members
  const handleViewFamilyDetails = async (family) => {
    setSelectedFamilyForView(family);
    setLoadingMembers(true);
    try {
      const members = await getCommunityMembers(family.id);
      setFamilyMembersList(members);
    } catch (err) {
      console.warn('Network error fetching family members. Showing default head member:', err);
      setFamilyMembersList([
        {
          id: 1,
          family_id: family.id,
          member_code: `M-${family.id}-1`,
          full_name: family.head_name,
          relationship_type: 'Family Head',
          gender: 'Male',
          mobile_number: '+91 98400 12345',
          status: family.status,
        },
      ]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Collect Santha Modal State & Handlers
  const [showCollectSanthaModal, setShowCollectSanthaModal] = useState(false);
  const [collectFamily, setCollectFamily] = useState(null);
  const [collectCalcData, setCollectCalcData] = useState(null);
  const [loadingCollectCalc, setLoadingCollectCalc] = useState(false);
  const [collectSanthaForm, setCollectSanthaForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    financial_account: 'Main Cash',
    reference_id: '',
    notes: ''
  });
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [collectError, setCollectError] = useState('');

  const handleOpenCollectSanthaModal = async (family, e) => {
    if (e) e.stopPropagation();
    setCollectFamily(family);
    const initialAmt = family.outstanding_amount ?? family.pending_amount ?? family.monthly_santha ?? 500;
    setCollectSanthaForm({
      amount: initialAmt.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      financial_account: 'Main Cash',
      reference_id: `TXN-${Date.now().toString().slice(-6)}`,
      notes: ''
    });
    setCollectError('');
    setShowCollectSanthaModal(true);
    setLoadingCollectCalc(true);
    try {
      const calc = await getFamilySanthaCalculation(family.id);
      setCollectCalcData(calc);
      if (calc && (calc.pending_arrears !== undefined || calc.outstanding_amount !== undefined)) {
        const dueAmt = calc.pending_arrears ?? calc.outstanding_amount ?? 500;
        setCollectSanthaForm((prev) => ({
          ...prev,
          amount: (dueAmt > 0 ? dueAmt : calc.monthly_santha || 500).toString()
        }));
      }
    } catch (err) {
      console.warn('Error fetching calculation for collect modal:', err);
    } finally {
      setLoadingCollectCalc(false);
    }
  };

  const handleCollectSanthaSubmit = async (e) => {
    e.preventDefault();
    if (!collectFamily) return;
    setCollectError('');
    setCollectSubmitting(true);

    const todayDate = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = monthNames[todayDate.getMonth()];
    const yearNum = todayDate.getFullYear();

    const payload = {
      family_id: collectFamily.id,
      family_name: collectFamily.family_name,
      family_code: collectFamily.family_code || `F-${collectFamily.id}`,
      head_name: collectFamily.head_name,
      month: monthStr,
      year: yearNum,
      payment_date: collectSanthaForm.payment_date,
      amount: parseFloat(collectSanthaForm.amount) || 0.0,
      payment_method: collectSanthaForm.payment_method || 'Cash',
      financial_account: collectSanthaForm.financial_account || 'Main Cash',
      reference_id: collectSanthaForm.reference_id,
      notes: collectSanthaForm.notes,
      collector_name: userInfo?.name || 'Admin User'
    };

    try {
      await createSanthaCollection(payload);
      setShowCollectSanthaModal(false);
      await fetchFamilies();
      if (selectedFamilyForView && selectedFamilyForView.id === collectFamily.id) {
        const updatedFam = familiesData.find((f) => f.id === collectFamily.id) || collectFamily;
        handleViewFamilyDetails(updatedFam);
      }
    } catch (err) {
      console.error('Failed to record Santha payment:', err);
      setCollectError(err.response?.data?.detail || 'Failed to record Santha payment');
    } finally {
      setCollectSubmitting(false);
    }
  };

  // Submission & Error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingFamilyId, setEditingFamilyId] = useState(null);

  const handleOpenAddFamilyModal = () => {
    setEditingFamilyId(null);
    setFamilyForm({
      first_name: '',
      last_name: '',
      status: 'Active',
      gender: 'Male',
      dob: '',
      mobile_number: '',
      joining_date: `${new Date().getFullYear()}-01-01`,
      relationship_type: 'Family Head',
      aadhar_ref: '',
      house_no: '',
      street: '',
      area: '',
      city: '',
      pin_code: '',
      landmark: '',
      monthly_santha: 200,
      santha_due_day: 10,
      previous_paid: 0,
    });
    setSubmitError('');
    setShowCreateFamilyModal(true);
  };

  const handleEditFamilyClick = (family, e) => {
    if (e) e.stopPropagation();
    setEditingFamilyId(family.id);

    const nameParts = (family.head_name || '').split(' ');
    const firstName = family.first_name || nameParts[0] || '';
    const lastName = family.last_name || nameParts.slice(1).join(' ') || '';

    setFamilyForm({
      first_name: firstName,
      last_name: lastName,
      status: family.status || 'Active',
      gender: family.gender || 'Male',
      dob: family.dob || '',
      mobile_number: family.mobile_number || '',
      joining_date: family.joining_date || new Date().toISOString().split('T')[0],
      relationship_type: family.relationship_type || 'Family Head',
      aadhar_ref: family.aadhar_ref || '',
      house_no: family.house_no ?? '',
      street: family.street ?? '',
      area: family.area ?? '',
      city: family.city ?? '',
      pin_code: family.pin_code ?? '',
      landmark: family.landmark ?? '',
      monthly_santha: family.monthly_santha ?? 200,
      santha_due_day: family.santha_due_day ?? 10,
      previous_paid: family.total_paid || 0,
    });
    setSubmitError('');
    setShowCreateFamilyModal(true);
  };

  // Create or Update Family Form Handler (Strict PostgreSQL Persistence)
  const handleCreateFamily = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    const headName = `${familyForm.first_name || ''} ${familyForm.last_name || ''}`.trim() || familyForm.first_name || 'Family Head';
    const familyTitle = `${headName} Family`;

    const newFamilyPayload = {
      first_name: familyForm.first_name,
      last_name: familyForm.last_name,
      head_name: headName,
      family_name: familyTitle,
      status: familyForm.status,
      gender: familyForm.gender,
      dob: familyForm.dob,
      mobile_number: familyForm.mobile_number,
      joining_date: familyForm.joining_date,
      relationship_type: familyForm.relationship_type !== 'Select Relationship' ? familyForm.relationship_type : 'Family Head',
      aadhar_ref: familyForm.aadhar_ref,
      house_no: familyForm.house_no,
      street: familyForm.street,
      area: familyForm.area,
      city: familyForm.city,
      pin_code: familyForm.pin_code,
      landmark: familyForm.landmark,
      monthly_santha: familyForm.monthly_santha ? parseFloat(familyForm.monthly_santha) : 200,
      santha_due_day: familyForm.santha_due_day ? parseInt(familyForm.santha_due_day) : 10,
      previous_paid: familyForm.previous_paid ? parseFloat(familyForm.previous_paid) : 0.0,
      collected_amount: 0.0,
    };

    try {
      if (editingFamilyId) {
        await updateCommunityFamily(editingFamilyId, newFamilyPayload);
      } else {
        await createCommunityFamily(newFamilyPayload);
      }
      setShowCreateFamilyModal(false);
      setEditingFamilyId(null);
      setFamilyForm({
        first_name: '',
        last_name: '',
        status: 'Active',
        gender: 'Male',
        dob: '',
        mobile_number: '',
        joining_date: '',
        relationship_type: 'Family Head',
        aadhar_ref: '',
        house_no: '',
        street: '',
        area: '',
        city: '',
        pin_code: '',
        landmark: '',
        monthly_santha: 500,
      });
      await fetchFamilies();
      await fetchHeadChanges();
    } catch (err) {
      console.error('Failed to save family:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to save family record.';
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };




  // View Member Profile Details Modal
  const handleViewMemberDetails = (member, family = null) => {
    const parentFamily = family || familiesData.find((f) => f.id === member.family_id) || selectedFamilyForView;
    const fullAddress = parentFamily
      ? `${parentFamily.house_no || ''} ${parentFamily.street || ''}, ${parentFamily.area || ''}, ${parentFamily.city || ''} ${parentFamily.pin_code || ''}`.trim()
      : '—';

    setSelectedMemberForView({
      ...member,
      family_name: parentFamily?.family_name || '—',
      family_code: parentFamily?.family_code || '—',
      head_name: parentFamily?.head_name || '—',
      address: fullAddress !== ',' && fullAddress !== '' ? fullAddress : 'Main Street, Tenkasi',
    });
  };

  // Open Dynamic Family Member Selection & Roster Interface Modal
  const handleOpenAddFamilyMemberRoster = async () => {
    setShowFamilyRosterModal(true);
    setLoadingRosterMembers(true);

    const initialExpanded = {};
    familiesData.forEach((f) => {
      initialExpanded[f.id] = true;
    });
    setRosterExpandedFamilyIds(initialExpanded);

    try {
      for (const f of familiesData) {
        if (!expandedMembersMap[f.id]) {
          try {
            const members = await getCommunityMembers(f.id);
            setExpandedMembersMap((prev) => ({ ...prev, [f.id]: members }));
          } catch (err) {
            console.warn(`Error loading members for roster family ${f.id}:`, err);
          }
        }
      }
    } finally {
      setLoadingRosterMembers(false);
    }
  };

  const toggleRosterFamilyExpand = (familyId) => {
    setRosterExpandedFamilyIds((prev) => ({
      ...prev,
      [familyId]: !prev[familyId],
    }));
  };

  // Open Add Member Modal with Auto-Generated Token Preview
  const handleOpenAddMemberModal = async (initialFamilyId = null) => {
    setEditingMemberId(null);
    setSelectedMemberFiles([]);
    if (memberFileInputRef.current) memberFileInputRef.current.value = '';
    const targetFamId = initialFamilyId || (familiesData.length > 0 ? familiesData[0].id : '');
    setMemberForm({
      full_name: '',
      gender: 'Male',
      dob: '',
      mobile_number: '',
      marital_status: 'Single',
      family_id: targetFamId,
      relationship_type: 'Son',
      status: 'Active',
      occupation: '',
      education: '',
      email: '',
      document_name: '',
    });

    if (targetFamId) {
      try {
        const res = await getCommunityNextMemberCode(targetFamId);
        setGeneratedMemberCode(res.next_code || '');
      } catch (err) {
        const targetFam = familiesData.find(f => f.id === parseInt(targetFamId));
        const match = targetFam?.family_code?.match(/MM\s*(\d+)/i);
        const headNum = match ? match[1] : (targetFam?.id || 1);
        const count = (expandedMembersMap[targetFamId] || []).length;
        setGeneratedMemberCode(`MM ${headNum}-${count + 1}`);
      }
    } else {
      setGeneratedMemberCode('');
    }

    setShowAddMemberModal(true);
  };

  // Handle Family selection change in Add Member form -> update preview token
  const handleFamilySelectInMemberForm = async (famId) => {
    setMemberForm((prev) => ({ ...prev, family_id: famId }));
    if (!editingMemberId && famId) {
      try {
        const res = await getCommunityNextMemberCode(famId);
        setGeneratedMemberCode(res.next_code || '');
      } catch (err) {
        const targetFam = familiesData.find(f => f.id === parseInt(famId));
        const match = targetFam?.family_code?.match(/MM\s*(\d+)/i);
        const headNum = match ? match[1] : (targetFam?.id || 1);
        const count = (expandedMembersMap[famId] || []).length;
        setGeneratedMemberCode(`MM ${headNum}-${count + 1}`);
      }
    }
  };

  // Open Edit Member Modal pre-populated with saved data
  const handleEditMemberClick = (member, family = null, e = null) => {
    if (e) e.stopPropagation();
    setEditingMemberId(member.id);
    const targetFamId = member.family_id || (family?.id || (familiesData.length > 0 ? familiesData[0].id : ''));
    const docName = member.document_name || '';
    setMemberForm({
      full_name: member.full_name || '',
      gender: member.gender || 'Male',
      dob: member.dob || '',
      mobile_number: member.mobile_number || '',
      marital_status: member.marital_status || 'Single',
      family_id: targetFamId,
      relationship_type: member.relationship_type || 'Family Head',
      status: member.status || 'Active',
      occupation: member.occupation || '',
      education: member.education || '',
      email: member.email || '',
      document_name: docName,
    });
    if (docName) {
      const fileNames = docName.split(',').map((s) => s.trim()).filter(Boolean);
      setSelectedMemberFiles(
        fileNames.map((fn) => ({
          name: fn,
          size: 'Saved Document',
          type: fn.split('.').pop().toUpperCase(),
        }))
      );
    } else {
      setSelectedMemberFiles([]);
    }
    if (memberFileInputRef.current) memberFileInputRef.current.value = '';
    setGeneratedMemberCode(member.member_code || `M-${member.id}`);
    setSelectedMemberForView(null);
    setShowAddMemberModal(true);
  };

  // Cancel Member Form Handler (Releases draft token, no DB persistence)
  const handleCancelMemberForm = () => {
    setShowAddMemberModal(false);
    setEditingMemberId(null);
    setGeneratedMemberCode('');
    setSelectedMemberFiles([]);
    if (memberFileInputRef.current) memberFileInputRef.current.value = '';
    setMemberForm({
      full_name: '',
      gender: 'Male',
      dob: '',
      mobile_number: '',
      marital_status: 'Single',
      family_id: familiesData[0]?.id || '',
      relationship_type: 'Family Head',
      status: 'Active',
      occupation: '',
      education: '',
      email: '',
      document_name: '',
    });
  };

  // Save / Update Member Form Handler (Permanently assigns token and persists to DB)
  const handleAddOrEditMember = async (e) => {
    e.preventDefault();
    if (!memberForm.family_id || !memberForm.full_name) return;
    setIsMemberSubmitting(true);

    try {
      const payload = {
        family_id: parseInt(memberForm.family_id),
        full_name: memberForm.full_name,
        member_code: generatedMemberCode || undefined,
        gender: memberForm.gender,
        dob: memberForm.dob,
        mobile_number: memberForm.mobile_number,
        marital_status: memberForm.marital_status,
        relationship_type: memberForm.relationship_type,
        status: memberForm.status,
        occupation: memberForm.occupation,
        education: memberForm.education,
        email: memberForm.email,
        document_name: memberForm.document_name || 'ID_Verification_Document.pdf',
      };

      if (editingMemberId) {
        await updateCommunityMember(editingMemberId, payload);
      } else {
        await addCommunityMember(payload);
      }

      setShowAddMemberModal(false);
      setEditingMemberId(null);
      setGeneratedMemberCode('');

      await fetchFamilies();
      const targetFamId = parseInt(memberForm.family_id);
      if (targetFamId) {
        const updatedMembers = await getCommunityMembers(targetFamId);
        setExpandedMembersMap(prev => ({ ...prev, [targetFamId]: updatedMembers }));
        if (selectedFamilyForView && selectedFamilyForView.id === targetFamId) {
          setFamilyMembersList(updatedMembers);
        }
      }
    } catch (err) {
      console.error('Error saving family member:', err);
    } finally {
      setIsMemberSubmitting(false);
    }
  };

  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-[#f8fafc] font-sans">
      <UserSidebar />

      <div className="min-w-0 h-full flex-1 overflow-y-auto flex flex-col justify-between">
        <main className="community-page-shell p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Top Header Bar */}
          <div className="community-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-500">
              <span className="hover:text-slate-700 cursor-pointer">Masjid</span>
              <span>/</span>
              <span className="text-slate-900 font-bold">
                {currentTab === 'families' && 'Families & Members'}
                {currentTab === 'head-changes' && 'Family Information'}
                {currentTab === 'member-requests' && 'Member Requests'}
                {currentTab === 'statements' && 'Family Statements'}
                {currentTab === 'functions' && 'Functions & Community Charges'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
              {/* Top-Right Family Head Display Section */}
              <div className="flex items-center space-x-2.5 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-emerald-400 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Family Head
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {familiesData.length} Registered
                    </span>
                  </div>
                  <div className="text-xs font-black text-slate-900 leading-tight truncate max-w-[150px] sm:max-w-[180px]">
                    {selectedFamilyForView?.head_name || familiesData[0]?.head_name || 'No Head Registered'}
                  </div>
                </div>
                {familiesData.length > 1 && (
                  <select
                    value={selectedFamilyForView?.id || familiesData[0]?.id || ''}
                    onChange={(e) => {
                      const selected = familiesData.find((f) => f.id === parseInt(e.target.value));
                      if (selected) setSelectedFamilyForView(selected);
                    }}
                    className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                    title="Switch active Family Head view"
                  >
                    {familiesData.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.head_name} ({f.family_code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={() => setShowSearchModal(true)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              <div className="flex items-center space-x-3 pl-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{userName}</div>
                  <div className="text-[11px] font-medium text-slate-400 leading-tight">{userRole}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-extrabold shadow-sm border border-slate-800">
                  {userInitials}
                </div>
              </div>
            </div>
          </div>

          {/* Title Header & Main Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentTab === 'families' && 'Families & Members'}
                {currentTab === 'head-changes' && 'Family Information'}
                {currentTab === 'member-requests' && 'Member Requests'}
                {currentTab === 'statements' && 'Family Statements'}
                {currentTab === 'functions' && 'Functions & Community Charges'}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                {currentTab === 'families' && 'Manage Masjid families, Family Heads and all members under each family.'}
                {currentTab === 'head-changes' && 'View family information, head records, and track leadership transfers.'}
                {currentTab === 'member-requests' && 'Review member addition and update requests submitted by families.'}
                {currentTab === 'statements' && 'View monthly Santha collection ledgers and outstanding dues per family.'}
                {currentTab === 'functions' && 'Manage marriage, Nikah, circumcision and community service charges.'}
              </p>
            </div>

            {/* Action Buttons: "+ Add Family Member" & "+ Create Family" */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenAddFamilyMemberRoster}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-600" />
                <span>Add Family Member</span>
              </button>

              <button
                onClick={handleOpenAddFamilyModal}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Family</span>
              </button>
            </div>
          </div>

          {/* 3 Redesigned Dashboard Metric Cards */}
          <div className="community-metrics-grid grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="community-metric-card bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-3xl p-5 border border-emerald-500/20 shadow-xs flex items-center justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Total Families</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_families}</div>
                <p className="text-[11px] font-semibold text-emerald-700/80">Registered Masjid Families</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent rounded-3xl p-5 border border-indigo-500/20 shadow-xs flex items-center justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-black text-indigo-800 uppercase tracking-wider">Total Members</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                    {stats.total_members} Members
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_members.toLocaleString()}</div>
                <p className="text-[11px] font-semibold text-indigo-700/80">Across all registered families</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent rounded-3xl p-5 border border-cyan-500/20 shadow-xs flex items-center justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-black text-cyan-800 uppercase tracking-wider">New This Month</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-100 text-cyan-800">
                    +{stats.new_this_month} New
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">+{stats.new_this_month}</div>
                <p className="text-[11px] font-semibold text-cyan-700/80">Recently onboarded families</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20 shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* MAIN TAB CONTENT */}
          {currentTab === 'families' && (
            <div className="space-y-5">
              {/* Search & Filter Header Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search family name, head, family ID or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-end">
                  <button className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-sm">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filters</span>
                  </button>

                  <button className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-sm">
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="community-family-table bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="community-family-table-head bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="py-3.5 px-3 w-10 text-center"></th>
                        <th className="py-3.5 px-4 sm:px-5">Family Head</th>
                        <th className="py-3.5 px-4 sm:px-5">Family / Code</th>
                        <th className="py-3.5 px-4 sm:px-5">Joining Date</th>
                        <th className="py-3.5 px-4 sm:px-5">Monthly Santha</th>
                        <th className="py-3.5 px-4 sm:px-5">Due Day</th>
                        <th className="py-3.5 px-4 sm:px-5">Total Due</th>
                        <th className="py-3.5 px-4 sm:px-5">Outstanding</th>
                        <th className="py-3.5 px-4 sm:px-5">Santha Status</th>
                        <th className="py-3.5 px-4 sm:px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan="10" className="py-8 text-center text-slate-400">
                            Loading families data...
                          </td>
                        </tr>
                      ) : familiesData.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="py-8 text-center text-slate-400">
                            No family records found.
                          </td>
                        </tr>
                      ) : (
                        familiesData.map((f) => {
                          const dueDay = f.santha_due_day || f.due_day || 10;
                          const outstanding = f.outstanding_amount ?? f.pending_amount ?? 0;
                          const pStatus = f.payment_status || (outstanding > 0 ? (f.total_paid > 0 ? "Partially Paid" : "Due") : "Paid");

                          let dueStatusBadge = (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              ✓ Full Amount Paid
                            </span>
                          );

                          if (pStatus === "Partially Paid") {
                            dueStatusBadge = (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-800 border-amber-300">
                                ⚡ Partially Paid (₹{outstanding.toLocaleString()} Pending)
                              </span>
                            );
                          } else if (pStatus === "Due" || pStatus === "Outstanding" || outstanding > 0) {
                            dueStatusBadge = (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-50 text-rose-800 border-rose-300">
                                ⚠️ Outstanding Dues (₹{outstanding.toLocaleString()})
                              </span>
                            );
                          }

                          return (
                          <React.Fragment key={f.id}>
                            <tr
                              onClick={(e) => toggleExpandFamily(f.id, e)}
                              className={`community-family-row hover:bg-slate-50/90 transition-colors cursor-pointer ${
                                expandedFamilyIds[f.id] ? 'bg-slate-50/80 border-l-4 border-l-emerald-500' : ''
                              }`}
                              title="Click down arrow or row to expand/collapse family members"
                            >
                              <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => toggleExpandFamily(f.id, e)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title={expandedFamilyIds[f.id] ? "Collapse Family Members" : "Expand Family Members"}
                                >
                                  {expandedFamilyIds[f.id] ? (
                                    <ChevronUp className="w-4 h-4 text-emerald-600 font-bold" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-600" />
                                  )}
                                </button>
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-bold text-slate-900">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{f.head_name}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                    Head
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4 sm:px-5">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-900 text-xs">{f.family_name}</span>
                                  <span className="font-mono text-[11px] font-bold text-slate-500">{f.family_code}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-semibold text-slate-700 text-xs">
                                {f.joining_date || '—'}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-extrabold text-slate-900 text-xs">
                                ₹{(f.monthly_santha || 500).toLocaleString()}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-extrabold text-slate-700 text-xs">
                                {dueDay}{dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-extrabold text-slate-800 text-xs">
                                ₹{(f.total_santha_due || 0).toLocaleString()}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-extrabold text-rose-700 text-xs">
                                ₹{outstanding.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 sm:px-5">
                                {dueStatusBadge}
                              </td>
                              <td className="py-4 px-4 sm:px-5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    onClick={() => handleViewFamilyDetails(f)}
                                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                    title="View / Edit Family"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteFamilyClick(f, e)}
                                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                    title="Delete Family & All Members"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {expandedFamilyIds[f.id] && (
                              <tr className="bg-slate-50/70 border-b border-slate-200/80">
                                <td colSpan="10" className="p-4 sm:p-6">
                                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                                          {f.family_name} — Members List ({expandedMembersMap[f.id]?.length || 0})
                                        </span>
                                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-md">
                                          {f.family_code}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleOpenAddMemberModal(f.id)}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
                                        >
                                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                          <span>Add Member</span>
                                        </button>
                                        <button
                                          onClick={() => handleViewFamilyDetails(f)}
                                          className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
                                        >
                                          <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>Edit Family View</span>
                                        </button>
                                      </div>
                                    </div>

                                    {loadingExpandedMembersMap[f.id] ? (
                                      <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                                        Loading family members...
                                      </div>
                                    ) : !expandedMembersMap[f.id] || expandedMembersMap[f.id].length === 0 ? (
                                      <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                        No family members listed under {f.head_name}. Click "+ Add Member" above to add.
                                      </div>
                                    ) : (
                                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                        <table className="w-full text-left">
                                          <thead className="bg-slate-100/80 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                            <tr>
                                              <th className="py-2.5 px-4">Member ID</th>
                                              <th className="py-2.5 px-4">Full Name</th>
                                              <th className="py-2.5 px-4">Relationship</th>
                                              <th className="py-2.5 px-4">Gender</th>
                                              <th className="py-2.5 px-4">Mobile</th>
                                              <th className="py-2.5 px-4">Status</th>
                                              <th className="py-2.5 px-4 text-right">Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                            {expandedMembersMap[f.id].map((m) => (
                                              <tr
                                                key={m.id}
                                                onClick={() => handleViewMemberDetails(m, f)}
                                                className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                                              >
                                                <td className="py-3 px-4 font-mono font-bold text-slate-700">
                                                  {m.member_code || `MM ${f.id}-${m.id}`}
                                                </td>
                                                <td className="py-3 px-4 font-extrabold text-slate-900">
                                                  {m.full_name}
                                                  {m.is_head && (
                                                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-white">
                                                      Head
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-700">
                                                  {m.relationship_type || (m.is_head ? 'Family Head' : 'Member')}
                                                </td>
                                                <td className="py-3 px-4 text-slate-700">{m.gender || 'Male'}</td>
                                                <td className="py-3 px-4 font-mono">{m.mobile_number || '—'}</td>
                                                <td className="py-3 px-4">
                                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.status === 'Inactive' || m.status === 'Deactive' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                    {m.status || 'Active'}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                  <div className="flex items-center justify-end space-x-1.5">
                                                    <button
                                                      onClick={() => handleViewMemberDetails(m, f)}
                                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                                      title="View Details"
                                                    >
                                                      <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => handleEditMemberClick(m, f, e)}
                                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                                      title="Edit Member"
                                                    >
                                                      <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => handleDeleteMemberClick(m, f, e)}
                                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-rose-600 transition-colors"
                                                      title="Delete Member"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FAMILY INFORMATION */}
          {currentTab === 'head-changes' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Family Information & Tracking</h3>
                  <p className="text-xs text-slate-500 font-medium">View and track Family Head records, leadership transfers, member rosters, and complete activity history across all registered families.</p>
                </div>
              </div>

              {/* Registered Families Head Records List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Registered Family Head Records ({familiesData.length})
                </h4>

                <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">FAMILY ID</th>
                        <th className="py-3 px-4">FAMILY NAME</th>
                        <th className="py-3 px-4">CURRENT FAMILY HEAD</th>
                        <th className="py-3 px-4">PREVIOUS HEAD</th>
                        <th className="py-3 px-4">AREA</th>
                        <th className="py-3 px-4">STATUS</th>
                        <th className="py-3 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {familiesData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                            No family records found.
                          </td>
                        </tr>
                      ) : (
                        familiesData.map((f) => {
                          const matchingLog = headChangesList.find((log) => log.family_id === f.id || log.family_name === f.family_name);
                          const prevHeadName = matchingLog && matchingLog.old_head && matchingLog.old_head !== 'Initial Registration' && matchingLog.old_head !== f.head_name
                            ? matchingLog.old_head
                            : '—';

                          return (
                            <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{f.family_code}</td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">{f.family_name}</td>
                              <td className="py-3.5 px-4 font-bold text-emerald-800">{f.head_name}</td>
                              <td className="py-3.5 px-4 font-medium text-slate-500">{prevHeadName}</td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">{f.area}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {f.status || 'Active'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleViewFamilyActivity(f.id)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>View</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Succession History Logs - Team Head Audit Structure */}
              {(() => {
                // 1. Deduplicate raw audit logs
                const uniqueHeadChangesList = (headChangesList || []).filter((log, idx, arr) => {
                  if (!log) return false;
                  const firstIdx = arr.findIndex((item) => {
                    if (item.id && log.id && item.id === log.id) return true;
                    const logDate = log.created_at ? new Date(log.created_at).toISOString().slice(0, 16) : '';
                    const itemDate = item.created_at ? new Date(item.created_at).toISOString().slice(0, 16) : '';
                    return (
                      item.family_id === log.family_id &&
                      item.reason === log.reason &&
                      item.old_head === log.old_head &&
                      item.new_head === log.new_head &&
                      itemDate === logDate
                    );
                  });
                  return firstIdx === idx;
                });

                // 2. Group logs by Team Head (Family)
                const teamHeadsMap = new Map();

                // Populate from registered families first
                (familiesData || []).forEach((fam) => {
                  teamHeadsMap.set(fam.id, {
                    family_id: fam.id,
                    family_name: fam.family_name,
                    family_code: fam.family_code || `FM-${fam.id}`,
                    head_name: fam.head_name || 'Family Head',
                    area: fam.area || 'Tenkasi',
                    city: fam.city || 'Tenkasi',
                    status: fam.status || 'Active',
                    logs: []
                  });
                });

                // Attach logs to team heads
                uniqueHeadChangesList.forEach((log) => {
                  const famId = log.family_id;
                  if (famId && teamHeadsMap.has(famId)) {
                    teamHeadsMap.get(famId).logs.push(log);
                  } else {
                    let foundKey = null;
                    for (const [k, v] of teamHeadsMap.entries()) {
                      if (v.family_name === log.family_name) {
                        foundKey = k;
                        break;
                      }
                    }
                    if (foundKey) {
                      teamHeadsMap.get(foundKey).logs.push(log);
                    } else {
                      const key = famId || log.family_name;
                      teamHeadsMap.set(key, {
                        family_id: famId,
                        family_name: log.family_name,
                        family_code: '—',
                        head_name: log.new_head || log.old_head || 'Family Head',
                        area: 'Tenkasi',
                        city: 'Tenkasi',
                        status: 'Active',
                        logs: [log]
                      });
                    }
                  }
                });

                const teamHeadsList = Array.from(teamHeadsMap.values());
                const totalAuditLogsCount = uniqueHeadChangesList.length;

                // Filter team heads based on search query
                const filteredTeamHeads = teamHeadsList.filter((th) => {
                  if (!teamHeadSearchQuery.trim()) return true;
                  const q = teamHeadSearchQuery.toLowerCase();
                  return (
                    th.head_name.toLowerCase().includes(q) ||
                    th.family_name.toLowerCase().includes(q) ||
                    th.family_code.toLowerCase().includes(q) ||
                    th.area.toLowerCase().includes(q)
                  );
                });

                // Selected Team Head object (if any)
                const selectedTeamHead = selectedTeamHeadId
                  ? teamHeadsList.find((th) => th.family_id === selectedTeamHeadId || th.family_name === selectedTeamHeadId)
                  : null;

                // Selected Team Head's filtered logs
                const selectedLogs = selectedTeamHead
                  ? selectedTeamHead.logs.filter((log) => {
                      if (auditLogTypeFilter === 'all') return true;
                      const r = (log.reason || '').toLowerCase();
                      if (auditLogTypeFilter === 'head') return r.includes('head') || r.includes('succession') || r.includes('initial') || log.old_head !== log.new_head;
                      if (auditLogTypeFilter === 'member') return r.includes('member');
                      if (auditLogTypeFilter === 'santha') return r.includes('santha') || r.includes('payment');
                      return true;
                    })
                  : [];

                return (
                  <div className="space-y-5 pt-5 border-t border-slate-200/80 font-sans">
                    {/* SECTION HEADER & CONTROL BAR */}
                    <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold shadow-inner">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center space-x-2">
                                <span>Leadership Succession & Audit History</span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {teamHeadsList.length} Team Heads
                                </span>
                              </h3>
                              <p className="text-xs text-slate-300 font-medium mt-0.5">
                                Organized audit trail categorized by Team Head. Select a Team Head to inspect complete change history.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                            {totalAuditLogsCount} Audit Records Logged
                          </span>
                          {selectedTeamHead && (
                            <button
                              onClick={() => setSelectedTeamHeadId(null)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>View All Team Heads</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SEARCH & BREADCRUMB NAVIGATION */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {selectedTeamHead ? (
                          <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
                            <button
                              onClick={() => setSelectedTeamHeadId(null)}
                              className="hover:text-emerald-400 transition-colors font-bold underline cursor-pointer"
                            >
                              All Team Heads
                            </button>
                            <span>/</span>
                            <span className="text-emerald-400 font-extrabold">{selectedTeamHead.head_name}</span>
                            <span className="text-slate-400 font-mono">({selectedTeamHead.family_code})</span>
                          </div>
                        ) : (
                          <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search Team Head by name, family code, area..."
                              value={teamHeadSearchQuery}
                              onChange={(e) => setTeamHeadSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            />
                            {teamHeadSearchQuery && (
                              <button
                                onClick={() => setTeamHeadSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VIEW LEVEL 1: TEAM HEAD CARDS SELECTION GRID (When no Team Head selected) */}
                    {!selectedTeamHead && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                            <span>Select Team Head to View Change Audit Log</span>
                            <span className="text-slate-400 font-normal text-[11px]">({filteredTeamHeads.length} available)</span>
                          </h4>
                        </div>

                        {loadingHeadChanges ? (
                          <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
                            Loading Team Heads & Leadership Logs...
                          </div>
                        ) : filteredTeamHeads.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">
                            No Team Heads found matching "{teamHeadSearchQuery}".
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTeamHeads.map((th) => {
                              const logCount = th.logs.length;
                              const hasLogs = logCount > 0;
                              const latestLog = hasLogs ? th.logs[0] : null;
                              const formattedLatest = latestLog?.created_at
                                ? new Date(latestLog.created_at).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : null;

                              return (
                                <div
                                  key={th.family_id || th.family_name}
                                  onClick={() => setSelectedTeamHeadId(th.family_id || th.family_name)}
                                  className={`group p-5 bg-white rounded-3xl border transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden ${
                                    hasLogs
                                      ? 'border-slate-200 hover:border-emerald-500/50 hover:bg-slate-50/60'
                                      : 'border-slate-200/70 opacity-80 hover:opacity-100 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform">
                                          {th.head_name ? th.head_name.slice(0, 2).toUpperCase() : 'TH'}
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                            {th.head_name}
                                          </h4>
                                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                            {th.family_name}
                                          </p>
                                        </div>
                                      </div>

                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border shrink-0 ${
                                          hasLogs
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}
                                      >
                                        {logCount} {logCount === 1 ? 'Audit Log' : 'Audit Logs'}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Family Code</span>
                                        <span className="font-mono font-bold text-slate-800">{th.family_code}</span>
                                      </div>
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Area & City</span>
                                        <span className="font-bold text-slate-800">{th.area}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-medium">
                                      {formattedLatest ? `Latest: ${formattedLatest}` : 'No logged activity'}
                                    </span>
                                    <span className="font-extrabold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                                      <span>View History</span>
                                      <span>→</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* VIEW LEVEL 2: SELECTED TEAM HEAD AUDIT HISTORY (When Team Head is selected) */}
                    {selectedTeamHead && (
                      <div className="space-y-4">
                        {/* Selected Team Head Banner Card */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                              {selectedTeamHead.head_name ? selectedTeamHead.head_name.slice(0, 2).toUpperCase() : 'TH'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-base font-extrabold text-slate-900">
                                  {selectedTeamHead.head_name}
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {selectedTeamHead.family_code}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                Family: <strong className="text-slate-800">{selectedTeamHead.family_name}</strong> • Area: <span className="text-slate-700">{selectedTeamHead.area}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                            <button
                              onClick={() => handleViewFamilyActivity(selectedTeamHead.family_id)}
                              className="px-3.5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>View Full Activity</span>
                            </button>
                            <button
                              onClick={() => setSelectedTeamHeadId(null)}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Back to Team Heads List</span>
                            </button>
                          </div>
                        </div>

                        {/* Audit Log Filters Pills */}
                        <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                          <div className="flex items-center space-x-2 overflow-x-auto">
                            <span className="text-xs font-extrabold text-slate-500 pl-2 uppercase tracking-wider">Filter Events:</span>
                            {[
                              { id: 'all', label: `All Changes (${selectedTeamHead.logs.length})` },
                              { id: 'head', label: 'Leadership / Head Transfer' },
                              { id: 'member', label: 'Member Modifications' },
                              { id: 'santha', label: 'Santha / Financial' }
                            ].map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setAuditLogTypeFilter(f.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  auditLogTypeFilter === f.id
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-200/60'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>

                          <span className="text-xs font-bold text-slate-500 pr-2">
                            Showing {selectedLogs.length} of {selectedTeamHead.logs.length} events
                          </span>
                        </div>

                        {/* Chronological Audit Logs Timeline */}
                        {selectedLogs.length === 0 ? (
                          <div className="p-10 text-center text-xs text-slate-400 font-medium bg-white rounded-3xl border border-slate-200 space-y-2">
                            <p className="font-bold text-slate-600">No audit log records found for this filter.</p>
                            <p>Try switching to "All Changes" or view all Team Heads.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedLogs.map((log) => {
                              const formattedDate = log.created_at
                                ? new Date(log.created_at).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Recent';

                              const reasonLower = (log.reason || '').toLowerCase();
                              const isInitial = reasonLower.includes('initial') || reasonLower.includes('new family head');
                              const isMemberEvent = reasonLower.includes('member');
                              const isSanthaEvent = reasonLower.includes('santha') || reasonLower.includes('payment');
                              const isHeadReplaced = !isInitial && !isMemberEvent && !isSanthaEvent && log.old_head && log.new_head && log.old_head !== log.new_head && log.old_head !== 'Initial Registration' && log.old_head !== '—';

                              let actionBadge = { label: 'Record Updated', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };

                              if (isInitial) {
                                actionBadge = { label: 'Team Head Registered', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold' };
                              } else if (isHeadReplaced) {
                                actionBadge = { label: 'Leadership Replaced', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold' };
                              } else if (isMemberEvent) {
                                actionBadge = { label: 'Member Modification', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' };
                              } else if (isSanthaEvent) {
                                actionBadge = { label: 'Santha Audit', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 font-mono font-bold' };
                              }

                              return (
                                <div
                                  key={log.id}
                                  className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                      <span className={`px-2.5 py-1 rounded-full text-[11px] border ${actionBadge.badgeClass}`}>
                                        {actionBadge.label}
                                      </span>
                                      <span className="font-extrabold text-sm text-slate-900">{log.reason || 'Leadership Event'}</span>
                                    </div>

                                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                                      <span>Modified By: <strong className="text-slate-700">{log.changed_by || 'Admin User'}</strong></span>
                                      <span>•</span>
                                      <span className="font-semibold text-slate-700">{formattedDate}</span>
                                    </div>
                                  </div>

                                  {/* Details Box - Only show Previous Head strikethrough if real Head Replacement occurred */}
                                  {isHeadReplaced ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Previous Team Head</span>
                                        <span className="font-bold text-rose-600 line-through text-xs block">
                                          {log.old_head}
                                        </span>
                                      </div>

                                      <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
                                        <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">New Team Head</span>
                                        <span className="font-bold text-emerald-800 text-xs block">
                                          {log.new_head}
                                        </span>
                                      </div>
                                    </div>
                                  ) : isInitial ? (
                                    <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Registered Team Head</span>
                                        <span className="font-bold text-emerald-900 text-xs block mt-0.5">{log.new_head || selectedTeamHead.head_name}</span>
                                      </div>
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        ✓ Baseline Creation
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Current Team Head</span>
                                        <span className="font-bold text-slate-800 text-xs block mt-0.5">{log.new_head || selectedTeamHead.head_name}</span>
                                      </div>
                                      <span className="text-[11px] text-slate-600 font-medium">{log.reason}</span>
                                    </div>
                                  )}

                                  {/* Bottom Actions */}
                                  <div className="flex items-center justify-end space-x-3 pt-1">
                                    <button
                                      onClick={() => setSelectedHeadChangeComparison(log)}
                                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                                      <span>Comparison Details</span>
                                    </button>
                                    <button
                                      onClick={() => handleViewFamilyActivity(log.family_id)}
                                      className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                                    >
                                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>View Full Family Activity</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}


          {/* TAB 3: MEMBER REQUESTS */}
          {currentTab === 'member-requests' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Submitted Member Addition & Update Requests</h3>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Mohamed Rahman (Son)</h4>
                  <p className="text-xs text-blue-700">Requested by Abdul Rahman Family</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs">Approved</span>
              </div>
            </div>
          )}

          {/* TAB 4: FAMILY STATEMENTS */}
          {currentTab === 'statements' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              
              {/* Top Header & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Family Financial & Membership Statements</h3>
                  <p className="text-xs text-slate-500 font-medium">Complete overview of family profiles, member rosters, collection amounts, and payment status.</p>
                </div>
                
                {/* Search & Status Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search family, head or code..."
                      value={statementSearchTerm}
                      onChange={(e) => setStatementSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <select
                    value={statementStatusFilter}
                    onChange={(e) => setStatementStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 shrink-0"
                  >
                    <option value="All">All Payment Statuses</option>
                    <option value="Paid in Full">Paid in Full</option>
                    <option value="Partial Dues Pending">Partial Dues Pending</option>
                    <option value="Overdue / Arrears">Overdue / Arrears</option>
                  </select>
                </div>
              </div>

              {/* Statements List Grid */}
              {loadingStatements ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading family financial & membership statements...</div>
              ) : (() => {
                const filtered = statementsList.filter((st) => {
                  const matchesSearch = !statementSearchTerm ||
                    st.family_name.toLowerCase().includes(statementSearchTerm.toLowerCase()) ||
                    st.family_code.toLowerCase().includes(statementSearchTerm.toLowerCase()) ||
                    st.head_name.toLowerCase().includes(statementSearchTerm.toLowerCase()) ||
                    st.area.toLowerCase().includes(statementSearchTerm.toLowerCase());
                  const matchesStatus = statementStatusFilter === 'All' || st.payment_status === statementStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No family statements found matching your filters.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((st) => {
                      const isPaid = st.payment_status === 'Paid in Full';
                      const isArrears = st.payment_status === 'Overdue / Arrears';

                      return (
                        <div
                          key={st.family_id}
                          className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          {/* Statement Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-base font-extrabold text-slate-900">{st.family_name}</h4>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white text-slate-700 border border-slate-200">
                                  {st.family_code}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                Family Head: <strong className="text-slate-800">{st.head_name}</strong> • Mobile: <span className="font-mono text-slate-700">{st.mobile_number}</span> • Area: <span className="text-slate-700">{st.area}</span>
                              </p>
                            </div>

                            {/* Status Badge & View Statement Button */}
                            <div className="flex items-center space-x-3 shrink-0 self-start sm:self-center">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isArrears
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {isPaid ? '✓ Paid in Full' : isArrears ? '⚠️ Overdue / Arrears' : '⏳ Dues Pending'}
                              </span>

                              <button
                                onClick={() => setSelectedFamilyStatement(st)}
                                className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>View Full Statement</span>
                              </button>
                            </div>
                          </div>

                          {/* Statement Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-medium">
                            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Members</span>
                              <span className="text-sm font-extrabold text-slate-900">{st.member_count} Members</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Santha</span>
                              <span className="text-sm font-extrabold text-slate-900">₹{st.monthly_santha}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Annual Required</span>
                              <span className="text-sm font-extrabold text-slate-900">₹{st.annual_required}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase block">Total Paid Amount</span>
                              <span className="text-sm font-extrabold text-emerald-700">₹{st.total_paid}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                              <span className="text-[10px] font-bold text-rose-500 uppercase block">Pending / Unpaid Dues</span>
                              <span className={`text-sm font-extrabold ${st.pending_amount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                ₹{st.pending_amount}
                              </span>
                            </div>
                          </div>

                          {/* Member List Preview Bar */}
                          {st.members && st.members.length > 0 && (
                            <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400 font-semibold mr-1">Members Roster:</span>
                              {st.members.map((m) => (
                                <span
                                  key={m.id}
                                  className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold flex items-center space-x-1"
                                >
                                  <span>{m.full_name} ({m.relationship_type})</span>
                                  <span className={`text-[10px] font-mono ${m.is_head && st.pending_amount <= 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                    • {m.payment_status}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB 5: FUNCTIONS & COMMUNITY CHARGES - LIST VIEW */}
          {currentTab === 'functions' && !isAddingFunctionCharge && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Functions & Community Charges</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Record Masjid community functions and collect applicable charges from families.</p>
                </div>

                <button
                  onClick={handleOpenAddFunctionCharge}
                  className="px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-2 shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Add Function Charge</span>
                </button>
              </div>

              {/* Column-Based Table View (Pixel-perfect match to User Reference Image 1) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="py-4 px-4 sm:px-6">FUNCTION NO.</th>
                        <th className="py-4 px-4 sm:px-6">FAMILY</th>
                        <th className="py-4 px-4 sm:px-6">FUNCTION TYPE</th>
                        <th className="py-4 px-4 sm:px-6">DATE</th>
                        <th className="py-4 px-4 sm:px-6">CHARGE AMOUNT</th>
                        <th className="py-4 px-4 sm:px-6">PAID</th>
                        <th className="py-4 px-4 sm:px-6">BALANCE</th>
                        <th className="py-4 px-4 sm:px-6">STATUS</th>
                        <th className="py-4 px-4 sm:px-6 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {loadingFunctions ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-slate-400">
                            Loading function charge records...
                          </td>
                        </tr>
                      ) : functionsList.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-slate-400">
                            No function charge records found. Click "+ Add Function Charge" to record a new charge.
                          </td>
                        </tr>
                      ) : (
                        functionsList.map((item) => {
                          const chargeAmt = item.amount ? `₹${item.amount.toLocaleString()}` : '₹0';
                          const paidAmt = item.paid_amount ? `₹${item.paid_amount.toLocaleString()}` : '₹0';
                          const balAmt = item.balance ? `₹${item.balance.toLocaleString()}` : '₹0';
                          const isPaid = item.status === 'Paid';
                          const isPartial = item.status === 'Partial';

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-600">
                                {item.function_no || `FUN-${item.id}`}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                                {item.family_name}
                              </td>
                              <td className="py-4 px-4 sm:px-6 text-slate-700 font-medium">
                                {item.function_type || item.function_title || 'Marriage Function'}
                              </td>
                              <td className="py-4 px-4 sm:px-6 text-slate-600">
                                {item.event_date || '—'}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                                {chargeAmt}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                                {paidAmt}
                              </td>
                              <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">
                                {balAmt}
                              </td>
                              <td className="py-4 px-4 sm:px-6">
                                <span
                                  className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold border ${
                                    isPaid
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : isPartial
                                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                                      : 'bg-rose-50 text-rose-600 border-rose-200'
                                  }`}
                                >
                                  {item.status || 'Draft'}
                                </span>
                              </td>
                              <td className="py-4 px-4 sm:px-6 text-right">
                                <button
                                  onClick={() => handleOpenEditFunctionCharge(item)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 hover:border-emerald-200 text-xs font-bold transition-colors inline-flex items-center space-x-1.5"
                                  title="Edit Function Charge"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-600" />
                                  <span>Edit</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ADD FUNCTION CHARGE SEPARATE FORM PAGE */}
          {currentTab === 'functions' && isAddingFunctionCharge && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 font-sans max-w-5xl mx-auto">
              
              {/* Top Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-900">
                  {editingFunctionId ? 'Edit Function Charge' : 'Add Function Charge'}
                </h2>
                <button
                  onClick={() => setIsAddingFunctionCharge(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center justify-between">
                  <span>⚠️ {submitError}</span>
                  <button type="button" onClick={() => setSubmitError('')} className="text-rose-500 hover:text-rose-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateFunctionCharge} className="space-y-6 text-xs font-medium">
                
                {/* SECTION 1: Family & Function */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">Family & Function</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Family</label>
                      <select
                        value={functionForm.family_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          const fam = familiesData.find((f) => f.id === parseInt(val));
                          setFunctionForm({
                            ...functionForm,
                            family_id: val,
                            family_name: fam ? fam.family_name : '',
                            contact_number: fam ? fam.mobile_number || '+91...' : '+91...'
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      >
                        {familiesData.length === 0 ? (
                          <option value="">No families registered</option>
                        ) : (
                          familiesData.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.family_code} • {f.family_name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Function Date</label>
                      <input
                        type="date"
                        value={functionForm.event_date}
                        onChange={(e) => setFunctionForm({ ...functionForm, event_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Function Type</label>
                      <select
                        value={functionForm.function_type}
                        onChange={(e) => setFunctionForm({ ...functionForm, function_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      >
                        <option value="Marriage Function">Marriage Function</option>
                        <option value="Circumcision Function">Circumcision Function</option>
                        <option value="Aqeeqah / Community Event">Aqeeqah / Community Event</option>
                        <option value="Janazah Service">Janazah Service</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Person / Member Name</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={functionForm.person_name}
                        onChange={(e) => setFunctionForm({ ...functionForm, person_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Contact Number</label>
                      <input
                        type="text"
                        placeholder="+91..."
                        value={functionForm.contact_number}
                        onChange={(e) => setFunctionForm({ ...functionForm, contact_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Status</label>
                      <select
                        value={functionForm.status}
                        onChange={(e) => setFunctionForm({ ...functionForm, status: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Charges & Collection */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">Charges & Collection</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">
                        Function Charge <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={functionForm.amount}
                        onChange={(e) => setFunctionForm({ ...functionForm, amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Advance / Paid</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={functionForm.paid_amount}
                        onChange={(e) => setFunctionForm({ ...functionForm, paid_amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Balance</label>
                      <input
                        type="text"
                        readOnly
                        value={
                          functionForm.amount
                            ? `₹${Math.max(0, (parseFloat(functionForm.amount) || 0) - (parseFloat(functionForm.paid_amount) || 0)).toLocaleString()}`
                            : 'Auto-calculated'
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold bg-slate-50 text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Payment Method</label>
                      <select
                        value={functionForm.payment_method}
                        onChange={(e) => setFunctionForm({ ...functionForm, payment_method: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI / QR">UPI / QR</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Receipt Number</label>
                      <input
                        type="text"
                        placeholder="Auto-generated"
                        value={functionForm.receipt_no}
                        onChange={(e) => setFunctionForm({ ...functionForm, receipt_no: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>


                {/* SECTION 4: Additional Information */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">Additional Information</h3>
                  <textarea
                    rows="3"
                    placeholder="Function details, requirements, notes..."
                    value={functionForm.notes}
                    onChange={(e) => setFunctionForm({ ...functionForm, notes: e.target.value })}
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-sm resize-none"
                  ></textarea>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    disabled={isFunctionSubmitting}
                    onClick={() => setIsAddingFunctionCharge(false)}
                    className="px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFunctionSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                  >
                    {isFunctionSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{editingFunctionId ? 'Updating Function Charge...' : 'Saving Function Charge...'}</span>
                      </>
                    ) : (
                      <span>{editingFunctionId ? 'Update Function Charge' : 'Save Function & Generate Receipt'}</span>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

        </main>

        <footer className="text-center py-4 border-t border-slate-200/60 bg-[#f8fafc] text-slate-400 text-xs font-medium shrink-0">
          Masjid Manager • Active System
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DYNAMIC FAMILY MEMBER SELECTION & ROSTER INTERFACE                */}
      {/* ========================================================================= */}
      {showFamilyRosterModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150 font-sans">
            
            {/* Modal Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Dynamic Family Member Roster & Selection</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Dynamic family categories generated from registered data. Select a family category to add members or edit existing records.
                </p>
              </div>
              <button
                onClick={() => setShowFamilyRosterModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors self-end sm:self-auto cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Roster Search Bar & Expand/Collapse All Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Family Head, Member Name, Family Code, or Relationship..."
                  value={rosterSearchTerm}
                  onChange={(e) => setRosterSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-inner"
                />
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const allExpanded = {};
                    familiesData.forEach((f) => { allExpanded[f.id] = true; });
                    setRosterExpandedFamilyIds(allExpanded);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => setRosterExpandedFamilyIds({})}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Dynamic Family Category Headers & Roster List */}
            <div className="space-y-6">
              {loadingRosterMembers ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  Loading dynamic family categories and members roster...
                </div>
              ) : familiesData.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No family records found. Click "+ Create Family" first to register a Family Head.
                </div>
              ) : (
                familiesData
                  .filter((f) => {
                    if (!rosterSearchTerm) return true;
                    const term = rosterSearchTerm.toLowerCase();
                    const headMatch = f.head_name?.toLowerCase().includes(term);
                    const codeMatch = f.family_code?.toLowerCase().includes(term);
                    const areaMatch = f.area?.toLowerCase().includes(term);
                    const members = expandedMembersMap[f.id] || [];
                    const memberMatch = members.some(m => m.full_name?.toLowerCase().includes(term) || m.relationship_type?.toLowerCase().includes(term));
                    return headMatch || codeMatch || areaMatch || memberMatch;
                  })
                  .map((f) => {
                    const members = expandedMembersMap[f.id] || [];
                    const headMember = members.find(m => m.is_head || m.relationship_type === 'Family Head');
                    const actualHeadName = headMember ? headMember.full_name : f.head_name;
                    const isExpanded = rosterExpandedFamilyIds[f.id] !== false;

                    return (
                      <div key={f.id} className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4 shadow-sm">
                        {/* Dynamic Category Header with Chevron Down Toggle */}
                        <div
                          onClick={() => toggleRosterFamilyExpand(f.id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3 cursor-pointer select-none group"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRosterFamilyExpand(f.id);
                              }}
                              className="p-1.5 rounded-lg bg-slate-200/80 hover:bg-emerald-100 text-slate-700 transition-colors"
                              title={isExpanded ? "Click down arrow to collapse family members" : "Click down arrow to show family members"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-emerald-600 font-bold" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-700 font-bold" />
                              )}
                            </button>

                            <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-emerald-400 flex items-center justify-center font-bold text-xs shadow-xs">
                              <Users className="w-3.5 h-3.5" />
                            </div>

                            <span className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              Family Head: <span className="text-emerald-800 font-black">{actualHeadName}</span>
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-700 rounded-md">
                              {f.family_code}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                              {f.area || 'Tenkasi'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              ({members.length} {members.length === 1 ? 'member' : 'members'})
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setShowFamilyRosterModal(false);
                                handleOpenAddMemberModal(f.id);
                              }}
                              className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              <span>Add Member to {actualHeadName.split(' ')[0]} Family</span>
                            </button>
                          </div>
                        </div>

                        {/* Member Roster List under this Family Header (Collapsible) */}
                        {isExpanded && (
                          <>
                            {members.length === 0 ? (
                              <div className="p-4 text-center text-xs font-medium text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                No members listed under {actualHeadName}. Click "+ Add Member to {actualHeadName.split(' ')[0]} Family" above.
                              </div>
                            ) : (
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100/80 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                      <tr>
                                        <th className="py-2.5 px-4">Member Code</th>
                                        <th className="py-2.5 px-4">Full Name</th>
                                        <th className="py-2.5 px-4">Relationship</th>
                                        <th className="py-2.5 px-4">Gender</th>
                                        <th className="py-2.5 px-4">Mobile</th>
                                        <th className="py-2.5 px-4">Status</th>
                                        <th className="py-2.5 px-4 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                      {members.map((m) => {
                                        const isHead = m.is_head || m.relationship_type === 'Family Head';
                                        return (
                                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                                              {m.member_code || `MM ${f.id}-${m.id}`}
                                            </td>
                                            <td className="py-3 px-4 font-extrabold text-slate-900">
                                              {m.full_name}
                                            </td>
                                            <td className="py-3 px-4">
                                              {isHead ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                  Family Head
                                                </span>
                                              ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                  {m.relationship_type || 'Member'}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700">{m.gender || 'Male'}</td>
                                            <td className="py-3 px-4 font-mono text-slate-700">{m.mobile_number || '—'}</td>
                                            <td className="py-3 px-4">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.status === 'Inactive' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {m.status || 'Active'}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <div className="flex items-center justify-end space-x-1.5">
                                                <button
                                                  onClick={() => {
                                                    setShowFamilyRosterModal(false);
                                                    handleEditMemberClick(m, f);
                                                  }}
                                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                                                  title="Edit Member Details"
                                                >
                                                  <Pencil className="w-3 h-3 text-emerald-600" />
                                                  <span>Edit</span>
                                                </button>
                                                <button
                                                  onClick={(e) => handleDeleteMemberClick(m, f, e)}
                                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                                  title="Delete Member"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowFamilyRosterModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT MEMBER (PERSISTENT & AUTO-TOKEN SUPPORT)                */}
      {/* ========================================================================= */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150 font-sans">
            
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">
                {editingMemberId ? 'Edit Family Member' : 'Add Member'}
              </h3>
              <button
                onClick={handleCancelMemberForm}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddOrEditMember} className="space-y-6 text-xs font-medium">
              
              {/* Row 1: Member ID (Auto-Generated Token), Full Name *, Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Member ID / Token
                  </label>
                  <input
                    type="text"
                    disabled
                    value={generatedMemberCode || ''}
                    placeholder="Auto-generated (e.g. M-0005-2)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-900 font-mono font-bold cursor-not-allowed shadow-inner"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {!editingMemberId ? 'Token will be released if you click Cancel.' : 'Saved member token.'}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Member full name"
                    value={memberForm.full_name}
                    onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                  <select
                    value={memberForm.gender}
                    onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Date of Birth, Mobile Number, Marital Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={memberForm.dob}
                    onChange={(e) => setMemberForm({ ...memberForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={memberForm.mobile_number}
                    onChange={(e) => setMemberForm({ ...memberForm, mobile_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Marital Status</label>
                  <select
                    value={memberForm.marital_status}
                    onChange={(e) => setMemberForm({ ...memberForm, marital_status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Family, Relationship, Member Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Family Head</label>
                  <select
                    value={memberForm.family_id}
                    onChange={(e) => handleFamilySelectInMemberForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none text-xs"
                  >
                    {familiesData.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.head_name} ({f.family_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Relationship</label>
                  <select
                    value={memberForm.relationship_type}
                    onChange={(e) => setMemberForm({ ...memberForm, relationship_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Family Head">Family Head</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Member Status</label>
                  <select
                    value={memberForm.status}
                    onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* SANTHA PAYMENT & PREVIOUS PAYMENT DUES SUMMARY CARD */}
              {(() => {
                const selFam = familiesData.find(f => f.id === parseInt(memberForm.family_id));
                if (!selFam) return null;
                const monthlyRate = selFam.monthly_santha || 200;
                const totalDue = selFam.total_santha_due || 0;
                const totalPaid = selFam.total_paid || 0;
                const outstanding = selFam.outstanding_amount ?? selFam.pending_amount ?? 0;
                const isFullPaid = outstanding === 0;

                return (
                  <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-md font-sans">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                          ₹
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          Family Santha Payment Calculation
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Joining Date: <span className="text-slate-200 font-bold">{selFam.joining_date || '—'}</span> • Monthly Rate: <span className="text-slate-200 font-bold">₹{monthlyRate}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Total Applicable Santha</span>
                        <span className="text-sm font-black text-white">₹{totalDue.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Previously Paid</span>
                        <span className="text-sm font-black text-emerald-400">₹{totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Remaining Payable Amount</span>
                        <span className={`text-sm font-black ${isFullPaid ? 'text-emerald-300' : 'text-rose-400'}`}>
                          {isFullPaid ? '✓ Full Amount Paid' : `₹${outstanding.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Section 2: Additional Information Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900">Additional Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Occupation</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer / Businessman"
                      value={memberForm.occupation}
                      onChange={(e) => setMemberForm({ ...memberForm, occupation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Education</label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech / Higher Secondary"
                      value={memberForm.education}
                      onChange={(e) => setMemberForm({ ...memberForm, education: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Documents Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>Documents</span>
                  </h4>
                  {selectedMemberFiles.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedMemberFiles.length} {selectedMemberFiles.length === 1 ? 'document attached' : 'documents attached'}
                    </span>
                  )}
                </div>

                {/* Hidden Native File Input */}
                <input
                  ref={memberFileInputRef}
                  type="file"
                  onChange={handleMemberFileChange}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                />

                {/* Drop Zone Box */}
                <div
                  onClick={() => memberFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(false);
                  }}
                  onDrop={handleMemberFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer space-y-2.5 ${
                    isDraggingDoc
                      ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                      : 'border-slate-200/90 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Drop ID documents here or <span className="text-indigo-600 underline">click to upload</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      Supports JPG, PNG, WEBP, PDF, WORD (.doc, .docx) & all document formats up to 10MB
                    </p>
                  </div>
                </div>

                {/* Attached Files List */}
                {selectedMemberFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-extrabold text-slate-700">Attached Documents:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedMemberFiles.map((file, idx) => {
                        const isPdf = file.type === 'PDF' || file.name.endsWith('.pdf');
                        const isImg = ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
                        const isWord = ['DOC', 'DOCX'].includes(file.type) || /\.(doc|docx)$/i.test(file.name);

                        let badgeBg = 'bg-slate-100 text-slate-700';
                        let iconColor = 'text-slate-500';
                        if (isPdf) {
                          badgeBg = 'bg-rose-100 text-rose-800';
                          iconColor = 'text-rose-600';
                        } else if (isImg) {
                          badgeBg = 'bg-amber-100 text-amber-800';
                          iconColor = 'text-amber-600';
                        } else if (isWord) {
                          badgeBg = 'bg-indigo-100 text-indigo-800';
                          iconColor = 'text-indigo-600';
                        }

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors shadow-2xs group"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              <div className={`p-1.5 rounded-lg ${badgeBg} shrink-0`}>
                                {isImg ? (
                                  <Image className="w-4 h-4 text-amber-600" />
                                ) : (
                                  <FileText className={`w-4 h-4 ${iconColor}`} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {file.type} {file.size ? `• ${file.size}` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMemberFile(idx);
                              }}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                              title="Remove file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isMemberSubmitting}
                  onClick={handleCancelMemberForm}
                  className="px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMemberSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-70"
                >
                  {isMemberSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Member...</span>
                    </>
                  ) : (
                    <span>{editingMemberId ? 'Save Member Changes' : 'Save Member'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW FAMILY (MATCHING USER SCREENSHOT PIXEL-PERFECTLY)          */}
      {/* ========================================================================= */}
      {showCreateFamilyModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150 font-sans">
            
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-extrabold text-slate-900">
                {editingFamilyId ? 'Edit Family & Head Details' : 'Add New Family'}
              </h3>
              <button
                onClick={() => {
                  setEditingFamilyId(null);
                  setShowCreateFamilyModal(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>


            {/* Notice Alert Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center space-x-3 text-xs text-emerald-900 font-medium">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                ⓘ
              </div>
              <p>A unique Family ID will be generated automatically upon saving.</p>
            </div>

            {/* Error Alert Banner */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center justify-between animate-in fade-in">
                <span>⚠️ {submitError}</span>
                <button type="button" onClick={() => setSubmitError('')} className="text-rose-500 hover:text-rose-700 font-bold">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleCreateFamily} className="space-y-6 text-xs font-medium">
              
              {/* SECTION 1: FIRST FAMILY MEMBER */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2 text-[#059669] font-bold text-sm">
                    <UserPlus className="w-4 h-4 text-[#059669]" />
                    <span>First Family Member (Family Head Details)</span>
                  </div>
                  {editingFamilyId && familiesData && familiesData.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-semibold text-xs">Target Family:</span>
                      <select
                        value={editingFamilyId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const fam = familiesData.find((f) => f.id === parseInt(val));
                            if (fam) handleEditFamilyClick(fam);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm"
                      >
                        {familiesData.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.family_name} ({f.family_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>


                {/* Row 1: First Name *, Last Name *, Family Status, Family Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abdul"
                      value={familyForm.first_name}
                      onChange={(e) => setFamilyForm({ ...familyForm, first_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahman"
                      value={familyForm.last_name}
                      onChange={(e) => setFamilyForm({ ...familyForm, last_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Family Status</label>
                    <select
                      value={familyForm.status}
                      onChange={(e) => setFamilyForm({ ...familyForm, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Arrears">Arrears</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Family Gender</label>
                    <select
                      value={familyForm.gender}
                      onChange={(e) => setFamilyForm({ ...familyForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Date of Birth *, Mobile Number *, Joining Date * */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={familyForm.dob}
                      onChange={(e) => setFamilyForm({ ...familyForm, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91..."
                      value={familyForm.mobile_number}
                      onChange={(e) => setFamilyForm({ ...familyForm, mobile_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Joining Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={familyForm.joining_date}
                      onChange={(e) => setFamilyForm({ ...familyForm, joining_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Relationship *, Aadhar / ID Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Relationship <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={familyForm.relationship_type}
                      onChange={(e) => setFamilyForm({ ...familyForm, relationship_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="Select Relationship">Select Relationship</option>
                      <option value="Family Head">Family Head</option>
                      <option value="Self">Self</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Aadhar / ID Reference</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={familyForm.aadhar_ref}
                      onChange={(e) => setFamilyForm({ ...familyForm, aadhar_ref: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ADDRESS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 text-[#059669] font-bold text-sm">
                  <Building2 className="w-4 h-4 text-[#059669]" />
                  <span>Address</span>
                </div>

                {/* Row 1: Door / House No., Street, Area */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Door / House No.</label>
                    <input
                      type="text"
                      placeholder="12/4"
                      value={familyForm.house_no}
                      onChange={(e) => setFamilyForm({ ...familyForm, house_no: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Street</label>
                    <input
                      type="text"
                      placeholder="Main Street"
                      value={familyForm.street}
                      onChange={(e) => setFamilyForm({ ...familyForm, street: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Area</label>
                    <input
                      type="text"
                      placeholder="East Area"
                      value={familyForm.area}
                      onChange={(e) => setFamilyForm({ ...familyForm, area: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: City, PIN Code, Landmark */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Tenkasi"
                      value={familyForm.city}
                      onChange={(e) => setFamilyForm({ ...familyForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">PIN Code</label>
                    <input
                      type="text"
                      placeholder="627811"
                      value={familyForm.pin_code}
                      onChange={(e) => setFamilyForm({ ...familyForm, pin_code: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Landmark</label>
                    <input
                      type="text"
                      placeholder="Near Masjid"
                      value={familyForm.landmark}
                      onChange={(e) => setFamilyForm({ ...familyForm, landmark: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SANTHA AMOUNT, DUE DATE & PREVIOUS PAID */}
              <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-5 space-y-4 font-sans">
                {/* Header */}
                <div className="flex items-center space-x-3 text-[#059669]">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-base shadow-xs">
                    ₹
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Monthly Santha Amount & Due Date System</h4>
                    <p className="text-xs text-slate-500 font-medium">Configure monthly collection rate, auto due date, and previous paid balance</p>
                  </div>
                </div>

                {/* 3 Input Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                      Monthly Santha (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-emerald-600">
                      <span className="px-3 py-2.5 bg-slate-50 text-slate-600 font-bold border-r border-slate-200 text-xs">₹</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="200"
                        value={familyForm.monthly_santha ?? ''}
                        onChange={(e) => setFamilyForm({ ...familyForm, monthly_santha: e.target.value })}
                        className="w-full px-3 py-2 text-slate-900 font-extrabold text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                      Collection Due Day <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={familyForm.santha_due_day || 10}
                      onChange={(e) => setFamilyForm({ ...familyForm, santha_due_day: parseInt(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-xs"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                      Previous Paid Amount (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-emerald-600">
                      <span className="px-3 py-2.5 bg-slate-50 text-slate-600 font-bold border-r border-slate-200 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 800"
                        value={familyForm.previous_paid ?? ''}
                        onChange={(e) => setFamilyForm({ ...familyForm, previous_paid: e.target.value })}
                        className="w-full px-3 py-2 text-slate-900 font-extrabold text-xs focus:outline-none"
                        title="Enter any Santha amounts already paid for previous months"
                      />
                    </div>
                  </div>
                </div>

                {/* LIVE SANTHA DUES CALCULATION PREVIEW */}
                {(() => {
                  const mRate = parseFloat(familyForm.monthly_santha) || 200;
                  const dueDay = parseInt(familyForm.santha_due_day) || 10;
                  const prevPaid = parseFloat(familyForm.previous_paid) || 0;
                  const jDateStr = familyForm.joining_date || `${new Date().getFullYear()}-01-01`;

                  let jYear = 2026, jMonth = 1, jDay = 1;
                  try {
                    if (jDateStr) {
                      if (jDateStr.includes('-')) {
                        const parts = jDateStr.split('-');
                        if (parts.length >= 3) {
                          jYear = parseInt(parts[0]) || 2026;
                          jMonth = parseInt(parts[1]) || 1;
                          jDay = parseInt(parts[2]) || 1;
                        }
                      } else if (jDateStr.includes('/')) {
                        const parts = jDateStr.split('/');
                        if (parts.length >= 3) {
                          if (parts[2].length === 4) {
                            jYear = parseInt(parts[2]) || 2026;
                            jMonth = parseInt(parts[0]) || 1;
                            jDay = parseInt(parts[1]) || 1;
                          } else if (parts[0].length === 4) {
                            jYear = parseInt(parts[0]) || 2026;
                            jMonth = parseInt(parts[1]) || 1;
                            jDay = parseInt(parts[2]) || 1;
                          }
                        }
                      }
                    }
                  } catch (e) {}

                  const now = new Date();
                  const targetYear = now.getFullYear();
                  const targetMonth = now.getMonth() + 1;
                  const targetDay = now.getDate();

                  let dueMonthsCount = 0;
                  let totalElapsedMonths = 0;
                  let currY = jYear;
                  let currM = jMonth;
                  while (currY < targetYear || (currY === targetYear && currM <= targetMonth)) {
                    totalElapsedMonths++;
                    let isPast = (currY < targetYear) || (currY === targetYear && currM < targetMonth);
                    let isDue = isPast || (currY === targetYear && currM === targetMonth && targetDay >= dueDay);
                    if (isDue) dueMonthsCount++;
                    currM++;
                    if (currM > 12) { currM = 1; currY++; }
                  }

                  const calcMonths = dueMonthsCount > 0 ? dueMonthsCount : Math.max(1, totalElapsedMonths);
                  const totalAppDue = calcMonths * mRate;
                  const netPayable = Math.max(0, totalAppDue - prevPaid);
                  const isPaidFull = (netPayable === 0);

                  let statusBadgeElement = null;
                  if (isPaidFull) {
                    statusBadgeElement = <span className="text-emerald-400 font-extrabold text-xs">✓ Full Amount Paid</span>;
                  } else if (prevPaid > 0) {
                    statusBadgeElement = <span className="text-amber-400 font-extrabold text-xs">⚡ Partially Paid (₹{netPayable.toLocaleString()} Pending)</span>;
                  } else {
                    statusBadgeElement = <span className="text-rose-400 font-extrabold text-xs">⚠️ Outstanding Dues (₹{netPayable.toLocaleString()})</span>;
                  }

                  return (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 font-sans shadow-md border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                        <span className="font-extrabold uppercase tracking-wider text-emerald-400">
                          Live Santha Calculation (From Joining Date)
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          Applicable Dues: {calcMonths} Month{calcMonths > 1 ? 's' : ''} ({jYear}-{jMonth < 10 ? '0' + jMonth : jMonth} → Now)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
                        <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Monthly Rate</span>
                          <span className="text-sm font-black text-white">₹{mRate.toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Total Applicable</span>
                          <span className="text-sm font-black text-white">₹{totalAppDue.toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Previously Paid</span>
                          <span className="text-sm font-black text-emerald-400">₹{prevPaid.toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">Current Payable Dues</span>
                          <div className="mt-0.5">{statusBadgeElement}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSubmitError('');
                    setShowCreateFamilyModal(false);
                  }}
                  className="px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-md transition-all flex items-center space-x-2 ${
                    isSubmitting
                      ? 'bg-emerald-500 cursor-not-allowed opacity-80'
                      : 'bg-[#059669] hover:bg-[#047857]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingFamilyId ? 'Save Changes' : 'Save Family'}</span>
                  )}

                </button>
              </div>


            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW FAMILY MEMBERS LIST (HIGH CONTRAST & ACTIONS SUPPORT)         */}
      {/* ========================================================================= */}
      {selectedFamilyForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 font-sans max-h-[90vh] overflow-y-auto">
            
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedFamilyForView.family_name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedFamilyForView.family_code}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs font-medium mt-1 text-slate-600">
                  <div><span className="text-slate-400 font-semibold">Family Head:</span> <strong className="text-slate-900 font-bold">{selectedFamilyForView.head_name}</strong></div>
                  <div><span className="text-slate-400 font-semibold">Area:</span> <strong className="text-slate-900 font-bold">{selectedFamilyForView.area}</strong></div>
                </div>
              </div>
              <button onClick={() => setSelectedFamilyForView(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SANTHA DETAILS CARD */}
            {(() => {
              const outstanding = selectedFamilyForView.outstanding_amount ?? selectedFamilyForView.pending_amount ?? 0;
              const pStatus = selectedFamilyForView.payment_status || (outstanding > 0 ? (selectedFamilyForView.total_paid > 0 ? "Partially Paid" : "Due") : "Paid");

              let viewStatusBadge = (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  ✓ Full Amount Paid
                </span>
              );

              if (pStatus === "Partially Paid" || (outstanding > 0 && selectedFamilyForView.total_paid > 0)) {
                viewStatusBadge = (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-800 border-amber-300">
                    ⚡ Partially Paid (₹{outstanding.toLocaleString()} Pending)
                  </span>
                );
              } else if (outstanding > 0) {
                viewStatusBadge = (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-50 text-rose-800 border-rose-300">
                    ⚠️ Outstanding Dues (₹{outstanding.toLocaleString()})
                  </span>
                );
              }

              return (
                <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-md font-sans">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                        ₹
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">Monthly Santha Dues & Payment Summary</h4>
                        <p className="text-[11px] text-slate-400">
                          Family Head: <span className="text-slate-200 font-bold">{selectedFamilyForView.head_name}</span> • Joining Date: <span className="text-slate-200 font-bold">{selectedFamilyForView.joining_date || '—'}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleOpenCollectSanthaModal(selectedFamilyForView, e)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Collect Santha</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Monthly Rate</span>
                      <span className="text-base font-black text-white">₹{(selectedFamilyForView.monthly_santha || 200).toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Total Due Amount</span>
                      <span className="text-base font-black text-white">₹{(selectedFamilyForView.total_santha_due || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Total Paid Amount</span>
                      <span className="text-base font-black text-emerald-400">₹{(selectedFamilyForView.total_paid || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Remaining Amount</span>
                      <span className="text-base font-black text-rose-400">₹{outstanding.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-800/80 pt-3">
                    <div className="bg-slate-800/40 p-2.5 rounded-xl flex items-center justify-between border border-slate-800">
                      <span className="text-slate-400 font-bold">Payment Status:</span>
                      <div>{viewStatusBadge}</div>
                    </div>
                    <div className="bg-slate-800/40 p-2.5 rounded-xl flex items-center justify-between border border-slate-800">
                      <span className="text-slate-400 font-bold">Next Due Date:</span>
                      <span className="text-emerald-400 font-black text-xs">{selectedFamilyForView.next_due_date || `${selectedFamilyForView.santha_due_day || 10}th of every month`}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Expandable Family Members Section */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div
                onClick={() => setIsModalMembersExpanded(!isModalMembersExpanded)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2">
                  {isModalMembersExpanded ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600 font-bold" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600 font-bold" />
                  )}
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Family Members ({familyMembersList.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddMemberModal(selectedFamilyForView.id);
                  }}
                  className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Add Member</span>
                </button>
              </div>
              
              {isModalMembersExpanded && (
                <div className="pt-2">
                  {loadingMembers ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading family members data...</div>
                  ) : familyMembersList.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                      No family members found.
                    </div>
                  ) : (
                    <div className="border border-slate-200/90 rounded-2xl overflow-hidden text-xs shadow-sm bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Member ID</th>
                            <th className="py-3 px-4">Full Name</th>
                            <th className="py-3 px-4">Relationship</th>
                            <th className="py-3 px-4">Gender</th>
                            <th className="py-3 px-4">Mobile</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                          {familyMembersList.map((m) => (
                            <tr
                              key={m.id}
                              onClick={() => handleViewMemberDetails(m, selectedFamilyForView)}
                              className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                              title="Click to view complete member profile"
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                                {m.member_code || `MM ${selectedFamilyForView.id}-${m.id}`}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900 hover:text-emerald-700 transition-colors">
                                {m.full_name}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 font-semibold">
                                {m.relationship_type || (m.is_head ? 'Family Head' : 'Member')}
                              </td>
                              <td className="py-3.5 px-4 text-slate-800 font-medium">
                                {m.gender || 'Male'}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                                {m.mobile_number || '—'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    m.status === 'Inactive' || m.status === 'Deactive' || m.status === 'Arrears'
                                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {m.status || 'Active'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    onClick={() => handleViewMemberDetails(m, selectedFamilyForView)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    title="View Member Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleEditMemberClick(m, selectedFamilyForView, e)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                    title="Edit Member Details"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteMemberClick(m, selectedFamilyForView, e)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-rose-600 transition-colors"
                                    title="Delete Member"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                onClick={() => setSelectedFamilyForView(null)}
                className="px-5 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW-ONLY MEMBER PROFILE POPUP (VIEW ALL SAVED DETAILS)            */}
      {/* ========================================================================= */}
      {selectedMemberForView && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150 font-sans">
            
            {/* Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-black text-lg shadow-sm border border-slate-800">
                  {(selectedMemberForView.full_name || 'M')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
                    <span>{selectedMemberForView.full_name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {selectedMemberForView.member_code || `MM ${selectedMemberForView.id}-1`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedMemberForView.relationship_type || 'Member'} • {selectedMemberForView.family_name} ({selectedMemberForView.family_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemberForView(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Grid (All Saved Details View-Only) */}
            <div className="space-y-4 text-xs font-medium">
              
              {/* Card 1: Personal Details */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                  Personal Profile Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 font-semibold block">Full Name</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedMemberForView.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Gender</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.gender || 'Male'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Date of Birth</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Marital Status</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.marital_status || 'Single'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Relationship to Head</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.relationship_type || 'Member'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Member Status</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${
                        selectedMemberForView.status === 'Inactive' || selectedMemberForView.status === 'Deactive' || selectedMemberForView.status === 'Arrears'
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {selectedMemberForView.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Contact & Identification */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                  Contact & Additional Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 font-semibold block">Mobile Number</span>
                    <span className="font-mono font-bold text-slate-900">{selectedMemberForView.mobile_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Email Address</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Occupation</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.occupation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Education</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.education || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Document Reference</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedMemberForView.document_name || 'ID_Verification_Document.pdf'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Family Head Name</span>
                    <span className="font-bold text-slate-900">{selectedMemberForView.head_name || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Residence Address */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                  Family Residence Address
                </h4>
                <p className="font-bold text-slate-900">
                  {selectedMemberForView.address || 'Main Street, East Area, Tenkasi'}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditMemberClick(selectedMemberForView)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Edit Member Details</span>
                </button>

                <button
                  onClick={() => handleDeleteMemberClick(selectedMemberForView)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Member</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedMemberForView(null)}
                className="px-5 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE MEMBER CONFIRMATION POPUP                                   */}
      {/* ========================================================================= */}
      {memberToDelete && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 border border-slate-200">
            
            {/* Header / Icon */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-900 leading-tight">Delete Family Member</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Are you sure you want to delete this family member?
                </p>
              </div>
              <button
                onClick={() => setMemberToDelete(null)}
                disabled={isDeletingMember}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member Details Preview Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">
                  {memberToDelete.member.full_name}
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-white border border-slate-200 text-slate-700">
                  {memberToDelete.member.member_code || `MM ${memberToDelete.member.family_id}-${memberToDelete.member.id}`}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium text-[11px] pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Relationship</span>
                  <span className="font-bold text-slate-800">
                    {memberToDelete.member.relationship_type || (memberToDelete.member.is_head ? 'Family Head' : 'Member')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Family</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {memberToDelete.family?.family_name || `Family #${memberToDelete.member.family_id}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Callout Banner */}
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-start space-x-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                This action cannot be undone. The member record will be permanently deleted.
              </p>
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isDeletingMember}
                onClick={() => setMemberToDelete(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingMember}
                onClick={handleConfirmDeleteMember}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2 disabled:opacity-75 cursor-pointer"
              >
                {isDeletingMember ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting Member...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Member</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE FAMILY CONFIRMATION POPUP                                   */}
      {/* ========================================================================= */}
      {familyToDelete && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 border border-slate-200">
            
            {/* Header / Icon */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-900 leading-tight">Delete Entire Family Record</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Are you sure you want to delete this family record and all associated members?
                </p>
              </div>
              <button
                onClick={() => setFamilyToDelete(null)}
                disabled={isDeletingFamily}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Family Details Preview Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">
                  {familyToDelete.family_name}
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-white border border-slate-200 text-slate-700">
                  {familyToDelete.family_code}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium text-[11px] pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Family Head</span>
                  <span className="font-bold text-slate-800">
                    {familyToDelete.head_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Members</span>
                  <span className="font-bold text-slate-800">
                    {familyToDelete.member_count} {familyToDelete.member_count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Callout Banner */}
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-start space-x-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                This will permanently delete the Family Head, the family record, and all members under this family.
              </p>
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isDeletingFamily}
                onClick={() => setFamilyToDelete(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingFamily}
                onClick={handleConfirmDeleteFamily}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2 disabled:opacity-75 cursor-pointer"
              >
                {isDeletingFamily ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting Family...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Entire Family</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIDE-BY-SIDE MODIFICATION COMPARISON (LEFT: OLD vs RIGHT: NEW)     */}
      {/* ========================================================================= */}
      {selectedHeadChangeComparison && (() => {
        const oldSnap = parseSnapshot(selectedHeadChangeComparison.old_details, selectedHeadChangeComparison.old_head);
        const newSnap = parseSnapshot(selectedHeadChangeComparison.new_details, selectedHeadChangeComparison.new_head);
        const formattedDate = selectedHeadChangeComparison.created_at
          ? new Date(selectedHeadChangeComparison.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'Recent';

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {selectedHeadChangeComparison.reason || 'Head & Record Modification'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">• Changed On: {formattedDate}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {selectedHeadChangeComparison.family_name} — Modification Details Comparison
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Modified by: <span className="font-bold text-slate-800">{selectedHeadChangeComparison.changed_by || 'Admin User'}</span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedHeadChangeComparison(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Side-By-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium">
                
                {/* LEFT SIDE: PREVIOUS SAVED DETAILS (OLD) */}
                <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm relative">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      ⬅️ Previous Saved Details (Old)
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Saved History</span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Family Head Name</span>
                      <p className="text-sm font-bold text-rose-600 line-through">
                        {oldSnap.head_name || selectedHeadChangeComparison.old_head || '—'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-semibold text-slate-400 block">Mobile Number</span>
                        <span className="font-mono font-bold text-slate-800">{oldSnap.mobile_number || '—'}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-semibold text-slate-400 block">Relationship</span>
                        <span className="font-bold text-slate-800">{oldSnap.relationship_type || 'Family Head'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-semibold text-slate-400 block">Gender & DOB</span>
                        <span className="font-bold text-slate-800">{oldSnap.gender || 'Male'} • {oldSnap.dob || '—'}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-semibold text-slate-400 block">Monthly Santha</span>
                        <span className="font-bold text-slate-800">₹{oldSnap.monthly_santha || 500}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Residence Address</span>
                      <p className="font-bold text-slate-800">
                        {[oldSnap.house_no, oldSnap.street, oldSnap.area, oldSnap.city].filter(Boolean).join(', ') || 'Tenkasi Area'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">Record Status:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {oldSnap.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: CURRENT MODIFIED DETAILS (NEW) */}
                <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-200/80 space-y-4 shadow-sm relative">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      ➡️ Current Modified Details (New)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">Updated DB Record</span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-0.5 shadow-sm">
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Family Head Name</span>
                      <p className="text-sm font-black text-emerald-700">
                        {newSnap.head_name || selectedHeadChangeComparison.new_head || '—'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Mobile Number</span>
                        <span className="font-mono font-bold text-slate-900">{newSnap.mobile_number || '—'}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Relationship</span>
                        <span className="font-bold text-slate-900">{newSnap.relationship_type || 'Family Head'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Gender & DOB</span>
                        <span className="font-bold text-slate-900">{newSnap.gender || 'Male'} • {newSnap.dob || '—'}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Monthly Santha</span>
                        <span className="font-bold text-emerald-700">₹{newSnap.monthly_santha || 500}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Residence Address</span>
                      <p className="font-bold text-slate-900">
                        {[newSnap.house_no, newSnap.street, newSnap.area, newSnap.city].filter(Boolean).join(', ') || 'Tenkasi Area'}
                      </p>
                    </div>

                    {newSnap.receipt_no && (
                      <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-300 space-y-1">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Santha Payment Record Details</span>
                        <div className="text-xs font-bold text-emerald-900 grid grid-cols-2 gap-1">
                          <span>Amount: ₹{newSnap.collected_amount ? Number(newSnap.collected_amount).toLocaleString('en-IN') : '0'}</span>
                          <span>Receipt: {newSnap.receipt_no}</span>
                          <span>Method: {newSnap.payment_method || 'Cash'}</span>
                          <span>Period: {newSnap.month_year || '—'}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">Record Status:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {newSnap.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedHeadChangeComparison(null)}
                  className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-md"
                >
                  Close Comparison
                </button>
              </div>

            </div>
          </div>
        );
      })()}
      {/* ========================================================================= */}
      {/* MODAL: FULL FAMILY STATEMENT & MEMBERSHIP LEDGER (PRINTABLE SUMMARY)       */}
      {/* ========================================================================= */}
      {selectedFamilyStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150 border border-slate-200">
            
            {/* Modal Title & Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-black text-base shadow-sm">
                  M
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedFamilyStatement.family_name} ({selectedFamilyStatement.family_code})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Official Masjid Family Financial & Membership Statement • Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Print Statement</span>
                </button>

                <button
                  onClick={() => setSelectedFamilyStatement(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SECTION 1: COMPLETE FAMILY DETAILS */}
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-3 text-xs font-medium">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                  Section 1: Complete Family Profile Information
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                  {selectedFamilyStatement.family_status} Record
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Family Code</span>
                  <span className="font-mono font-bold text-slate-900">{selectedFamilyStatement.family_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Family Head Name</span>
                  <span className="font-bold text-slate-900">{selectedFamilyStatement.head_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Mobile Contact</span>
                  <span className="font-mono font-bold text-slate-900">{selectedFamilyStatement.mobile_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Registration / Joining Date</span>
                  <span className="font-bold text-slate-900">{selectedFamilyStatement.joining_date}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Residential Address</span>
                  <span className="font-bold text-slate-900">
                    {[selectedFamilyStatement.house_no, selectedFamilyStatement.street, selectedFamilyStatement.area, selectedFamilyStatement.city, selectedFamilyStatement.pin_code].filter(Boolean).join(', ') || 'Tenkasi Area'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Special Assistance Quota</span>
                  <span className="font-bold text-slate-900">
                    Standard Quota
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: FINANCIAL & COLLECTION SUMMARY LEDGER */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3 text-xs font-medium shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                  Section 2: Collection & Payment Ledger Summary
                </h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedFamilyStatement.payment_status === 'Paid in Full'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedFamilyStatement.payment_status === 'Overdue / Arrears'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  Status: {selectedFamilyStatement.payment_status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Santha</span>
                  <span className="text-base font-extrabold text-slate-900">₹{selectedFamilyStatement.monthly_santha}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Required (Since Joining)</span>
                  <span className="text-base font-extrabold text-slate-900">₹{selectedFamilyStatement.annual_required}</span>
                  <span className="text-[9px] font-semibold text-slate-400 block">({selectedFamilyStatement.applicable_months || 1} Month{selectedFamilyStatement.applicable_months > 1 ? 's' : ''})</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Paid Amount</span>
                  <span className="text-base font-extrabold text-emerald-700">₹{selectedFamilyStatement.total_paid}</span>
                </div>
                <div className={`p-3 rounded-xl border ${selectedFamilyStatement.pending_amount > 0 ? 'bg-rose-50/60 border-rose-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                  <span className={`text-[10px] font-bold uppercase block ${selectedFamilyStatement.pending_amount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>Pending / Unpaid Dues</span>
                  <span className={`text-base font-extrabold ${selectedFamilyStatement.pending_amount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>₹{selectedFamilyStatement.pending_amount}</span>
                </div>
              </div>

              {/* Dues Breakdown Row */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Current Month Due:</span>
                  <span className="font-bold text-slate-900">₹{selectedFamilyStatement.current_month_due ?? 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Previous Arrears:</span>
                  <span className="font-bold text-rose-600">₹{selectedFamilyStatement.previous_arrears ?? 0}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: COMPLETE FAMILY MEMBERS ROSTER & PAYMENT BREAKDOWN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-700">
                  Section 3: Family Members Breakdown ({selectedFamilyStatement.members ? selectedFamilyStatement.members.length : selectedFamilyStatement.member_count} Total Members)
                </h4>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                    <tr>
                      <th className="py-3 px-4">Member ID</th>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Relationship</th>
                      <th className="py-3 px-4">Gender & DOB</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Individual Paid Amount</th>
                      <th className="py-3 px-4 text-right">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {selectedFamilyStatement.members && selectedFamilyStatement.members.length > 0 ? (
                      selectedFamilyStatement.members.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-600">{m.member_code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{m.full_name}</span>
                            {m.is_head && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">HEAD</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{m.relationship_type}</td>
                          <td className="py-3 px-4 text-slate-600">{m.gender} • {m.dob}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{m.mobile_number}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            {m.is_head ? `₹${selectedFamilyStatement.total_paid}` : 'Covered'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                m.payment_status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : m.payment_status === 'Pending'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {m.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-6 text-center text-slate-400">
                          No member records found for this family statement.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                Official Document • System Generated
              </span>
              <button
                onClick={() => setSelectedFamilyStatement(null)}
                className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-md"
              >
                Close Statement
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAILED FAMILY ACTIVITY & HISTORY MODAL                */}
      {/* ======================================================== */}
      {showFamilyActivityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Top Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-extrabold text-white">
                      {activityData?.family?.family_name || 'Family Profile & Activity History'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {activityData?.family?.family_code || '—'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-medium mt-1 text-slate-300">
                    <div><span className="text-slate-400 font-semibold">Family Head:</span> <strong className="text-white font-bold">{activityData?.family?.head_name || '—'}</strong></div>
                    <div><span className="text-slate-400 font-semibold">Area:</span> <span className="text-white font-bold">{activityData?.family?.area || 'Tenkasi'}</span></div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFamilyActivityModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Top Navigation Sub-Tabs */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center space-x-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setActivityActiveTab('daily')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 shrink-0 ${
                  activityActiveTab === 'daily'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Daily Activities</span>
              </button>

              <button
                onClick={() => setActivityActiveTab('changes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 shrink-0 ${
                  activityActiveTab === 'changes'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>2. Family & Member Changes ({(activityData?.head_changes?.length || 0) + (activityData?.members?.length || 0)})</span>
              </button>

              <button
                onClick={() => setActivityActiveTab('payments')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 shrink-0 ${
                  activityActiveTab === 'payments'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>3. Payment Tracking ({(activityData?.collections?.length || 0)})</span>
              </button>

              <button
                onClick={() => setActivityActiveTab('functions')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 shrink-0 ${
                  activityActiveTab === 'functions'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>4. Functions & Events ({(activityData?.functions?.length || 0)})</span>
              </button>

              <button
                onClick={() => setActivityActiveTab('summary')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 shrink-0 ${
                  activityActiveTab === 'summary'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>5. Weekly Summary</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 bg-[#f8fafc]/60 flex-1">
              {loadingActivity ? (
                <div className="py-16 text-center text-xs text-slate-400 font-semibold">
                  Fetching detailed family activity report...
                </div>
              ) : !activityData ? (
                <div className="py-16 text-center text-xs text-slate-400 font-semibold">
                  No activity details found for this family.
                </div>
              ) : (
                <>
                  {/* TAB 1: DAILY ACTIVITIES (DAY-BY-DAY BREAKDOWN) */}
                  {activityActiveTab === 'daily' && (() => {
                    const events = [];
                    const seenSignatures = new Set();

                    (activityData.collections || []).forEach((c) => {
                      const sig = `col-${c.id}`;
                      if (!seenSignatures.has(sig)) {
                        seenSignatures.add(sig);
                        events.push({
                          id: sig,
                          date: c.collection_date || 'Recent',
                          type: 'Weekly Santha Payment',
                          title: `Santha Payment from ${c.member_name}`,
                          details: `Paid Amount: ₹${c.amount?.toLocaleString()} • Method: ${c.payment_method} • Receipt: ${c.receipt_no}`,
                          amount: c.amount,
                          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          user: 'Admin User'
                        });
                      }
                    });

                    (activityData.head_changes || []).forEach((hc) => {
                      const reasonLower = (hc.reason || '').toLowerCase();
                      if (reasonLower.includes('santha') || reasonLower.includes('collection payment')) {
                        return; // Exclude Santha payment audit log to prevent duplicate Santha items under Daily Activities
                      }

                      const timeStr = hc.change_date || 'Recent';
                      const sig = `hc-${hc.id || ''}-${hc.reason}-${timeStr}`;
                      if (!seenSignatures.has(sig)) {
                        seenSignatures.add(sig);

                        const isInitial = reasonLower.includes('initial') || reasonLower.includes('new family head');
                        const isHeadReplaced = !isInitial && hc.old_head && hc.new_head && hc.old_head !== hc.new_head && hc.old_head !== 'Initial Registration' && hc.old_head !== '—';

                        let eventType = 'Record Edit';
                        let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
                        let detailsText = `Family Head: ${hc.new_head}`;

                        if (isInitial) {
                          eventType = 'Family Head Registration';
                          badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold';
                          detailsText = `Registered Family Head: ${hc.new_head} (Initial Registration Baseline)`;
                        } else if (isHeadReplaced) {
                          eventType = 'Leadership Succession';
                          badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold';
                          detailsText = `Previous Head: ${hc.old_head} → New Head: ${hc.new_head}`;
                        } else if (reasonLower.includes('member')) {
                          eventType = 'Member Modification';
                          badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
                          detailsText = `${hc.reason}`;
                        }

                        events.push({
                          id: `hc-${hc.id}`,
                          date: timeStr,
                          type: eventType,
                          title: hc.reason || 'Head Transfer / Record Edit',
                          details: detailsText,
                          badge: badgeStyle,
                          user: hc.changed_by || 'Admin User'
                        });
                      }
                    });

                    (activityData.functions || []).forEach((fn) => {
                      const sig = `fn-${fn.id}`;
                      if (!seenSignatures.has(sig)) {
                        seenSignatures.add(sig);
                        events.push({
                          id: sig,
                          date: fn.event_date || 'Recent',
                          type: 'Function / Event',
                          title: fn.function_title || fn.function_type,
                          details: `Member: ${fn.member_name} • Total: ₹${fn.amount?.toLocaleString()} (Paid: ₹${fn.paid_amount?.toLocaleString()})`,
                          amount: fn.paid_amount,
                          badge: 'bg-purple-50 text-purple-700 border-purple-200',
                          user: 'Admin User'
                        });
                      }
                    });

                    (activityData.members || []).forEach((m) => {
                      const memberName = m.full_name;
                      const isAlreadyInHeadChanges = (activityData.head_changes || []).some(
                        (hc) => hc.reason && hc.reason.includes(memberName)
                      );
                      if (!isAlreadyInHeadChanges) {
                        const sig = `mem-${m.id}`;
                        if (!seenSignatures.has(sig)) {
                          seenSignatures.add(sig);
                          events.push({
                            id: sig,
                            date: m.date_added || 'Recent',
                            type: 'Member Record Event',
                            title: `${m.full_name} (${m.relationship_type})`,
                            details: `Member Code: ${m.member_code} • Mobile: ${m.mobile_number} • Status: ${m.status}`,
                            badge: 'bg-slate-100 text-slate-700 border-slate-200',
                            user: 'System'
                          });
                        }
                      }
                    });

                    const grouped = {};
                    events.forEach((e) => {
                      const key = e.date || 'Recorded Dates';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(e);
                    });

                    const dates = Object.keys(grouped);

                    return (
                      <div className="space-y-5 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              Daily Activities Breakdown
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Day-by-day chronological activity breakdown for the selected week.
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {events.length} Total Activity Records
                          </span>
                        </div>

                        {dates.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white rounded-2xl border border-slate-200/80">
                            No daily activities recorded for this week.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {dates.map((dateStr) => (
                              <div key={dateStr} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                  <Calendar className="w-4 h-4 text-emerald-600" />
                                  <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">{dateStr}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">({grouped[dateStr].length} events)</span>
                                </div>

                                <div className="space-y-2.5">
                                  {grouped[dateStr].map((item) => (
                                    <div key={item.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                      <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${item.badge}`}>
                                            {item.type}
                                          </span>
                                          <span className="font-extrabold text-slate-900">{item.title}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-medium">{item.details}</p>
                                      </div>

                                      <div className="text-right shrink-0">
                                        {item.amount > 0 && (
                                          <div className="font-extrabold text-emerald-700 text-sm">₹{item.amount.toLocaleString()}</div>
                                        )}
                                        <span className="text-[10px] text-slate-400 font-medium">By: {item.user}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB 2: FAMILY & MEMBER CHANGES */}
                  {activityActiveTab === 'changes' && (() => {
                    const uniqueHeadChanges = (() => {
                      const seen = new Set();
                      return (activityData.head_changes || []).filter((hc) => {
                        const reasonLower = (hc.reason || '').toLowerCase();
                        if (reasonLower.includes('santha') || reasonLower.includes('collection payment')) return false;

                        const key = `${hc.id}-${hc.reason}-${hc.change_date}-${hc.change_time}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      });
                    })();

                    const uniqueMembersList = (() => {
                      const seen = new Set();
                      return (activityData.members || []).filter((m) => {
                        const isAlreadyInHeadChanges = uniqueHeadChanges.some(
                          (hc) => hc.reason && hc.reason.includes(m.full_name)
                        );
                        if (isAlreadyInHeadChanges) return false;
                        if (seen.has(m.id)) return false;
                        seen.add(m.id);
                        return true;
                      });
                    })();

                    return (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 font-sans">
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              Weekly Family & Member Changes
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Detailed log of all family and member modifications, additions, and updates made during the week.
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            {uniqueHeadChanges.length + uniqueMembersList.length} Total Modifications
                          </span>
                        </div>

                        <div className="space-y-3">
                          {uniqueHeadChanges.map((hc) => {
                            const reasonLower = (hc.reason || '').toLowerCase();
                            const isInitial = reasonLower.includes('initial') || reasonLower.includes('new family head');
                            const isHeadReplaced = !isInitial && hc.old_head && hc.new_head && hc.old_head !== hc.new_head && hc.old_head !== 'Initial Registration' && hc.old_head !== '—';

                            return (
                              <div key={hc.id} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      isHeadReplaced
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      {isHeadReplaced ? 'Leadership Replaced' : isInitial ? 'Initial Family Head Registration' : 'Family Head Record'}
                                    </span>
                                    <span className="font-extrabold text-slate-900">{hc.family_name}</span>
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-500">
                                    {hc.change_date} at {hc.change_time}
                                  </span>
                                </div>

                                {isHeadReplaced ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">Previous Head</span>
                                      <span className="font-bold text-rose-600 line-through text-xs">{hc.old_head}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">Current Head</span>
                                      <span className="font-bold text-emerald-700 text-xs">{hc.new_head}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2 pt-1">
                                    <div>
                                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">Registered Family Head</span>
                                      <span className="font-extrabold text-slate-900 text-xs">{hc.new_head}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">{hc.reason}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                                  <span>Reason: <strong className="text-slate-700">{hc.reason}</strong></span>
                                  <span>Modified By: <strong className="text-slate-700">{hc.changed_by}</strong></span>
                                </div>
                              </div>
                            );
                          })}

                          {uniqueMembersList.map((m) => (
                            <div key={m.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-2 text-xs shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                    Member Record
                                  </span>
                                  <span className="font-extrabold text-slate-900">{m.full_name} ({m.relationship_type})</span>
                                  <span className="font-mono font-bold text-xs text-slate-500">{m.member_code}</span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium">Added: {m.date_added}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div><span className="text-slate-400 font-semibold">Gender:</span> <span className="font-bold text-slate-800">{m.gender}</span></div>
                                <div><span className="text-slate-400 font-semibold">Mobile:</span> <span className="font-mono font-bold text-slate-800">{m.mobile_number}</span></div>
                                <div><span className="text-slate-400 font-semibold">Occupation:</span> <span className="font-bold text-slate-800">{m.occupation}</span></div>
                                <div><span className="text-slate-400 font-semibold">Status:</span> <span className="font-extrabold text-emerald-700">{m.status}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB 3: PAYMENT TRACKING */}
                  {activityActiveTab === 'payments' && (() => {
                    const collections = activityData.collections || [];
                    const functionsPaid = (activityData.functions || []).filter((f) => (f.paid_amount || 0) > 0);

                    const santhaTotal = collections.reduce((acc, c) => acc + (c.amount || 0), 0);
                    const funcTotal = functionsPaid.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
                    const grandTotal = santhaTotal + funcTotal;

                    return (
                      <div className="space-y-5 font-sans">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Weekly Santha</span>
                            <span className="text-base font-extrabold text-slate-900">₹{santhaTotal.toLocaleString()}</span>
                          </div>
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Individual Payments</span>
                            <span className="text-base font-extrabold text-emerald-700">₹{santhaTotal.toLocaleString()}</span>
                          </div>
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Advance Payments</span>
                            <span className="text-base font-extrabold text-slate-900">₹0</span>
                          </div>
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Payments</span>
                            <span className="text-base font-extrabold text-slate-900">₹{(activityData.family?.monthly_santha || 500).toLocaleString()}</span>
                          </div>
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Function Charges</span>
                            <span className="text-base font-extrabold text-purple-700">₹{funcTotal.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                                Weekly Payment Tracking
                              </h3>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Detailed tracking of all payments, receipts, and payment methods recorded this week.
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Total Collected: ₹{grandTotal.toLocaleString()}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                  <th className="py-2.5 px-3">DATE</th>
                                  <th className="py-2.5 px-3">PAYER / MEMBER</th>
                                  <th className="py-2.5 px-3">PAYMENT CATEGORY</th>
                                  <th className="py-2.5 px-3">AMOUNT</th>
                                  <th className="py-2.5 px-3">METHOD</th>
                                  <th className="py-2.5 px-3">RECEIPT NO</th>
                                  <th className="py-2.5 px-3">STATUS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {collections.length === 0 && functionsPaid.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold text-xs">
                                      No payment records logged for this week.
                                    </td>
                                  </tr>
                                ) : (
                                  <>
                                    {collections.map((c) => (
                                      <tr key={`col-${c.id}`} className="hover:bg-slate-50">
                                        <td className="py-3 px-3 font-semibold text-slate-800">{c.collection_date}</td>
                                        <td className="py-3 px-3 font-extrabold text-slate-900">{c.member_name}</td>
                                        <td className="py-3 px-3 font-semibold text-emerald-700">Weekly Santha Payment</td>
                                        <td className="py-3 px-3 font-black text-emerald-700">₹{c.amount?.toLocaleString()}</td>
                                        <td className="py-3 px-3 font-semibold text-slate-700">{c.payment_method}</td>
                                        <td className="py-3 px-3 font-mono font-bold text-slate-600">{c.receipt_no}</td>
                                        <td className="py-3 px-3">
                                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Paid
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                    {functionsPaid.map((fn) => (
                                      <tr key={`fn-${fn.id}`} className="hover:bg-slate-50">
                                        <td className="py-3 px-3 font-semibold text-slate-800">{fn.event_date}</td>
                                        <td className="py-3 px-3 font-extrabold text-slate-900">{fn.member_name}</td>
                                        <td className="py-3 px-3 font-semibold text-purple-700">{fn.function_title} Charge</td>
                                        <td className="py-3 px-3 font-black text-purple-700">₹{fn.paid_amount?.toLocaleString()}</td>
                                        <td className="py-3 px-3 font-semibold text-slate-700">{fn.payment_method}</td>
                                        <td className="py-3 px-3 font-mono font-bold text-slate-600">{fn.receipt_no}</td>
                                        <td className="py-3 px-3">
                                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {fn.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB 4: FUNCTIONS & EVENTS */}
                  {activityActiveTab === 'functions' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 font-sans">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Weekly Functions & Events
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Marriage registrations, Nikah formalities, and community function charges.
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                          {activityData.functions?.length || 0} Registered Events
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3">FUNCTION NO</th>
                              <th className="py-2.5 px-3">EVENT TITLE / TYPE</th>
                              <th className="py-2.5 px-3">MEMBER NAME</th>
                              <th className="py-2.5 px-3">EVENT DATE</th>
                              <th className="py-2.5 px-3">TOTAL CHARGE</th>
                              <th className="py-2.5 px-3">PAID AMOUNT</th>
                              <th className="py-2.5 px-3">BALANCE</th>
                              <th className="py-2.5 px-3">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {activityData.functions?.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold text-xs">
                                  No function or marriage records registered under this family.
                                </td>
                              </tr>
                            ) : (
                              activityData.functions.map((fn) => (
                                <tr key={fn.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-3 font-mono font-bold text-slate-600">{fn.function_no}</td>
                                  <td className="py-3 px-3 font-extrabold text-slate-900">{fn.function_title}</td>
                                  <td className="py-3 px-3 font-semibold text-slate-800">{fn.member_name}</td>
                                  <td className="py-3 px-3 text-slate-600">{fn.event_date}</td>
                                  <td className="py-3 px-3 font-extrabold text-slate-900">₹{fn.amount?.toLocaleString()}</td>
                                  <td className="py-3 px-3 font-extrabold text-emerald-700">₹{fn.paid_amount?.toLocaleString()}</td>
                                  <td className="py-3 px-3 font-extrabold text-rose-600">₹{fn.balance?.toLocaleString()}</td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      fn.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {fn.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: WEEKLY SUMMARY */}
                  {activityActiveTab === 'summary' && (() => {
                    const collections = activityData.collections || [];
                    const functions = activityData.functions || [];
                    const headChanges = activityData.head_changes || [];
                    const members = activityData.members || [];

                    const totalSanthaPaid = collections.reduce((acc, c) => acc + (c.amount || 0), 0);
                    const totalFuncPaid = functions.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
                    const grandTotal = totalSanthaPaid + totalFuncPaid;

                    return (
                      <div className="space-y-6 font-sans">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Families Modified</span>
                            <div className="text-2xl font-black text-slate-900">{headChanges.length > 0 ? 1 : 0}</div>
                            <span className="text-[10px] text-slate-400 font-medium">Head & Profile Updates</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Members Modified</span>
                            <div className="text-2xl font-black text-slate-900">{members.length}</div>
                            <span className="text-[10px] text-slate-400 font-medium">Active Roster Members</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Individual Payments</span>
                            <div className="text-2xl font-black text-emerald-700">₹{totalSanthaPaid.toLocaleString()}</div>
                            <span className="text-[10px] text-slate-400 font-medium">{collections.length} Payments Logged</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Weekly Santha</span>
                            <div className="text-2xl font-black text-slate-900">₹{totalSanthaPaid.toLocaleString()}</div>
                            <span className="text-[10px] text-slate-400 font-medium">Weekly Collections</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Advance Payments</span>
                            <div className="text-2xl font-black text-slate-900">₹0</div>
                            <span className="text-[10px] text-slate-400 font-medium">No Advance Logged</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Monthly Payments</span>
                            <div className="text-2xl font-black text-slate-900">₹{(activityData.family?.monthly_santha || 500).toLocaleString()}</div>
                            <span className="text-[10px] text-slate-400 font-medium">Santha Rate</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Other / Functions</span>
                            <div className="text-2xl font-black text-purple-700">₹{totalFuncPaid.toLocaleString()}</div>
                            <span className="text-[10px] text-slate-400 font-medium">{functions.length} Events</span>
                          </div>

                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Functions</span>
                            <div className="text-2xl font-black text-slate-900">{functions.length}</div>
                            <span className="text-[10px] text-slate-400 font-medium">Marriage & Events</span>
                          </div>

                          <div className="col-span-2 bg-[#0f172a] text-white rounded-2xl p-4 shadow-md space-y-1">
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">Total Collection Amount</span>
                            <div className="text-2xl font-black text-white">₹{grandTotal.toLocaleString()}</div>
                            <span className="text-[10px] text-slate-300 font-medium">Grand Total Collections</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              Family Head & Profile Summary
                            </h3>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Status: {activityData.family.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Family Head Name</span>
                              <span className="font-extrabold text-slate-900">{activityData.family.head_name}</span>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Mobile Number</span>
                              <span className="font-extrabold font-mono text-slate-900">{activityData.family.mobile_number}</span>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Area & Location</span>
                              <span className="font-extrabold text-slate-900">{activityData.family.area}, {activityData.family.city}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-white shrink-0">
              <button
                onClick={() => setShowFamilyActivityModal(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              >
                Close Family Activity View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT SANTHA PAYMENT */}
      {showCollectSanthaModal && collectFamily && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Collect Santha Payment</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Family: {collectFamily.family_name} ({collectFamily.family_code})
                </p>
              </div>
              <button
                onClick={() => setShowCollectSanthaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {collectError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                ⚠️ {collectError}
              </div>
            )}

            {/* Financial Overview Card */}
            {loadingCollectCalc ? (
              <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-medium animate-pulse">
                Calculating latest dues & previous payment history...
              </div>
            ) : (
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-sm text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400">
                    Joining Date: {collectCalcData?.joining_date || collectFamily.joining_date || '—'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Due Day: {(collectCalcData?.due_day || collectFamily.santha_due_day || 10)}th of every month
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Santha Due</span>
                    <span className="text-sm font-black text-white">₹{(collectCalcData?.required_santha ?? collectFamily.total_santha_due ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Paid</span>
                    <span className="text-sm font-black text-emerald-400">₹{(collectCalcData?.total_paid ?? collectFamily.total_paid ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Outstanding</span>
                    <span className="text-sm font-black text-rose-400">₹{(collectCalcData?.pending_arrears ?? collectFamily.outstanding_amount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCollectSanthaSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Collection Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <span className="px-3 py-2.5 bg-slate-50 text-slate-600 font-bold border-r border-slate-200">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={collectSanthaForm.amount}
                    onChange={(e) => setCollectSanthaForm({ ...collectSanthaForm, amount: e.target.value })}
                    className="w-full px-3 py-2.5 text-slate-900 font-black text-sm focus:outline-none"
                    placeholder="Enter amount being collected"
                  />
                </div>
              </div>

              {/* Real-time Balance Preview */}
              {(() => {
                const currentOutstanding = collectCalcData ? collectCalcData.pending_arrears : (collectFamily.outstanding_amount || 0);
                const payingAmt = parseFloat(collectSanthaForm.amount || 0);
                const remaining = Math.max(0, currentOutstanding - payingAmt);
                return (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-bold">Remaining Outstanding After Payment:</span>
                    <span className="text-sm font-black text-emerald-800">
                      ₹{remaining.toLocaleString()} {remaining === 0 ? '(Paid in Full)' : ''}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={collectSanthaForm.payment_date}
                    onChange={(e) => setCollectSanthaForm({ ...collectSanthaForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                  <select
                    value={collectSanthaForm.payment_method}
                    onChange={(e) => setCollectSanthaForm({ ...collectSanthaForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="QR / UPI">QR / UPI</option>
                    <option value="Paytm">Paytm</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Financial Account</label>
                  <select
                    value={collectSanthaForm.financial_account}
                    onChange={(e) => setCollectSanthaForm({ ...collectSanthaForm, financial_account: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                  >
                    <option value="Main Cash">Main Cash Account</option>
                    <option value="Bank Account">Masjid Bank Account</option>
                    <option value="Petty Cash">Petty Cash Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Transaction Ref / ID</label>
                  <input
                    type="text"
                    placeholder="TXN-XXXX"
                    value={collectSanthaForm.reference_id}
                    onChange={(e) => setCollectSanthaForm({ ...collectSanthaForm, reference_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Optional collection notes"
                  value={collectSanthaForm.notes}
                  onChange={(e) => setCollectSanthaForm({ ...collectSanthaForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={collectSubmitting}
                  onClick={() => setShowCollectSanthaModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
                >
                  {collectSubmitting ? (
                    <span>Saving Payment...</span>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Record Payment & Update Dues</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
