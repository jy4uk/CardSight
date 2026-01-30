import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Scan, Plus, Save, Search, Loader2, Check } from 'lucide-react';
import { searchCardImages, fetchPSAData, isPSACertNumber, searchTCGProducts } from '../api';
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
    series: editItem?.series || '',
    card_number: editItem?.card_number || '',
    game: editItem?.game || 'pokemon',
    card_type: editItem?.card_type || 'raw',
    cert_number: editItem?.cert_number || '',
    grade: editItem?.grade || '',
    grade_qualifier: editItem?.grade_qualifier || '',
    condition: editItem?.condition || 'NM',
    purchase_price: editItem?.purchase_price ?? '',
    front_label_price: editItem?.front_label_price ?? '',
    purchase_percentage: '',
    notes: editItem?.notes || '',
    image_url: editItem?.image_url || '',
    tcg_product_id: editItem?.tcg_product_id || null,
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [imageOptions, setImageOptions] = useState([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });
  const [psaData, setPsaData] = useState(null);
  const [psaLoading, setPsaLoading] = useState(false);
  const [psaError, setPsaError] = useState(null);
  const [tcgProducts, setTcgProducts] = useState([]);
  const [tcgLoading, setTcgLoading] = useState(false);
  const [selectedTcgProduct, setSelectedTcgProduct] = useState(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const imageSearchAbortRef = useRef(null);
  const imageSearchTimeoutRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const psaFetchedRef = useRef(null);
  const psaDebounceRef = useRef(null);
  const tcgDebounceRef = useRef(null);

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
      setTcgProducts([]);
      setTcgLoading(false);
      setSelectedTcgProduct(null);
      // Show more details if editing and has non-default values
      setShowMoreDetails(isEditMode && (editItem?.game !== 'pokemon' || editItem?.card_type !== 'raw' || editItem?.condition !== 'NM'));
      setShowNotes(isEditMode && !!editItem?.notes);
      psaFetchedRef.current = null;
      if (psaDebounceRef.current) {
        clearTimeout(psaDebounceRef.current);
        psaDebounceRef.current = null;
      }
      if (tcgDebounceRef.current) {
        clearTimeout(tcgDebounceRef.current);
        tcgDebounceRef.current = null;
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
        
        // Extract numeric grade from PSA grade (e.g., "GEM MT 10" -> "10")
        const extractNumericGrade = (psaGrade) => {
          if (!psaGrade) return '';
          const match = psaGrade.match(/(\d+(?:\.\d+)?)/);
          return match ? match[1] : '';
        };

        // Convert to title case (first letter of each word capitalized)
        const toTitleCase = (str) => {
          if (!str) return '';
          return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        };

        // Strip PSA variant prefixes from card name (e.g., "Fa/Lugia V" -> "Lugia V")
        // PSA uses these prefixes: Fa=Full Art, Sr=Secret Rare, Ar=Art Rare, etc.
        const cleanCardName = (name) => {
          if (!name) return '';
          // Common PSA variant prefixes followed by /
          const prefixPattern = /^(Fa|Sr|Ar|Sar|Ir|Sir|Ur|Chr|Csr|Tg|Gg|Rr|Pr|Hr)\//i;
          return name.replace(prefixPattern, '').trim();
        };

        // Game prefixes to detect and strip from set name
        const GAME_PREFIXES = [
          { pattern: /^POKEMON\s+/i, game: 'pokemon' },
          { pattern: /^ONE PIECE\s+/i, game: 'onepiece' },
          { pattern: /^ONEPIECE\s+/i, game: 'onepiece' },
          { pattern: /^MTG\s+/i, game: 'mtg' },
          { pattern: /^MAGIC\s+/i, game: 'mtg' },
          { pattern: /^MAGIC:?\s*THE GATHERING\s+/i, game: 'mtg' },
          { pattern: /^YU-?GI-?OH!?\s+/i, game: 'yugioh' },
          { pattern: /^YUGIOH!?\s+/i, game: 'yugioh' },
        ];

        // Parse set name: extract game prefix, series, and true set name
        // e.g., "POKEMON SWORD & SHIELD SILVER TEMPEST" -> { game: 'pokemon', series: 'Sword & Shield', setName: 'Silver Tempest' }
        const parseSetName = (rawSet) => {
          if (!rawSet) return { game: null, series: '', setName: '' };
          
          let setName = rawSet;
          let detectedGame = null;
          let detectedSeries = '';

          // Check for game prefix
          for (const { pattern, game } of GAME_PREFIXES) {
            if (pattern.test(setName)) {
              detectedGame = game;
              setName = setName.replace(pattern, '');
              break;
            }
          }

          // Extract common Pokemon series prefixes (e.g., "SWORD & SHIELD" from "SWORD & SHIELD SILVER TEMPEST")
          const POKEMON_SERIES_PREFIXES = [
            { pattern: /^(SWORD\s*&?\s*SHIELD)\s+/i, series: 'Sword & Shield' },
            { pattern: /^(SUN\s*&?\s*MOON)\s+/i, series: 'Sun & Moon' },
            { pattern: /^(XY)\s+/i, series: 'XY' },
            { pattern: /^(BLACK\s*&?\s*WHITE)\s+/i, series: 'Black & White' },
            { pattern: /^(SCARLET\s*&?\s*VIOLET)\s+/i, series: 'Scarlet & Violet' },
            { pattern: /^(DIAMOND\s*&?\s*PEARL)\s+/i, series: 'Diamond & Pearl' },
            { pattern: /^(HEARTGOLD\s*&?\s*SOULSILVER)\s+/i, series: 'HeartGold & SoulSilver' },
            { pattern: /^(PLATINUM)\s+/i, series: 'Platinum' },
            { pattern: /^(EX)\s+/i, series: 'EX' },
          ];

          if (detectedGame === 'pokemon') {
            for (const { pattern, series } of POKEMON_SERIES_PREFIXES) {
              if (pattern.test(setName)) {
                detectedSeries = series;
                setName = setName.replace(pattern, '');
                break;
              }
            }
          }

          return { game: detectedGame, series: detectedSeries, setName: toTitleCase(setName.trim()) };
        };

        const { game: detectedGame, series: detectedSeries, setName: parsedSetName } = parseSetName(result.psa.set);

        // Auto-fill form fields from PSA data
        setFormData(prev => ({
          ...prev,
          card_type: 'psa',
          cert_number: certNumber,
          game: detectedGame || prev.game,
          card_name: toTitleCase(cleanCardName(result.psa.name)) || prev.card_name,
          set_name: parsedSetName || prev.set_name,
          series: detectedSeries || prev.series,
          card_number: result.psa.number || prev.card_number,
          grade: extractNumericGrade(result.psa.grade) || prev.grade,
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

  // TCG product search with debouncing
  const handleTCGSearch = async (cardName, setName, cardNumber) => {
    if (!cardName || cardName.trim().length < 2) {
      setTcgProducts([]);
      return;
    }
    
    setTcgLoading(true);
    try {
      const result = await searchTCGProducts(cardName, setName, cardNumber, 3);
      if (result.success && result.products) {
        setTcgProducts(result.products);
      } else {
        setTcgProducts([]);
      }
    } catch (err) {
      console.error('TCG search error:', err);
      setTcgProducts([]);
    } finally {
      setTcgLoading(false);
    }
  };

  // Convert to title case (first letter of each word capitalized)
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Strip trailing numbers and variant suffixes from cleanName
  // e.g., "Lugia V Alternate Full Art 216 091" -> "Lugia V"
  const cleanCardName = (name) => {
    if (!name) return '';
    let cleaned = name.replace(/\s+\d+\s+\d+$/, '').replace(/\s+-\s+\d+\/\d+$/, '').trim();
    
    // Strip common variant suffixes
    const variantSuffixes = [
      /\s+Alternate Full Art$/i,
      /\s+Full Art$/i,
      /\s+Special Art Rare$/i,
      /\s+Special Illustration Rare$/i,
      /\s+Illustration Rare$/i,
      /\s+Ultra Rare$/i,
      /\s+Secret Rare$/i,
      /\s+Rainbow Rare$/i,
      /\s+Gold Rare$/i,
      /\s+Black Star Promo$/i,
      /\s+Promo$/i,
      /\s+Shiny$/i,
      /\s+Shiny Rare$/i,
      /\s+Shiny Full Art$/i,
      /\s+Shiny Secret Rare$/i,
      /\s+Shiny Ultra Rare$/i,
      /\s+Shiny Rainbow Rare$/i,
      /\s+Shiny Gold Rare$/i,
      /\s+Shiny Black Star Promo$/i,
      /\s+Shiny Promo$/i,
    ];
    
    for (const suffix of variantSuffixes) {
      cleaned = cleaned.replace(suffix, '');
    }
    
    return cleaned.trim();
  };

  // Strip set code prefixes like "Swsh12:" or "ME02:" from set names
  const cleanSetName = (name) => {
    if (!name) return '';
    return name.replace(/^[A-Za-z]+\d*:\s*/i, '').trim();
  };

  // Select a TCG product and overwrite form fields with title case formatting
  const selectTCGProduct = (product) => {
    setSelectedTcgProduct(product);
    
    const formattedCardName = toTitleCase(cleanCardName(product.cleanName || product.name || ''));
    const formattedSetName = toTitleCase(cleanSetName(product.setName || ''));
    
    setFormData(prev => ({
      ...prev,
      image_url: product.imageUrl || prev.image_url,
      tcg_product_id: product.productId,
      // Overwrite fields with title case formatted values from selected product
      card_name: formattedCardName,
      set_name: formattedSetName,
      card_number: product.cardNumber || '',
      // Auto-select game to pokemon (TCG data is Pokemon cards)
      game: 'pokemon',
    }));
    setTcgProducts([]); // Clear suggestions after selection
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
    } else if (name === 'card_name' || name === 'set_name' || name === 'card_number') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Debounce TCG product search when card name, set name, or card number changes
      if (tcgDebounceRef.current) {
        clearTimeout(tcgDebounceRef.current);
      }
      
      const newCardName = name === 'card_name' ? value : formData.card_name;
      const newSetName = name === 'set_name' ? value : formData.set_name;
      const newCardNumber = name === 'card_number' ? value : formData.card_number;
      
      if (newCardName && newCardName.trim().length >= 2) {
        tcgDebounceRef.current = setTimeout(() => {
          handleTCGSearch(newCardName, newSetName, newCardNumber);
        }, 400);
      } else {
        setTcgProducts([]);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePercentageChange = (e) => {
    const { value } = e.target;
    const marketPrice = parseFloat(formData.front_label_price) || 0;
    
    // Update the percentage field value
    setFormData(prev => ({
      ...prev,
      purchase_percentage: value,
    }));
    
    if (marketPrice === 0) {
      // Can't calculate percentage without market price
      return;
    }
    
    // Parse percentage value (remove % if present)
    const percentage = parseFloat(value.toString().replace('%', '')) || 0;
    
    // Calculate purchase price from percentage
    const purchasePrice = (marketPrice * percentage / 100).toFixed(2);
    
    // Update purchase price
    setFormData(prev => ({
      ...prev,
      purchase_price: purchasePrice,
    }));
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

  // Sync percentage when purchase price or market price changes
  useEffect(() => {
    const purchase = parseFloat(formData.purchase_price) || 0;
    const market = parseFloat(formData.front_label_price) || 0;
    
    if (market > 0 && purchase > 0) {
      const percentage = ((purchase / market) * 100).toFixed(1);
      setFormData(prev => ({
        ...prev,
        purchase_percentage: percentage,
      }));
    } else if (market === 0) {
      // Clear percentage if no market price
      setFormData(prev => ({
        ...prev,
        purchase_percentage: '',
      }));
    }
  }, [formData.purchase_price, formData.front_label_price]);

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
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
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
              Barcode or Cert # {!isEditMode && '*'}
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

          {/* TCG Product Autocomplete */}
          {formData.card_type === 'raw' && (
            <div>
              {/* TCG Product Grid - shows up to 3 matches */}
              {tcgProducts.length > 0 && !selectedTcgProduct && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Match Card {tcgLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                </label>
              )}
              {tcgProducts.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {tcgProducts.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => selectTCGProduct(product)}
                      className={`rounded-lg overflow-hidden border-2 transition-all text-left
                        ${selectedTcgProduct?.productId === product.productId 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <div className="relative">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full aspect-[2.5/3.5] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No image</span>
                          </div>
                        )}
                        {selectedTcgProduct?.productId === product.productId && (
                          <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5 bg-gray-50 text-[11px] leading-tight">
                        <p className="font-medium text-gray-900 truncate">
                          {/* Strip trailing numbers from cleanName (e.g., "Mew ex 216 091" -> "Mew ex") */}
                          {(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '').replace(/\s+-\s+\d+\/\d+$/, '')}
                        </p>
                        <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                        {product.rarity && (
                          <p className="text-purple-600 truncate text-[10px]">{product.rarity}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No matches message */}
              {formData.card_name && formData.card_name.length >= 2 && !tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
                <p className="text-xs text-gray-500 mt-1">No matching cards found. Try adjusting the card name.</p>
              )}
              
              {/* Selected card preview */}
              {selectedTcgProduct && tcgProducts.length === 0 && (
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  {selectedTcgProduct.imageUrl && (
                    <img 
                      src={selectedTcgProduct.imageUrl} 
                      alt={selectedTcgProduct.name}
                      className="w-12 h-auto rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedTcgProduct.cleanName || selectedTcgProduct.name}</p>
                    {selectedTcgProduct.setName && (
                      <p className="text-xs text-gray-500 truncate">{selectedTcgProduct.setName}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTcgProduct(null);
                      setFormData(prev => ({ ...prev, tcg_product_id: null, image_url: '' }));
                      // Re-trigger search
                      if (formData.card_name) handleTCGSearch(formData.card_name, formData.set_name, formData.card_number);
                    }}
                    className="p-1 hover:bg-blue-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
              
              {/* TCGPlayer Link */}
              {selectedTcgProduct?.url && (
                <a
                  href={(() => {
                    const conditionMap = {
                      'NM': 'Near+Mint',
                      'LP': 'Lightly+Played',
                      'MP': 'Moderately+Played',
                      'HP': 'Heavily+Played',
                      'DMG': 'Damaged',
                    };
                    const baseUrl = selectedTcgProduct.url;
                    const condition = conditionMap[formData.condition] || 'Near+Mint';
                    const separator = baseUrl.includes('?') ? '&' : '?';
                    return `${baseUrl}${separator}Language=English&Condition=${condition}&page=1`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View on TCGPlayer →
                </a>
              )}
              
              {/* Fallback: show current image if no TCG product selected */}
              {!selectedTcgProduct && formData.image_url && tcgProducts.length === 0 && (
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

          {/* Grade (only for slabs) */}
          {formData.card_type !== 'raw' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
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
                  {formData.grade !== '10' && (
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
                  )}
                </div>
                {formData.grade && formData.grade_qualifier && (
                  <div className="text-sm text-gray-600">
                    Selected Grade: <span className="font-semibold text-gray-900">{formData.grade}{formData.grade_qualifier}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* More Details Toggle */}
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {showMoreDetails ? '− Hide Details' : '+ More Details'}
          </button>

          {/* Expandable More Details Section */}
          {showMoreDetails && (
            <div className="space-y-4 p-3 bg-gray-50 rounded-xl">
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
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
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
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition (only for raw cards) */}
              {formData.card_type === 'raw' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {CONDITIONS.map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, condition: cond }))}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors
                          ${formData.condition === cond
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price Row */}
          <div className="grid grid-cols-3 gap-4">
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
                Market Price
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase %
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="purchase_percentage"
                  value={formData.purchase_percentage}
                  onChange={handlePercentageChange}
                  placeholder="%"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* Notes Toggle */}
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              + Add Notes
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false);
                    setFormData(prev => ({ ...prev, notes: '' }));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Remove
                </button>
              </div>
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
          )}

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
