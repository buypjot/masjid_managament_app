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
  deleteCommunityMember
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
  Paperclip
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

  const handleDeleteMemberClick = async (member, family = null, e = null) => {
    if (e) e.stopPropagation();
    const famId = member.family_id || family?.id || selectedFamilyForView?.id;
    if (!window.confirm(`Are you sure you want to delete member "${member.full_name}"?`)) return;
    try {
      await deleteCommunityMember(member.id);
      await fetchFamilies();
      if (famId) {
        const updated = await getCommunityMembers(famId);
        setExpandedMembersMap(prev => ({ ...prev, [famId]: updated }));
        if (selectedFamilyForView && selectedFamilyForView.id === famId) {
          setFamilyMembersList(updated);
        }
      }
    } catch (err) {
      console.error('Failed to delete member:', err);
      alert('Failed to delete member. Please try again.');
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

  // Detailed Family Activity & History Modal State
  const [showFamilyActivityModal, setShowFamilyActivityModal] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityActiveTab, setActivityActiveTab] = useState('daily');

  const handleViewFamilyActivity = async (familyId) => {
    setLoadingActivity(true);
    setShowFamilyActivityModal(true);
    setActivityActiveTab('daily');
    try {
      const data = await getCommunityFamilyActivity(familyId);
      setActivityData(data);
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
      setSubmitError(err.response?.data?.detail || 'Failed to save Function Charge to PostgreSQL database.');
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
    relationship_type: 'Family Head',
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
      santha_due_day: 20,
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
      joining_date: family.joining_date || '',
      relationship_type: family.relationship_type || 'Family Head',
      aadhar_ref: family.aadhar_ref || '',
      house_no: family.house_no ?? '',
      street: family.street ?? '',
      area: family.area ?? '',
      city: family.city ?? '',
      pin_code: family.pin_code ?? '',
      landmark: family.landmark ?? '',
      monthly_santha: family.monthly_santha ?? 500,
      santha_due_day: family.santha_due_day ?? 20,
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
      monthly_santha: familyForm.monthly_santha ? parseFloat(familyForm.monthly_santha) : 500,
      santha_due_day: familyForm.santha_due_day ? parseInt(familyForm.santha_due_day) : 20,
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
      console.error('Failed to save family to PostgreSQL:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to save family record to PostgreSQL database.';
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
        setGeneratedMemberCode(`M-${targetFamId}-NEW`);
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
        setGeneratedMemberCode(`M-${famId}-NEW`);
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
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-500">
              <span className="hover:text-slate-700 cursor-pointer">Masjid</span>
              <span>/</span>
              <span className="text-slate-900 font-bold">
                {currentTab === 'families' && 'Families & Members'}
                {currentTab === 'head-changes' && 'Family Head Changes'}
                {currentTab === 'member-requests' && 'Member Requests'}
                {currentTab === 'statements' && 'Family Statements'}
                {currentTab === 'functions' && 'Functions & Community Charges'}
              </span>
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-auto">
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
                {currentTab === 'head-changes' && 'Family Head Changes'}
                {currentTab === 'member-requests' && 'Member Requests'}
                {currentTab === 'statements' && 'Family Statements'}
                {currentTab === 'functions' && 'Functions & Community Charges'}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                {currentTab === 'families' && 'Manage Masjid families, Family Heads and all members under each family.'}
                {currentTab === 'head-changes' && 'Track family leadership transfers and update Family Head records.'}
                {currentTab === 'member-requests' && 'Review member addition and update requests submitted by families.'}
                {currentTab === 'statements' && 'View monthly Santha collection ledgers and outstanding dues per family.'}
                {currentTab === 'functions' && 'Manage marriage, Nikah, circumcision and community service charges.'}
              </p>
            </div>

            {/* Action Buttons: "+ Add Family Member" & "+ Create Family" */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleOpenAddMemberModal()}
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

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Families</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_families}</div>
                <p className="text-[11px] font-medium text-slate-400">Active {stats.total_families}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_members.toLocaleString()}</div>
                <p className="text-[11px] font-medium text-slate-400">Across all families</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-sm shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New This Month</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">+{stats.new_this_month}</div>
                <p className="text-[11px] font-medium text-slate-400">Recently registered</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-5 h-5" />
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
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="py-3.5 px-3 w-10 text-center"></th>
                        <th className="py-3.5 px-4 sm:px-5">Family Head</th>
                        <th className="py-3.5 px-4 sm:px-5">Family / Code</th>
                        <th className="py-3.5 px-4 sm:px-5">Members</th>
                        <th className="py-3.5 px-4 sm:px-5">Area</th>
                        <th className="py-3.5 px-4 sm:px-5">Monthly Santha</th>
                        <th className="py-3.5 px-4 sm:px-5">Due Day</th>
                        <th className="py-3.5 px-4 sm:px-5">Next Collection</th>
                        <th className="py-3.5 px-4 sm:px-5">Santha Status</th>
                        <th className="py-3.5 px-4 sm:px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan="10" className="py-8 text-center text-slate-400">
                            Loading families data from PostgreSQL...
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
                          const dueDay = f.santha_due_day || 20;
                          const todayDay = 24; // Aug 24
                          const isPending = (f.pending_amount || 0) > 0;
                          let dueStatusBadge = (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              ✓ Paid
                            </span>
                          );

                          if (isPending) {
                            if (todayDay === dueDay) {
                              dueStatusBadge = (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-800 border-amber-300">
                                  ⚡ Due Today ({dueDay}th)
                                </span>
                              );
                            } else if (todayDay < dueDay && (dueDay - todayDay) <= 4) {
                              dueStatusBadge = (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-sky-50 text-sky-800 border-sky-300">
                                  🔔 Due in {dueDay - todayDay} Days
                                </span>
                              );
                            } else if (todayDay > dueDay) {
                              dueStatusBadge = (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-50 text-rose-800 border-rose-300">
                                  ⚠️ Overdue / Arrears
                                </span>
                              );
                            } else {
                              dueStatusBadge = (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
                                  Upcoming ({dueDay}th)
                                </span>
                              );
                            }
                          }

                          return (
                          <React.Fragment key={f.id}>
                            <tr
                              onClick={(e) => toggleExpandFamily(f.id, e)}
                              className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
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
                              <td className="py-4 px-4 sm:px-5 font-extrabold text-slate-800 text-xs">
                                {f.member_count} {f.member_count === 1 ? 'member' : 'members'}
                              </td>
                              <td className="py-4 px-4 sm:px-5 text-slate-600 font-semibold">
                                {f.area}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-bold text-slate-800">
                                ₹{f.monthly_santha || 500}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-extrabold text-slate-700 text-xs">
                                {dueDay}{dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'}
                              </td>
                              <td className="py-4 px-4 sm:px-5 font-mono font-bold text-slate-600 text-xs">
                                {dueDay < 10 ? `0${dueDay}` : dueDay} {isPending ? 'Aug 2026' : 'Sep 2026'}
                              </td>
                              <td className="py-4 px-4 sm:px-5">
                                {dueStatusBadge}
                              </td>
                              <td className="py-4 px-4 sm:px-5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleViewFamilyDetails(f)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                  title="Edit Family"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Edit</span>
                                </button>
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
                                                  {m.member_code || `M-${f.id}-${m.id}`}
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

          {/* TAB 2: FAMILY HEAD CHANGES */}
          {currentTab === 'head-changes' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Family Head Changes & Tracking</h3>
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

              {/* Succession History Logs */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Leadership Succession Audit Logs ({headChangesList.length})
                </h4>

                {loadingHeadChanges ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading head succession logs...</div>
                ) : headChangesList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200/60">
                    No succession audit logs recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {headChangesList.map((log) => {
                      const formattedDate = log.created_at
                        ? new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Recent';

                      const isSanthaPayment = log.reason && log.reason.toLowerCase().includes('santha');

                      return (
                        <div
                          key={log.id}
                          className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">{log.family_name}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isSanthaPayment
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-mono'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {log.reason || 'Head Succession'}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                • Modified by: <strong className="text-slate-600">{log.changed_by || 'Admin User'}</strong>
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium flex items-center space-x-2">
                              <span>Family Head: <span className="font-bold text-emerald-700">{log.new_head}</span></span>
                              {log.old_head && log.old_head !== 'Initial Registration' && log.old_head !== log.new_head && (
                                <span>(Previous: <span className="font-bold text-rose-600 line-through">{log.old_head}</span>)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Modification Date & Time: <span className="font-semibold text-slate-700">{formattedDate}</span>
                            </p>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0 self-start md:self-center">
                            <button
                              onClick={() => setSelectedHeadChangeComparison(log)}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>Comparison Details</span>
                            </button>
                            <button
                              onClick={() => handleViewFamilyActivity(log.family_id)}
                              className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
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
                <div className="p-8 text-center text-xs text-slate-400">Loading family financial & membership statements from PostgreSQL...</div>
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
                            Loading function charge records from PostgreSQL...
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
          Masjid Manager • Live PostgreSQL Backend Connected
        </footer>
      </div>

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
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-between shadow-sm">
                    <span className="truncate">
                      {(() => {
                        const fam = familiesData.find((f) => f.id === parseInt(memberForm.family_id)) || selectedFamilyForView;
                        return fam ? fam.head_name : 'Family Head';
                      })()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 shrink-0 ml-1">
                      {(() => {
                        const fam = familiesData.find((f) => f.id === parseInt(memberForm.family_id)) || selectedFamilyForView;
                        return fam ? fam.family_code : '';
                      })()}
                    </span>
                  </div>
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
              <p>A unique Family ID will be generated automatically when the family is saved to PostgreSQL.</p>
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

              {/* SECTION 3: SANTHA AMOUNT & MONTHLY DUE DATE */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-[#059669] font-bold text-sm">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700">
                    ₹
                  </div>
                  <div>
                    <span>Monthly Santha Amount & Due Date</span>
                    <p className="text-[10px] text-slate-500 font-medium">Monthly collection rate & auto collection due date</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                    <span className="px-3 py-2 bg-slate-50 text-slate-500 font-bold border-r border-slate-200 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="500"
                      value={familyForm.monthly_santha}
                      onChange={(e) => setFamilyForm({ ...familyForm, monthly_santha: e.target.value })}
                      className="w-full px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                    <span className="px-2.5 py-2 bg-slate-50 text-slate-500 font-bold border-r border-slate-200 text-[11px] whitespace-nowrap">
                      Due Day
                    </span>
                    <select
                      value={familyForm.santha_due_day || 20}
                      onChange={(e) => setFamilyForm({ ...familyForm, santha_due_day: parseInt(e.target.value) })}
                      className="w-full px-2.5 py-2 text-slate-900 font-bold text-xs focus:outline-none"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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
                      <span>Saving to PostgreSQL...</span>
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
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>Family Head: {selectedFamilyForView.head_name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedFamilyForView.family_code}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Family Name: <span className="text-slate-900 font-bold">{selectedFamilyForView.family_name}</span> • Area: <span className="text-slate-900 font-bold">{selectedFamilyForView.area}</span>
                </p>
              </div>
              <button onClick={() => setSelectedFamilyForView(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                                {m.member_code || `M-${selectedFamilyForView.id}-${m.id}`}
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
                      {selectedMemberForView.member_code || `M-${selectedMemberForView.id}`}
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
              <button
                onClick={() => handleEditMemberClick(selectedMemberForView)}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                <span>Edit Member Details</span>
              </button>

              <button
                onClick={() => setSelectedMemberForView(null)}
                className="px-5 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close Details
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
                Official Document • Generated from live PostgreSQL database
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
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Family Head: <strong className="text-white">{activityData?.family?.head_name || '—'}</strong> • Area: <span className="text-slate-300">{activityData?.family?.area || '—'}</span>
                  </p>
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

                    (activityData.collections || []).forEach((c) => {
                      events.push({
                        id: `col-${c.id}`,
                        date: c.collection_date || 'Recent',
                        type: 'Weekly Santha Payment',
                        title: `Santha Payment from ${c.member_name}`,
                        details: `Paid Amount: ₹${c.amount?.toLocaleString()} • Method: ${c.payment_method} • Receipt: ${c.receipt_no}`,
                        amount: c.amount,
                        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        user: 'Admin User'
                      });
                    });

                    (activityData.head_changes || []).forEach((hc) => {
                      events.push({
                        id: `hc-${hc.id}`,
                        date: hc.change_date || 'Recent',
                        type: 'Family / Head Modification',
                        title: hc.reason || 'Head Transfer / Record Edit',
                        details: `Previous: ${hc.old_head} → Current: ${hc.new_head}`,
                        badge: 'bg-blue-50 text-blue-700 border-blue-200',
                        user: hc.changed_by || 'Admin User'
                      });
                    });

                    (activityData.functions || []).forEach((fn) => {
                      events.push({
                        id: `fn-${fn.id}`,
                        date: fn.event_date || 'Recent',
                        type: 'Function / Event',
                        title: fn.function_title || fn.function_type,
                        details: `Member: ${fn.member_name} • Total: ₹${fn.amount?.toLocaleString()} (Paid: ₹${fn.paid_amount?.toLocaleString()})`,
                        amount: fn.paid_amount,
                        badge: 'bg-purple-50 text-purple-700 border-purple-200',
                        user: 'Admin User'
                      });
                    });

                    (activityData.members || []).forEach((m) => {
                      events.push({
                        id: `mem-${m.id}`,
                        date: m.date_added || 'Recent',
                        type: 'Member Record Event',
                        title: `${m.full_name} (${m.relationship_type})`,
                        details: `Member Code: ${m.member_code} • Mobile: ${m.mobile_number} • Status: ${m.status}`,
                        badge: 'bg-slate-100 text-slate-700 border-slate-200',
                        user: 'System'
                      });
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
                  {activityActiveTab === 'changes' && (
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
                          {(activityData.head_changes?.length || 0) + (activityData.members?.length || 0)} Total Modifications
                        </span>
                      </div>

                      <div className="space-y-3">
                        {activityData.head_changes && activityData.head_changes.map((hc) => (
                          <div key={hc.id} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                              <div className="flex items-center space-x-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Family Head Transfer / Edit
                                </span>
                                <span className="font-extrabold text-slate-900">{hc.family_name}</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                {hc.change_date} at {hc.change_time}
                              </span>
                            </div>

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

                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                              <span>Reason: <strong className="text-slate-700">{hc.reason}</strong></span>
                              <span>Modified By: <strong className="text-slate-700">{hc.changed_by}</strong></span>
                            </div>
                          </div>
                        ))}

                        {activityData.members && activityData.members.map((m) => (
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
                  )}

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
    </div>
  );
};
