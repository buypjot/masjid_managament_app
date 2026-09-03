import React, { useState, useEffect } from 'react';
import { X, Upload, Sparkles, CheckCircle2, AlertCircle, Loader2, Package, Tag, Plus } from 'lucide-react';
import { createCookingVessel, updateCookingVessel, getVesselCategories } from '../services/api';

export default function CreateCookingVesselModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  onManageCategories,
}) {
  const [formData, setFormData] = useState({
    vessel_id: '',
    vessel_code: '',
    vessel_name: '',
    category_id: '',
    category_name: '',
    total_quantity: 1,
    available_quantity: 1,
    condition: 'Good',
    available_for_rent: true,
    rental_amount: '',
    rental_unit: 'Per Day',
    status: 'Available',
    notes: '',
    document_url: '',
  });

  const [categoriesList, setCategoriesList] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch Categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await getVesselCategories();
        setCategoriesList(data || []);
      } catch (err) {
        console.warn('Failed to load categories:', err);
        setCategoriesList([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isOpen]);

  // Sync form data for Add vs Edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({
        vessel_id: initialData.vessel_id || initialData.vesselId || '',
        vessel_code: initialData.vessel_code || initialData.vesselCode || '',
        vessel_name: initialData.vessel_name || initialData.vesselName || initialData.item_name || initialData.itemName || '',
        category_id: initialData.category_id || '',
        category_name: initialData.category_name || initialData.categoryName || 'Cooking Pots',
        total_quantity: initialData.total_quantity || initialData.quantity || 1,
        available_quantity: initialData.available_quantity !== undefined ? initialData.available_quantity : (initialData.available || 1),
        condition: initialData.condition || 'Good',
        available_for_rent: initialData.available_for_rent !== undefined ? initialData.available_for_rent : true,
        rental_amount: initialData.rental_amount || initialData.rental_rate_per_day || initialData.rentalRatePerDay || '',
        rental_unit: initialData.rental_unit || 'Per Day',
        status: initialData.status || 'Available',
        notes: initialData.notes || '',
        document_url: initialData.document_url || '',
      });
    } else {
      setFormData({
        vessel_id: '',
        vessel_code: '',
        vessel_name: '',
        category_id: '',
        category_name: '',
        total_quantity: 1,
        available_quantity: 1,
        condition: 'Good',
        available_for_rent: true,
        rental_amount: '',
        rental_unit: 'Per Day',
        status: 'Available',
        notes: '',
        document_url: '',
      });
    }
    setError('');
    setSelectedFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;

    if (name === 'available_for_rent') {
      finalVal = value === 'Yes' || value === true;
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: finalVal };
      if (name === 'total_quantity' && !initialData) {
        next.available_quantity = parseInt(finalVal, 10) || 1;
      }
      return next;
    });
  };

  const handleCategorySelect = (e) => {
    const catIdStr = e.target.value;
    if (!catIdStr) {
      setFormData((prev) => ({ ...prev, category_id: '', category_name: '' }));
      return;
    }

    const catId = parseInt(catIdStr, 10);
    const selectedCat = categoriesList.find((c) => c.id === catId);
    setFormData((prev) => ({
      ...prev,
      category_id: catId,
      category_name: selectedCat ? selectedCat.category_name : '',
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFormData((prev) => ({ ...prev, document_url: file.name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vessel_name.trim()) {
      setError('Vessel Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        total_quantity: parseInt(formData.total_quantity, 10) || 1,
        available_quantity: parseInt(formData.available_quantity, 10) || 1,
        rental_amount: formData.available_for_rent ? parseFloat(formData.rental_amount) || 0.0 : 0.0,
      };

      if (initialData?.id) {
        await updateCookingVessel(initialData.id, payload);
      } else {
        await createCookingVessel(payload);
      }

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save cooking vessel:', err);
      setError(err.response?.data?.detail || 'Failed to save cooking vessel.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialData ? 'Edit Cooking Vessel' : 'Add Cooking Vessel'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Define vessel specs, quantity, condition and rental settings.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Vessel Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-950 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Package className="w-4 h-4 text-slate-700" />
              <span>Vessel Information</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vessel ID (Auto-generated / Readonly) */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Vessel ID</label>
                <input
                  type="text"
                  value={formData.vessel_id || 'Auto-generated'}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Vessel Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Vessel Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="vessel_name"
                  value={formData.vessel_name}
                  onChange={handleChange}
                  placeholder="Large Cooking Pot"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Category Dropdown + Manage Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">Category</label>
                  <button
                    type="button"
                    onClick={onManageCategories}
                    className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manage Categories</span>
                  </button>
                </div>
                <select
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleCategorySelect}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="">-- Choose Category --</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Quantity</label>
                <input
                  type="number"
                  name="total_quantity"
                  min="1"
                  value={formData.total_quantity}
                  onChange={handleChange}
                  placeholder="1"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs Repair">Needs Repair</option>
                  <option value="Damaged">Damaged</option>
                  <option value="New">New</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Rental Settings */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-950 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Rental Settings</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Available for Rent */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Available for Rent</label>
                <select
                  name="available_for_rent"
                  value={formData.available_for_rent ? 'Yes' : 'No'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Rental Amount */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Rental Amount</label>
                <input
                  type="number"
                  step="0.01"
                  name="rental_amount"
                  value={formData.rental_amount}
                  onChange={handleChange}
                  disabled={!formData.available_for_rent}
                  placeholder="250"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              {/* Rental Unit */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Rental Unit</label>
                <select
                  name="rental_unit"
                  value={formData.rental_unit}
                  onChange={handleChange}
                  disabled={!formData.available_for_rent}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="Per Day">Per Day</option>
                  <option value="Per Event">Per Event</option>
                  <option value="Per Hour">Per Hour</option>
                  <option value="Per Session">Per Session</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Documents / Notes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-950 border-b border-slate-100 pb-3">
              Documents / Notes
            </h4>

            {/* Notes */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Notes</label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Storage location, usage instructions or other notes"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
              />
            </div>

            {/* Document Upload Area */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Attach Document</label>
              <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-600">
                  {selectedFile ? selectedFile.name : 'Upload purchase / asset document if required'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 10MB</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Vessel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
