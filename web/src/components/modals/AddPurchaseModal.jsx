import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, DollarSign, Loader2, Scan, X, ShoppingBag, CheckCircle, Pencil, Bookmark } from 'lucide-react';
import { fetchPSAData, isPSACertNumber, searchTCGProducts, addInventoryItem } from '../../api';
import { usePendingPurchase } from '../../context/PendingPurchaseContext.jsx';
import { useSavedDeals } from '../../context/SavedDealsContext';
import PSAMarketData from '../PSAMarketData';
import { CONDITIONS, GRADES, GAMES, CARD_TYPES } from '../../constants';
import { getInitialFormData, cleanCardName, cleanSetName, toTitleCase } from '../../utils';

export default function AddPurchaseModal({ isOpen, onClose, inventoryItems = [], onPurchaseComplete, resumedDeal = null }) {
  const { pendingItems, addPendingItem, updatePendingItem, removePendingItem, clearPending, totalQuantity, totalCost } = usePendingPurchase();
  const { saveDeal, deleteDeal } = useSavedDeals();
  
  const [formData, setFormData] = useState(getInitialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Save for later state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveCustomerName, setSaveCustomerName] = useState('');
  const [saveCustomerNote, setSaveCustomerNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [resumedDealId, setResumedDealId] = useState(null);
  
  // Editing staged items state
  const [editingLineId, setEditingLineId] = useState(null);
  const [editingData, setEditingData] = useState({});
  
  // TCG product matching state
  const [tcgProducts, setTcgProducts] = useState([]);
  const [tcgLoading, setTcgLoading] = useState(false);
  const [selectedTcgProduct, setSelectedTcgProduct] = useState(null);
  const [showAllTcgResults, setShowAllTcgResults] = useState(false);
  const [preSelectionFormData, setPreSelectionFormData] = useState(null);
  const tcgDebounceRef = useRef(null);
  
  // PSA lookup state
  const [psaData, setPsaData] = useState(null);
  const [psaLoading, setPsaLoading] = useState(false);
  const [psaError, setPsaError] = useState(null);
  const psaDebounceRef = useRef(null);
  const psaFetchedRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // Check for duplicate barcodes
  const isDuplicateBarcode = useMemo(() => {
    const barcode = formData.barcode_id?.trim();
    if (!barcode) return false;
    return inventoryItems.some(item => item.barcode_id === barcode);
  }, [formData.barcode_id, inventoryItems]);

  // Focus barcode input when modal opens
  useEffect(() => {
    if (isOpen && barcodeInputRef.current) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(getInitialFormData);
      setSelectedTcgProduct(null);
      setPsaData(null);
      setTcgProducts([]);
      setEditingLineId(null);
      setEditingData({});
      setShowSaveDialog(false);
      setSaveCustomerName('');
      setSaveCustomerNote('');
      setResumedDealId(null);
    }
  }, [isOpen]);

  // Hydrate from resumed deal
  useEffect(() => {
    if (isOpen && resumedDeal && resumedDeal.deal_data) {
      // Clear existing pending items first
      clearPending();
      
      // Add items from resumed deal
      const dealData = typeof resumedDeal.deal_data === 'string' 
        ? JSON.parse(resumedDeal.deal_data) 
        : resumedDeal.deal_data;
      
      if (dealData.items && Array.isArray(dealData.items)) {
        dealData.items.forEach(item => {
          addPendingItem(item);
        });
      }
      
      // Pre-fill customer name if available
      if (resumedDeal.customer_name) {
        setSaveCustomerName(resumedDeal.customer_name);
      }
      if (resumedDeal.customer_note) {
        setSaveCustomerNote(resumedDeal.customer_note);
      }
      
      // Track the resumed deal ID for deletion after completion
      setResumedDealId(resumedDeal.id);
    }
  }, [isOpen, resumedDeal, clearPending, addPendingItem]);

  // PSA lookup with full parsing (matching PurchasePanel)
  const handlePSALookup = async (certNumber) => {
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

        // Strip PSA variant prefixes from card name (e.g., "Fa/Lugia V" -> "Lugia V")
        const cleanPSACardName = (name) => {
          if (!name) return '';
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

        // Parse set name: extract game prefix, series, set code, and true set name
        const parseSetName = (rawSet) => {
          if (!rawSet) return { game: null, series: '', setName: '', setCode: '', tcgSetName: '' };
          
          let setName = rawSet;
          let detectedGame = null;
          let detectedSeries = '';
          let setCode = '';

          for (const { pattern, game } of GAME_PREFIXES) {
            if (pattern.test(setName)) {
              detectedGame = game;
              setName = setName.replace(pattern, '');
              break;
            }
          }

          // Handle One Piece set format: "Op11-A Fist Of Divine Speed" or "OP11-A Fist Of Divine Speed"
          const onePieceMatch = setName.match(/^(OP\d+[A-Z]?)-(.+)$/i);
          if (onePieceMatch || detectedGame === 'onepiece') {
            if (onePieceMatch) {
              setCode = onePieceMatch[1].toUpperCase();
              const lexicalName = toTitleCase(onePieceMatch[2].trim());
              return { 
                game: 'onepiece', 
                series: '', 
                setName: `${lexicalName} - ${setCode}`,
                setCode,
                tcgSetName: lexicalName
              };
            }
          }

          // Extract Pokemon series prefixes
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

          const finalSetName = toTitleCase(setName.trim());
          return { game: detectedGame, series: detectedSeries, setName: finalSetName, setCode: '', tcgSetName: finalSetName };
        };

        const { game: detectedGame, series: detectedSeries, setName: parsedSetName, tcgSetName } = parseSetName(result.psa.set);
        const cardName = toTitleCase(cleanPSACardName(result.psa.name));
        const cardNumber = result.psa.number;

        // Auto-fill form fields from PSA data
        setFormData(prev => ({
          ...prev,
          card_type: 'psa',
          cert_number: certNumber,
          game: detectedGame || prev.game,
          card_name: cardName || prev.card_name,
          set_name: parsedSetName || prev.set_name,
          card_number: cardNumber || prev.card_number,
          grade: extractNumericGrade(result.psa.grade) || prev.grade,
        }));

        // Trigger TCG product search to find matching images
        if (cardName && cardName.trim().length >= 2) {
          handleTCGSearch(cardName, tcgSetName || parsedSetName, cardNumber);
        }
      } else {
        setPsaError(result.error || 'PSA certification not found');
      }
    } catch (err) {
      setPsaError(err.message || 'Failed to fetch PSA data');
    } finally {
      setPsaLoading(false);
    }
  };

  // PSA cert number detection - trigger lookup on barcode change
  useEffect(() => {
    const barcode = formData.barcode_id?.trim() || '';
    
    if (psaDebounceRef.current) clearTimeout(psaDebounceRef.current);
    setPsaError(null);
    
    if (isPSACertNumber(barcode)) {
      psaDebounceRef.current = setTimeout(() => {
        handlePSALookup(barcode);
      }, 1200);
    } else {
      setPsaData(null);
      psaFetchedRef.current = null;
    }
    
    return () => {
      if (psaDebounceRef.current) clearTimeout(psaDebounceRef.current);
    };
  }, [formData.barcode_id]);

  const cleanForCardLookup = (name) => {
    if (!name) return '';
    return name.replace(/[.\s']/g, '');
  };

  // TCG product search with fallback for different naming conventions
  const handleTCGSearch = async (cardName, setName, cardNumber) => {
    if (!cardName || cardName.trim().length < 2) {
      setTcgProducts([]);
      return;
    }
    
    setTcgLoading(true);
    try {
      let result = await searchTCGProducts(cardName, setName, cardNumber, 9);
      
      if ((!result.success || !result.products || result.products.length === 0) && 
          (cardName.includes('.') || cardName.includes(' '))) {
        const cleanedName = cleanForCardLookup(cardName);
        if (cleanedName !== cardName) {
          result = await searchTCGProducts(cleanedName, setName, cardNumber, 9);
        }
      }
      
      if ((!result.success || !result.products || result.products.length === 0) && setName) {
        result = await searchTCGProducts(cardName, '', cardNumber, 9);
        
        if ((!result.success || !result.products || result.products.length === 0) && 
            (cardName.includes('.') || cardName.includes(' '))) {
          const cleanedName = cleanForCardLookup(cardName);
          if (cleanedName !== cardName) {
            result = await searchTCGProducts(cleanedName, '', cardNumber, 9);
          }
        }
      }
      
      if (result.success && result.products) {
        setTcgProducts(result.products);
        setShowAllTcgResults(false);
      } else {
        setTcgProducts([]);
        setShowAllTcgResults(false);
      }
    } catch (err) {
      console.error('TCG search error:', err);
      setTcgProducts([]);
    } finally {
      setTcgLoading(false);
    }
  };

  // Debounced TCG search
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'card_name' || field === 'set_name' || field === 'card_number') {
      if (tcgDebounceRef.current) clearTimeout(tcgDebounceRef.current);
      
      const newCardName = field === 'card_name' ? value : formData.card_name;
      const newSetName = field === 'set_name' ? value : formData.set_name;
      const newCardNumber = field === 'card_number' ? value : formData.card_number;
      
      if (newCardName && newCardName.trim().length >= 2) {
        tcgDebounceRef.current = setTimeout(() => {
          handleTCGSearch(newCardName, newSetName, newCardNumber);
        }, 400);
      } else {
        setTcgProducts([]);
      }
    }
  };

  // Auto-detect PSA card type from barcode
  useEffect(() => {
    const barcode = formData.barcode_id?.trim() || '';
    if (isPSACertNumber(barcode) && formData.card_type === 'raw') {
      setFormData(prev => ({ ...prev, card_type: 'psa' }));
    }
  }, [formData.barcode_id, formData.card_type]);

  // Detect game from TCG product categoryId
  const detectGameFromProduct = (product) => {
    const categoryId = product.categoryId;
    switch (categoryId) {
      case 3: return 'pokemon';
      case 68: return 'onepiece';
      case 1: return 'mtg';
      case 2: return 'yugioh';
      default: return 'pokemon';
    }
  };

  const handleSelectTcgProduct = (product) => {
    setPreSelectionFormData({ ...formData });
    setSelectedTcgProduct(product);
    
    const formattedCardName = toTitleCase(cleanCardName(product.cleanName || product.name || ''));
    const formattedSetName = toTitleCase(cleanSetName(product.setName || ''));
    const detectedGame = detectGameFromProduct(product);
    
    setFormData(prev => {
      const isGradedCard = prev.card_type !== 'raw';
      
      if (isGradedCard) {
        return {
          ...prev,
          image_url: product.imageUrl || prev.image_url,
          tcg_product_id: product.productId,
          game: detectedGame,
        };
      }
      return {
        ...prev,
        image_url: product.imageUrl || prev.image_url,
        tcg_product_id: product.productId,
        card_name: formattedCardName,
        set_name: formattedSetName,
        card_number: product.cardNumber || prev.card_number,
        game: detectedGame,
        condition: prev.condition || 'NM',
      };
    });
    setTcgProducts([]);
  };

  const handleAddToStaged = () => {
    if (!formData.card_name?.trim()) return;
    if (formData.barcode_id?.trim() && isDuplicateBarcode) return;
    
    addPendingItem({
      ...formData,
      purchase_price: Number(formData.purchase_price) || 0,
      front_label_price: Number(formData.front_label_price) || null,
      quantity: 1,
    });
    
    setFormData(getInitialFormData);
    setSelectedTcgProduct(null);
    setPsaData(null);
    psaFetchedRef.current = null;
    
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const handleSubmitAll = async () => {
    if (pendingItems.length === 0) return;
    
    setSubmitting(true);
    try {
      for (const item of pendingItems) {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          const itemData = { ...item };
          if (i > 0) delete itemData.barcode_id;
          delete itemData.lineId;
          delete itemData.quantity;
          await addInventoryItem(itemData);
        }
      }
      
      clearPending();
      setSuccessMessage(`Successfully added ${totalQuantity} card${totalQuantity > 1 ? 's' : ''} to inventory!`);
      
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        if (onPurchaseComplete) onPurchaseComplete();
      }, 1500);
    } catch (err) {
      console.error('Failed to add items:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit handlers
  const handleStartEdit = (item) => {
    setEditingLineId(item.lineId);
    setEditingData({
      card_name: item.card_name,
      set_name: item.set_name || '',
      card_number: item.card_number || '',
      purchase_price: item.purchase_price || '',
      front_label_price: item.front_label_price || '',
      condition: item.condition || '',
      grade: item.grade || '',
      card_type: item.card_type || 'raw',
      game: item.game || '',
    });
  };

  const handleSaveEdit = (lineId) => {
    updatePendingItem(lineId, editingData);
    setEditingLineId(null);
    setEditingData({});
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditingData({});
  };

  // Generate TCGPlayer product URL with condition
  const generateTCGPlayerUrl = (product, condition) => {
    // Use the direct product URL if available
    if (product?.url) {
      const conditionMap = {
        'NM': 'Near Mint',
        'LP': 'Lightly Played',
        'MP': 'Moderately Played',
        'HP': 'Heavily Played',
        'DMG': 'Damaged'
      };
      const tcgCondition = conditionMap[condition] || 'Near Mint';
      const separator = product.url.includes('?') ? '&' : '?';
      return `${product.url}${separator}Language=English&Condition=${encodeURIComponent(tcgCondition)}`;
    }
    
    // Fallback to search URL
    const searchQuery = product?.cardNumber 
      ? `${product.cleanName || product.name} ${product.setName || ''} ${product.cardNumber}`
      : `${product.cleanName || product.name} ${product.setName || ''}`;
    return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(searchQuery.trim())}&page=1`;
  };

  // Save for later handler
  const handleSaveForLater = async () => {
    if (pendingItems.length === 0) return;
    
    setSaving(true);
    try {
      const dealData = {
        items: pendingItems,
        totalQuantity,
        totalCost
      };
      
      const result = await saveDeal({
        deal_type: 'purchase',
        customer_name: saveCustomerName.trim() || null,
        customer_note: saveCustomerNote.trim() || null,
        deal_data: dealData,
        total_items: totalQuantity,
        total_value: totalCost,
        trade_out_inventory_ids: []
      });
      
      if (result.success) {
        // If we resumed from an existing deal, delete the old one
        if (resumedDealId) {
          await deleteDeal(resumedDealId);
        }
        
        clearPending();
        setShowSaveDialog(false);
        setSuccessMessage('Deal saved for later!');
        
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1500);
      } else {
        alert('Failed to save deal: ' + result.error);
      }
    } catch (err) {
      console.error('Failed to save deal:', err);
      alert('Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isGraded = formData.card_type !== 'raw';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Record Purchase</h2>
          </div>
          <div className="flex items-center gap-3">
            {pendingItems.length > 0 && (
              <span className="text-sm text-gray-600">
                {totalQuantity} card{totalQuantity !== 1 ? 's' : ''} • ${totalCost.toFixed(2)}
              </span>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Success Message */}
          {successMessage && (
            <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
          )}

          {/* Add Card Form */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* Barcode Input */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Barcode / Cert #</label>
              <div className="relative">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={formData.barcode_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, barcode_id: e.target.value }))}
                  placeholder="Scan or enter barcode"
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    isDuplicateBarcode ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {psaLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                )}
              </div>
              {isDuplicateBarcode && (
                <p className="text-xs text-red-600 mt-1">This barcode already exists in your inventory</p>
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

            {/* Card Name & Card Number Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Card Name *</label>
                <input
                  type="text"
                  value={formData.card_name}
                  onChange={(e) => handleFieldChange('card_name', e.target.value)}
                  placeholder="e.g., Charizard VMAX"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Card Number</label>
                <input
                  type="text"
                  value={formData.card_number}
                  onChange={(e) => handleFieldChange('card_number', e.target.value)}
                  placeholder="e.g., 136/172"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Set Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Set Name</label>
              <input
                type="text"
                value={formData.set_name}
                onChange={(e) => handleFieldChange('set_name', e.target.value)}
                placeholder="e.g., Brilliant Stars"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Game, Card Type, and Condition/Grade Row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Game</label>
                <select
                  value={formData.game}
                  onChange={(e) => setFormData(prev => ({ ...prev, game: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select game</option>
                  {GAMES.map(g => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Card Type</label>
                <select
                  value={formData.card_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, card_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {CARD_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                {isGraded ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select grade</option>
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              </div>
            </div>

            {/* TCG Loading Spinner */}
            {tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Looking up Image(s)...</span>
              </div>
            )}

            {/* TCG Product Grid */}
            {tcgProducts.length > 0 && !selectedTcgProduct && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">
                    Match Card {tcgLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                  </label>
                  {tcgProducts.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTcgResults(!showAllTcgResults)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showAllTcgResults ? 'Show less' : `Show more (${tcgProducts.length})`}
                    </button>
                  )}
                </div>
                
                {showAllTcgResults && tcgProducts.length > 3 ? (
                  <div className="overflow-x-auto pb-2 -mx-1">
                    <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
                      {tcgProducts.map((product) => (
                        <button
                          key={product.productId}
                          type="button"
                          onClick={() => handleSelectTcgProduct(product)}
                          className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left"
                        >
                          <div className="relative">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                            ) : (
                              <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No image</span>
                              </div>
                            )}
                          </div>
                          <div className="px-1.5 py-1 bg-gray-50 text-[10px] leading-tight">
                            <p className="font-medium text-gray-900 truncate">
                              {(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}
                            </p>
                            <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {tcgProducts.slice(0, 3).map((product) => (
                      <button
                        key={product.productId}
                        type="button"
                        onClick={() => handleSelectTcgProduct(product)}
                        className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left"
                      >
                        <div className="relative">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                          ) : (
                            <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="px-1.5 py-1 bg-gray-50 text-[10px] leading-tight">
                          <p className="font-medium text-gray-900 truncate">
                            {(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}
                          </p>
                          <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No matches message */}
            {formData.card_name && formData.card_name.length >= 2 && !tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
              <p className="text-xs text-gray-500">No matching cards found. Try adjusting the card name.</p>
            )}

            {/* Selected card preview */}
            {selectedTcgProduct && tcgProducts.length === 0 && (
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-200">
                {selectedTcgProduct.imageUrl && (
                  <img src={selectedTcgProduct.imageUrl} alt={selectedTcgProduct.name} className="w-12 h-auto rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedTcgProduct.cleanName || selectedTcgProduct.name}</p>
                  {selectedTcgProduct.setName && (
                    <p className="text-xs text-gray-500 truncate">{selectedTcgProduct.setName}</p>
                  )}
                  <a 
                    href={generateTCGPlayerUrl(selectedTcgProduct, formData.condition)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on TCGPlayer
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (preSelectionFormData) {
                      setFormData(preSelectionFormData);
                      if (preSelectionFormData.card_name) {
                        handleTCGSearch(preSelectionFormData.card_name, preSelectionFormData.set_name, preSelectionFormData.card_number);
                      }
                    } else {
                      setFormData(prev => ({ ...prev, tcg_product_id: null, image_url: '' }));
                      if (formData.card_name) handleTCGSearch(formData.card_name, formData.set_name, formData.card_number);
                    }
                    setSelectedTcgProduct(null);
                    setPreSelectionFormData(null);
                  }}
                  className="p-1 hover:bg-green-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Price Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Market Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.front_label_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, front_label_price: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Add to Staged Button */}
            <button
              onClick={handleAddToStaged}
              disabled={!formData.card_name?.trim() || (formData.barcode_id?.trim() && isDuplicateBarcode)}
              className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add to Purchase
            </button>
          </div>

          {/* Staged Items List */}
          <div className="p-4 max-h-72 overflow-y-auto">
            {pendingItems.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cards staged yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.map((item) => {
                  const purchasePrice = Number(item.purchase_price || 0);
                  const marketPrice = Number(item.front_label_price || 0);
                  const percentage = marketPrice > 0 ? Math.round((purchasePrice / marketPrice) * 100) : null;
                  
                  return (
                    <div 
                      key={item.lineId} 
                      className={`rounded-lg p-3 ${editingLineId === item.lineId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                    >
                      {editingLineId === item.lineId ? (
                        <div className="space-y-2">
                          {/* Row 1: Image + Card Name + Set */}
                          <div className="flex items-start gap-2">
                            {item.image_url && (
                              <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />
                            )}
                            <div className="flex-1 space-y-1">
                              <input
                                type="text"
                                value={editingData.card_name}
                                onChange={(e) => setEditingData(prev => ({ ...prev, card_name: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="Card Name"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editingData.set_name}
                                  onChange={(e) => setEditingData(prev => ({ ...prev, set_name: e.target.value }))}
                                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  placeholder="Set Name"
                                />
                                <input
                                  type="text"
                                  value={editingData.card_number}
                                  onChange={(e) => setEditingData(prev => ({ ...prev, card_number: e.target.value }))}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  placeholder="#"
                                />
                              </div>
                            </div>
                          </div>
                          {/* Row 2: Game, Type, Condition/Grade */}
                          <div className="flex items-center gap-1">
                            <select
                              value={editingData.game || ''}
                              onChange={(e) => setEditingData(prev => ({ ...prev, game: e.target.value }))}
                              className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Game</option>
                              {GAMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                            <select
                              value={editingData.card_type || 'raw'}
                              onChange={(e) => setEditingData(prev => ({ ...prev, card_type: e.target.value, condition: e.target.value === 'raw' ? prev.condition : '', grade: e.target.value !== 'raw' ? prev.grade : '' }))}
                              className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              {CARD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                            {editingData.card_type === 'raw' ? (
                              <select
                                value={editingData.condition || ''}
                                onChange={(e) => setEditingData(prev => ({ ...prev, condition: e.target.value }))}
                                className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Cond</option>
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <select
                                value={editingData.grade || ''}
                                onChange={(e) => setEditingData(prev => ({ ...prev, grade: e.target.value }))}
                                className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Grade</option>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            )}
                          </div>
                          {/* Row 3: Prices + Actions */}
                          <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                value={editingData.purchase_price}
                                onChange={(e) => setEditingData(prev => ({ ...prev, purchase_price: e.target.value }))}
                                className="w-full pl-5 pr-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="Purchase Price"
                                step="0.01"
                              />
                            </div>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                value={editingData.front_label_price}
                                onChange={(e) => setEditingData(prev => ({ ...prev, front_label_price: e.target.value }))}
                                className="w-full pl-5 pr-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="Market Price"
                                step="0.01"
                              />
                            </div>
                            {editingData.front_label_price > 0 && editingData.purchase_price > 0 && (
                              <span className="text-xs font-medium text-gray-500 w-10 text-center">
                                {Math.round((Number(editingData.purchase_price) / Number(editingData.front_label_price)) * 100)}%
                              </span>
                            )}
                            <button
                              onClick={() => handleSaveEdit(item.lineId)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {item.image_url && (
                            <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{item.card_name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {item.card_type !== 'raw' ? `${item.card_type.toUpperCase()} ${item.grade || ''}` : item.condition || 'Raw'}
                              {item.set_name && ` • ${item.set_name}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm text-green-600">Buy @ ${purchasePrice.toFixed(2)}</p>
                            {marketPrice > 0 && (
                              <p className="text-xs text-gray-400">
                                <span className="text-gray-500">Market: ${marketPrice.toFixed(2)}</span>
                                {percentage !== null && (
                                  <span className={`ml-1 font-medium ${percentage <= 60 ? 'text-green-600' : percentage <= 80 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    ({percentage}%)
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removePendingItem(item.lineId)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Submit */}
        {pendingItems.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
            {/* Save Dialog */}
            {showSaveDialog ? (
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Save this quote for later?</p>
                <input
                  type="text"
                  value={saveCustomerName}
                  onChange={(e) => setSaveCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="text"
                  value={saveCustomerNote}
                  onChange={(e) => setSaveCustomerNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveForLater}
                    disabled={saving}
                    className="flex-1 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                    Save Deal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total ({totalQuantity} cards)</span>
                  <span className="font-bold text-lg">Pay customer: ${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearPending}
                    className="py-2.5 px-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="py-2.5 px-3 border border-amber-400 text-amber-600 font-medium rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1"
                  >
                    <Bookmark className="w-4 h-4" />
                    Save for Later
                  </button>
                  <button
                    onClick={handleSubmitAll}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 
                               disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Complete Purchase
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
