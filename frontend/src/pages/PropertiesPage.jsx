import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserSidebar } from '../components/Sidebar';
import { getProperties, createProperty } from '../services/api';
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
  Layers3
} from 'lucide-react';

export const PropertiesPage = ({ activeSubTab = 'properties-rent' }) => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(activeSubTab);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Fetch live properties & tenants from database API on mount
  useEffect(() => {
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
    };
    loadApiData();
  }, []);

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
    setShowAddTenantModal(true);
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    if (!tenantName.trim()) {
      alert('Please enter Tenant Name / Business Name');
      return;
    }

    const selectedProp = properties.find(
      (p) => String(p.dbId) === String(tenantPropertyId) || String(p.id) === String(tenantPropertyId)
    );

    const payload = {
      name: tenantName,
      contact_person: tenantContactPerson,
      phone: tenantMobile,
      email: tenantEmail,
      door_no: tenantDoorNo,
      street: tenantStreet,
      city: tenantCity || 'Tenkasi',
      pin_code: tenantPinCode || '627811',
      govt_id: tenantGovtId,
      doc_notes: tenantDocNotes,
      property_id: selectedProp?.dbId || undefined,
      assigned_shop: tenantShopUnit || (selectedProp ? selectedProp.name : ''),
      monthly_rent: parseFloat(tenantMonthlyRent) || 0,
      due_day: tenantDueDay || '5',
      security_deposit: parseFloat(tenantSecurityDeposit) || 0,
      agreement_start: tenantAgreementStart,
      agreement_end: tenantAgreementEnd,
      status: tenantRentStatus
    };

    try {
      const created = await createTenant(payload);
      if (created) {
        // Refetch properties & tenants to reflect updated Occupied state
        const updatedTenants = await getTenants();
        if (updatedTenants && Array.isArray(updatedTenants)) {
          setTenants(updatedTenants);
        }
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
      }
    } catch (err) {
      console.warn('Backend tenant save API error:', err);
      // Fallback state update
      const fallbackCode = `TEN-${String(tenants.length + 1).padStart(4, '0')}`;
      const newTen = {
        id: fallbackCode,
        tenant_code: fallbackCode,
        name: tenantName,
        property_name: selectedProp?.name || '',
        assigned_shop: tenantShopUnit || '',
        monthly_rent: parseFloat(tenantMonthlyRent) || 0,
        due_day: tenantDueDay || '5',
        security_deposit: parseFloat(tenantSecurityDeposit) || 0,
        status: tenantRentStatus
      };
      setTenants([newTen, ...tenants]);
    }

    setShowAddTenantModal(false);
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
                      Manage tenant profiles, documents, rented property units, rent terms and security deposits.
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
                        <th className="py-3.5 px-4">RENT</th>
                        <th className="py-3.5 px-4">DUE DATE</th>
                        <th className="py-3.5 px-4">DEPOSIT</th>
                        <th className="py-3.5 px-4">STATUS</th>
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
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">
                              ₹{(item.security_deposit || item.advance_paid || item.advancePaid || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                item.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                              }`}>
                                {item.status || 'Active'}
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

            {/* TAB 3: RENT COLLECTION */}
            {currentTab === 'rent-collection' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Tenant Name</th>
                      <th className="py-3 px-4">Shop</th>
                      <th className="py-3 px-4">Month / Period</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collections.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-semibold">
                          No rent collection receipts recorded yet.
                        </td>
                      </tr>
                    ) : (
                      collections.map((item) => (
                        <tr key={item.receiptNo} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{item.receiptNo}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.tenant}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.shop}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.monthYear}</td>
                          <td className="py-3 px-4 font-black text-emerald-600">₹{item.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.paymentDate}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.mode}</td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 ml-auto">
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Applicant Name</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Date & Time Slot</th>
                      <th className="py-3 px-4">Total Fee</th>
                      <th className="py-3 px-4">Advance Paid</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hallBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-semibold">
                          No hall bookings recorded yet.
                        </td>
                      </tr>
                    ) : (
                      hallBookings.map((item) => (
                        <tr key={item.bookingId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{item.bookingId}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.applicant}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.event}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            <div>{item.date}</div>
                            <span className="text-[10px] text-slate-400">{item.timeSlot}</span>
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900">₹{item.totalFee.toLocaleString()}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-600">₹{item.advancePaid.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              item.status === 'Confirmed' || item.status === 'Fully Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors">
                              Manage Booking
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 6: COOKING VESSELS */}
            {currentTab === 'cooking-vessels' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Vessel Code</th>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Total Inventory</th>
                      <th className="py-3 px-4">Currently Available</th>
                      <th className="py-3 px-4">Daily Rent Rate</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vessels.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-semibold">
                          No cooking vessels in inventory.
                        </td>
                      </tr>
                    ) : (
                      vessels.map((item) => (
                        <tr key={item.vesselId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{item.vesselId}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span>{item.itemName}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.capacity}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{item.quantity} Units</td>
                          <td className="py-3 px-4 font-extrabold text-emerald-600">{item.available} Units</td>
                          <td className="py-3 px-4 font-bold text-slate-900">₹{item.rentalRatePerDay} / day</td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[11px] transition-colors">
                              Issue Vessel
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 7: PROPERTY DOCUMENTS */}
            {currentTab === 'property-documents' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Associated Property</th>
                      <th className="py-3 px-4">Upload Date</th>
                      <th className="py-3 px-4">File Specs</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-semibold">
                          No property documents uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      documents.map((item) => (
                        <tr key={item.docId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <div>
                              <div>{item.title}</div>
                              <span className="text-[10px] font-medium text-slate-400">{item.docId}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.category}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.property}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">{item.uploadDate}</td>
                          <td className="py-3 px-4 font-medium text-slate-500">{item.fileType} ({item.fileSize})</td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 ml-auto">
                              <Eye className="w-3 h-3" />
                              <span>View File</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Documents</h3>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer">
                  Upload title deed, agreement, tax document or other files
                </div>
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
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer">
                      Upload PDF, JPG or PNG
                    </div>
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
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Rent Agreement</h3>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer">
                  Upload signed agreement or use Masjid agreement template
                </div>
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
                className="px-6 py-2.5 rounded-xl bg-[#0f172a] text-white text-xs font-extrabold hover:bg-slate-800 shadow-sm transition-all"
              >
                Save Tenant
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
