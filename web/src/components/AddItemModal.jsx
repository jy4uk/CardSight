import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Scan, Plus, Save, Search, Loader2, Check } from 'lucide-react';
import { searchCardImages, fetchPSAData, isPSACertNumber } from '../api';
import AlertModal from './AlertModal';
import PSAMarketData from './PSAMarketData';

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const GRADE_QUALIFIERS = ['', '.5', '10'];

const GAMES = [
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'onepiece', label: 'One Piece' },
  { id: 'mtg', label: 'MTG' },
  { id: 'yugioh', label: 'Yu-Gi-Oh!' },
];

const CARD_TYPES = [
  { id: 'raw', label: 'Raw' },
  { id: 'psa', label: 'PSA Slab' },
  { id: 'bgs', label: 'BGS Slab' },
  { id: 'cgc', label: 'CGC Slab' },
];

export default function AddItemModal({ isOpen, onClose, onAdd, inventoryItems = [], editItem = null, onEdit }) {
  const isEditMode = !!editItem;
  
  const getInitialFormData = () => ({
    barcode_id: editItem?.barcode_id || '',
    card_name: editItem?.card_name || '',
    set_name: editItem?.set_name || '',
    card_number: editItem?.card_number || '',
    game: editItem?.game || 'pokemon',
    card_type: editItem?.card_type || 'raw',
    cert_number: editItem?.cert_number || '',
    grade: editItem?.grade || '',
    grade_qualifier: editItem?.grade_qualifier || '',
    condition: editItem?.condition || 'NM',
    purchase_price: editItem?.purchase_price ?? '',
    front_label_price: editItem?.front_label_price ?? '',
    notes: editItem?.notes || '',
    image_url: editItem?.image_url || '',
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [imageOptions, setImageOptions] = useState([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });
  const [psaData, setPsaData] = useState(null);
  const [psaLoading, setPsaLoading] = useState(false);
  const [psaError, setPsaError] = useState(null);
  const imageSearchAbortRef = useRef(null);
  const imageSearchTimeoutRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const psaFetchedRef = useRef(null);
  const psaDebounceRef = useRef(null);

  const duplicateBarcodeItem = useMemo(() => {
    if (isEditMode) return null;
    const barcode = (formData.barcode_id || '').toString().trim();
    if (!barcode) return null;
    return (inventoryItems || []).find((item) => {
      const candidate = (item?.barcode_id ?? '').toString().trim();
      return candidate && candidate === barcode;
    }) || null;
  }, [formData.barcode_id, inventoryItems, isEditMode]);

  const isDuplicateBarcode = !!duplicateBarcodeItem;

  useEffect(() => {
    if (isOpen && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setImageOptions([]);
      setPsaData(null);
      setPsaLoading(false);
      setPsaError(null);
      psaFetchedRef.current = null;
      if (psaDebounceRef.current) {
        clearTimeout(psaDebounceRef.current);
        psaDebounceRef.current = null;
      }
      if (imageSearchAbortRef.current) {
        imageSearchAbortRef.current.abort();
        imageSearchAbortRef.current = null;
      }
      if (imageSearchTimeoutRef.current) {
        clearTimeout(imageSearchTimeoutRef.current);
        imageSearchTimeoutRef.current = null;
      }
      setSearchingImages(false);
    }
  }, [isOpen, editItem]);

  const showAlert = (type, message) => {
    setAlertModal({ isOpen: true, type, message });
  };

  const handlePSALookup = async (certNumber) => {
    // Don't re-fetch if we already fetched this cert
    if (psaFetchedRef.current === certNumber) return;
    
    setPsaLoading(true);
    setPsaError(null);
    psaFetchedRef.current = certNumber;

    try {
      const result = await fetchPSAData(certNumber);
      
      if (result.success && result.psa) {
        setPsaData(result);
        
        // Auto-fill form fields from PSA data
        setFormData(prev => ({
          ...prev,
          card_type: 'psa',
          cert_number: certNumber,
          card_name: result.psa.name || prev.card_name,
          set_name: result.psa.set || prev.set_name,
          card_number: result.psa.number || prev.card_number,
          grade: result.psa.grade || prev.grade,
          image_url: result.psa.imageUrl || prev.image_url,
        }));
      } else {
        setPsaError(result.error || 'PSA certification not found');
      }
    } catch (err) {
      setPsaError(err.message || 'Failed to fetch PSA data');
    } finally {
      setPsaLoading(false);
    }
  };

  const handleSearchImages = async () => {
    if (!formData.card_name) return;
    if (imageSearchAbortRef.current) {
      imageSearchAbortRef.current.abort();
      imageSearchAbortRef.current = null;
    }
    if (imageSearchTimeoutRef.current) {
      clearTimeout(imageSearchTimeoutRef.current);
      imageSearchTimeoutRef.current = null;
    }

    const controller = new AbortController();
    imageSearchAbortRef.current = controller;
    imageSearchTimeoutRef.current = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }, 30000);
    setSearchingImages(true);
    try {
      const result = await searchCardImages(
        formData.card_name,
        formData.set_name,
        formData.game,
        formData.card_number,
        6
        ,
        controller.signal
      );
      if (result.success && result.cards) {
        setImageOptions(result.cards);
      }
      if (!result.success && result.error) {
        showAlert('error', result.error);
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // User cancelled the search or timeout
        if (imageSearchTimeoutRef.current) {
          showAlert('timeout', 'Image search timed out after 30 seconds.');
        }
        return;
      }
      console.error('Failed to search images:', err);
      showAlert('error', 'Failed to search images. Try adding set name or card number.');
    } finally {
      setSearchingImages(false);
      if (imageSearchAbortRef.current === controller) {
        imageSearchAbortRef.current = null;
      }
      if (imageSearchTimeoutRef.current) {
        clearTimeout(imageSearchTimeoutRef.current);
        imageSearchTimeoutRef.current = null;
      }
    }
  };

  const cancelImageSearch = () => {
    if (imageSearchAbortRef.current) {
      imageSearchAbortRef.current.abort();
      imageSearchAbortRef.current = null;
    }
    if (imageSearchTimeoutRef.current) {
      clearTimeout(imageSearchTimeoutRef.current);
      imageSearchTimeoutRef.current = null;
    }
    setSearchingImages(false);
  };

  const selectImage = (card) => {
    setFormData(prev => ({ 
      ...prev, 
      image_url: card.imageUrl,
      card_number: card.number || prev.card_number,
    }));
    setImageOptions([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'card_type') {
      const certNumber = value !== 'raw' ? formData.barcode_id : '';
      setFormData((prev) => ({ ...prev, card_type: value, cert_number: certNumber }));
    } else if (name === 'barcode_id') {
      // If barcode changes and it's a graded card, update cert number too
      const certNumber = formData.card_type !== 'raw' ? value : '';
      setFormData((prev) => ({ ...prev, barcode_id: value, cert_number: certNumber }));

      const trimmed = (value || '').toString().trim();
      const isDuplicate =
        !isEditMode &&
        !!trimmed &&
        (inventoryItems || []).some((item) => {
          const candidate = (item?.barcode_id ?? '').toString().trim();
          return candidate && candidate === trimmed;
        });
      
      // Debounce PSA lookup - only trigger after user stops typing for 1200ms
      if (psaDebounceRef.current) {
        clearTimeout(psaDebounceRef.current);
      }
      // Clear any pending lookup and previous data when input changes
      setPsaError(null);
      
      if (!isDuplicate && isPSACertNumber(value)) {
        const capturedValue = value;
        psaDebounceRef.current = setTimeout(() => {
          // Double-check the value hasn't changed (prevents stale lookups)
          handlePSALookup(capturedValue);
        }, 1200);
      } else {
        // Clear PSA data if input is no longer a valid cert number
        setPsaData(null);
        psaFetchedRef.current = null;
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEditMode && !formData.barcode_id) return;
    if (!isEditMode && isDuplicateBarcode) {
      showAlert('error', 'This barcode already exists in your inventory.');
      return;
    }
    
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
      front_label_price: formData.front_label_price ? Number(formData.front_label_price) : null,
      grade: formData.grade || null,
      grade_qualifier: formData.grade_qualifier || null,
    };
    
    if (isEditMode) {
      onEdit({ id: editItem.id, ...data });
    } else {
      onAdd(data);
    }
  };

  const handleBarcodeKeyDown = (e) => {
    // Most barcode scanners send Enter after the code
    if (e.key === 'Enter' && formData.barcode_id) {
      e.preventDefault();
      // Move focus to card name after scan
      document.getElementById('card_name')?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{isEditMode ? 'Edit Item' : 'Add New Item'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Barcode Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode ID {!isEditMode && '*'}
            </label>
            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                name="barcode_id"
                value={formData.barcode_id}
                onChange={handleChange}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan or enter barcode..."
                disabled={isEditMode}
                title={
                  !isEditMode && isDuplicateBarcode
                    ? `Barcode already exists in inventory${duplicateBarcodeItem?.card_name ? `: ${duplicateBarcodeItem.card_name}` : ''}`
                    : undefined
                }
                className={`w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 
                           focus:ring-blue-500 focus:border-blue-500 text-lg font-mono
                           ${isEditMode ? 'bg-gray-100 text-gray-500' : ''}
                           ${!isEditMode && isDuplicateBarcode ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                autoComplete="off"
              />
              <Scan className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {!isEditMode && isDuplicateBarcode && (
              <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Barcode already exists in your inventory{duplicateBarcodeItem?.card_name ? `: ${duplicateBarcodeItem.card_name}` : ''}.
              </div>
            )}
            {!isEditMode && (
              <p className="text-xs text-gray-500 mt-1">
                Use your barcode scanner or type manually
              </p>
            )}
          </div>

          {/* PSA Market Data Panel */}
          {(psaData || psaLoading || psaError) && (
            <PSAMarketData
              data={psaData}
              loading={psaLoading}
              error={psaError}
              onRetry={() => formData.barcode_id && handlePSALookup(formData.barcode_id)}
            />
          )}

          {/* Card Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Name
            </label>
            <input
              id="card_name"
              type="text"
              name="card_name"
              value={formData.card_name}
              onChange={handleChange}
              placeholder="e.g., Charizard VMAX"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Set Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Set Name
            </label>
            <input
              type="text"
              name="set_name"
              value={formData.set_name}
              onChange={handleChange}
              placeholder="e.g., Brilliant Stars"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              name="card_number"
              value={formData.card_number}
              onChange={handleChange}
              placeholder="e.g., 136/172"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Image Search */}
          {formData.game === 'pokemon' && formData.card_type === 'raw' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Image
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSearchImages}
                  disabled={!formData.card_name || searchingImages}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm
                             hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                             flex items-center gap-2"
                >
                  {searchingImages ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {formData.image_url ? 'Select New Image' : 'Find Images'}
                </button>

                {searchingImages && (
                  <button
                    type="button"
                    onClick={cancelImageSearch}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                    aria-label="Cancel image search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Image Options Grid */}
              {imageOptions.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {imageOptions.map((card, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectImage(card)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all
                        ${formData.image_url === card.imageUrl 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <img 
                        src={card.smallImageUrl || card.imageUrl} 
                        alt={card.name}
                        className="w-full aspect-[2.5/3.5] object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                        <p className="text-white text-[10px] truncate">{card.set}</p>
                        <p className="text-gray-300 text-[9px]">#{card.number}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {imageOptions.length === 0 && formData.image_url && (
                <div className="mt-2">
                  <img 
                    src={formData.image_url} 
                    alt="Selected card"
                    className="w-20 h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* Game */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Game
            </label>
            <div className="flex gap-2 flex-wrap">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, game: g.id }))}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors
                    ${formData.game === g.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {CARD_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, card_type: t.id }))}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors
                    ${formData.card_type === t.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cert Number (for slabs) */}
          {formData.card_type !== 'raw' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.card_type.toUpperCase()} Cert Number
              </label>
              <input
                type="text"
                name="cert_number"
                value={formData.cert_number}
                onChange={handleChange}
                placeholder={`Enter ${formData.card_type.toUpperCase()} certification number (syncs with barcode)`}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                           focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to fetch slab image from {formData.card_type.toUpperCase()}
              </p>
            </div>
          )}

          {/* Condition / Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.card_type === 'raw' ? 'Condition' : 'Grade'}
            </label>
            {formData.card_type === 'raw' ? (
              <div className="flex gap-2 flex-wrap">
                {CONDITIONS.map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, condition: cond }))}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors
                      ${formData.condition === cond
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ 
                      ...prev, 
                      grade_qualifier: prev.grade_qualifier === '' ? '.5' : prev.grade_qualifier === '.5' ? '' : prev.grade_qualifier === '10' ? '.5' : '10'
                    }))}
                    className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors
                      ${formData.grade_qualifier === '.5'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                  >
                    {formData.grade_qualifier === '.5' ? '.5' : formData.grade_qualifier === '10' ? '10' : 'Add .5'}
                  </button>
                </div>
                {formData.grade && formData.grade_qualifier && (
                  <div className="text-sm text-gray-600">
                    Selected Grade: <span className="font-semibold text-gray-900">{formData.grade}{formData.grade_qualifier}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="front_label_price"
                  value={formData.front_label_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isEditMode && (!formData.barcode_id || isDuplicateBarcode)}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
          >
            {isEditMode ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEditMode ? 'Save Changes' : 'Add to Inventory'}
          </button>
        </form>
      </div>
      
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, type: 'error', message: '' })}
        type={alertModal.type}
        message={alertModal.message}
        showCancel={false}
      />
    </div>
  );
}
