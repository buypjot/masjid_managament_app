import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import { getProperties, createProperty, getTenants, createTenant, getRentStats, getHallBookings, deleteHallBooking, updateHallBookingStatus, getCookingVessels, deleteCookingVessel, updateCookingVesselStatus, getPropertyDocuments, createPropertyDocument, deletePropertyDocument } from '../services/api';

import { RentCollectionDetailView } from '../components/RentCollectionDetailView';
import { TenantPaymentHistoryModal } from '../components/TenantPaymentHistoryModal';
import CreateHallBookingModal from '../components/CreateHallBookingModal';
import CreateCookingVesselModal from '../components/CreateCookingVesselModal';
import CategoryManagementModal from '../components/CategoryManagementModal';



import {
  Building2,
  Home,
  User,
  IndianRupee,
  AlertCircle,
  LayoutGrid,
  Sparkles,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Tag,
  ShieldCheck,
  Eye,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Filter,
  Layers,
  ArrowUpRight,
  Utensils,
  X,
  Upload,
  Info,
  Layers3,
  Loader2
} from 'lucide-react';


export const PropertiesPage = ({ activeSubTab = 'properties-rent' }) => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(activeSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRentTenantId, setSelectedRentTenantId] = useState(null);

  // Modal display state
  const [showAddModal, setShowAddModal] = useState(false);

  const [expandedPropertyId, setExpandedPropertyId] = useState(null);

  // Sync tab when prop changes
  useEffect(() => {
    setCurrentTab(activeSubTab);
  }, [activeSubTab]);

  const tabs = [
    { id: 'properties-rent', label: 'Properties & Rent', icon: Home, path: '/dashboard/properties/properties-rent' },
    { id: 'tenants', label: 'Tenants', icon: User, path: '/dashboard/properties/tenants' },
    { id: 'rent-collection', label: 'Rent Collection', icon: IndianRupee, path: '/dashboard/properties/rent-collection' },
    { id: 'rent-arrears', label: 'Rent Arrears', icon: AlertCircle, path: '/dashboard/properties/rent-arrears' },
    { id: 'hall-bookings', label: 'Hall Bookings', icon: LayoutGrid, path: '/dashboard/properties/hall-bookings' },
    { id: 'cooking-vessels', label: 'Cooking Vessels', icon: Sparkles, path: '/dashboard/properties/cooking-vessels' },
    { id: 'property-documents', label: 'Property Documents', icon: FileText, path: '/dashboard/properties/property-documents' },
  ];

  const handleTabClick = (tab) => {
    setCurrentTab(tab.id);
    navigate(tab.path);
  };

  // Real Property & Asset Datasets (initialized empty; loaded from DB API)
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [collections, setCollections] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [hallBookings, setHallBookings] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [rentStats, setRentStats] = useState({
    total_collected: 0,
    total_pending: 0,
    total_completed: 0,
    pending_count: 0,
    completed_count: 0,
    total_tenants: 0
  });
  const [historyModalTenant, setHistoryModalTenant] = useState(null);

  // Hall Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState(null);

  // Cooking Vessel & Category Modal State
  const [isVesselModalOpen, setIsVesselModalOpen] = useState(false);
  const [selectedVesselForEdit, setSelectedVesselForEdit] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const loadApiData = async () => {
    try {
      const resProps = await getProperties();
      if (resProps && Array.isArray(resProps) && resProps.length > 0) {
        const mapped = resProps.map((prop) => {
          const tenantStr = prop.current_tenant || 'Vacant';
          const isVacant = !tenantStr || tenantStr === 'Vacant' || tenantStr.includes('Vacant') || tenantStr.includes('Units Created');
          return {
            id: prop.property_number || `PROP-${prop.id}`,
            dbId: prop.id,
            name: prop.property_name,
            type: prop.property_type,
            location: [prop.door_house_no, prop.street, prop.area, prop.city].filter(Boolean).join(', ') || 'N/A',
            tenant: tenantStr,
            monthlyRent: isVacant ? 0 : (prop.monthly_rent || 0),
            deposit: isVacant ? 0 : (prop.deposit_amount || 0),
            status: prop.status || 'Active',
            units: prop.units ? prop.units.map(u => ({
              unitNo: u.unit_no,
              doorNo: u.door_no,
              floor: u.floor,
              area: u.area_sqft,
              availability: u.availability,
              tenantName: u.tenant_name,
              rentAmount: u.rent_amount
            })) : []
          };
        });
        setProperties(mapped);
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.warn('Backend API properties load error:', err);
      setProperties([]);
    }

    try {
      const resTenants = await getTenants();
      if (resTenants && Array.isArray(resTenants)) {
        setTenants(resTenants);
      }
    } catch (err) {
      console.warn('Backend API tenants load error:', err);
    }

    try {
      const resBookings = await getHallBookings();
      if (resBookings && Array.isArray(resBookings)) {
        setHallBookings(resBookings);
      } else {
        setHallBookings([]);
      }
    } catch (err) {
      console.warn('Backend API hall bookings load error:', err);
    }

    try {
      const resVessels = await getCookingVessels();
      if (resVessels && Array.isArray(resVessels)) {
        setVessels(resVessels);
      } else {
        setVessels([]);
      }
    } catch (err) {
      console.warn('Backend API cooking vessels load error:', err);
    }

    try {
      const stats = await getRentStats();
      if (stats) {
        setRentStats(stats);
      }
    } catch (err) {
      console.warn('Backend API rent stats load error:', err);
    }

    try {
      const resDocs = await getPropertyDocuments();
      if (resDocs && Array.isArray(resDocs)) {
        setDocuments(resDocs);
      }
    } catch (err) {
      console.warn('Backend API documents load error:', err);
    }
  };


  // Fetch live properties & tenants from database API on mount
  useEffect(() => {
    loadApiData();
  }, []);

  // --- PROPERTY DOCUMENTS CATEGORIZATION & MANAGEMENT STATE ---
  const [docSubTab, setDocSubTab] = useState('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docPropertyFilter, setDocPropertyFilter] = useState('all');
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  const [uploadDocForm, setUploadDocForm] = useState({
    title: '',
    category: 'Property Documents',
    associated_property: '',
    associated_tenant: '',
    file_type: 'PDF Document',
    file_size: '1.5 MB'
  });

  const uploadFileInputRef = useRef(null);
  const [uploadSelectedFile, setUploadSelectedFile] = useState(null);

  const handleUploadModalFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadSelectedFile(file);
      const ext = file.name.split('.').pop().toUpperCase();
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;
      setUploadDocForm(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        file_type: `${ext} Document`,
        file_size: sizeStr
      }));
    }
  };

  const handleSaveUploadedDocument = async (e) => {
    if (e) e.preventDefault();
    if (!uploadDocForm.title.trim()) {
      alert('Please enter a Document Title');
      return;
    }

    setDocUploading(true);
    try {
      const payload = {
        title: uploadDocForm.title,
        category: uploadDocForm.category || 'Property Documents',
        associated_property: uploadDocForm.associated_property || (properties[0]?.name || 'Commercial Complex'),
        associated_tenant: uploadDocForm.associated_tenant || undefined,
        upload_date: new Date().toISOString().split('T')[0],
        file_type: uploadDocForm.file_type || 'PDF Document',
        file_size: uploadDocForm.file_size || '1.2 MB'
      };

      await createPropertyDocument(payload);
      const updatedDocs = await getPropertyDocuments();
      if (updatedDocs && Array.isArray(updatedDocs)) setDocuments(updatedDocs);
      setShowUploadDocModal(false);
      setUploadDocForm({
        title: '',
        category: 'Property Documents',
        associated_property: '',
        associated_tenant: '',
        file_type: 'PDF Document',
        file_size: '1.5 MB'
      });
      setUploadSelectedFile(null);
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Failed to save document. Please try again.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (window.confirm(`Are you sure you want to delete document "${title}"?`)) {
      try {
        await deletePropertyDocument(docId);
        const updatedDocs = await getPropertyDocuments();
        if (updatedDocs && Array.isArray(updatedDocs)) setDocuments(updatedDocs);
      } catch (err) {
        console.error('Failed to delete document:', err);
        alert('Failed to delete document.');
      }
    }
  };


  // --- ADD PROPERTY FORM STATE (BLANK INITIALLY FOR MANUAL USER ENTRY) ---
  const [formPropType, setFormPropType] = useState('Commercial Complex');
  const [formPropNumber, setFormPropNumber] = useState('');
  const [formPropName, setFormPropName] = useState('');
  const [formDoorNo, setFormDoorNo] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPinCode, setFormPinCode] = useState('');
  const [formStatus, setFormStatus] = useState('Active');

  const [formNumUnits, setFormNumUnits] = useState(5);
  const [formUnits, setFormUnits] = useState([]);

  const [formRentFreq, setFormRentFreq] = useState('Monthly');
  const [formDefaultDueDate, setFormDefaultDueDate] = useState('');
  const [formSecurityDeposit, setFormSecurityDeposit] = useState('Yes');

  // Property Document Upload State & Ref
  const propFileInputRef = useRef(null);
  const [selectedPropFiles, setSelectedPropFiles] = useState([]);
  const [isDraggingPropDoc, setIsDraggingPropDoc] = useState(false);

  const handlePropFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processPropFiles(Array.from(e.target.files));
    }
  };

  const handlePropFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingPropDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processPropFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processPropFiles = (newFiles) => {
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

    setSelectedPropFiles((prev) => [...prev, ...formatted]);
  };

  const handleRemovePropFile = (indexToRemove) => {
    setSelectedPropFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (propFileInputRef.current) propFileInputRef.current.value = '';
  };

  // Tenant Documents Upload State & Ref
  const tenantIdFileInputRef = useRef(null);
  const [selectedTenantIdFiles, setSelectedTenantIdFiles] = useState([]);
  const [isDraggingTenantIdDoc, setIsDraggingTenantIdDoc] = useState(false);

  const handleTenantIdFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processTenantIdFiles(Array.from(e.target.files));
    }
  };

  const handleTenantIdFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingTenantIdDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processTenantIdFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processTenantIdFiles = (newFiles) => {
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
    setSelectedTenantIdFiles((prev) => [...prev, ...formatted]);
  };

  const handleRemoveTenantIdFile = (indexToRemove) => {
    setSelectedTenantIdFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (tenantIdFileInputRef.current) tenantIdFileInputRef.current.value = '';
  };

  // Tenant Agreement Document Upload State & Ref
  const tenantAgrFileInputRef = useRef(null);
  const [selectedTenantAgrFiles, setSelectedTenantAgrFiles] = useState([]);
  const [isDraggingTenantAgrDoc, setIsDraggingTenantAgrDoc] = useState(false);

  const handleTenantAgrFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processTenantAgrFiles(Array.from(e.target.files));
    }
  };

  const handleTenantAgrFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingTenantAgrDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processTenantAgrFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processTenantAgrFiles = (newFiles) => {
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
    setSelectedTenantAgrFiles((prev) => [...prev, ...formatted]);
  };

  const handleRemoveTenantAgrFile = (indexToRemove) => {
    setSelectedTenantAgrFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (tenantAgrFileInputRef.current) tenantAgrFileInputRef.current.value = '';
  };

  const isComplex = ['Commercial Complex', 'Apartment', 'Residential Building', 'Shopping Arcade'].includes(formPropType);

  // Auto-generate unit rows when property type, unit count or door number changes
  useEffect(() => {
    if (isComplex) {
      const count = Math.max(1, parseInt(formNumUnits) || 1);
      setFormUnits((prev) => {
        const nextUnits = [];
        for (let i = 0; i < count; i++) {
          if (prev[i]) {
            nextUnits.push(prev[i]);
          } else {
            let suggestedDoor = formDoorNo || '';
            if (suggestedDoor && suggestedDoor.includes('/')) {
              const parts = suggestedDoor.split('/');
              suggestedDoor = `${parts[0]}/${i + 1}`;
            } else if (suggestedDoor) {
              suggestedDoor = `${suggestedDoor}-${i + 1}`;
            } else {
              suggestedDoor = `${i + 1}`;
            }
            nextUnits.push({
              unitNo: '',
              doorNo: '',
              floor: '',
              area: '',
              availability: 'Available'
            });
          }
        }
        return nextUnits;
      });
    } else {
      setFormUnits((prev) => [
        prev[0] || {
          unitNo: '',
          doorNo: '',
          floor: '',
          area: '',
          availability: 'Available'
        }
      ]);
    }
  }, [formPropType, formNumUnits, formDoorNo, isComplex]);

  const handleUnitChange = (index, field, value) => {
    setFormUnits((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const generateAutoPropNumber = () => {
    const count = properties.length + 1;
    return `PROP-${String(count).padStart(3, '0')}`;
  };

  const handleOpenAddModal = () => {
    const autoCode = generateAutoPropNumber();
    setFormPropNumber(autoCode);
    setFormPropName('');
    setFormDoorNo('');
    setFormStreet('');
    setFormArea('');
    setFormCity('');
    setFormPinCode('');
    setFormDefaultDueDate('');
    setSelectedPropFiles([]);
    if (propFileInputRef.current) propFileInputRef.current.value = '';
    setShowAddModal(true);
  };

  const handleSaveProperty = async (e) => {
    e.preventDefault();
    if (!formPropName.trim()) {
      alert('Please enter a Property Name');
      return;
    }

    const calculatedRent = 0;
    const newProperty = {
      id: formPropNumber || `PROP-00${properties.length + 1}`,
      name: formPropName,
      type: formPropType,
      location: [formDoorNo, formStreet, formArea, formCity].filter(Boolean).join(', ') || 'N/A',
      tenant: isComplex ? `${formUnits.length} Units Created` : 'Vacant',
      monthlyRent: calculatedRent,
      deposit: 0,
      status: formStatus,
      units: [...formUnits]
    };

    // Attempt API save to database
    try {
      const apiPayload = {
        property_number: formPropNumber || undefined,
        property_name: formPropName,
        property_type: formPropType,
        door_house_no: formDoorNo,
        street: formStreet,
        area: formArea,
        city: formCity,
        pin_code: formPinCode,
        status: formStatus,
        number_of_units: formUnits.length,
        rent_frequency: formRentFreq,
        default_due_date: formDefaultDueDate,
        security_deposit: formSecurityDeposit,
        monthly_rent: calculatedRent,
        units: formUnits.map((u) => ({
          unit_no: u.unitNo,
          door_no: u.doorNo,
          floor: u.floor,
          area_sqft: u.area,
          availability: u.availability
        }))
      };
      const savedResult = await createProperty(apiPayload);
      if (savedResult && savedResult.id) {
        newProperty.dbId = savedResult.id;
        if (savedResult.property_number) newProperty.id = savedResult.property_number;
      }
    } catch (err) {
      console.warn('Backend API submission skipped or offline:', err);
    }

    setProperties([newProperty, ...properties]);
    setShowAddModal(false);
    
    // Clear inputs after save
    setFormPropName('');
    setFormDoorNo('');
    setFormStreet('');
    setFormArea('');
    setFormCity('');
    setFormPinCode('');
    setFormDefaultDueDate('');
  };

  // --- ADD NEW TENANT FORM STATE ---
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [tenantSubmitting, setTenantSubmitting] = useState(false);
  const [tenantFormError, setTenantFormError] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantContactPerson, setTenantContactPerson] = useState('');
  const [tenantMobile, setTenantMobile] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantDoorNo, setTenantDoorNo] = useState('');
  const [tenantStreet, setTenantStreet] = useState('');
  const [tenantCity, setTenantCity] = useState('Tenkasi');
  const [tenantPinCode, setTenantPinCode] = useState('627811');
  const [tenantGovtId, setTenantGovtId] = useState('');
  const [tenantDocNotes, setTenantDocNotes] = useState('');
  const [tenantPropertyId, setTenantPropertyId] = useState('');
  const [tenantShopUnit, setTenantShopUnit] = useState('');
  const [tenantMonthlyRent, setTenantMonthlyRent] = useState('');
  const [tenantDueDay, setTenantDueDay] = useState('5');
  const [tenantSecurityDeposit, setTenantSecurityDeposit] = useState('');
  const [tenantAgreementStart, setTenantAgreementStart] = useState('');
  const [tenantAgreementEnd, setTenantAgreementEnd] = useState('');
  const [tenantRentStatus, setTenantRentStatus] = useState('Active');

  const handleOpenAddTenantModal = () => {
    setTenantName('');
    setTenantContactPerson('');
    setTenantMobile('');
    setTenantEmail('');
    setTenantDoorNo('');
    setTenantStreet('');
    setTenantCity('Tenkasi');
    setTenantPinCode('627811');
    setTenantGovtId('');
    setTenantDocNotes('');
    setTenantPropertyId(properties[0]?.dbId || properties[0]?.id || '');
    setTenantShopUnit('');
    setTenantMonthlyRent('');
    setTenantDueDay('5');
    setTenantSecurityDeposit('');
    setTenantAgreementStart('');
    setTenantAgreementEnd('');
    setTenantRentStatus('Active');
    setTenantFormError('');
    setTenantSubmitting(false);
    setSelectedTenantIdFiles([]);
    setSelectedTenantAgrFiles([]);
    if (tenantIdFileInputRef.current) tenantIdFileInputRef.current.value = '';
    if (tenantAgrFileInputRef.current) tenantAgrFileInputRef.current.value = '';
    setShowAddTenantModal(true);
  };

  const handleSaveTenant = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!tenantName.trim()) {
      setTenantFormError('Please enter Tenant Name / Business Name.');
      return;
    }

    setTenantSubmitting(true);
    setTenantFormError('');

    const selectedProp = properties.find(
      (p) => String(p.dbId) === String(tenantPropertyId) || String(p.id) === String(tenantPropertyId)
    );

    const rawPropId = selectedProp?.dbId || tenantPropertyId;
    const parsedPropId = rawPropId ? parseInt(rawPropId, 10) : undefined;

    const payload = {
      name: tenantName.trim(),
      contact_person: tenantContactPerson.trim() || undefined,
      phone: tenantMobile.trim() || undefined,
      email: tenantEmail.trim() || undefined,
      door_no: tenantDoorNo.trim() || undefined,
      street: tenantStreet.trim() || undefined,
      city: tenantCity || 'Tenkasi',
      pin_code: tenantPinCode || '627811',
      govt_id: tenantGovtId.trim() || undefined,
      doc_notes: tenantDocNotes.trim() || undefined,
      property_id: isNaN(parsedPropId) ? undefined : parsedPropId,
      assigned_shop: tenantShopUnit || (selectedProp ? selectedProp.name : ''),
      monthly_rent: parseFloat(tenantMonthlyRent) || 0,
      due_day: tenantDueDay || '5',
      security_deposit: parseFloat(tenantSecurityDeposit) || 0,
      agreement_start: tenantAgreementStart || undefined,
      agreement_end: tenantAgreementEnd || undefined,
      status: tenantRentStatus || 'Active'
    };

    try {
      const created = await createTenant(payload);
      if (created && created.id) {
        // Refetch real database tenants list to ensure persistent sync
        const updatedTenants = await getTenants();
        if (updatedTenants && Array.isArray(updatedTenants)) {
          setTenants(updatedTenants);
        } else {
          setTenants((prev) => [created, ...prev]);
        }

        // Auto pre-select newly created tenant for Rent Collection
        setSelectedRentTenantId(created.id);

        // Refetch properties list to reflect occupancy
        try {
          const updatedProps = await getProperties();
          if (updatedProps && Array.isArray(updatedProps)) {
            const mapped = updatedProps.map((prop) => {
              const tenantStr = prop.current_tenant || 'Vacant';
              const isVacant = !tenantStr || tenantStr === 'Vacant' || tenantStr.includes('Vacant') || tenantStr.includes('Units Created');
              return {
                id: prop.property_number || `PROP-${prop.id}`,
                dbId: prop.id,
                name: prop.property_name,
                type: prop.property_type,
                location: [prop.door_house_no, prop.street, prop.area, prop.city].filter(Boolean).join(', ') || 'N/A',
                tenant: tenantStr,
                monthlyRent: isVacant ? 0 : (prop.monthly_rent || 0),
                deposit: isVacant ? 0 : (prop.deposit_amount || 0),
                status: prop.status || 'Active',
                units: prop.units ? prop.units.map(u => ({
                  unitNo: u.unit_no,
                  doorNo: u.door_no,
                  floor: u.floor,
                  area: u.area_sqft,
                  availability: u.availability
                })) : []
              };
            });
            setProperties(mapped);
          }
        } catch (pErr) {
          console.warn('Properties refetch warning:', pErr);
        }

        setShowAddTenantModal(false);
      } else {
        setTenantFormError('Failed to create tenant record in database.');
      }
    } catch (err) {
      console.error('Backend tenant save API error:', err.response?.data || err);
      let errorMsg = 'Failed to create tenant record in database.';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d) => `${d.loc?.[d.loc.length - 1] || 'Field'}: ${d.msg}`).join('; ');
      } else if (err.message) {
        errorMsg = err.message;
      }
      setTenantFormError(errorMsg);
    } finally {
      setTenantSubmitting(false);
    }

  };


  // Filter properties based on search term
  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-[#f8fafc] font-sans">
      <UserSidebar />
      <div className="min-w-0 h-full flex-1 overflow-y-auto flex flex-col justify-between">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Header Banner */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Properties & Assets Management</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage shops, tenants, rent collections, arrears, hall bookings, cooking vessels inventory & legal documents.
              </p>
            </div>
            
            {currentTab === 'properties-rent' && (
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Property</span>
                </button>
              </div>
            )}
          </div>

          {/* Key Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Properties</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{properties.length} Properties</p>
                <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                  {properties.filter((p) => p.status === 'Occupied' || p.status === 'Active').length} Active / Occupied
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Monthly Rent Yield</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  ₹{tenants.reduce((acc, t) => acc + (Number(t.monthly_rent || t.monthlyRent) || 0), 0).toLocaleString()}
                </p>
                <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                  {tenants.length > 0 ? 'Current monthly yield' : 'No active yield'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Rent Arrears</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  ₹{arrears.reduce((acc, a) => acc + (Number(a.totalArrears) || 0), 0).toLocaleString()}
                </p>
                <p className="text-[11px] font-medium text-amber-600 mt-0.5">
                  {arrears.length > 0 ? `${arrears.length} ${arrears.length === 1 ? 'Tenant' : 'Tenants'} Pending` : 'No pending arrears'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Hall Bookings</p>
                <p className="text-2xl font-black text-purple-600 mt-1">
                  {hallBookings.length} {hallBookings.length === 1 ? 'Event' : 'Events'}
                </p>
                <p className="text-[11px] font-medium text-purple-600 mt-0.5">
                  {hallBookings.length > 0 ? 'Upcoming events' : 'No upcoming bookings'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Tab Content Display */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${tabs.find((t) => t.id === currentTab)?.label}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center space-x-2">
                {currentTab === 'properties-rent' && (
                  <button
                    onClick={handleOpenAddModal}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Property</span>
                  </button>
                )}
                <button className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                <button className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PROPERTIES & RENT */}
            {currentTab === 'properties-rent' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Property Code & Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Units / Tenant</th>
                        <th className="py-3 px-4">Monthly Rent</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProperties.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-semibold">
                            No properties found. Click "+ Add Property" to create your first property.
                          </td>
                        </tr>
                      ) : (
                        filteredProperties.map((item) => {
                        const isExpanded = expandedPropertyId === item.id;
                        return (
                          <React.Fragment key={item.id}>
                            <tr className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2.5">
                                <Home className="w-4 h-4 text-slate-400 shrink-0" />
                                <div>
                                  <div className="font-extrabold text-slate-900">{item.name}</div>
                                  <span className="text-[10px] font-semibold text-slate-400">{item.id}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-600">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-600 max-w-xs truncate">{item.location}</td>
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                <div className="flex items-center space-x-2">
                                  <span>{item.tenant}</span>
                                  {item.units && item.units.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                      {item.units.length} Unit{item.units.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-extrabold text-slate-900">
                                {item.tenant && !item.tenant.includes('Vacant') && !item.tenant.includes('Units Created') && item.monthlyRent > 0
                                  ? `₹${item.monthlyRent.toLocaleString()}`
                                  : '₹0'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  item.status === 'Occupied' || item.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.status === 'Available'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {item.units && item.units.length > 0 && (
                                  <button
                                    onClick={() => setExpandedPropertyId(isExpanded ? null : item.id)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center space-x-1"
                                  >
                                    <span>{isExpanded ? 'Hide Units' : 'View Units'}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* EXPANDABLE UNITS VIEW */}
                            {isExpanded && item.units && (
                              <tr className="bg-slate-50/70 border-b border-slate-200/80">
                                <td colSpan={7} className="p-4">
                                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                                    <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span>Units under {item.name} ({item.units.length} total)</span>
                                      <span className="text-[10px] text-slate-400 font-normal">Created from property address</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                      {item.units.map((unit, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs space-y-1">
                                          <div className="flex items-center justify-between font-bold text-slate-900">
                                            <span>{unit.unitNo}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                              unit.availability === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                              {unit.availability}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 font-medium">Door No: <span className="text-slate-800 font-semibold">{unit.doorNo}</span></div>
                                          <div className="text-[11px] text-slate-500 font-medium">Floor: {unit.floor} • Area: {unit.area} sq.ft</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: TENANTS */}
            {currentTab === 'tenants' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Tenants</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Manage tenant profiles, documents, rented property units, rent terms and live payment status.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddTenantModal}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Tenant</span>
                  </button>
                </div>

                <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">TENANT ID</th>
                        <th className="py-3.5 px-4">TENANT</th>
                        <th className="py-3.5 px-4">PROPERTY / SHOP</th>
                        <th className="py-3.5 px-4">MONTHLY RENT</th>
                        <th className="py-3.5 px-4">DUE DATE</th>
                        <th className="py-3.5 px-4">RENT STATUS</th>
                        <th className="py-3.5 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-semibold">
                            No tenant records found. Click "+ Add New Tenant" to create a tenant profile.
                          </td>
                        </tr>
                      ) : (
                        tenants.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-700">{item.tenant_code || item.id}</td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">{item.name}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {item.property_name ? `${item.property_name} • ${item.assigned_shop || ''}` : item.assigned_shop || item.shop || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">
                              ₹{(item.monthly_rent || item.monthlyRent || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              {item.due_day ? `${String(item.due_day).padStart(2, '0')}th` : '05th'}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.payment_status === 'Completed' ? (
                                <div className="space-y-1">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{item.paid_month || 'Current Month'} – Paid</span>
                                  </span>
                                  {item.next_due_month && (
                                    <div className="text-[10px] text-slate-500 font-bold">
                                      Next: <span className="text-slate-900">{item.next_due_month}</span> (₹{(item.next_due_amount || item.monthly_rent || 0).toLocaleString()} Due)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>{item.current_month_name || 'Current Month'} – Pending</span>
                                  </span>
                                  <div className="text-[10px] text-rose-600 font-black">
                                    ₹{(item.pending_amount || item.monthly_rent || 0).toLocaleString()} Due
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                onClick={() => setHistoryModalTenant(item)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                History
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRentTenantId(item.id);
                                  setCurrentTab('rent-collection');
                                  navigate('/dashboard/properties/rent-collection');
                                }}
                                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                              >
                                {item.payment_status === 'Completed' ? 'Collect Next Month' : 'Collect Rent'}
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

            {/* TAB 3: RENT COLLECTION */}
            {currentTab === 'rent-collection' && (
              selectedRentTenantId ? (
                <RentCollectionDetailView
                  preselectedTenantId={selectedRentTenantId}
                  onBack={() => {
                    setSelectedRentTenantId(null);
                  }}
                  onPaymentConfirmed={() => {
                    loadApiData();
                  }}
                />
              ) : (
                <div className="space-y-6">
                  {/* Top Stats Bar for Rent Collection */}
                  {(() => {
                    const completedList = tenants.filter(t => t.payment_status === 'Completed');
                    const pendingList = tenants.filter(t => t.payment_status !== 'Completed');

                    const derivedCompletedRent = completedList.reduce((acc, t) => acc + (t.amount_paid || t.monthly_rent || 0), 0);
                    const derivedPendingRent = pendingList.reduce((acc, t) => acc + (t.pending_amount || t.monthly_rent || 0), 0);

                    const displayTotalCollected = (rentStats.total_collected || 0) > 0 ? rentStats.total_collected : derivedCompletedRent;
                    const displayTotalCompleted = (rentStats.total_completed || 0) > 0 ? rentStats.total_completed : derivedCompletedRent;
                    const displayTotalPending = (rentStats.total_pending || 0) > 0 ? rentStats.total_pending : derivedPendingRent;
                    const displayCompletedCount = (rentStats.completed_count || 0) > 0 ? rentStats.completed_count : completedList.length;
                    const displayPendingCount = (rentStats.pending_count || 0) > 0 ? rentStats.pending_count : pendingList.length;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Total Collected */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Rent Collected</div>
                          <div className="text-xl font-black text-emerald-700">₹{displayTotalCollected.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 font-medium">All confirmed receipts</div>
                        </div>

                        {/* Total Pending */}
                        <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-sm bg-amber-50/30 space-y-1">
                          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Pending Rent</div>
                          <div className="text-xl font-black text-amber-600">₹{displayTotalPending.toLocaleString()}</div>
                          <div className="text-[10px] text-amber-700 font-medium">{displayPendingCount} Tenants Pending</div>
                        </div>

                        {/* Total Completed */}
                        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-sm bg-emerald-50/30 space-y-1">
                          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Completed Rent</div>
                          <div className="text-xl font-black text-emerald-700">₹{displayTotalCompleted.toLocaleString()}</div>
                          <div className="text-[10px] text-emerald-700 font-medium">{displayCompletedCount} Tenants Paid</div>
                        </div>

                        {/* Pending Tenants */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase">Pending Tenants</div>
                            <div className="text-2xl font-black text-amber-600 font-mono">{displayPendingCount}</div>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Completed Tenants */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase">Completed Tenants</div>
                            <div className="text-2xl font-black text-emerald-700 font-mono">{displayCompletedCount}</div>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}


                  {/* Dual-Column List: Pending Tenants (Left) vs Completed Tenants (Right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* LEFT COLUMN: Pending Tenants */}
                    <div className="bg-white rounded-3xl border border-amber-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Pending Rent Payments</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Tenants whose current cycle rent is awaiting collection</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
                          {tenants.filter(t => t.payment_status !== 'Completed').length} Pending
                        </span>
                      </div>

                      <div className="space-y-3">
                        {tenants.filter(t => t.payment_status !== 'Completed').length === 0 ? (
                          <div className="py-12 text-center text-slate-400 space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                            <p className="text-xs font-bold text-slate-700">All tenant rent payments completed!</p>
                            <p className="text-[11px] text-slate-400">No pending rent collections for this cycle.</p>
                          </div>
                        ) : (
                          tenants.filter(t => t.payment_status !== 'Completed').map((tenant) => (
                            <div
                              key={tenant.id}
                              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-amber-300 transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-sm font-extrabold text-slate-950">{tenant.name}</h4>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                      {tenant.current_month_name || 'Pending'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium">
                                    {tenant.property_name ? `${tenant.property_name} • ${tenant.assigned_shop || ''}` : tenant.assigned_shop || 'Unit'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-slate-400">Pending Amount</div>
                                  <div className="text-base font-black text-rose-600">
                                    ₹{(tenant.pending_amount || tenant.monthly_rent || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                                <div className="text-slate-500 font-medium">
                                  Due Date: <strong className="text-slate-900">{tenant.due_day ? `${String(tenant.due_day).padStart(2, '0')}th` : '05th'} of month</strong>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setHistoryModalTenant(tenant)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                  >
                                    History
                                  </button>
                                  <button
                                    onClick={() => setSelectedRentTenantId(tenant.id)}
                                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center space-x-1"
                                  >
                                    <IndianRupee className="w-3.5 h-3.5" />
                                    <span>Collect Rent</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Completed Tenants */}
                    <div className="bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Completed Rent Payments</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Tenants whose rent payment has been received and confirmed</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black">
                          {tenants.filter(t => t.payment_status === 'Completed').length} Completed
                        </span>
                      </div>

                      <div className="space-y-3">
                        {tenants.filter(t => t.payment_status === 'Completed').length === 0 ? (
                          <div className="py-12 text-center text-slate-400 space-y-2">
                            <Clock className="w-10 h-10 text-amber-400 mx-auto" />
                            <p className="text-xs font-bold text-slate-700">No completed rent collections yet.</p>
                            <p className="text-[11px] text-slate-400">Confirmed rent payments will appear in this column.</p>
                          </div>
                        ) : (
                          tenants.filter(t => t.payment_status === 'Completed').map((tenant) => (
                            <div
                              key={tenant.id}
                              className="p-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/20 hover:bg-emerald-50/40 transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-sm font-extrabold text-slate-950">{tenant.name}</h4>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center space-x-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>{tenant.paid_month || 'Paid'} – Completed</span>
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium">
                                    {tenant.property_name ? `${tenant.property_name} • ${tenant.assigned_shop || ''}` : tenant.assigned_shop || 'Unit'}
                                  </p>
                                  {tenant.next_due_month && (
                                    <p className="text-[11px] text-slate-600 font-bold">
                                      Next Due: <span className="text-emerald-800">{tenant.next_due_month}</span> (₹{(tenant.next_due_amount || tenant.monthly_rent || 0).toLocaleString()})
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-slate-400">Amount Paid</div>
                                  <div className="text-base font-black text-emerald-700">
                                    ₹{(tenant.amount_paid || tenant.monthly_rent || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-emerald-100 text-xs">
                                <div className="text-slate-500 font-medium">
                                  Paid Date: <strong className="text-emerald-800">{tenant.last_payment_date || 'Recorded'}</strong>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setHistoryModalTenant(tenant)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                  >
                                    View History
                                  </button>
                                  <button
                                    onClick={() => setSelectedRentTenantId(tenant.id)}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                                  >
                                    Collect Next Month
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )
            )}




            {/* TAB 4: RENT ARREARS */}
            {currentTab === 'rent-arrears' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Tenant Name</th>
                      <th className="py-3 px-4">Shop Name</th>
                      <th className="py-3 px-4">Pending Month(s)</th>
                      <th className="py-3 px-4">Monthly Rent</th>
                      <th className="py-3 px-4">Total Arrears</th>
                      <th className="py-3 px-4">Overdue Days</th>
                      <th className="py-3 px-4">Last Payment</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arrears.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-semibold">
                          No pending rent arrears.
                        </td>
                      </tr>
                    ) : (
                      arrears.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span>{item.tenant}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.shop}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.pendingMonths}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">₹{item.monthlyRate.toLocaleString()}</td>
                          <td className="py-3 px-4 font-black text-rose-600">₹{item.totalArrears.toLocaleString()}</td>
                          <td className="py-3 px-4 font-semibold text-amber-600">{item.overdueDays} Days</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.lastPaid}</td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition-colors">
                              Send Reminder
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: HALL BOOKINGS */}
            {currentTab === 'hall-bookings' && (
              <div className="space-y-4">
                {/* Header section matching Reference Image 1 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Hall Bookings</h3>
                    <p className="text-xs text-slate-500 font-medium">Manage marriage hall, community hall and event bookings with optional vessel rentals.</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBookingForEdit(null);
                      setIsBookingModalOpen(true);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create New Booking</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">BOOKING NO.</th>
                        <th className="py-3.5 px-4">HALL</th>
                        <th className="py-3.5 px-4">FAMILY / CONTACT</th>
                        <th className="py-3.5 px-4">DATE</th>
                        <th className="py-3.5 px-4">FUNCTION</th>
                        <th className="py-3.5 px-4">ADVANCE PAID</th>
                        <th className="py-3.5 px-4">TOTAL CHARGE</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hallBookings.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-semibold">
                            No hall bookings recorded yet. Click "+ Create New Booking" to add one.
                          </td>
                        </tr>
                      ) : (
                        hallBookings
                          .filter((item) => {
                            if (!searchTerm) return true;
                            const query = searchTerm.toLowerCase();
                            return (
                              (item.booking_person || item.applicant || '').toLowerCase().includes(query) ||
                              (item.hall_name || '').toLowerCase().includes(query) ||
                              (item.function_type || item.event || '').toLowerCase().includes(query) ||
                              (item.booking_no || '').toLowerCase().includes(query)
                            );
                          })
                          .map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                {item.booking_no || item.booking_id || item.id}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                {item.hall_name || 'Marriage Hall'}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-slate-900">
                                  {item.booking_person || item.applicant || 'N/A'}
                                </div>
                                {item.family_name && (
                                  <div className="text-[10px] font-extrabold text-indigo-600">
                                    {item.family_name}
                                  </div>
                                )}
                                {item.contact_number && (
                                  <div className="text-[10px] text-slate-400 font-medium">{item.contact_number}</div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700">
                                <div>{item.booking_date || item.date || 'N/A'}</div>
                                {(item.start_time || item.time_slot) && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {item.start_time ? `${item.start_time} - ${item.end_time || ''}` : item.time_slot}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700">
                                {item.function_type || item.event || 'Marriage'}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-emerald-700">
                                ₹{(item.advance_paid || item.advancePaid || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 font-black text-slate-900">
                                ₹{(item.total_charge || item.total_fee || item.totalFee || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                                    item.status === 'Confirmed'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : item.status === 'Completed'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : item.status === 'Cancelled'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  }`}
                                >
                                  <span>{item.status || 'Draft'}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedBookingForEdit(item);
                                    setIsBookingModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this hall booking?')) {
                                      try {
                                        await deleteHallBooking(item.id);
                                        loadApiData();
                                      } catch (err) {
                                        alert('Failed to delete booking.');
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                  Delete
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


            {/* TAB 6: COOKING VESSELS (Matching Reference Image 1) */}
            {currentTab === 'cooking-vessels' && (
              <div className="space-y-4">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50/60 rounded-2xl border border-slate-200/80">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Cooking Vessels</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Separate inventory for vessels that can be used internally or rented to the community.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Manage Categories</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVesselForEdit(null);
                        setIsVesselModalOpen(true);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Vessel</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">VESSEL ID</th>
                        <th className="py-3.5 px-4">VESSEL NAME</th>
                        <th className="py-3.5 px-4">CATEGORY</th>
                        <th className="py-3.5 px-4">TOTAL QTY</th>
                        <th className="py-3.5 px-4">AVAILABLE QTY</th>
                        <th className="py-3.5 px-4">RENT RATE</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vessels.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-semibold">
                            No cooking vessels in inventory. Click "+ Add Vessel" above to add one.
                          </td>
                        </tr>
                      ) : (
                        vessels
                          .filter((item) => {
                            const q = (searchQuery || searchTerm || '').toLowerCase();
                            if (!q) return true;
                            return (
                              (item.vessel_id || item.vesselId || '').toLowerCase().includes(q) ||
                              (item.vessel_name || item.itemName || '').toLowerCase().includes(q) ||
                              (item.category_name || item.categoryName || '').toLowerCase().includes(q)
                            );
                          })
                          .map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                {item.vessel_id || item.vesselId || `VSL-${item.id}`}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                {item.vessel_name || item.item_name || item.itemName}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-600">
                                {item.category_name || item.categoryName || 'Cooking Pots'}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                {item.total_quantity || item.quantity || 1}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-emerald-700">
                                {item.available_quantity !== undefined ? item.available_quantity : (item.available || 1)}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                {item.available_for_rent !== false ? (
                                  `₹${(item.rental_amount || item.rental_rate_per_day || item.rentalRatePerDay || 0).toLocaleString()} / ${item.rental_unit || 'Day'}`
                                ) : (
                                  <span className="text-slate-400 font-medium">Not for Rent</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                                    item.status === 'Available'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : item.status === 'In Use'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : item.status === 'Under Maintenance'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}
                                >
                                  <span>{item.status || 'Available'}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedVesselForEdit(item);
                                    setIsVesselModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete "${item.vessel_name || item.itemName}"?`)) {
                                      try {
                                        await deleteCookingVessel(item.id);
                                        loadApiData();
                                      } catch (err) {
                                        alert('Failed to delete vessel.');
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                  Delete
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


            {/* TAB 7: PROPERTY DOCUMENTS (Categorized by Module) */}
            {currentTab === 'property-documents' && (
              <div className="space-y-6">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span>Property Documents Management</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Organized module-level documentation. View and manage documents categorized by property, tenant, rental agreement, and rent collection.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUploadDocModal(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                </div>

                {/* Module Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category 1: Property Documents */}
                  <div
                    onClick={() => setDocSubTab('Property Documents')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      docSubTab === 'Property Documents'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        docSubTab === 'Property Documents' ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}>
                        🏢
                      </div>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        docSubTab === 'Property Documents' ? 'bg-slate-800 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {documents.filter(d => (d.category || '').toLowerCase().includes('property')).length} files
                      </span>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-extrabold">Property Documents</h4>
                      <p className={`text-[10px] font-medium mt-0.5 ${docSubTab === 'Property Documents' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Title deeds, blueprints & tax certificates
                      </p>
                    </div>
                  </div>

                  {/* Category 2: Tenant Documents */}
                  <div
                    onClick={() => setDocSubTab('Tenant Documents')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      docSubTab === 'Tenant Documents'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        docSubTab === 'Tenant Documents' ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                      }`}>
                        👥
                      </div>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        docSubTab === 'Tenant Documents' ? 'bg-slate-800 text-blue-300' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {documents.filter(d => (d.category || '').toLowerCase().includes('tenant')).length} files
                      </span>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-extrabold">Tenant Documents</h4>
                      <p className={`text-[10px] font-medium mt-0.5 ${docSubTab === 'Tenant Documents' ? 'text-slate-300' : 'text-slate-500'}`}>
                        ID proofs, GST licenses & background checks
                      </p>
                    </div>
                  </div>

                  {/* Category 3: Rental Agreement Documents */}
                  <div
                    onClick={() => setDocSubTab('Rental Agreement Documents')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      docSubTab === 'Rental Agreement Documents'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        docSubTab === 'Rental Agreement Documents' ? 'bg-slate-800 text-purple-400' : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                      }`}>
                        📄
                      </div>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        docSubTab === 'Rental Agreement Documents' ? 'bg-slate-800 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {documents.filter(d => (d.category || '').toLowerCase().includes('agreement')).length} files
                      </span>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-extrabold">Rental Agreement Documents</h4>
                      <p className={`text-[10px] font-medium mt-0.5 ${docSubTab === 'Rental Agreement Documents' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Signed lease deeds & contract renewals
                      </p>
                    </div>
                  </div>

                  {/* Category 4: Rent Collection Documents */}
                  <div
                    onClick={() => setDocSubTab('Rent Collection Documents')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      docSubTab === 'Rent Collection Documents'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        docSubTab === 'Rent Collection Documents' ? 'bg-slate-800 text-teal-400' : 'bg-teal-50 text-teal-700 border border-teal-200/60'
                      }`}>
                        💳
                      </div>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        docSubTab === 'Rent Collection Documents' ? 'bg-slate-800 text-teal-300' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {documents.filter(d => (d.category || '').toLowerCase().includes('collection') || (d.category || '').toLowerCase().includes('rent')).length} files
                      </span>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-extrabold">Rent Collection Documents</h4>
                      <p className={`text-[10px] font-medium mt-0.5 ${docSubTab === 'Rent Collection Documents' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Payment receipts, deposit slips & vouchers
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-Tab Module Filters */}
                <div className="flex items-center space-x-1 border-b border-slate-200/80 pb-px overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Document Categories', icon: Layers },
                    { id: 'Property Documents', label: 'Property Documents', icon: Building2 },
                    { id: 'Tenant Documents', label: 'Tenant Documents', icon: User },
                    { id: 'Rental Agreement Documents', label: 'Rental Agreement Documents', icon: FileText },
                    { id: 'Rent Collection Documents', label: 'Rent Collection Documents', icon: IndianRupee },
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = docSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setDocSubTab(tab.id)}
                        className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-white border-slate-900 text-slate-900 shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by title, ref, property, tenant..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <select
                      value={docPropertyFilter}
                      onChange={(e) => setDocPropertyFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Properties</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {(docSearchQuery || docPropertyFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setDocSearchQuery('');
                          setDocPropertyFilter('all');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Categorized Document Groups */}
                <div className="space-y-6">
                  {[
                    {
                      id: 'Property Documents',
                      title: '1. Property Creation Documents',
                      icon: '🏢',
                      desc: 'Property-related documentation including title deeds, blueprints, municipal approvals and land registry certificates.',
                      headerBg: 'bg-emerald-50/40',
                      iconBg: 'bg-emerald-100 text-emerald-800',
                      badgeStyle: 'bg-emerald-100 text-emerald-800'
                    },
                    {
                      id: 'Tenant Documents',
                      title: '2. Tenant Creation Documents',
                      icon: '👥',
                      desc: 'Tenant-related documentation including government ID proofs, business licenses, GST certificates and background checks.',
                      headerBg: 'bg-blue-50/40',
                      iconBg: 'bg-blue-100 text-blue-800',
                      badgeStyle: 'bg-blue-100 text-blue-800'
                    },
                    {
                      id: 'Rental Agreement Documents',
                      title: '3. Rental Agreement Documents',
                      icon: '📄',
                      desc: 'Lease and tenancy agreement documents including commercial contracts, renewal deeds, and deposit guarantee notes.',
                      headerBg: 'bg-purple-50/40',
                      iconBg: 'bg-purple-100 text-purple-800',
                      badgeStyle: 'bg-purple-100 text-purple-800'
                    },
                    {
                      id: 'Rent Collection Documents',
                      title: '4. Rent Collection Documents',
                      icon: '💳',
                      desc: 'Rent payment transactions and financial receipts including deposit slips, payment vouchers, and monthly statement receipts.',
                      headerBg: 'bg-teal-50/40',
                      iconBg: 'bg-teal-100 text-teal-800',
                      badgeStyle: 'bg-teal-100 text-teal-800'
                    }
                  ]
                    .filter(cat => docSubTab === 'all' || docSubTab === cat.id)
                    .map(cat => {
                      const categoryDocs = documents.filter((doc) => {
                        // Category matching
                        const docCat = (doc.category || '').toLowerCase();
                        let matchesCat = false;
                        if (cat.id === 'Property Documents') {
                          matchesCat = docCat.includes('property') && !docCat.includes('tenant') && !docCat.includes('agreement') && !docCat.includes('collection') && !docCat.includes('rent');
                        } else if (cat.id === 'Tenant Documents') {
                          matchesCat = docCat.includes('tenant');
                        } else if (cat.id === 'Rental Agreement Documents') {
                          matchesCat = docCat.includes('agreement') || docCat.includes('lease') || docCat.includes('contract');
                        } else if (cat.id === 'Rent Collection Documents') {
                          matchesCat = docCat.includes('collection') || docCat.includes('payment') || (docCat.includes('rent') && !docCat.includes('agreement'));
                        } else {
                          matchesCat = docCat === cat.id.toLowerCase();
                        }

                        if (!matchesCat) return false;

                        // Search matching
                        if (docSearchQuery) {
                          const q = docSearchQuery.toLowerCase();
                          const titleMatch = (doc.title || '').toLowerCase().includes(q);
                          const codeMatch = (doc.doc_id || doc.docId || '').toLowerCase().includes(q);
                          const propMatch = (doc.associated_property || doc.associatedProperty || doc.property || '').toLowerCase().includes(q);
                          const tenantMatch = (doc.associated_tenant || doc.associatedTenant || doc.tenant || '').toLowerCase().includes(q);
                          if (!titleMatch && !codeMatch && !propMatch && !tenantMatch) return false;
                        }

                        // Property Filter
                        if (docPropertyFilter !== 'all') {
                          const pName = (doc.associated_property || doc.associatedProperty || doc.property || '');
                          if (pName !== docPropertyFilter) return false;
                        }

                        return true;
                      });

                      return (
                        <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                          {/* Category Card Header */}
                          <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${cat.headerBg}`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-xl ${cat.iconBg} flex items-center justify-center font-bold text-sm shadow-2xs`}>
                                {cat.icon}
                              </div>
                              <div>
                                <h3 className="text-xs font-extrabold text-slate-900 flex items-center space-x-2">
                                  <span>{cat.title}</span>
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cat.badgeStyle}`}>
                                    {categoryDocs.length} {categoryDocs.length === 1 ? 'document' : 'documents'}
                                  </span>
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium">{cat.desc}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setUploadDocForm(prev => ({ ...prev, category: cat.id }));
                                setShowUploadDocModal(true);
                              }}
                              className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Upload Document</span>
                            </button>
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700">
                              <thead className="bg-slate-50/60 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                  <th className="py-3 px-4">DOCUMENT TITLE & REF</th>
                                  <th className="py-3 px-4">ASSOCIATED ENTITY</th>
                                  <th className="py-3 px-4">UPLOAD DATE</th>
                                  <th className="py-3 px-4">FILE SPECS</th>
                                  <th className="py-3 px-4 text-right">ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {categoryDocs.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-semibold">
                                      No documents in {cat.title}. Click "+ Upload Document" to attach one.
                                    </td>
                                  </tr>
                                ) : (
                                  categoryDocs.map((item) => {
                                    const docCode = item.doc_id || item.docId || `DOC-${item.id}`;
                                    const docTitle = item.title;
                                    const assocProp = item.associated_property || item.associatedProperty || item.property || 'Commercial Complex';
                                    const assocTenant = item.associated_tenant || item.associatedTenant || item.tenant;
                                    const upDate = item.upload_date || item.uploadDate || '2026-08-28';
                                    const fType = item.file_type || item.fileType || 'PDF Document';
                                    const fSize = item.file_size || item.fileSize || '1.2 MB';

                                    const isPdf = fType.toLowerCase().includes('pdf');
                                    const isImg = fType.toLowerCase().includes('jpg') || fType.toLowerCase().includes('png') || fType.toLowerCase().includes('image');

                                    return (
                                      <tr key={item.id || docCode} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4">
                                          <div className="flex items-center space-x-2.5">
                                            <div className={`p-2 rounded-xl shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600 border border-rose-100' : isImg ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                              <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <p className="font-extrabold text-slate-900 text-xs">{docTitle}</p>
                                              <span className="text-[10px] font-bold font-mono text-slate-400">{docCode}</span>
                                            </div>
                                          </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                          <div className="text-xs">
                                            <span className="font-bold text-slate-800">{assocProp}</span>
                                            {assocTenant && (
                                              <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                                                Tenant: {assocTenant}
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="py-3.5 px-4 font-semibold text-slate-600">{upDate}</td>

                                        <td className="py-3.5 px-4">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                            {fType} ({fSize})
                                          </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                          <div className="flex items-center justify-end space-x-2">
                                            <button
                                              onClick={() => alert(`Viewing document: ${docTitle} (${fType})`)}
                                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                              <span>View File</span>
                                            </button>
                                            <button
                                              onClick={() => handleDeleteDocument(item.id, docTitle)}
                                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                              title="Delete document"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>

        </main>
        
        {/* Page Footer */}
        <footer className="text-center py-4 border-t border-slate-200/60 bg-[#f8fafc] text-slate-400 text-xs font-medium shrink-0">
          Masjid Manager • Properties & Asset Management Module Active
        </footer>
      </div>

      {/* ======================================================== */}
      {/* ADD PROPERTY MODAL (Matching exact design reference)    */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-extrabold text-slate-900">Add Property</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-8rem)]">
              
              {/* SECTION 1: PROPERTY INFORMATION */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Property Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Property Type */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Property Type</label>
                    <select
                      value={formPropType}
                      onChange={(e) => setFormPropType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value="Commercial Complex">Commercial Complex</option>
                      <option value="Individual Shop">Individual Shop</option>
                      <option value="House">House</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Office">Office</option>
                      <option value="Marriage Hall">Marriage Hall</option>
                      <option value="Land">Land</option>
                      <option value="Agricultural Land">Agricultural Land</option>
                      <option value="Community Hall">Community Hall</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Property Number */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Property Number</label>
                    <input
                      type="text"
                      placeholder="Auto-generated"
                      value={formPropNumber}
                      onChange={(e) => setFormPropNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Property Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Property Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Al Noor Commercial Complex"
                      value={formPropName}
                      onChange={(e) => setFormPropName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {/* Door / House No. */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Door / House No.</label>
                    <input
                      type="text"
                      placeholder="12/1"
                      value={formDoorNo}
                      onChange={(e) => setFormDoorNo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {/* Street */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Street</label>
                    <input
                      type="text"
                      placeholder="Market Road"
                      value={formStreet}
                      onChange={(e) => setFormStreet(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {/* Area */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Area</label>
                    <input
                      type="text"
                      placeholder="Main Market"
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Tenkasi"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {/* PIN Code */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">PIN Code</label>
                    <input
                      type="text"
                      placeholder="627811"
                      value={formPinCode}
                      onChange={(e) => setFormPinCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DYNAMIC UNITS SECTION */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">
                  {isComplex ? `${formPropType} Units` : 'Property Unit'}
                </h3>

                {/* Complex Header Input & Blue Info Box */}
                {isComplex ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-full sm:w-48 shrink-0">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Number of Units</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formNumUnits}
                          onChange={(e) => setFormNumUnits(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                        />
                      </div>
                      
                      <div className="flex-1 bg-blue-50/80 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 font-medium">
                        All units share the same property address. Each shop receives its own unique Shop No. and Door No.
                      </div>
                    </div>

                    {/* Dynamic Unit Rows List */}
                    <div className="space-y-3 pt-1">
                      {formUnits.map((unit, index) => (
                        <div key={index} className="border border-slate-200/80 rounded-xl p-3 bg-white space-y-2 hover:border-slate-300 transition-colors">
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Shop / Unit No.</label>
                              <input
                                type="text"
                                placeholder={`Shop ${index + 1}`}
                                value={unit.unitNo}
                                onChange={(e) => handleUnitChange(index, 'unitNo', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Door No.</label>
                              <input
                                type="text"
                                placeholder={`12/${index + 1}`}
                                value={unit.doorNo}
                                onChange={(e) => handleUnitChange(index, 'doorNo', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Floor</label>
                              <input
                                type="text"
                                placeholder="Ground Floor"
                                value={unit.floor}
                                onChange={(e) => handleUnitChange(index, 'floor', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Area (sq.ft)</label>
                              <input
                                type="text"
                                placeholder="500"
                                value={unit.area}
                                onChange={(e) => handleUnitChange(index, 'area', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Availability</label>
                              <select
                                value={unit.availability}
                                onChange={(e) => handleUnitChange(index, 'availability', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                              >
                                <option value="Available">Available</option>
                                <option value="Occupied">Occupied</option>
                                <option value="Reserved">Reserved</option>
                                <option value="Maintenance">Maintenance</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Single Non-Complex Unit Display */
                  <div className="space-y-3">
                    <div className="border border-slate-200/80 rounded-xl p-3 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Shop / Unit No.</label>
                          <input
                            type="text"
                            placeholder="Unit 1"
                            value={formUnits[0]?.unitNo || ''}
                            onChange={(e) => handleUnitChange(0, 'unitNo', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Door No.</label>
                          <input
                            type="text"
                            placeholder="12/1"
                            value={formUnits[0]?.doorNo || ''}
                            onChange={(e) => handleUnitChange(0, 'doorNo', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Floor</label>
                          <input
                            type="text"
                            placeholder="Ground Floor"
                            value={formUnits[0]?.floor || ''}
                            onChange={(e) => handleUnitChange(0, 'floor', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Area (sq.ft)</label>
                          <input
                            type="text"
                            placeholder="500"
                            value={formUnits[0]?.area || ''}
                            onChange={(e) => handleUnitChange(0, 'area', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Availability</label>
                          <select
                            value={formUnits[0]?.availability || 'Available'}
                            onChange={(e) => handleUnitChange(0, 'availability', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="Available">Available</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Reserved">Reserved</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      For non-complex properties, the system creates one unit by default. You can add units later where applicable.
                    </p>
                  </div>
                )}
              </div>



              {/* SECTION 4: DOCUMENTS */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>Documents</span>
                  </h3>
                  {selectedPropFiles.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedPropFiles.length} {selectedPropFiles.length === 1 ? 'file attached' : 'files attached'}
                    </span>
                  )}
                </div>

                {/* Hidden Native File Input */}
                <input
                  ref={propFileInputRef}
                  type="file"
                  onChange={handlePropFileChange}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                />

                {/* Drop Zone Box */}
                <div
                  onClick={() => propFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPropDoc(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingPropDoc(false);
                  }}
                  onDrop={handlePropFileDrop}
                  className={`border-2 border-dashed rounded-xl p-7 text-center transition-all cursor-pointer space-y-2 ${
                    isDraggingPropDoc
                      ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-xs mb-1">
                    <Upload className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-600 font-bold">
                    Upload title deed, agreement, tax document or other files
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Supports PDF, JPG, PNG, WEBP, WORD (.doc, .docx) & all document files up to 10MB
                  </p>
                </div>

                {/* Attached Files List */}
                {selectedPropFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-extrabold text-slate-700">Attached Documents:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedPropFiles.map((file, idx) => {
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
                                <FileText className={`w-4 h-4 ${iconColor}`} />
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
                                handleRemovePropFile(idx);
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

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3 bg-white shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProperty}
                className="px-6 py-2.5 rounded-xl bg-[#0f172a] text-white text-xs font-extrabold hover:bg-slate-800 shadow-sm transition-all"
              >
                Save Property & Units
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD NEW TENANT MODAL (Matching exact design reference)  */}
      {/* ======================================================== */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-extrabold text-slate-900">Add New Tenant</h2>
              <button
                onClick={() => setShowAddTenantModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-[#f8fafc]/50 flex-1">
              
              {/* Form Error Banner */}
              {tenantFormError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2.5 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{tenantFormError}</span>
                </div>
              )}

              {/* SECTION 1: TENANT INFORMATION */}

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Tenant Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Tenant Name / Business Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Business or person name"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={tenantContactPerson}
                      onChange={(e) => setTenantContactPerson(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Mobile <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="+91..."
                      value={tenantMobile}
                      onChange={(e) => setTenantMobile(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="Optional"
                      value={tenantEmail}
                      onChange={(e) => setTenantEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Door / House No.</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={tenantDoorNo}
                      onChange={(e) => setTenantDoorNo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Street / Area</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={tenantStreet}
                      onChange={(e) => setTenantStreet(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Tenkasi"
                      value={tenantCity}
                      onChange={(e) => setTenantCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">PIN Code</label>
                    <input
                      type="text"
                      placeholder="627811"
                      value={tenantPinCode}
                      onChange={(e) => setTenantPinCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Government ID Reference</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={tenantGovtId}
                      onChange={(e) => setTenantGovtId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: TENANT DOCUMENTS */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Tenant Documents</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Upload ID / Business Documents</label>
                    <input
                      ref={tenantIdFileInputRef}
                      type="file"
                      onChange={handleTenantIdFileChange}
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      className="hidden"
                    />
                    <div
                      onClick={() => tenantIdFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingTenantIdDoc(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingTenantIdDoc(false);
                      }}
                      onDrop={handleTenantIdFileDrop}
                      className={`border-2 border-dashed rounded-xl p-5 text-center text-xs transition-all cursor-pointer space-y-1 ${
                        isDraggingTenantIdDoc
                          ? 'border-emerald-500 bg-emerald-50/60'
                          : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                      <p className="font-bold text-slate-600">Upload PDF, JPG, PNG or Word</p>
                      <p className="text-[10px] text-slate-400">Click or drag & drop documents</p>
                    </div>

                    {selectedTenantIdFiles.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {selectedTenantIdFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs">
                            <span className="truncate font-medium text-slate-700 max-w-[200px]" title={file.name}>{file.name}</span>
                            <button type="button" onClick={() => handleRemoveTenantIdFile(idx)} className="text-slate-400 hover:text-rose-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Document Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Optional"
                      value={tenantDocNotes}
                      onChange={(e) => setTenantDocNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PROPERTY & UNIT */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Property & Unit</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Property</label>
                    <select
                      value={tenantPropertyId}
                      onChange={(e) => {
                        setTenantPropertyId(e.target.value);
                        setTenantShopUnit('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value="">Select Property</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.dbId || p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Choose Shop / Unit</label>
                    <select
                      value={tenantShopUnit}
                      onChange={(e) => setTenantShopUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value="">Select Shop / Unit</option>
                      {(() => {
                        const selProp = properties.find((p) => String(p.dbId) === String(tenantPropertyId) || String(p.id) === String(tenantPropertyId));
                        if (!selProp || !selProp.units || selProp.units.length === 0) {
                          return <option value="Unit 1">Unit 1 — Available</option>;
                        }
                        return selProp.units.map((u, idx) => (
                          <option key={idx} value={u.unitNo} disabled={u.availability === 'Occupied'}>
                            {u.unitNo} — {u.availability || 'Available'}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 font-semibold">
                  Only Available units should be selectable. Occupied units are blocked automatically.
                </div>
              </div>

              {/* SECTION 4: RENT DETAILS */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Rent Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Monthly Rent <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="25000"
                      value={tenantMonthlyRent}
                      onChange={(e) => setTenantMonthlyRent(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Due Day</label>
                    <input
                      type="text"
                      placeholder="5"
                      value={tenantDueDay}
                      onChange={(e) => setTenantDueDay(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Security Deposit</label>
                    <input
                      type="text"
                      placeholder="50000"
                      value={tenantSecurityDeposit}
                      onChange={(e) => setTenantSecurityDeposit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Agreement Start</label>
                    <input
                      type="date"
                      value={tenantAgreementStart}
                      onChange={(e) => setTenantAgreementStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Agreement End</label>
                    <input
                      type="date"
                      value={tenantAgreementEnd}
                      onChange={(e) => setTenantAgreementEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Rent Status</label>
                    <select
                      value={tenantRentStatus}
                      onChange={(e) => setTenantRentStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 5: RENT AGREEMENT */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>Rent Agreement</span>
                  </h3>
                  {selectedTenantAgrFiles.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedTenantAgrFiles.length} {selectedTenantAgrFiles.length === 1 ? 'agreement attached' : 'agreements attached'}
                    </span>
                  )}
                </div>
                
                <input
                  ref={tenantAgrFileInputRef}
                  type="file"
                  onChange={handleTenantAgrFileChange}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                />

                <div
                  onClick={() => tenantAgrFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingTenantAgrDoc(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingTenantAgrDoc(false);
                  }}
                  onDrop={handleTenantAgrFileDrop}
                  className={`border-2 border-dashed rounded-xl p-7 text-center text-xs transition-all cursor-pointer space-y-2 ${
                    isDraggingTenantAgrDoc
                      ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-xs mb-1">
                    <Upload className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="font-bold text-slate-600">
                    Upload signed agreement sheet or <span className="text-indigo-600 underline">click to select file</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Supports PDF, DOC, DOCX, JPG, PNG & all agreement sheets up to 10MB
                  </p>
                </div>

                {selectedTenantAgrFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-extrabold text-slate-700">Attached Agreement Sheets:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTenantAgrFiles.map((file, idx) => {
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
                                <FileText className={`w-4 h-4 ${iconColor}`} />
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
                                handleRemoveTenantAgrFile(idx);
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

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3 bg-white shrink-0">
              <button
                onClick={() => setShowAddTenantModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTenant}
                disabled={tenantSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {tenantSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Tenant...</span>
                  </>
                ) : (
                  <span>Save Tenant</span>
                )}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Hall Booking Modal */}
      <CreateHallBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBookingForEdit(null);
        }}
        onSuccess={() => {
          loadApiData();
        }}
        initialData={selectedBookingForEdit}
      />

      {/* Cooking Vessel Modal (Recreating Reference Image 2) */}
      <CreateCookingVesselModal
        isOpen={isVesselModalOpen}
        onClose={() => {
          setIsVesselModalOpen(false);
          setSelectedVesselForEdit(null);
        }}
        onSuccess={() => {
          loadApiData();
        }}
        initialData={selectedVesselForEdit}
        onManageCategories={() => setIsCategoryModalOpen(true)}
      />

      {/* Vessel Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => {
          loadApiData();
        }}
      />

      {/* Upload Document Modal */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Upload New Document</h3>
                  <p className="text-xs text-slate-500 font-medium">Categorize and link documents to property modules.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUploadedDocument} className="p-6 space-y-4 text-xs font-medium">
              
              {/* Category / Module Selection */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Document Module / Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadDocForm.category}
                  onChange={(e) => setUploadDocForm({ ...uploadDocForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Property Documents">1. Property Creation Documents</option>
                  <option value="Tenant Documents">2. Tenant Creation Documents</option>
                  <option value="Rental Agreement Documents">3. Rental Agreement Documents</option>
                  <option value="Rent Collection Documents">4. Rent Collection Documents</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Title Deed / Signed Agreement Deed"
                  value={uploadDocForm.title}
                  onChange={(e) => setUploadDocForm({ ...uploadDocForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              {/* Associated Property */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Associated Property</label>
                <select
                  value={uploadDocForm.associated_property}
                  onChange={(e) => setUploadDocForm({ ...uploadDocForm, associated_property: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Select Property (Optional)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Associated Tenant */}
              {(uploadDocForm.category === 'Tenant Documents' || uploadDocForm.category === 'Rental Agreement Documents' || uploadDocForm.category === 'Rent Collection Documents') && (
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">Associated Tenant</label>
                  <select
                    value={uploadDocForm.associated_tenant}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, associated_tenant: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Tenant (Optional)</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.name || t.tenant_name}>
                        {t.name || t.tenant_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Upload Drop Zone */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Attach File</label>
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  onChange={handleUploadModalFileSelect}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                />
                <div
                  onClick={() => uploadFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-5 text-center cursor-pointer transition-all space-y-1"
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="font-extrabold text-slate-700 text-xs">
                    {uploadSelectedFile ? uploadSelectedFile.name : 'Click to select local file or drop document'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Supports PDF, JPG, PNG, WEBP, Word (.doc, .docx) up to 10MB</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docUploading}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {docUploading ? (
                    <span>Uploading...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Upload & Link Document</span>
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

